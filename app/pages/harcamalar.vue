<script setup lang="ts">
const { categories, isCategoryId } = useCategories()
import type { ExpenseDTO, ExpenseListResponse } from '#shared/types/api'
import type { PeriodId } from '#shared/utils/dates'

useHead({ title: 'Harcamalar — defter.' })

const route = useRoute()
const money = useMoney()
const toast = useToast()
const { openNew, openEdit } = useExpenseModal()

const SORT_OPTIONS = [
  { id: 'new', label: 'En yeni önce' },
  { id: 'old', label: 'En eski önce' },
  { id: 'amount_desc', label: 'Tutar: yüksekten düşüğe' },
  { id: 'amount_asc', label: 'Tutar: düşükten yükseğe' },
] as const
type SortId = (typeof SORT_OPTIONS)[number]['id']

const str = (v: unknown) => (typeof v === 'string' ? v : undefined)

// Filtreler adres çubuğunda tutulur; sayfa yenilenince ya da paylaşılınca korunur.
const period = computed<PeriodId>(() => (isPeriodId(route.query.donem) ? route.query.donem : 'bu-ay'))
const customFrom = computed(() => (isISODate(route.query.bas) ? route.query.bas : monthRange(todayISO().slice(0, 7)).from))
const customTo = computed(() => (isISODate(route.query.bit) ? route.query.bit : todayISO()))
const category = computed(() => (isCategoryId(route.query.kategori) ? route.query.kategori : ''))
const sort = computed<SortId>(() => SORT_OPTIONS.find((s) => s.id === route.query.sirala)?.id ?? 'new')
const page = computed(() => Math.max(1, Number.parseInt(str(route.query.sayfa) ?? '1') || 1))
const search = ref(str(route.query.q) ?? '')

const range = computed(() => periodRange(period.value) ?? { from: customFrom.value, to: customTo.value })

const filters = computed(() => ({
  from: range.value.from,
  to: range.value.to,
  category: category.value || undefined,
  q: str(route.query.q) || undefined,
  sort: sort.value,
}))

const { data, status, refresh } = await useFetch<ExpenseListResponse>('/api/expenses', {
  query: computed(() => ({ ...filters.value, page: page.value, pageSize: 10 })),
})

function setQuery(patch: Record<string, string | undefined>) {
  const next: Record<string, string> = {}
  for (const [k, v] of Object.entries({ ...route.query, ...patch })) {
    if (typeof v === 'string' && v !== '') next[k] = v
  }
  // Filtre değişince ilk sayfaya dön
  if (!('sayfa' in patch)) delete next.sayfa
  return navigateTo({ query: next }, { replace: true })
}

let searchTimer: ReturnType<typeof setTimeout> | undefined
watch(search, (value) => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => setQuery({ q: value.trim() || undefined }), 300)
})

const pageCount = computed(() => Math.max(1, Math.ceil((data.value?.count ?? 0) / 10)))
const firstIndex = computed(() => (data.value?.count ? (page.value - 1) * 10 + 1 : 0))
const lastIndex = computed(() => Math.min(page.value * 10, data.value?.count ?? 0))
const pages = computed(() => {
  const total = pageCount.value
  const start = Math.max(1, Math.min(page.value - 2, total - 4))
  return Array.from({ length: Math.min(5, total) }, (_, i) => start + i)
})

function exportUrl(kind: 'csv' | 'pdf') {
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(filters.value)) if (v) params.set(k, String(v))
  params.set('currency', money.currency.value)
  return `/api/export/${kind}?${params}`
}

async function remove(e: ExpenseDTO) {
  try {
    await $fetch(`/api/expenses/${e.id}`, { method: 'DELETE' })
    await refresh()
    toast.show(`“${e.description}” silindi`, {
      actionLabel: 'Geri al',
      action: async () => {
        await $fetch('/api/expenses', {
          method: 'POST',
          body: { amount: e.amount, date: e.date, category: e.category, description: e.description, note: e.note },
        })
        await refresh()
      },
    })
  } catch (error) {
    toast.show(apiErrorMessage(error, 'Silinemedi, tekrar dene.'), { tone: 'error' })
  }
}
</script>

