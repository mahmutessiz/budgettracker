export const CURRENCIES = [
  { code: 'TRY', symbol: '₺', name: 'Türk lirası' },
  { code: 'USD', symbol: '$', name: 'ABD doları' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'İngiliz sterlini' },
] as const

export type CurrencyCode = (typeof CURRENCIES)[number]['code']

export const BASE_CURRENCY = 'TRY' satisfies CurrencyCode
export type ForeignCurrency = Exclude<CurrencyCode, 'TRY'>
export const FOREIGN_CURRENCIES = CURRENCIES.map((c) => c.code).filter((c): c is ForeignCurrency => c !== BASE_CURRENCY)

/**
 * Bir tutarın tüm para birimlerindeki karşılığı, küçük birim cinsinden
 * (kuruş / sent / cent / pence). Kur bilinmiyorsa null.
 */
export type Money = Record<CurrencyCode, number | null> & { TRY: number }

export const ZERO_MONEY: Money = { TRY: 0, USD: 0, EUR: 0, GBP: 0 }

/** Frankfurter'dan gelen kurlar: 1 TRY = rates[code] */
export interface RatesPayload {
  base: 'TRY'
  date: string | null
  rates: Partial<Record<CurrencyCode, number>>
  fetchedAt: number
  stale: boolean
}

export function isCurrencyCode(value: unknown): value is CurrencyCode {
  return typeof value === 'string' && CURRENCIES.some((c) => c.code === value)
}

export function currencySymbol(code: CurrencyCode): string {
  return CURRENCIES.find((c) => c.code === code)!.symbol
}

/** Kuruş cinsinden tutarı seçili para birimine çevirir. Kur yoksa null. */
export function convertMinor(minor: number, code: CurrencyCode, rates: RatesPayload['rates']): number | null {
  const lira = minor / 100
  if (code === BASE_CURRENCY) return lira
  const rate = rates[code]
  return rate ? lira * rate : null
}

const nf2 = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const nf1 = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 1 })
const nf0 = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 })

export function formatNumber(value: number): string {
  return nf2.format(value)
}

/**
 * "₺18.430,50" biçimi. `suffix` stili PDF içindir ("18.430,50 TL"),
 * çünkü gömülü fontta ₺ glifi yok.
 */
export function formatAmount(
  value: number,
  code: CurrencyCode,
  opts: { sign?: boolean; style?: 'symbol' | 'suffix' } = {},
): string {
  const sign = value < 0 ? '−' : opts.sign && value > 0 ? '+' : ''
  const abs = nf2.format(Math.abs(value))
  if (opts.style === 'suffix') return `${sign}${abs} ${code === 'TRY' ? 'TL' : code}`
  return `${sign}${currencySymbol(code)}${abs}`
}

/** Grafik etiketleri için kısa sayı: 18400 → "18,4b", 412 → "412" */
export function formatCompactNumber(value: number): string {
  return Math.abs(value) >= 1000 ? `${nf1.format(value / 1000)}b` : nf0.format(value)
}

export function formatCompact(value: number, code: CurrencyCode): string {
  return `${currencySymbol(code)}${formatCompactNumber(value)}`
}

/** 9.04 → "%9,0" */
export function formatPercent(value: number, digits = 1): string {
  return `%${new Intl.NumberFormat('tr-TR', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value)}`
}
