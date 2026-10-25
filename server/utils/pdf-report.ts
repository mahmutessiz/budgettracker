import PDFDocument from 'pdfkit'
import { categoryOf } from './categories'
import { formatAmount, formatPercent, type CurrencyCode } from '#shared/utils/currency'
import { formatDateTR } from '#shared/utils/dates'
import type { ExpenseDTO } from '#shared/types/api'

const INK = '#16130F'
const PAPER = '#FFFDF7'
const YELLOW = '#FFD43B'
const MUTED = '#5C564B'
const RULE = '#CFC6B3'

const FONT_FILES = {
  regular: 'Geist-Regular.ttf',
  semibold: 'Geist-SemiBold.ttf',
  bold: 'Geist-Bold.ttf',
  mono: 'GeistMono-Regular.ttf',
  monoSemibold: 'GeistMono-SemiBold.ttf',
} as const

type FontName = keyof typeof FONT_FILES
let fontCache: Record<FontName, Buffer> | null = null

async function loadFonts() {
  if (fontCache) return fontCache
  const storage = useStorage('assets:server')
  const entries = await Promise.all(
    Object.entries(FONT_FILES).map(async ([name, file]) => {
      const raw = await storage.getItemRaw(`fonts/${file}`)
      if (!raw) throw new Error(`Font bulunamadı: ${file}`)
      return [name, Buffer.from(raw as ArrayBuffer)] as const
    }),
  )
  fontCache = Object.fromEntries(entries) as Record<FontName, Buffer>
  return fontCache
}

export interface ReportInput {
  userId: string
  userName: string
  periodLabel: string
  filterLabel: string
  currency: CurrencyCode
  rows: ExpenseDTO[]
  generatedAt: Date
}

