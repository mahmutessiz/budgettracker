import { and, eq } from 'drizzle-orm'
import { expense } from '../../db/schema'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const id = getRouterParam(event, 'id')!
  const body = await readValidatedBody(event, expenseInputSchema(user.id).parse)
  const owned = and(eq(expense.id, id), eq(expense.userId, user.id))

  const existing = db.select().from(expense).where(owned).get()
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Kayıt bulunamadı' })

  // Tarih aynıysa kayıttaki kur korunur; yalnızca tutar yeniden hesaplanır.
  const snap =
    body.date === existing.date && existing.fxDate && existing.fxRates
      ? { fxDate: existing.fxDate, fxRates: existing.fxRates }
      : await snapshotFor(body.date)

  const row = db
    .update(expense)
    .set({ ...body, ...fxColumns(body.amount, snap) })
    .where(owned)
    .returning()
    .get()!
  if (!snap) void backfillMissingFx()
  return toExpenseDTO(row, (await getRates()).rates)
})
