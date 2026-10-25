import { categoryTable } from '../db/schema'
import { db } from './db'
import type { Category } from '#shared/utils/categories'

const defaults: Category[] = [
  { id: 'kira', name: 'Kira & Ev', color: '#2F4BFF', cssColor: 'var(--cat-kira)', icon: 'home' },
  { id: 'market', name: 'Market', color: '#E8590C', cssColor: 'var(--cat-market)', icon: 'cart' },
  { id: 'fatura', name: 'Faturalar', color: '#8B3FD9', cssColor: 'var(--cat-fatura)', icon: 'receipt' },
  { id: 'ulasim', name: 'Ulaşım', color: '#0A8754', cssColor: 'var(--cat-ulasim)', icon: 'car' },
  { id: 'eglence', name: 'Eğlence', color: '#C98F00', cssColor: 'var(--cat-eglence)', icon: 'music' },
  { id: 'saglik', name: 'Sağlık', color: '#D13B83', cssColor: 'var(--cat-saglik)', icon: 'heart' },
  { id: 'diger', name: 'Diğer', color: '#8A8578', cssColor: 'var(--cat-diger)', icon: 'tag' },
]

export function createDefaultCategories(userId: string) {
  db.insert(categoryTable).values(defaults.map(({ id, ...category }) => ({
    ...category, key: id, userId,
  }))).onConflictDoNothing().run()
}
