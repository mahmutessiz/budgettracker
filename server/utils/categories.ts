import { and, eq } from 'drizzle-orm'
import { categoryTable } from '../db/schema'
import { findCategory, type Category } from '#shared/utils/categories'
import { db } from './db'

export function getCategories(userId: string): Category[] {
  return db.select({ id: categoryTable.key, name: categoryTable.name,
    color: categoryTable.color, cssColor: categoryTable.cssColor, icon: categoryTable.icon,
  }).from(categoryTable).where(eq(categoryTable.userId, userId)).orderBy(categoryTable.id).all()
}
export function categoryExists(userId: string, id: string): boolean {
  return !!db.select({ id: categoryTable.id }).from(categoryTable).where(and(eq(categoryTable.userId, userId), eq(categoryTable.key, id))).get()
}
export function categoryOf(userId: string, id: string): Category {
  return findCategory(getCategories(userId), id)
}
