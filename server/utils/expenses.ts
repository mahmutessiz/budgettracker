import { and, asc, desc, eq, gte, lte, or, sql, type SQL } from 'drizzle-orm'
import { z } from 'zod'
import { MAX_AMOUNT_MINOR } from '#shared/utils/amount'
import type { CategoryId } from '#shared/utils/categories'
import { categoryExists } from './categories'
import { isCurrencyCode, type RatesPayload } from '#shared/utils/currency'
import { isISODate } from '#shared/utils/dates'
import type { ExpenseDTO } from '#shared/types/api'
import { expense } from '../db/schema'
import { convertWith } from './fx'

const isoDate = z.string().refine(isISODate, 'Geçersiz tarih')

export const expenseInputSchema = z.object({
  amount: z.number().int().positive().max(MAX_AMOUNT_MINOR),
  date: isoDate,
  category: z.string().min(1).refine(categoryExists, 'Invalid category'),
  description: z.string().trim().min(1, 'Açıklama gerekli').max(120),
  note: z
    .string()
    .trim()
    .max(500)
    .nullish()
    .transform((v) => v || null),
})

export const SORTS = ['new', 'old', 'amount_desc', 'amount_asc'] as const

export const expenseFilterSchema = z.object({
  from: isoDate.optional(),
  to: isoDate.optional(),
  category: z.string().min(1).refine(categoryExists, 'Invalid category').optional(),
  q: z.string().trim().max(100).optional(),
  sort: z.enum(SORTS).default('new'),
})

export const listQuerySchema = expenseFilterSchema.extend({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
})

export const exportQuerySchema = expenseFilterSchema.extend({
  currency: z.string().refine(isCurrencyCode).default('TRY'),
})

export type ExpenseFilters = z.infer<typeof expenseFilterSchema>

export function expenseWhere(userId: string, f: Partial<ExpenseFilters>): SQL {
  const conditions: (SQL | undefined)[] = [eq(expense.userId, userId)]
  if (f.from) conditions.push(gte(expense.date, f.from))
  if (f.to) conditions.push(lte(expense.date, f.to))
  if (f.category) conditions.push(eq(expense.category, f.category))
  if (f.q) {
    const pattern = `%${f.q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`
    conditions.push(
      or(
        sql`${expense.description} LIKE ${pattern} ESCAPE '\\'`,
        sql`${expense.note} LIKE ${pattern} ESCAPE '\\'`,
      ),
    )
  }
  return and(...conditions)!
}

export function expenseOrder(sort: (typeof SORTS)[number]) {
  switch (sort) {
    case 'old':
      return [asc(expense.date), asc(expense.createdAt)]
    case 'amount_desc':
      return [desc(expense.amount), desc(expense.date)]
    case 'amount_asc':
      return [asc(expense.amount), desc(expense.date)]
    default:
      return [desc(expense.date), desc(expense.createdAt)]
  }
}

/** `current`: kuru henüz tamamlanmamış kayıtlar için geçici yaklaşık değer */
export function toExpenseDTO(row: typeof expense.$inferSelect, current: RatesPayload['rates']): ExpenseDTO {
  return {
    id: row.id,
    amount: row.amount,
    amounts: {
      TRY: row.amount,
      USD: row.amountUsd ?? convertWith(row.amount, current.USD),
      EUR: row.amountEur ?? convertWith(row.amount, current.EUR),
      GBP: row.amountGbp ?? convertWith(row.amount, current.GBP),
    },
    date: row.date,
    category: row.category as CategoryId,
    description: row.description,
    note: row.note,
    fxDate: row.fxDate,
    fxRates: row.fxRates ?? null,
  }
}

/** Kuruş toplamı; sıralama için. Para birimli toplamlar: moneySum() */
export const sumAmount = sql<number>`coalesce(sum(${expense.amount}), 0)`
export const countRows = sql<number>`count(*)`
export const monthOf = sql<string>`substr(${expense.date}, 1, 7)`
