/** Tutarlar veritabanında kuruş (tam sayı) olarak tutulur. */
export const MAX_AMOUNT_MINOR = 100_000_000_000 // 1 milyar TL

/**
 * Kullanıcının yazdığı tutarı kuruşa çevirir.
 * "486,30", "1.250", "1.250,75", "1250.75", "₺ 99" kabul edilir.
 */
export function parseAmountInput(input: string): number | null {
  let s = input.trim().replace(/\s|₺|tl/gi, '')
  if (!s) return null
  const lastComma = s.lastIndexOf(',')
  const lastDot = s.lastIndexOf('.')
  if (lastComma > -1 && lastDot > -1) {
    const decimal = lastComma > lastDot ? ',' : '.'
    const thousands = decimal === ',' ? '.' : ','
    s = s.split(thousands).join('').replace(decimal, '.')
  } else if (lastComma > -1) {
    if (s.indexOf(',') !== lastComma) return null
    s = s.replace(',', '.')
  } else if (lastDot > -1 && /^\d{1,3}(\.\d{3})+$/.test(s)) {
    s = s.replace(/\./g, '')
  }
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null
  const minor = Math.round(Number.parseFloat(s) * 100)
  return minor > 0 && minor <= MAX_AMOUNT_MINOR ? minor : null
}

/** 48630 → "486,30" (form alanı için, binlik ayırıcı yok) */
export function minorToInput(minor: number): string {
  return (minor / 100).toFixed(2).replace('.', ',')
}
