import { categoryInputSchema } from '../../utils/category-input'
import { categoryTable } from '../../db/schema'
export default defineEventHandler(async (event) => {
  await requireUser(event)
  const body = await readValidatedBody(event, categoryInputSchema.parse)
  const row = db.insert(categoryTable).values({ ...body, cssColor: body.color ?? 'var(--cat-diger)', key: crypto.randomUUID() }).returning().get()!
  setResponseStatus(event, 201)
  return { id: row.key, name: row.name, color: row.color, cssColor: row.cssColor, icon: row.icon }
})
