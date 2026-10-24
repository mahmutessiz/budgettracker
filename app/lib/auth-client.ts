import { adminClient, inferAdditionalFields } from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/vue'
import type { auth } from '~~/server/utils/auth'

export const authClient = createAuthClient({
  plugins: [adminClient(), inferAdditionalFields<typeof auth>()],
})

export type SessionUser = typeof authClient.$Infer.Session.user
