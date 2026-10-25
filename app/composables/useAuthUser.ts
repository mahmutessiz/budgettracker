import { authClient, type SessionUser } from '~/lib/auth-client'

export function useAuthUser() {
  const user = useState<SessionUser | null>('auth-user', () => null)

  async function signOut() {
    await authClient.signOut()
    user.value = null
    clearNuxtData('categories')
    await navigateTo('/giris')
  }

  return { user, signOut }
}
