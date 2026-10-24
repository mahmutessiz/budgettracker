import type { SessionUser } from '~/lib/auth-client'

const PUBLIC = new Set(['/giris'])
const PASSWORD_PAGE = '/sifre-degistir'
const ADMIN_PAGE = '/yonetim'

export default defineNuxtRouteMiddleware(async (to) => {
  const user = useState<SessionUser | null>('auth-user', () => null)
  const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined
  const session = await $fetch<{ user: SessionUser } | null>('/api/auth/get-session', { headers }).catch(() => null)
  user.value = session?.user ?? null

  const home = user.value?.role === 'admin' ? ADMIN_PAGE : '/'

  if (PUBLIC.has(to.path)) {
    return user.value ? navigateTo(home) : undefined
  }
  if (!user.value) return navigateTo('/giris')
  if (user.value.mustChangePassword) {
    return to.path === PASSWORD_PAGE ? undefined : navigateTo(PASSWORD_PAGE)
  }
  if (to.path === PASSWORD_PAGE) return
  // Yönetici yalnızca kullanıcı yönetir; harcama ekranları kullanıcılar içindir.
  if (user.value.role === 'admin' && to.path !== ADMIN_PAGE) return navigateTo(ADMIN_PAGE)
  if (user.value.role !== 'admin' && to.path === ADMIN_PAGE) return navigateTo('/')
})
