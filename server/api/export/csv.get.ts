import { categoryOf } from '../../utils/categories'
import { formatDateTR } from '#shared/utils/dates'

// Türkçe Excel ondalık virgül ve ; ayırıcı bekler.
const SEP = ';'

function cell(value: string): string {
  // Formül enjeksiyonuna karşı (=, +, -, @ ile başlayan metin)
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value
  return /[";\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}

const num = (v: number) => v.toFixed(2).replace('.', ',')

export default defineEventHandler(async (event) => {
  const { rows, currency, fileStem } = await loadExport(event)
  const foreign = currency !== 'TRY'

  const header = ['Tarih', 'Açıklama', 'Not', 'Kategori', 'Tutar (TRY)']
  if (foreign) header.push(`Tutar (${currency})`, `Kur (1 ${currency} = TRY)`, 'Kur tarihi')

  const lines = [header.map(cell).join(SEP)]
  for (const r of rows) {
    const line = [formatDateTR(r.date), r.description, r.note ?? '', categoryOf(r.category).name, num(r.amount / 100)]
    if (foreign) {
      // Kayıttaki kur; henüz tamamlanmadıysa güncel kurla yaklaşık (tarih boş kalır)
      const rate = r.fxRates?.[currency]
      line.push(
        num(r.amounts[currency]! / 100),
        rate ? (1 / rate).toFixed(4).replace('.', ',') : '',
        r.fxDate ? formatDateTR(r.fxDate) : 'güncel kur',
      )
    }
    lines.push(line.map(cell).join(SEP))
  }

  setResponseHeaders(event, {
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename="${fileStem}.csv"`,
    'Cache-Control': 'no-store',
  })
  return `﻿${lines.join('\r\n')}\r\n`
})
