import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { admin } from 'better-auth/plugins'
import { eq } from 'drizzle-orm'
import * as schema from '../db/schema'
import { db } from './db'

const baseURL = (process.env.BETTER_AUTH_URL || 'http://localhost:5153').trim()
const trustedProxies = process.env.BETTER_AUTH_TRUSTED_PROXIES?.split(',').map(ip => ip.trim()).filter(Boolean)

export const auth = betterAuth({
  appName: 'defter.',
  baseURL,
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins: [new URL(baseURL).origin],
  advanced: {
    ipAddress: {
      ...(trustedProxies?.length ? { trustedProxies } : {}),
    },
  },
  database: drizzleAdapter(db, { provider: 'sqlite', schema }),
  emailAndPassword: {
    enabled: true,
    // Hesapları yalnızca yönetici açar.
    disableSignUp: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
  },
  user: {
    additionalFields: {
      mustChangePassword: { type: 'boolean', defaultValue: false, input: false },
      lastLoginAt: { type: 'date', required: false, input: false },
    },
  },
  databaseHooks: {
    session: {
      create: {
        after: async (s) => {
          db.update(schema.user).set({ lastLoginAt: new Date() }).where(eq(schema.user.id, s.userId)).run()
        },
      },
    },
  },
  plugins: [admin({ defaultRole: 'user', adminRoles: ['admin'] })],
})

export type AuthUser = typeof auth.$Infer.Session.user
