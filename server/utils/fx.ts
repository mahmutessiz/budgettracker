import { eq, isNull, sql } from 'drizzle-orm'
import type { ForeignCurrency, RatesPayload } from '#shared/utils/currency'
import { todayISO } from '#shared/utils/dates'
import { expense } from '../db/schema'
import { db } from './db'
import { getRateSeries, getRatesForDate } from './rates'

export interface FxSnapshot {
  fxDate: string
  fxRates: RatesPayload['rates']
}

export const FX_COLUMN = {
  USD: expense.amountUsd,
  EUR: expense.amountEur,
  GBP: expense.amountGbp,
} as const satisfies Record<ForeignCurrency, unknown>

/** Kuruş × (1 TRY = r) → yabancı birimin küçük birimi (sent, cent, pence) */
export function convertWith(amount: number, rate: number | undefined): number | null {
  return rate ? Math.round(amount * rate) : null
}

/** Kaydedilecek döviz kolonları; kur yoksa hepsi null (arka planda tamamlanır). */
export function fxColumns(amount: number, snap: FxSnapshot | null) {
  return {
    amountUsd: snap ? convertWith(amount, snap.fxRates.USD) : null,
    amountEur: snap ? convertWith(amount, snap.fxRates.EUR) : null,
    amountGbp: snap ? convertWith(amount, snap.fxRates.GBP) : null,
    fxDate: snap?.fxDate ?? null,
    fxRates: snap?.fxRates ?? null,
  }
}

export async function snapshotFor(date: string): Promise<FxSnapshot | null> {
  const r = await getRatesForDate(date)
  return r?.date ? { fxDate: r.date, fxRates: r.rates } : null
}

let backfilling: Promise<number> | null = null

/**
 * Kuru olmayan kayıtları (eski kayıtlar ya da kur alınamadan girilenler)
 * kendi tarihlerindeki ECB kuruyla tamamlar.
 */
export function backfillMissingFx(): Promise<number> {
  backfilling ??= run().finally(() => (backfilling = null))
  return backfilling

  async function run() {
    const rows = db
      .select({ id: expense.id, amount: expense.amount, date: expense.date })
      .from(expense)
      .where(isNull(expense.fxDate))
      .all()
    if (!rows.length) return 0

    const today = todayISO()
    const dates = rows.map((r) => (r.date > today ? today : r.date)).sort()
    let series: Record<string, RatesPayload['rates']>
    try {
      series = await getRateSeries(dates[0]!, dates[dates.length - 1]!)
    } catch (error) {
      console.warn('[fx] Kur serisi alınamadı, sonra tekrar denenecek:', (error as Error)?.message ?? error)
      return 0
    }
    const available = Object.keys(series).sort()
    if (!available.length) return 0

    // Tarihe eşit ya da ondan önceki son iş günü; yoksa ilk iş günü.
    const rateDateFor = (d: string) => {
      let pick = available[0]!
      for (const a of available) {
        if (a > d) break
        pick = a
      }
      return pick
    }

    db.transaction((tx) => {
      for (const r of rows) {
        const fxDate = rateDateFor(r.date > today ? today : r.date)
        const cols = fxColumns(r.amount, { fxDate, fxRates: series[fxDate]! })
        tx.update(expense).set(cols).where(eq(expense.id, r.id)).run()
      }
    })
    console.info(`[fx] ${rows.length} kaydın döviz karşılığı tamamlandı`)
    return rows.length
  }
}

/**
 * Özet sorguları için toplamlar. Kayıtlı karşılıklar toplanır; kuru eksik
 * kayıt varsa (henüz tamamlanmamış) güncel kurla yaklaşıklanır.
 */
export function moneySum(current: RatesPayload['rates']) {
  const foreign = (code: ForeignCurrency) => {
    const col = FX_COLUMN[code]
    const rate = current[code]
    return rate
      ? sql<number>`coalesce(sum(coalesce(${col}, round(${expense.amount} * ${rate}))), 0)`
      : sql<number | null>`case when count(${col}) = count(*) then coalesce(sum(${col}), 0) end`
  }
  return {
    TRY: sql<number>`coalesce(sum(${expense.amount}), 0)`,
    USD: foreign('USD'),
    EUR: foreign('EUR'),
    GBP: foreign('GBP'),
  }
}
