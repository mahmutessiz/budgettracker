import type { ExpenseListResponse } from '#shared/types/api'
import { expense } from '../../db/schema'

export default defineEventHandler(async (event): Promise<ExpenseListResponse> => {
  const user = await requireUser(event)
  const q = await getValidatedQuery(event, listQuerySchema(user.id).parse)
  const where = expenseWhere(user.id, q)
  const { rates } = await getRates()

  const agg = db.select({ count: countRows, sum: moneySum(rates) }).from(expense).where(where).get()!
  const rows = db
    .select()
    .from(expense)
    .where(where)
    .orderBy(...expenseOrder(q.sort))
    .limit(q.pageSize)
    .offset((q.page - 1) * q.pageSize)
    .all()

  return {
    items: rows.map((r) => toExpenseDTO(r, rates)),
    count: agg.count,
    sum: agg.sum,
    page: q.page,
    pageSize: q.pageSize,
  }
})