export async function renderReportPdf(input: ReportInput): Promise<Buffer> {
  const fonts = await loadFonts()
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 40, bottom: 56, left: 40, right: 40 },
    bufferPages: true,
    font: fonts.regular as unknown as string,
    info: { Title: `defter. harcama raporu · ${input.periodLabel}`, Author: input.userName },
  })
  for (const [name, buf] of Object.entries(fonts)) doc.registerFont(name, buf)

  const chunks: Buffer[] = []
  doc.on('data', (c: Buffer) => chunks.push(c))
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)
  })

  const foreign = input.currency !== 'TRY'
  /** Kayıt anındaki kurla saklanan karşılık (küçük birim → birim) */
  const valueOf = (r: ExpenseDTO) => r.amounts[input.currency]! / 100
  const money = (value: number, code: CurrencyCode = input.currency) =>
    formatAmount(value, code, { style: code === 'TRY' ? 'suffix' : 'symbol' })

  const left = doc.page.margins.left
  const width = doc.page.width - left - doc.page.margins.right
  const bottomLimit = () => doc.page.height - doc.page.margins.bottom

  // --- Başlık -----------------------------------------------------------------
  let y = doc.page.margins.top
  doc.font('bold').fontSize(14)
  const markW = doc.widthOfString('defter.') + 14
  doc.lineWidth(2).roundedRect(left, y, markW, 22, 4).fillAndStroke(YELLOW, INK)
  doc.fillColor(INK).text('defter.', left + 7, y + 4, { lineBreak: false })
  doc.font('bold').fontSize(26).text('Harcama raporu', left, y + 34, { lineBreak: false })

  const meta: [string, string][] = [
    ['Dönem', input.periodLabel],
    ['Kullanıcı', input.userName],
    ['Filtre', input.filterLabel],
    ['Para birimi', input.currency],
  ]
  if (foreign) meta.push(['Kur', 'Her kayıt kendi tarihindeki ECB kuruyla'])
  meta.push(['Oluşturuldu', input.generatedAt.toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })])
  let my = y
  for (const [k, v] of meta) {
    doc.font('regular').fontSize(8.5).fillColor(MUTED).text(k, left + width - 250, my, { width: 80, align: 'right', lineBreak: false })
    doc.font('semibold').fillColor(INK).text(v, left + width - 162, my, { width: 162, align: 'right', lineBreak: false })
    my += 12
  }
  y = Math.max(y + 72, my + 8)
  doc.lineWidth(3).moveTo(left, y).lineTo(left + width, y).stroke(INK)
  y += 18

  // --- Özet kutuları -----------------------------------------------------------
  const total = input.rows.reduce((s, r) => s + valueOf(r), 0)
  const byCat = new Map<string, number>()
  for (const r of input.rows) byCat.set(r.category, (byCat.get(r.category) ?? 0) + valueOf(r))
  const cats = [...byCat.entries()].sort((a, b) => b[1] - a[1])
  const topCat = cats[0] ? categoryOf(input.userId, cats[0][0]).name : '—'

  const boxes: [string, string, boolean][] = [
    ['Toplam', money(total), true],
    ['Kayıt sayısı', String(input.rows.length), false],
    ['En büyük kategori', topCat, false],
  ]
  const gap = 10
  const boxW = (width - gap * 2) / 3
  boxes.forEach(([label, value, accent], i) => {
    const numeric = i < 2
    const x = left + i * (boxW + gap)
    doc.lineWidth(2).roundedRect(x, y, boxW, 50, 6).fillAndStroke(accent ? YELLOW : PAPER, INK)
    doc.fillColor(INK).font('semibold').fontSize(8.5).text(label, x + 12, y + 10, { lineBreak: false })
    doc.font(numeric ? 'monoSemibold' : 'semibold').fontSize(14).text(value, x + 12, y + 24, { width: boxW - 24, lineBreak: false, ellipsis: true })
  })
  y += 50 + 26

  // --- Kategoriler -------------------------------------------------------------
  doc.font('bold').fontSize(14).fillColor(INK).text('Kategoriler', left, y)
  y += 24
  const colAmountW = 100
  const colPctW = 44
  const colNameW = 110
  const barX = left + colNameW
  const barMaxW = width - colNameW - colAmountW - colPctW - 24
  const maxCat = cats[0]?.[1] ?? 1
  doc.lineWidth(2).moveTo(left, y).lineTo(left + width, y).stroke(INK)
  y += 6
  if (cats.length === 0) {
    doc.font('regular').fontSize(9).fillColor(MUTED).text('Bu dönemde kayıt yok.', left, y + 4)
    y += 22
  }
  for (const [id, value] of cats) {
    const c = categoryOf(input.userId, id)
    doc.lineWidth(1.5).rect(left, y + 4, 8, 8).fillAndStroke(c.color, INK)
    doc.fillColor(INK).font('regular').fontSize(9).text(c.name, left + 14, y + 3, { lineBreak: false })
    const w = Math.max(4, (value / maxCat) * barMaxW)
    doc.lineWidth(1.5).rect(barX, y + 4, w, 8).fillAndStroke(c.color, INK)
    doc.fillColor(INK).font('mono').fontSize(9).text(money(value), left + width - colAmountW - colPctW, y + 3, {
      width: colAmountW,
      align: 'right',
      lineBreak: false,
    })
    doc.fillColor(MUTED).text(formatPercent((value / total) * 100), left + width - colPctW, y + 3, {
      width: colPctW,
      align: 'right',
      lineBreak: false,
    })
    y += 18
    doc.lineWidth(0.5).moveTo(left, y).lineTo(left + width, y).stroke(RULE)
    y += 2
  }
  y += 22

  // --- Tüm kayıtlar ------------------------------------------------------------
  const cols = foreign
    ? [
        { key: 'date', label: 'Tarih', w: 66, align: 'left' as const },
        { key: 'desc', label: 'Açıklama', w: width - 66 - 82 - 86 - 86, align: 'left' as const },
        { key: 'cat', label: 'Kategori', w: 82, align: 'left' as const },
        { key: 'amt', label: `Tutar (${input.currency})`, w: 86, align: 'right' as const },
        { key: 'orig', label: 'Orijinal (TL)', w: 86, align: 'right' as const },
      ]
    : [
        { key: 'date', label: 'Tarih', w: 70, align: 'left' as const },
        { key: 'desc', label: 'Açıklama', w: width - 70 - 96 - 100, align: 'left' as const },
        { key: 'cat', label: 'Kategori', w: 96, align: 'left' as const },
        { key: 'amt', label: 'Tutar (TL)', w: 100, align: 'right' as const },
      ]

  const drawHeader = () => {
    doc.rect(left, y, width, 20).fill(INK)
    let x = left
    doc.font('semibold').fontSize(8.5).fillColor(PAPER)
    for (const col of cols) {
      doc.text(col.label, x + 6, y + 6, { width: col.w - 12, align: col.align, lineBreak: false })
      x += col.w
    }
    y += 20
  }

  if (y + 60 > bottomLimit()) {
    doc.addPage()
    y = doc.page.margins.top
  }
  doc.font('bold').fontSize(14).fillColor(INK).text('Tüm kayıtlar', left, y)
  y += 24
  drawHeader()

  const rowH = 18
  for (const r of input.rows) {
    if (y + rowH > bottomLimit()) {
      doc.addPage()
      y = doc.page.margins.top
      drawHeader()
    }
    const values: Record<string, string> = {
      date: formatDateTR(r.date),
      desc: r.description,
      cat: categoryOf(input.userId, r.category).name,
      amt: money(valueOf(r)),
      orig: money(r.amount / 100, 'TRY'),
    }
    let x = left
    for (const col of cols) {
      const mono = col.key === 'date' || col.key === 'amt' || col.key === 'orig'
      doc
        .font(mono ? 'mono' : 'regular')
        .fontSize(8.5)
        .fillColor(col.key === 'orig' ? MUTED : INK)
        .text(values[col.key]!, x + 6, y + 5, { width: col.w - 12, height: 11, align: col.align, lineBreak: false, ellipsis: true })
      x += col.w
    }
    y += rowH
    doc.lineWidth(0.5).moveTo(left, y).lineTo(left + width, y).stroke(RULE)
  }
  if (input.rows.length === 0) {
    doc.font('regular').fontSize(9).fillColor(MUTED).text('Bu dönemde kayıt yok.', left + 6, y + 6)
  }

  // --- Sayfa altlığı -----------------------------------------------------------
  const range = doc.bufferedPageRange()
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i)
    const bottom = doc.page.margins.bottom
    doc.page.margins.bottom = 0
    const fy = doc.page.height - 36
    doc.lineWidth(2).moveTo(left, fy - 8).lineTo(left + width, fy - 8).stroke(INK)
    doc.font('regular').fontSize(8).fillColor(MUTED).text('defter. · kişisel gider defteri', left, fy, { lineBreak: false })
    doc.font('mono').text(`Sayfa ${i + 1} / ${range.count}`, left, fy, { width, align: 'right', lineBreak: false })
    doc.page.margins.bottom = bottom
  }

  doc.end()
  return done
}
