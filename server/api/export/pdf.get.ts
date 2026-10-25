export default defineEventHandler(async (event) => {
  const { user, rows, currency, periodLabel, filterLabel, fileStem } = await loadExport(event)
  const pdf = await renderReportPdf({
    userId: user.id,
    userName: user.name,
    periodLabel,
    filterLabel,
    currency,
    rows,
    generatedAt: new Date(),
  })
  setResponseHeaders(event, {
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="${fileStem}.pdf"`,
    'Cache-Control': 'no-store',
  })
  return pdf
})
