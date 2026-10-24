import { sql } from 'drizzle-orm'

export default defineEventHandler(() => {
  db.get(sql`select 1`)
  return { ok: true }
})
