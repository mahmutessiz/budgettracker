import { findCategory, type Category } from '#shared/utils/categories'
export function useCategories() {
  const { data } = useNuxtData<Category[]>('categories')
  const categories = computed(() => data.value ?? [])
  const categoryOf = (id: string) => findCategory(categories.value, id)
  const isCategoryId = (id: unknown): id is string =>
    typeof id === 'string' && categories.value.some((c) => c.id === id)
  return { categories, categoryOf, isCategoryId }
}
