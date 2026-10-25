import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { categoryTable } from '../../../db/schema'

const input = z.object({ name: z.string().trim().min(1).max(80) })

export default defineEventHandler(async (event) => {
  await requireUser(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Category ID is required' })
  const body = await readValidatedBody(event, input.parse)
  const row = db.update(categoryTable).set({ name: body.name })
    .where(eq(categoryTable.key, id)).returning().get()
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Category not found' })

  return { id: row.key, name: row.name, color: row.color, cssColor: row.cssColor }
})
