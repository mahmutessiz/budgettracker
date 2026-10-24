import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { user } from '../../db/schema'

const bodySchema = z.object({
  currentPassword: z.string().min(1, 'Mevcut şifre gerekli'),
  newPassword: z.string().min(8, 'Yeni şifre en az 8 karakter olmalı').max(128),
})

export default defineEventHandler(async (event) => {
  const current = await requireUser(event, { allowPendingPassword: true })
  const body = await readValidatedBody(event, bodySchema.parse)
  if (body.currentPassword === body.newPassword) {
    throw createError({ statusCode: 400, statusMessage: 'Yeni şifre eskisiyle aynı olamaz' })
  }
  try {
    await auth.api.changePassword({ body: { ...body, revokeOtherSessions: false }, headers: event.headers })
  } catch {
    throw createError({ statusCode: 400, statusMessage: 'Mevcut şifre yanlış' })
  }
  db.update(user).set({ mustChangePassword: false }).where(eq(user.id, current.id)).run()
  return { ok: true }
})
