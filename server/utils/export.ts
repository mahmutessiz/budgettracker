import type { H3Event } from 'h3'
import { categoryOf } from './categories'
import type { CurrencyCode } from '#shared/utils/currency'
import { formatRange } from '#shared/utils/dates'
import { expense } from '../db/schema'

/** Dışa aktarma uçlarının ortak kısmı: filtrele, kur al, dosya adı üret. */
export async function loadExport(event: H3Event) {
  const user = await requireUser(event)
  const q = await getValidatedQuery(event, exportQuerySchema.parse)
  const currency = q.currency as CurrencyCode

  const { rates } = await getRates()
  const rows = db
    .select()
    .from(expense)
    .where(expenseWhere(user.id, q))
    .orderBy(...expenseOrder(q.sort))
    .all()
    .map((r) => toExpenseDTO(r, rates))

  if (rows.some((r) => r.amounts[currency] === null)) {
    throw createError({ statusCode: 503, statusMessage: 'Bazı kayıtların kuru henüz alınamadı, TRY ile dene' })
  }

  const periodLabel =
    q.from && q.to ? formatRange(q.from, q.to) : q.from ? `${q.from} sonrası` : q.to ? `${q.to} öncesi` : 'Tüm kayıtlar'
  const filterParts = [q.category ? categoryOf(q.category).name : 'Tüm kategoriler']
  if (q.q) filterParts.push(`“${q.q}”`)

  const fileStem = `defter-${q.from ?? 'baslangic'}_${q.to ?? 'bugun'}${currency === 'TRY' ? '' : `-${currency}`}`

  return { user, rows, currency, periodLabel, filterLabel: filterParts.join(' · '), fileStem }
}
