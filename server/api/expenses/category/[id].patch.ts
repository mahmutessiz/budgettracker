import { eq } from 'drizzle-orm'
import { categoryInputSchema } from '../../../utils/category-input'
import { categoryTable } from '../../../db/schema'


export default defineEventHandler(async (event) => {
  await requireUser(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Category ID is required' })
  const body = await readValidatedBody(event, categoryInputSchema.parse)
  const row = db.update(categoryTable).set({ ...body, ...(body.color ? { cssColor: body.color } : {}) })
    .where(eq(categoryTable.key, id)).returning().get()
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Category not found' })

  return { id: row.key, name: row.name, color: row.color, cssColor: row.cssColor, icon: row.icon }
})
