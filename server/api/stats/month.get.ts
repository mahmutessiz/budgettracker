import { and, desc, eq } from 'drizzle-orm'
import { z } from 'zod'
import type { CategoryId } from '#shared/utils/categories'
import { ZERO_MONEY } from '#shared/utils/currency'
import { addMonths, isMonthKey, monthRange, todayISO } from '#shared/utils/dates'
import type { MonthSummary } from '#shared/types/api'
import { expense } from '../../db/schema'

const querySchema = z.object({
  month: z.string().refine(isMonthKey, 'Geçersiz ay').default(() => todayISO().slice(0, 7)),
})

const TREND_MONTHS = 6

export default defineEventHandler(async (event): Promise<MonthSummary> => {
  const user = await requireUser(event)
  const { month } = await getValidatedQuery(event, querySchema.parse)
  const range = monthRange(month)
  const where = expenseWhere(user.id, range)
  const { rates } = await getRates()
  const money = moneySum(rates)

  const agg = db.select({ total: money, count: countRows }).from(expense).where(where).get()!
  const prev = db
    .select({ total: money })
    .from(expense)
    .where(expenseWhere(user.id, monthRange(addMonths(month, -1))))
    .get()!

  const byCategory = db
    .select({ category: expense.category, total: money })
    .from(expense)
    .where(where)
    .groupBy(expense.category)
    .orderBy(desc(sumAmount))
    .all()

  const trendStart = addMonths(month, -(TREND_MONTHS - 1))
  const trendRows = db
    .select({ month: monthOf, total: money })
    .from(expense)
    .where(expenseWhere(user.id, { from: `${trendStart}-01`, to: range.to }))
    .groupBy(monthOf)
    .all()
  const trend = Array.from({ length: TREND_MONTHS }, (_, i) => {
    const key = addMonths(trendStart, i)
    return { month: key, total: trendRows.find((r) => r.month === key)?.total ?? ZERO_MONEY }
  })

  const recent = db
    .select()
    .from(expense)
    .where(where)
    .orderBy(desc(expense.date), desc(expense.createdAt))
    .limit(5)
    .all()

  const top = db
    .select({ date: expense.date, total: sumAmount })
    .from(expense)
    .where(where)
    .groupBy(expense.date)
    .orderBy(desc(sumAmount))
    .limit(1)
    .get()
  const topExpense = top
    ? db
        .select({ description: expense.description })
        .from(expense)
        .where(and(eq(expense.userId, user.id), eq(expense.date, top.date)))
        .orderBy(desc(expense.amount))
        .limit(1)
        .get()
    : undefined

  return {
    month,
    total: agg.total,
    count: agg.count,
    prevTotal: prev.total,
    byCategory: byCategory.map((r) => ({ category: r.category as CategoryId, total: r.total })),
    trend,
    recent: recent.map((r) => toExpenseDTO(r, rates)),
    topDay: top ? { date: top.date, description: topExpense?.description ?? '' } : null,
  }
})
