import { and, eq } from 'drizzle-orm'
import { categoryTable, expense } from '../../../db/schema'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Category ID is required' })

  db.transaction((tx) => {
    const category = tx.select().from(categoryTable).where(and(eq(categoryTable.userId, user.id), eq(categoryTable.key, id))).get()
    if (!category) throw createError({ statusCode: 404, statusMessage: 'Category not found' })
    const used = tx.select({ id: expense.id }).from(expense).where(and(eq(expense.userId, user.id), eq(expense.category, id))).get()
    if (used) {
      throw createError({ statusCode: 409, statusMessage: 'Category is used by expenses' })
    }
    tx.delete(categoryTable).where(and(eq(categoryTable.userId, user.id), eq(categoryTable.key, id))).run()
  })

  setResponseStatus(event, 204)
  return null
})
