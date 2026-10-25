import { expense } from '../../db/schema'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const body = await readValidatedBody(event, expenseInputSchema(user.id).parse)
  // Kayıt anının kuru saklanır; kur alınamazsa arka planda tamamlanır.
  const snap = await snapshotFor(body.date)
  const row = db
    .insert(expense)
    .values({ ...body, ...fxColumns(body.amount, snap), userId: user.id })
    .returning()
    .get()
  if (!snap) void backfillMissingFx()
  setResponseStatus(event, 201)
  return toExpenseDTO(row, (await getRates()).rates)
})
