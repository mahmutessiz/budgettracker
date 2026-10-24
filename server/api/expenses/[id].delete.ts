import { and, eq } from 'drizzle-orm'
import { expense } from '../../db/schema'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const id = getRouterParam(event, 'id')!
  const row = db
    .delete(expense)
    .where(and(eq(expense.id, id), eq(expense.userId, user.id)))
    .returning()
    .get()
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Kayıt bulunamadı' })
  return toExpenseDTO(row, (await getRates()).rates)
})
