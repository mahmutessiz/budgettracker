export type CategoryId = string
export interface Category {
  id: CategoryId
  name: string
  color: string
  cssColor: string
}
export function findCategory(categories: Category[], id: string): Category {
  return categories.find((c) => c.id === id)
    ?? { id, name: id, color: '#8A8578', cssColor: 'var(--cat-diger)' }
}
