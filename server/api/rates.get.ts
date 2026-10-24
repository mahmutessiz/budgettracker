import { z } from 'zod'
import { isISODate } from '#shared/utils/dates'

const querySchema = z.object({ date: z.string().refine(isISODate).optional() })

/** Güncel kur; `?date=` ile o günün kuru (harcama formundaki önizleme için). */
export default defineEventHandler(async (event) => {
  await requireUser(event, { allowPendingPassword: true })
  const { date } = await getValidatedQuery(event, querySchema.parse)
  if (!date) return getRates()
  const rates = await getRatesForDate(date)
  if (!rates) throw createError({ statusCode: 503, statusMessage: 'Bu tarihin kuru alınamadı' })
  return rates
})
