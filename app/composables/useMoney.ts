import type { CurrencyCode, Money, RatesPayload } from '#shared/utils/currency'

const EMPTY_RATES: RatesPayload = { base: 'TRY', date: null, rates: {}, fetchedAt: 0, stale: true }

/**
 * Gösterim para birimi. Sunucu her tutarı tüm birimlerde (kayıt anının kuruyla)
 * döndürür; burada yalnızca seçili birim okunur, güncel kurla çevrilmez.
 * Seçim çerezde saklanır ki sunucu tarafı render da aynı birimi kullansın.
 */
export function useMoney() {
  const selected = useCookie<CurrencyCode>('defter-cur', {
    default: () => 'TRY',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  })

  // Güncel kur yalnızca seçicideki bilgi satırı ve form önizlemesi için.
  const { data, status, refresh } = useFetch<RatesPayload>('/api/rates', {
    key: 'rates',
    default: () => EMPTY_RATES,
    dedupe: 'defer',
  })
  const rates = computed(() => data.value ?? EMPTY_RATES)

  const currency = computed<CurrencyCode>(() => (isCurrencyCode(selected.value) ? selected.value : 'TRY'))

  /** Seçili birimde değer (birim cinsinden). Kuru bilinmeyen eski kayıtta güncel kura düşer. */
  function value(m: Money): number {
    const stored = m[currency.value]
    if (stored !== null) return stored / 100
    return convertMinor(m.TRY, currency.value, rates.value.rates) ?? m.TRY / 100
  }

  function formatValue(v: number, opts?: { sign?: boolean }): string {
    return formatAmount(v, currency.value, opts)
  }

  function format(m: Money, opts?: { sign?: boolean }): string {
    return formatValue(value(m), opts)
  }

  function compactValue(v: number): string {
    return formatCompact(v, currency.value)
  }

  function compact(m: Money): string {
    return compactValue(value(m))
  }

  /** İkincil satır: TRY'deyken dolar karşılığı, başka birimdeyken orijinal ₺. */
  function alt(m: Money): string {
    if (currency.value !== 'TRY') return formatAmount(m.TRY / 100, 'TRY')
    return m.USD !== null ? `≈ ${formatAmount(m.USD / 100, 'USD')}` : ''
  }

  /** "1 USD = ₺49,63" */
  function rateLabel(code: CurrencyCode, source = rates.value.rates): string {
    const r = source[code]
    return r ? `1 ${code} = ${formatAmount(1 / r, 'TRY')}` : 'kur yok'
  }

  function select(code: CurrencyCode) {
    selected.value = code
  }

  return { currency, selected, rates, status, refresh, value, format, formatValue, compact, compactValue, alt, rateLabel, select }
}
