# defter.

Kişisel gider defteri. Harcamalar Türk lirası olarak girilir; o günün Frankfurter (ECB) kuruyla USD, EUR ve GBP
karşılıkları da kaydedilir. Ekranın sağ altındaki seçiciyle tüm tutarlar bu kayıtlı karşılıklarla gösterilir.
Açık ve koyu tema vardır (kenar çubuğundaki düğme: Sistem → Koyu → Açık). Kayıt sayfası yoktur: hesapları yönetici açar.

**Yığın:** Nuxt 4 · Better Auth (admin eklentisi) · Drizzle ORM · SQLite (better-sqlite3) · pdfkit

## Geliştirme

```bash
cp .env.example .env        # BETTER_AUTH_SECRET ve ADMIN_PASSWORD'ü doldur
npm install
npm run dev                 # http://localhost:5153
```

İlk açılışta veritabanında hiç kullanıcı yoksa `ADMIN_EMAIL` / `ADMIN_PASSWORD` ile yönetici oluşturulur.
Yönetici yalnızca kullanıcı ekler; eklediği kişi geçici şifreyle girer ve ilk girişte şifresini değiştirmek zorundadır.

Şema değişince migration üret:

```bash
npm run db:generate         # server/db/migrations altına yazar; açılışta otomatik uygulanır
```

## Docker / Dokploy

```bash
docker compose up -d --build
```

- Uygulama **5153** portunda çalışır.
- SQLite dosyası `defter-data` adlı volume'da (`/app/data/defter.db`) tutulur; konteyner yeniden kurulsa da veriler kalır.
- Dokploy'da **Compose** servisi olarak bu repoyu bağla ve ortam değişkenlerine şunları gir:

| Değişken | Açıklama |
| --- | --- |
| `BETTER_AUTH_URL` | Uygulamanın dış adresi, ör. `https://defter.alanadin.com` |
| `BETTER_AUTH_SECRET` | `openssl rand -base64 32` çıktısı |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | İlk yönetici (yalnızca veritabanı boşken kullanılır) |
| `ADMIN_NAME` | İsteğe bağlı, varsayılan "Yönetici" |
| `FRANKFURTER_URL` | İsteğe bağlı, varsayılan `https://api.frankfurter.dev/v1` |

Domain'i Dokploy üzerinden bağlıyorsan `ports` satırını kaldırıp yönlendirmeyi Traefik'e bırakabilirsin.

## Kurlar hakkında

Frankfurter, Avrupa Merkez Bankası referans kurlarını kullanır. Bu kurlar iş günlerinde günde bir kez (~16:00 CET)
güncellenir.

- Her harcama kaydedilirken **harcama tarihinin** kuru alınır (bugün için en güncel kur; hafta sonu/tatil için bir
  önceki iş günü) ve USD/EUR/GBP karşılıkları kayda yazılır. Kur sonradan değişse de geçmiş tutarlar değişmez.
- Düzenlemede tarih aynı kalırsa kayıttaki kur korunur; tarih değişirse yeni tarihin kuru alınır.
- Kayıt anında Frankfurter'a ulaşılamazsa kayıt yine alınır; karşılıkları açılışta ve saatte bir, kendi tarihinin
  kuruyla tamamlanır (bu arada geçici olarak güncel kurla yaklaşık gösterilir). Eski kayıtlar da aynı yolla tamamlanır.

## API

Tüm uçlar oturum çerezi ister (mobil uygulama için ileride Better Auth `bearer` eklentisi açılabilir).
Tutarlar küçük birim cinsinden tam sayıdır; özetler `{ TRY, USD, EUR, GBP }` biçiminde döner.

| Uç | Açıklama |
| --- | --- |
| `GET /api/expenses` | `from`, `to`, `category`, `q`, `sort`, `page`, `pageSize` |
| `POST /api/expenses` · `PATCH/DELETE /api/expenses/:id` | Kayıt ekle / düzenle / sil |
| `GET /api/stats/month?month=YYYY-MM` | Panel özeti |
| `GET /api/stats/overview?range=3m\|6m\|12m\|ytd` | İstatistikler |
| `GET /api/rates[?date=YYYY-MM-DD]` | 1 TRY karşılığı USD/EUR/GBP (güncel ya da o günün) |
| `GET /api/export/csv` · `GET /api/export/pdf` | Liste filtreleri + `currency` |
| `GET/POST /api/admin/users` | Yönetici: kullanıcı listesi / ekleme |
