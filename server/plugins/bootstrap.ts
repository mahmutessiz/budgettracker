import { resolve } from 'node:path'
import { sql } from 'drizzle-orm'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { user } from '../db/schema'

/** Açılışta şemayı günceller; hiç kullanıcı yoksa .env'deki yöneticiyi oluşturur. */
export default defineNitroPlugin(async () => {
  migrate(db, { migrationsFolder: resolve(process.env.MIGRATIONS_DIR || 'server/db/migrations') })
  // Kur önbelleğini ısıt; ilk ziyaretçi beklemesin.
  void getRates()
  // Kuru olmayan kayıtları (eski veriler, kur alınamadan girilenler) kendi tarihlerinin kuruyla tamamla.
  void backfillMissingFx()
  setInterval(() => void backfillMissingFx(), 60 * 60 * 1000).unref()

  const { n } = db.select({ n: sql<number>`count(*)` }).from(user).get()!
  if (n > 0) return

  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase()
  const password = process.env.ADMIN_PASSWORD
  if (!email || !password) {
    console.warn('[bootstrap] Kullanıcı yok ve ADMIN_EMAIL / ADMIN_PASSWORD tanımlı değil; giriş yapılamaz.')
    return
  }
  if (password.length < 8) {
    console.warn('[bootstrap] ADMIN_PASSWORD en az 8 karakter olmalı; yönetici oluşturulmadı.')
    return
  }

  const ctx = await auth.$context
  const admin = await ctx.internalAdapter.createUser({
    email,
    name: process.env.ADMIN_NAME?.trim() || 'Yönetici',
    emailVerified: true,
    role: 'admin',
  }, { method: 'admin' })
  await ctx.internalAdapter.linkAccount({
    userId: admin.id,
    providerId: 'credential',
    accountId: admin.id,
    password: await ctx.password.hash(password),
  })
  console.info(`[bootstrap] Yönetici oluşturuldu: ${email}`)
})
