<script setup lang="ts">
const { categoryOf } = useCategories()
import type { OverviewResponse } from '#shared/types/api'

useHead({ title: 'İstatistikler — defter.' })

const route = useRoute()
const money = useMoney()

const RANGES = [
  { id: '3m', label: '3 ay' },
  { id: '6m', label: '6 ay' },
  { id: '12m', label: '12 ay' },
  { id: 'ytd', label: 'Bu yıl' },
] as const
type RangeId = (typeof RANGES)[number]['id']

const currentMonth = todayISO().slice(0, 7)
const range = computed<RangeId>(() => RANGES.find((r) => r.id === route.query.aralik)?.id ?? '12m')

const { data, status } = await useFetch<OverviewResponse>('/api/stats/overview', {
  query: computed(() => ({ range: range.value, month: currentMonth })),
})

const months = computed(() => data.value?.months ?? [])
// En yüksek / en düşük: devam eden ay yanıltmasın diye tamamlanmış aylar.
const completed = computed(() => months.value.filter((m) => m.month !== currentMonth))
const total = computed(() => (data.value ? money.value(data.value.total) : 0))
const average = computed(() => (months.value.length ? total.value / months.value.length : 0))
type MonthRow = (typeof months.value)[number]
const maxMonth = computed(() => completed.value.reduce<MonthRow | null>((a, m) => (!a || money.value(m.total) > money.value(a.total) ? m : a), null))
const minMonth = computed(() => completed.value.reduce<MonthRow | null>((a, m) => (!a || money.value(m.total) < money.value(a.total) ? m : a), null))

const bars = computed(() =>
  months.value.map((t) => ({
    key: t.month,
    label: monthShort(t.month),
    title: monthLabel(t.month),
    value: money.value(t.total),
    display: money.format(t.total),
    compact: money.compact(t.total),
    partial: t.month === currentMonth,
  })),
)

const segments = computed(() =>
  (data.value?.byCategory ?? [])
    .map((c) => {
      const cat = categoryOf(c.category)
      return { key: c.category, label: cat.name, value: money.value(c.total), color: cat.cssColor, display: money.format(c.total) }
    })
    .sort((a, b) => b.value - a.value),
)
const topSegment = computed(() => segments.value[0])

const compareRows = computed(() => {
  const rows = data.value?.compare.rows ?? []
  const vals = rows.map((r) => ({ category: r.category, previous: money.value(r.previous), current: money.value(r.current) }))
  const max = Math.max(1, ...vals.flatMap((r) => [r.previous, r.current]))
  return vals.map((r) => {
    const diff = r.current - r.previous
    return {
      ...r,
      cat: categoryOf(r.category),
      diff,
      pct: r.previous > 0 ? (diff / r.previous) * 100 : null,
      prevW: (r.previous / max) * 100,
      curW: (r.current / max) * 100,
    }
  })
})

const reportUrl = computed(() => {
  if (!data.value) return '#'
  const params = new URLSearchParams({ from: data.value.from, to: data.value.to, currency: money.currency.value })
  return `/api/export/pdf?${params}`
})
</script>

