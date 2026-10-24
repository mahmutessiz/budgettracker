export const MONTHS_TR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']
export const MONTHS_TR_SHORT = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara']

const pad = (n: number) => String(n).padStart(2, '0')

/** Yerel saate göre YYYY-MM-DD */
export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function todayISO(): string {
  return toISODate(new Date())
}

export function isISODate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [y, m, d] = value.split('-').map(Number) as [number, number, number]
  const date = new Date(y, m - 1, d)
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d
}

export function isMonthKey(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(value)
}

export function monthKeyOf(iso: string): string {
  return iso.slice(0, 7)
}

export function addMonths(key: string, n: number): string {
  const [y, m] = key.split('-').map(Number) as [number, number]
  const d = new Date(y, m - 1 + n, 1)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
}

export function daysInMonth(key: string): number {
  const [y, m] = key.split('-').map(Number) as [number, number]
  return new Date(y, m, 0).getDate()
}

export function monthRange(key: string): { from: string; to: string } {
  return { from: `${key}-01`, to: `${key}-${pad(daysInMonth(key))}` }
}

/** "2026-10" → "Ekim 2026" */
export function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number) as [number, number]
  return `${MONTHS_TR[m - 1]} ${y}`
}

export function monthShort(key: string): string {
  return MONTHS_TR_SHORT[Number(key.slice(5, 7)) - 1]!
}

export function monthName(key: string): string {
  return MONTHS_TR[Number(key.slice(5, 7)) - 1]!
}

/** "2026-10-22" → "22.10.2026" */
export function formatDateTR(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y}`
}

/** "2026-10-22" → "22 Eki" */
export function formatDayShort(iso: string): string {
  return `${Number(iso.slice(8, 10))} ${MONTHS_TR_SHORT[Number(iso.slice(5, 7)) - 1]}`
}

/** "2026-10-01" → "1 Ekim" */
export function formatDayLong(iso: string): string {
  return `${Number(iso.slice(8, 10))} ${MONTHS_TR[Number(iso.slice(5, 7)) - 1]}`
}

export const PERIODS = [
  { id: 'bu-ay', label: 'Bu ay' },
  { id: 'gecen-ay', label: 'Geçen ay' },
  { id: 'son-3-ay', label: 'Son 3 ay' },
  { id: 'bu-yil', label: 'Bu yıl' },
  { id: 'ozel', label: 'Özel aralık' },
] as const

export type PeriodId = (typeof PERIODS)[number]['id']

export function isPeriodId(value: unknown): value is PeriodId {
  return typeof value === 'string' && PERIODS.some((p) => p.id === value)
}

/** `ozel` için null döner; aralığı kullanıcı seçer. */
export function periodRange(period: PeriodId, today = todayISO()): { from: string; to: string } | null {
  const month = monthKeyOf(today)
  switch (period) {
    case 'bu-ay':
      return monthRange(month)
    case 'gecen-ay':
      return monthRange(addMonths(month, -1))
    case 'son-3-ay':
      return { from: monthRange(addMonths(month, -2)).from, to: monthRange(month).to }
    case 'bu-yil':
      return { from: `${today.slice(0, 4)}-01-01`, to: `${today.slice(0, 4)}-12-31` }
    case 'ozel':
      return null
  }
}

/** "1–31 Ekim 2026" veya "1 Ağu 2026 – 31 Eki 2026" */
export function formatRange(from: string, to: string): string {
  if (from.slice(0, 7) === to.slice(0, 7)) {
    return `${Number(from.slice(8, 10))}–${Number(to.slice(8, 10))} ${monthLabel(monthKeyOf(from))}`
  }
  return `${formatDayShort(from)} ${from.slice(0, 4)} – ${formatDayShort(to)} ${to.slice(0, 4)}`
}
