import { z } from 'zod'
import { CATEGORY_ICONS } from '#shared/utils/categories'

export const categoryInputSchema = z.object({
  name: z.string().trim().min(1).max(80),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  icon: z.enum(CATEGORY_ICONS).optional(),
})
