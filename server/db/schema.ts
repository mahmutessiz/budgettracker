import { sql } from 'drizzle-orm'
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

const timestamps = {
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .$onUpdate(() => new Date())
    .notNull(),
}

// --- Better Auth (core + admin eklentisi) ---------------------------------

export const user = sqliteTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: integer('email_verified', { mode: 'boolean' }).default(false).notNull(),
  image: text('image'),
  role: text('role'),
  banned: integer('banned', { mode: 'boolean' }).default(false),
  banReason: text('ban_reason'),
  banExpires: integer('ban_expires', { mode: 'timestamp_ms' }),
  mustChangePassword: integer('must_change_password', { mode: 'boolean' }).default(false).notNull(),
  lastLoginAt: integer('last_login_at', { mode: 'timestamp_ms' }),
  ...timestamps,
})

export const session = sqliteTable(
  'session',
  {
    id: text('id').primaryKey(),
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
    token: text('token').notNull().unique(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    impersonatedBy: text('impersonated_by'),
    ...timestamps,
  },
  (t) => [index('session_user_id_idx').on(t.userId)],
)

export const account = sqliteTable(
  'account',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: integer('access_token_expires_at', { mode: 'timestamp_ms' }),
    refreshTokenExpiresAt: integer('refresh_token_expires_at', { mode: 'timestamp_ms' }),
    scope: text('scope'),
    password: text('password'),
    ...timestamps,
  },
  (t) => [index('account_user_id_idx').on(t.userId)],
)

export const verification = sqliteTable(
  'verification',
  {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
    ...timestamps,
  },
  (t) => [index('verification_identifier_idx').on(t.identifier)],
)

// --- Uygulama ---------------------------------------------------------------

export const expense = sqliteTable(
  'expense',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    /** kuruş */
    amount: integer('amount').notNull(),
    /** YYYY-MM-DD */
    date: text('date').notNull(),
    category: text('category').notNull(),
    description: text('description').notNull(),
    note: text('note'),
    /**
     * Kayıt anındaki döviz karşılıkları (sent / cent / pence). Sonradan kur
     * değişse de bunlar sabit kalır; geçmiş veriler güncel kura çevrilmez.
     */
    amountUsd: integer('amount_usd'),
    amountEur: integer('amount_eur'),
    amountGbp: integer('amount_gbp'),
    /** Kullanılan ECB kurunun tarihi ve değerleri (1 TRY = fxRates[kod]) */
    fxDate: text('fx_date'),
    fxRates: text('fx_rates', { mode: 'json' }).$type<Partial<Record<string, number>>>(),
    ...timestamps,
  },
  (t) => [index('expense_user_date_idx').on(t.userId, t.date), index('expense_fx_date_idx').on(t.fxDate)],
)

export const categoryTable = sqliteTable('categories', {
  id: integer('id').primaryKey(),
  name: text('name').notNull(),
  key: text('key').notNull().unique(),
  color: text('color').notNull().default('#8A8578'),
  cssColor: text('css_color').notNull().default('var(--cat-diger)'),
  icon: text('icon').$type<import('../../shared/utils/categories').CategoryIcon>().notNull().default('tag'),
})

/** Frankfurter son başarılı yanıtı; API'ye ulaşılamazsa bu kullanılır. */
export const exchangeRate = sqliteTable('exchange_rate', {
  base: text('base').primaryKey(),
  date: text('date').notNull(),
  rates: text('rates', { mode: 'json' }).$type<Record<string, number>>().notNull(),
  fetchedAt: integer('fetched_at', { mode: 'timestamp_ms' }).notNull(),
})
