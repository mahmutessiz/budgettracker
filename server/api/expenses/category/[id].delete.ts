import { eq } from 'drizzle-orm'
import { categoryTable, expense } from '../../../db/schema'

export default defineEventHandler(async (event) => {
  await requireUser(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Category ID is required' })

  db.transaction((tx) => {
    const category = tx.select().from(categoryTable).where(eq(categoryTable.key, id)).get()
    if (!category) throw createError({ statusCode: 404, statusMessage: 'Category not found' })
    const used = tx.select({ id: expense.id }).from(expense).where(eq(expense.category, id)).get()
    if (used) {
      throw createError({ statusCode: 409, statusMessage: 'Category is used by expenses' })
    }
    tx.delete(categoryTable).where(eq(categoryTable.key, id)).run()
  })

  setResponseStatus(event, 204)
  return null
})
