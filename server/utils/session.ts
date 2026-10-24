import type { H3Event } from 'h3'
import { auth } from './auth'

/**
 * Oturumu doğrular. Şifresini değiştirmesi gereken kullanıcı, şifre değişimi
 * dışındaki uçlara erişemez.
 */
export async function requireUser(event: H3Event, opts: { allowPendingPassword?: boolean } = {}) {
  const session = await auth.api.getSession({ headers: event.headers })
  if (!session) throw createError({ statusCode: 401, statusMessage: 'Oturum gerekli' })
  if (session.user.mustChangePassword && !opts.allowPendingPassword) {
    throw createError({ statusCode: 403, statusMessage: 'Önce şifreni değiştirmelisin' })
  }
  return session.user
}

export async function requireAdmin(event: H3Event) {
  const user = await requireUser(event)
  if (user.role !== 'admin') throw createError({ statusCode: 403, statusMessage: 'Yalnızca yönetici' })
  return user
}
