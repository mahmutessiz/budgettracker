import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { user } from '../../db/schema'

const bodySchema = z.object({
  name: z.string().trim().min(1, 'Ad gerekli').max(80),
  email: z.email('Geçerli bir e-posta gir').trim().toLowerCase(),
  password: z.string().min(8, 'Şifre en az 8 karakter olmalı').max(128),
})

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readValidatedBody(event, bodySchema.parse)

  const exists = db.select({ id: user.id }).from(user).where(eq(user.email, body.email)).get()
  if (exists) throw createError({ statusCode: 409, statusMessage: 'Bu e-posta ile bir hesap zaten var' })

  const created = await auth.api.createUser({
    body: { email: body.email, password: body.password, name: body.name, role: 'user' },
    headers: event.headers,
  })
  // Geçici şifre: ilk girişte değiştirilecek.
  db.update(user).set({ mustChangePassword: true }).where(eq(user.id, created.user.id)).run()

  setResponseStatus(event, 201)
  return { id: created.user.id, name: created.user.name, email: created.user.email }
})
