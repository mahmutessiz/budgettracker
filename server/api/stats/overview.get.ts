import { desc } from 'drizzle-orm'
import { z } from 'zod'
import { CATEGORIES, type CategoryId } from '#shared/utils/categories'
import { ZERO_MONEY } from '#shared/utils/currency'
import { addMonths, isMonthKey, monthRange, todayISO } from '#shared/utils/dates'
import type { OverviewResponse } from '#shared/types/api'
import { expense } from '../../db/schema'

const OVERVIEW_RANGES = ['3m', '6m', '12m', 'ytd'] as const

const querySchema = z.object({
  range: z.enum(OVERVIEW_RANGES).default('12m'),
  /** İstemcinin yerel saatine göre içinde bulunulan ay */
  month: z.string().refine(isMonthKey, 'Geçersiz ay').default(() => todayISO().slice(0, 7)),
})

export default defineEventHandler(async (event): Promise<OverviewResponse> => {
  const user = await requireUser(event)
  const { range, month } = await getValidatedQuery(event, querySchema.parse)

  const span = range === 'ytd' ? Number(month.slice(5, 7)) : Number.parseInt(range)
  const startMonth = addMonths(month, -(span - 1))
  const from = `${startMonth}-01`
  const to = monthRange(month).to
  const where = expenseWhere(user.id, { from, to })
  const { rates } = await getRates()
  const money = moneySum(rates)

  const agg = db.select({ total: money, count: countRows }).from(expense).where(where).get()!

  const monthRows = db.select({ month: monthOf, total: money }).from(expense).where(where).groupBy(monthOf).all()
  const months = Array.from({ length: span }, (_, i) => {
    const key = addMonths(startMonth, i)
    return { month: key, total: monthRows.find((r) => r.month === key)?.total ?? ZERO_MONEY }
  })

  const byCategory = db
    .select({ category: expense.category, total: money })
    .from(expense)
    .where(where)
    .groupBy(expense.category)
    .orderBy(desc(sumAmount))
    .all()

  const previous = addMonths(month, -1)
  const totalsFor = (key: string) =>
    db
      .select({ category: expense.category, total: money })
      .from(expense)
      .where(expenseWhere(user.id, monthRange(key)))
      .groupBy(expense.category)
      .all()
  const cur = totalsFor(month)
  const prev = totalsFor(previous)
  const rows = CATEGORIES.map((c) => ({
    category: c.id,
    previous: prev.find((r) => r.category === c.id)?.total ?? ZERO_MONEY,
    current: cur.find((r) => r.category === c.id)?.total ?? ZERO_MONEY,
  })).filter((r) => r.previous.TRY > 0 || r.current.TRY > 0)

  return {
    from,
    to,
    months,
    total: agg.total,
    count: agg.count,
    byCategory: byCategory.map((r) => ({ category: r.category as CategoryId, total: r.total })),
    compare: { current: month, previous, rows },
  }
})