<template>
  <div class="page">
    <header class="top">
      <h1 class="page-title">İstatistikler</h1>
      <div class="top-actions">
        <div class="seg" role="group" aria-label="Dönem">
          <button
            v-for="r in RANGES"
            :key="r.id"
            type="button"
            :aria-pressed="range === r.id"
            @click="navigateTo({ query: r.id === '12m' ? {} : { aralik: r.id } }, { replace: true })"
          >
            {{ r.label }}
          </button>
        </div>
        <a class="btn btn--primary" :href="reportUrl" download>
          <AppIcon name="download" />
          Rapor al (PDF)
        </a>
      </div>
    </header>

    <div v-if="status === 'error'" class="notice notice--error" role="alert">
      <AppIcon name="alert" />
      <span>İstatistikler yüklenemedi. Sayfayı yenilemeyi dene.</span>
    </div>

    <template v-else-if="data">
      <section aria-label="Dönem özeti" class="kpis">
        <div class="kpi kpi--ink">
          <div class="kpi-label">Toplam · {{ formatRange(data.from, data.to) }}</div>
          <div class="kpi-num mono">{{ money.format(data.total) }}</div>
        </div>
        <div class="kpi">
          <div class="kpi-label">Aylık ortalama</div>
          <div class="kpi-num mono">{{ money.formatValue(average) }}</div>
        </div>
        <div class="kpi">
          <div class="kpi-label">En yüksek ay{{ maxMonth ? ` · ${monthName(maxMonth.month)}` : '' }}</div>
          <div class="kpi-num mono">{{ maxMonth ? money.format(maxMonth.total) : '—' }}</div>
        </div>
        <div class="kpi">
          <div class="kpi-label">En düşük ay{{ minMonth ? ` · ${monthName(minMonth.month)}` : '' }}</div>
          <div class="kpi-num mono">{{ minMonth ? money.format(minMonth.total) : '—' }}</div>
        </div>
      </section>

      <section class="card">
        <div class="card-head">
          <h2 class="section-title">Aylık toplam harcama · {{ money.currency.value }}</h2>
          <div class="keys">
            <span class="key"><span class="swatch fill" aria-hidden="true" />Ay toplamı</span>
            <span class="key"><span class="swatch hatch" aria-hidden="true" />Ay devam ediyor</span>
            <span class="key"><span class="avg-key" aria-hidden="true" />Dönem ortalaması</span>
          </div>
        </div>
        <BarChart
          :bars="bars"
          :height="260"
          label="Aylık toplam harcama"
          :average="{ value: average, label: `ort. ${money.compactValue(average)}` }"
        />
      </section>

      <div v-if="data.count === 0" class="card empty">
        <h2 class="section-title">Bu dönemde kayıt yok</h2>
        <p>Harcama ekledikçe kategori dağılımı ve karşılaştırmalar burada görünecek.</p>
      </div>

      <section v-else class="grid2">
        <div class="card stack">
          <h2 class="section-title">Kategori dağılımı</h2>
          <DonutChart :segments="segments" :size="340" label="Dönemin kategori dağılımı">
            <template v-if="topSegment">
              <span class="donut-pct">{{ formatPercent((topSegment.value / total) * 100) }}</span>
              <span class="center-top">{{ topSegment.label }}</span>
            </template>
          </DonutChart>
          <table class="cat-table">
            <thead>
              <tr>
                <th scope="col">Kategori</th>
                <th scope="col" class="num">Tutar</th>
                <th scope="col" class="num w-pct">Pay</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="s in segments" :key="s.key">
                <td>
                  <span class="cat-name"><span class="swatch" :style="{ background: s.color }" aria-hidden="true" />{{ s.label }}</span>
                </td>
                <td class="num mono">{{ s.display }}</td>
                <td class="num mono muted">{{ formatPercent((s.value / total) * 100) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="card stack">
          <div class="card-head">
            <h2 class="section-title">{{ monthName(data.compare.current) }}, {{ monthName(data.compare.previous) }}'e göre</h2>
            <div class="keys">
              <span class="key"><span class="bar-key" aria-hidden="true" />{{ monthName(data.compare.previous) }}</span>
              <span class="key"><span class="bar-key bar-key--ink" aria-hidden="true" />{{ monthName(data.compare.current) }}</span>
            </div>
          </div>
          <p v-if="!compareRows.length" class="muted">Bu iki ayda kayıt yok.</p>
          <div v-for="r in compareRows" :key="r.category" class="cmp">
            <div class="cmp-head">
              <span class="cmp-name">{{ r.cat.name }}</span>
              <span v-if="r.diff === 0" class="badge">Değişmedi</span>
              <span v-else class="badge" :class="r.diff > 0 ? 'badge--up' : 'badge--down'">
                <AppIcon :name="r.diff > 0 ? 'arrow-up' : 'arrow-down'" :size="12" :stroke="3.5" />
                {{ money.formatValue(Math.abs(r.diff)) }}<template v-if="r.pct !== null"> · {{ formatPercent(Math.abs(r.pct)) }}</template>
              </span>
            </div>
            <div class="cmp-bar cmp-bar--prev" :style="{ width: `${r.prevW}%` }" aria-hidden="true" />
            <div class="cmp-bar" :style="{ width: `${r.curW}%`, background: r.cat.cssColor }" aria-hidden="true" />
            <div class="mono muted small">{{ money.formatValue(r.previous) }} → {{ money.formatValue(r.current) }}</div>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: var(--space-7);
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
  align-items: center;
  gap: var(--space-3);
}

.kpis {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr));
  gap: var(--space-5);
}
.kpi {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: var(--space-5) 22px;
  background: var(--color-surface);
  border: var(--rule);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
}
.kpi--ink {
  background: var(--color-ink);
  color: var(--color-surface);
  box-shadow: 6px 6px 0 var(--color-accent);
}
.kpi-label {
  font-weight: 600;
  font-size: 14px;
}
.kpi-num {
  font-weight: 600;
  font-size: clamp(22px, 1.6vw + 10px, 28px);
  letter-spacing: -0.02em;
  overflow-wrap: anywhere;
}

.keys {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-4);
}
.key {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-sm);
  color: var(--color-muted);
}
.fill {
  background: var(--color-accent);
}
.hatch {
  background: repeating-linear-gradient(135deg, var(--color-accent) 0 3px, var(--color-surface) 3px 6px);
}
.avg-key {
  width: 22px;
  border-top: 3px dashed var(--color-focus);
}
.bar-key {
  width: 22px;
  height: 10px;
  border: var(--rule-thin);
  border-radius: 2px;
  background: var(--color-surface);
}
.bar-key--ink {
  background: var(--color-ink);
}

.grid2 {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 480px), 1fr));
  gap: var(--space-5);
}
.stack {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}
.stack > .donut {
  align-self: center;
}
.donut-pct {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 40px;
  letter-spacing: -0.03em;
}
.center-top {
  font-size: 14px;
  color: var(--color-muted);
}

.cat-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--text-base);
}
.cat-table th {
  padding: 8px 0;
  text-align: left;
  font-weight: 600;
  border-bottom: var(--rule);
}
.cat-table td {
  padding: 8px 0;
  border-bottom: 2px solid var(--color-rule);
}
.cat-table tr:last-child td {
  border-bottom: 0;
}
.cat-table .num {
  text-align: right;
}
.w-pct {
  width: 64px;
}
.cat-name {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-weight: 500;
}

.cmp {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-bottom: 14px;
  border-bottom: 2px solid var(--color-rule);
}
.cmp:last-child {
  border-bottom: 0;
  padding-bottom: 0;
}
.cmp-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}
.cmp-name {
  font-weight: 600;
}
.cmp-head .badge {
  align-self: auto;
  font-size: var(--text-sm);
  padding: 2px 10px;
}
.cmp-bar {
  height: 10px;
  min-width: 8px;
  border: var(--rule-thin);
  border-radius: 2px;
}
.cmp-bar--prev {
  background: var(--color-surface);
}
.small {
  font-size: var(--text-sm);
}
</style>