<template>
  <div class="page">
    <header class="top">
      <h1 class="page-title">Harcamalar</h1>
      <div class="top-actions">
        <a class="btn" :href="exportUrl('csv')" download>
          <AppIcon name="download" />
          CSV indir · {{ money.currency.value }}
        </a>
        <a class="btn" :href="exportUrl('pdf')" download>
          <AppIcon name="download" />
          PDF indir · {{ money.currency.value }}
        </a>
        <button type="button" class="btn btn--primary" @click="openNew">
          <AppIcon name="plus" :stroke="3" />
          Harcama ekle
        </button>
      </div>
    </header>

    <section aria-label="Filtreler" class="card filters">
      <div class="filter-row">
        <span class="filter-label">Dönem</span>
        <div class="seg" role="group" aria-label="Dönem">
          <button
            v-for="p in PERIODS"
            :key="p.id"
            type="button"
            :aria-pressed="period === p.id"
            @click="setQuery({ donem: p.id === 'bu-ay' ? undefined : p.id })"
          >
            {{ p.label }}
          </button>
        </div>
      </div>

      <div v-if="period === 'ozel'" class="filter-row">
        <label class="field compact">
          Başlangıç
          <span class="input-wrap"><input type="date" class="mono" :value="customFrom" :max="customTo" @change="setQuery({ bas: ($event.target as HTMLInputElement).value })" /></span>
        </label>
        <label class="field compact">
          Bitiş
          <span class="input-wrap"><input type="date" class="mono" :value="customTo" :min="customFrom" @change="setQuery({ bit: ($event.target as HTMLInputElement).value })" /></span>
        </label>
      </div>

      <div class="filter-grid">
        <label class="field search">
          Ara
          <span class="input-wrap">
            <AppIcon name="search" :size="18" />
            <input v-model="search" type="search" placeholder="Açıklama veya not" />
          </span>
        </label>
        <label class="field">
          Kategori
          <select class="select" :value="category" @change="setQuery({ kategori: ($event.target as HTMLSelectElement).value || undefined })">
            <option value="">Tüm kategoriler</option>
            <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </label>
        <label class="field">
          Sırala
          <select class="select" :value="sort" @change="setQuery({ sirala: ($event.target as HTMLSelectElement).value === 'new' ? undefined : ($event.target as HTMLSelectElement).value })">
            <option v-for="s in SORT_OPTIONS" :key="s.id" :value="s.id">{{ s.label }}</option>
          </select>
        </label>
      </div>
    </section>

    <section v-if="data" aria-label="Sonuç özeti" class="summary">
      <div class="total">
        <span>Filtrelenen toplam</span>
        <span class="mono total-num">{{ money.format(data.sum) }}</span>
        <span v-if="money.alt(data.sum)" class="mono total-alt">{{ money.alt(data.sum) }}</span>
      </div>
      <span class="muted">{{ data.count }} kayıt · {{ formatRange(range.from, range.to) }}</span>
    </section>

    <div v-if="status === 'error'" class="notice notice--error" role="alert">
      <AppIcon name="alert" />
      <span>Kayıtlar yüklenemedi. Sayfayı yenilemeyi dene.</span>
    </div>

    <section v-else class="card list" :aria-busy="status === 'pending'">
      <div v-if="data && data.items.length === 0" class="empty">
        <h2 class="section-title">Kayıt bulunamadı</h2>
        <p>Bu filtrelere uyan harcama yok. Dönemi genişlet ya da aramayı temizle.</p>
      </div>
      <template v-else>
        <div class="table-scroll">
          <table class="table">
            <thead>
              <tr>
                <th scope="col" class="w-date">Tarih</th>
                <th scope="col">Açıklama</th>
                <th scope="col" class="w-cat">Kategori</th>
                <th scope="col" class="num w-amt">Tutar · {{ money.currency.value }}</th>
                <th scope="col" class="num w-act"><span class="sr-only">İşlemler</span></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="e in data?.items ?? []" :key="e.id">
                <td class="mono muted date">{{ formatDateTR(e.date) }}</td>
                <td>
                  <div class="desc">{{ e.description }}</div>
                  <div v-if="e.note" class="note muted">{{ e.note }}</div>
                </td>
                <td><CategoryTag :id="e.category" /></td>
                <td class="num">
                  <div class="mono strong">{{ money.format(e.amounts) }}</div>
                  <div class="mono muted tiny">{{ money.alt(e.amounts) }}</div>
                </td>
                <td class="num actions">
                  <button type="button" class="icon-btn" :aria-label="`${e.description} kaydını düzenle`" @click="openEdit(e)">
                    <AppIcon name="pencil" :size="18" />
                  </button>
                  <button type="button" class="icon-btn" :aria-label="`${e.description} kaydını sil`" @click="remove(e)">
                    <AppIcon name="trash" :size="18" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="pager">
          <span class="muted small">{{ firstIndex }}–{{ lastIndex }} / {{ data?.count ?? 0 }} kayıt</span>
          <nav v-if="pageCount > 1" aria-label="Sayfalama" class="pages">
            <button type="button" class="page-btn" :disabled="page === 1" @click="setQuery({ sayfa: String(page - 1) })">Önceki</button>
            <button
              v-for="p in pages"
              :key="p"
              type="button"
              class="page-btn"
              :aria-current="p === page ? 'page' : undefined"
              @click="setQuery({ sayfa: p === 1 ? undefined : String(p) })"
            >
              {{ p }}
            </button>
            <button type="button" class="page-btn" :disabled="page >= pageCount" @click="setQuery({ sayfa: String(page + 1) })">Sonraki</button>
          </nav>
        </div>
      </template>
    </section>
  </div>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}
