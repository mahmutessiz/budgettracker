import { asc } from 'drizzle-orm'
import type { AdminUserDTO } from '#shared/types/api'
import { user } from '../../db/schema'

export default defineEventHandler(async (event): Promise<AdminUserDTO[]> => {
  await requireAdmin(event)
  return db
    .select()
    .from(user)
    .orderBy(asc(user.createdAt))
    .all()
    .map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role ?? 'user',
      createdAt: u.createdAt.toISOString(),
      lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
      mustChangePassword: u.mustChangePassword,
    }))
})
