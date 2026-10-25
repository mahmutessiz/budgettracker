import { z } from 'zod'
import { categoryTable } from '../../db/schema'
const input = z.object({ name: z.string().trim().min(1).max(80) })
export default defineEventHandler(async (event) => {
  await requireUser(event)
  const body = await readValidatedBody(event, input.parse)
  const row = db.insert(categoryTable).values({ name: body.name, key: crypto.randomUUID() }).returning().get()!
  setResponseStatus(event, 201)
  return { id: row.key, name: row.name, color: row.color, cssColor: row.cssColor }
})