.top {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
}
.top-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
}

.filters {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--space-5) var(--space-6);
}
.filter-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-3);
}
.filter-label {
  width: 64px;
  font-weight: 600;
  font-size: 14px;
}
.filter-grid {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: var(--space-4);
}
.filter-grid .field {
  flex: 1 1 200px;
  font-size: 14px;
}
.filter-grid .search {
  flex: 2 1 260px;
}
.filter-grid .input-wrap,
.compact .input-wrap {
  min-height: 48px;
}
.compact {
  font-size: 14px;
}

.summary {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-3) var(--space-6);
}
.total {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 10px;
  padding: 10px 18px;
  border-radius: var(--radius);
  background: var(--color-ink);
  color: var(--color-surface);
  font-size: 14px;
}
.total-num {
  font-weight: 600;
  font-size: 22px;
}
.total-alt {
  color: var(--color-grid);
}

.list {
  padding: 0;
  overflow: hidden;
}
.table {
  min-width: 720px;
}
.w-date {
  width: 120px;
}
.w-cat {
  width: 170px;
}
.w-amt {
  width: 160px;
}
.w-act {
  width: 120px;
}
.date {
  font-size: 14px;
  white-space: nowrap;
}
.desc {
  font-weight: 500;
}
.note {
  font-size: var(--text-sm);
}
.strong {
  font-weight: 600;
}
.tiny {
  font-size: var(--text-xs);
}
.small {
  font-size: 14px;
}
.actions {
  white-space: nowrap;
}
.actions .icon-btn + .icon-btn {
  margin-left: 6px;
}

.pager {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: 14px 20px;
  border-top: var(--rule);
  background: var(--color-paper);
}
.pages {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}
.page-btn {
  min-width: 44px;
  height: 44px;
  padding: 0 12px;
  border: var(--rule);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-ink);
  font: 600 var(--text-base) var(--font-body);
  cursor: pointer;
  white-space: nowrap;
}
.page-btn:hover:not(:disabled) {
  background: var(--color-accent-soft);
}
.page-btn[aria-current='page'] {
  background: var(--color-ink);
  color: var(--color-surface);
}
.page-btn:disabled {
  border-color: var(--color-disabled);
  color: var(--color-disabled);
  cursor: not-allowed;
}
</style>
