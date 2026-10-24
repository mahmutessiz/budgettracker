import { eq } from 'drizzle-orm'
import { FOREIGN_CURRENCIES, type RatesPayload } from '#shared/utils/currency'
import { todayISO } from '#shared/utils/dates'
import { exchangeRate } from '../db/schema'
import { db } from './db'

// Frankfurter ECB referans kurlarını iş günlerinde günde bir kez (~16:00 CET) günceller.
const TTL_MS = 60 * 60 * 1000
const FAILURE_BACKOFF_MS = 60 * 1000
const API_BASE = (process.env.FRANKFURTER_URL || 'https://api.frankfurter.dev/v1').replace(/\/(latest)?\/?$/, '')

type FrankfurterRates = Record<string, number>
const FETCH_OPTS = { timeout: 10_000, retry: 2, retryDelay: 1000 } as const
const QUERY = { base: 'TRY', symbols: FOREIGN_CURRENCIES.join(',') }

function pickRates(raw: FrankfurterRates): RatesPayload['rates'] {
  const rates: RatesPayload['rates'] = {}
  for (const code of FOREIGN_CURRENCIES) {
    const value = raw[code]
    if (typeof value === 'number' && value > 0) rates[code] = value
  }
  return rates
}

// --- Güncel kur -------------------------------------------------------------

let cache: RatesPayload | null = null
let lastFailureAt = 0
let inflight: Promise<RatesPayload> | null = null

function fromDb(): RatesPayload | null {
  const row = db.select().from(exchangeRate).where(eq(exchangeRate.base, 'TRY')).get()
  if (!row) return null
  return { base: 'TRY', date: row.date, rates: row.rates, fetchedAt: row.fetchedAt.getTime(), stale: true }
}

async function fetchLatest(): Promise<RatesPayload> {
  const res = await $fetch<{ date: string; rates: FrankfurterRates }>(`${API_BASE}/latest`, { query: QUERY, ...FETCH_OPTS })
  const rates = pickRates(res.rates)
  const fetchedAt = new Date()
  db.insert(exchangeRate)
    .values({ base: 'TRY', date: res.date, rates, fetchedAt })
    .onConflictDoUpdate({ target: exchangeRate.base, set: { date: res.date, rates, fetchedAt } })
    .run()
  return { base: 'TRY', date: res.date, rates, fetchedAt: fetchedAt.getTime(), stale: false }
}

export async function getRates(): Promise<RatesPayload> {
  const now = Date.now()
  if (cache && !cache.stale && now - cache.fetchedAt < TTL_MS) return cache
  if (cache?.stale && now - lastFailureAt < FAILURE_BACKOFF_MS) return cache

  inflight ??= fetchLatest()
    .then((fresh) => (cache = fresh))
    .catch((error) => {
      lastFailureAt = Date.now()
      console.warn('[rates] Frankfurter isteği başarısız:', error?.message ?? error)
      cache = cache ? { ...cache, stale: true } : fromDb()
      return cache ?? { base: 'TRY' as const, date: null, rates: {}, fetchedAt: 0, stale: true }
    })
    .finally(() => (inflight = null))
  return inflight
}

// --- Belirli bir günün kuru ---------------------------------------------------

/** Geçmiş kurlar değişmez; süreç boyunca saklanır. */
const historical = new Map<string, RatesPayload>()

/**
 * Harcama tarihi için kur. Bugün (veya ileri) için güncel kur, geçmiş için o günün
 * ECB kuru (hafta sonu/tatilde bir önceki iş günü). Alınamazsa null.
 */
export async function getRatesForDate(date: string): Promise<RatesPayload | null> {
  if (date >= todayISO()) {
    const latest = await getRates()
    return latest.date && Object.keys(latest.rates).length ? latest : null
  }
  const hit = historical.get(date)
  if (hit) return hit
  try {
    const res = await $fetch<{ date: string; rates: FrankfurterRates }>(`${API_BASE}/${date}`, { query: QUERY, ...FETCH_OPTS })
    const payload: RatesPayload = { base: 'TRY', date: res.date, rates: pickRates(res.rates), fetchedAt: Date.now(), stale: false }
    historical.set(date, payload)
    return payload
  } catch (error) {
    console.warn(`[rates] ${date} kuru alınamadı:`, (error as Error)?.message ?? error)
    return null
  }
}

/** Tarih aralığındaki tüm iş günü kurları: { "2026-10-21": { USD: … } } */
export async function getRateSeries(from: string, to: string): Promise<Record<string, RatesPayload['rates']>> {
  const res = await $fetch<{ rates: Record<string, FrankfurterRates> }>(`${API_BASE}/${from}..${to}`, {
    query: QUERY,
    ...FETCH_OPTS,
  })
  return Object.fromEntries(Object.entries(res.rates).map(([d, r]) => [d, pickRates(r)]))
}
