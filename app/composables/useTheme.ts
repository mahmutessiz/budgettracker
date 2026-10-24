export type ThemePref = 'system' | 'light' | 'dark'

const ORDER: ThemePref[] = ['system', 'dark', 'light']
const LABELS: Record<ThemePref, string> = { system: 'Sistem', light: 'Açık', dark: 'Koyu' }

/** Tema tercihi çerezde tutulur; sunucu render'ı doğru temayla gelir, yanıp sönme olmaz. */
export function useTheme() {
  const pref = useCookie<ThemePref>('defter-theme', {
    default: () => 'system',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  })
  const current = computed<ThemePref>(() => (ORDER.includes(pref.value) ? pref.value : 'system'))

  function cycle() {
    pref.value = ORDER[(ORDER.indexOf(current.value) + 1) % ORDER.length]!
  }

  return { pref: current, label: computed(() => LABELS[current.value]), cycle, set: (p: ThemePref) => (pref.value = p) }
}
