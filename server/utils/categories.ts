import { eq } from 'drizzle-orm'
import { categoryTable } from '../db/schema'
import { findCategory, type Category } from '#shared/utils/categories'
import { db } from './db'

export function getCategories(): Category[] {
  return db.select({ id: categoryTable.key, name: categoryTable.name,
    color: categoryTable.color, cssColor: categoryTable.cssColor,
  }).from(categoryTable).orderBy(categoryTable.id).all()
}
export function categoryExists(id: string): boolean {
  return !!db.select({ id: categoryTable.id }).from(categoryTable).where(eq(categoryTable.key, id)).get()
}
export function categoryOf(id: string): Category {
  return findCategory(getCategories(), id)
}
