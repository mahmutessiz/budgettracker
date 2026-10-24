/** $fetch hatasından kullanıcıya gösterilecek Türkçe mesajı çıkarır. */
export function apiErrorMessage(error: unknown, fallback = 'Bir şeyler ters gitti, tekrar dene.'): string {
  const e = error as { data?: { statusMessage?: string }; statusMessage?: string }
  const message = e?.data?.statusMessage ?? e?.statusMessage
  // Sunucu doğrulama hataları İngilizce gelir; istemci zaten aynı kuralları kontrol ediyor.
  return message && message !== 'Validation Error' ? message : fallback
}
