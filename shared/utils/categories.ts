export type CategoryId = string
export const CATEGORY_ICONS = ['tag', 'home', 'cart', 'receipt', 'car', 'music', 'heart', 'gift', 'book', 'coffee'] as const
export type CategoryIcon = (typeof CATEGORY_ICONS)[number]
export interface Category {
  id: CategoryId
  name: string
  color: string
  cssColor: string
  icon: CategoryIcon
}
export function findCategory(categories: Category[], id: string): Category {
  return categories.find((c) => c.id === id)
    ?? { id, name: id, color: '#8A8578', cssColor: 'var(--cat-diger)', icon: 'tag' }
}
