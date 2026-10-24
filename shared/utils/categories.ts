// Renkler renk körlüğü doğrulayıcısından açık ve koyu zemin için ayrı ayrı geçti;
// sıra ve eşleşme sabit kalmalı. Arayüz `cssColor` kullanır (tema değişince açılır),
// `color` açık tema değeridir (PDF gibi temasız çıktılar için).
export const CATEGORIES = [
  { id: 'kira', name: 'Kira & Ev', color: '#2F4BFF', cssColor: 'var(--cat-kira)' },
  { id: 'market', name: 'Market', color: '#E8590C', cssColor: 'var(--cat-market)' },
  { id: 'fatura', name: 'Faturalar', color: '#8B3FD9', cssColor: 'var(--cat-fatura)' },
  { id: 'ulasim', name: 'Ulaşım', color: '#0A8754', cssColor: 'var(--cat-ulasim)' },
  { id: 'eglence', name: 'Eğlence', color: '#C98F00', cssColor: 'var(--cat-eglence)' },
  { id: 'saglik', name: 'Sağlık', color: '#D13B83', cssColor: 'var(--cat-saglik)' },
  { id: 'diger', name: 'Diğer', color: '#8A8578', cssColor: 'var(--cat-diger)' },
] as const

export type Category = (typeof CATEGORIES)[number]
export type CategoryId = Category['id']

export const CATEGORY_IDS = CATEGORIES.map((c) => c.id) as [CategoryId, ...CategoryId[]]

export function isCategoryId(value: unknown): value is CategoryId {
  return typeof value === 'string' && CATEGORY_IDS.includes(value as CategoryId)
}

export function categoryOf(id: string): Category {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1]!
}
