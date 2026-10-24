<script setup lang="ts">
import type { MonthSummary } from '#shared/types/api'

useHead({ title: 'Panel — defter.' })

const route = useRoute()
const money = useMoney()
const { openNew, openEdit } = useExpenseModal()

const currentMonth = todayISO().slice(0, 7)
const month = computed(() => (isMonthKey(route.query.ay) && route.query.ay <= currentMonth ? route.query.ay : currentMonth))
const isCurrent = computed(() => month.value === currentMonth)

const { data, status } = await useFetch<MonthSummary>('/api/stats/month', { query: { month } })

function goMonth(delta: number) {
  const next = addMonths(month.value, delta)
  return navigateTo({ query: next === currentMonth ? {} : { ay: next } })
}

const elapsedDays = computed(() => (isCurrent.value ? Number(todayISO().slice(8, 10)) : daysInMonth(month.value)))

const totalValue = computed(() => (data.value ? money.value(data.value.total) : 0))

const hero = computed(() => {
  const text = money.formatValue(totalValue.value)
  const cut = text.lastIndexOf(',')
  return { int: text.slice(0, cut), dec: text.slice(cut) }
})

const delta = computed(() => {
  const d = data.value
  if (!d || d.prevTotal.TRY === 0) return null
  const prev = money.value(d.prevTotal)
  const diff = totalValue.value - prev
  return { diff, pct: (diff / prev) * 100, up: diff > 0 }
})

const prevMonthName = computed(() => monthName(addMonths(month.value, -1)))

const segments = computed(() =>
  (data.value?.byCategory ?? [])
    .map((c) => {
      const cat = categoryOf(c.category)
      return { key: c.category, label: cat.name, value: money.value(c.total), color: cat.cssColor, display: money.format(c.total) }
    })
    .sort((a, b) => b.value - a.value),
)

const bars = computed(() =>
  (data.value?.trend ?? []).map((t) => ({
    key: t.month,
    label: monthShort(t.month),
    title: monthLabel(t.month),
    value: money.value(t.total),
    display: money.format(t.total),
    compact: money.compact(t.total),
    partial: t.month === currentMonth,
  })),
)

const rangeLabel = computed(() => {
  const { from } = monthRange(month.value)
  const to = isCurrent.value ? todayISO() : monthRange(month.value).to
  return formatRange(from, to)
})
</script>

<template>
  <div class="page">
    <header class="top">
      <div class="month-nav">
        <button type="button" class="icon-btn icon-btn--thick" aria-label="Önceki ay" @click="goMonth(-1)">
          <AppIcon name="chevron-left" :stroke="3" />
        </button>
        <h1 class="page-title">{{ monthLabel(month) }}</h1>
        <button type="button" class="icon-btn icon-btn--thick" aria-label="Sonraki ay" :disabled="isCurrent" @click="goMonth(1)">
          <AppIcon name="chevron-right" :stroke="3" />
        </button>
      </div>
      <button type="button" class="btn btn--primary btn--lg" @click="openNew">
        <AppIcon name="plus" :size="22" :stroke="3" />
        Harcama ekle
      </button>
    </header>

    <div v-if="status === 'error'" class="notice notice--error" role="alert">
      <AppIcon name="alert" />
      <span>Özet yüklenemedi. Sayfayı yenilemeyi dene.</span>
    </div>

    <template v-else-if="data">
      <section aria-label="Özet" class="tiles">
        <div class="tile tile--hero">
          <div class="tile-label">{{ isCurrent ? 'Bu ay harcadığın' : `${monthName(month)} ayında harcadığın` }}</div>
          <div class="hero-num">{{ hero.int }}<span class="hero-dec">{{ hero.dec }}</span></div>
          <div class="hero-meta">
            <span v-if="money.alt(data.total)" class="badge mono">{{ money.alt(data.total) }}</span>
            <span>{{ data.count }} kayıt · {{ rangeLabel }}</span>
          </div>
        </div>

        <div class="tile">
          <div class="tile-label">{{ prevMonthName }}'e göre</div>
          <template v-if="delta">
            <div class="tile-num mono">{{ money.formatValue(delta.diff, { sign: true }) }}</div>
            <span class="badge" :class="delta.up ? 'badge--up' : 'badge--down'">
              <AppIcon :name="delta.up ? 'arrow-up-right' : 'arrow-down-right'" :size="16" :stroke="3" />
              {{ formatPercent(Math.abs(delta.pct)) }} {{ delta.up ? 'daha fazla' : 'daha az' }}
            </span>
            <div class="muted small">{{ prevMonthName }}: {{ money.format(data.prevTotal) }}</div>
          </template>
          <p v-else class="muted small">{{ prevMonthName }} ayında kayıt yok; karşılaştırma için veri birikmeli.</p>
        </div>

        <div class="tile">
          <div class="tile-label">Günlük ortalama</div>
          <div class="tile-num mono">{{ money.formatValue(totalValue / elapsedDays) }}</div>
          <div class="muted small">{{ elapsedDays }} gün üzerinden</div>
          <div v-if="data.topDay" class="muted small">
            En pahalı gün: {{ formatDayLong(data.topDay.date) }}<template v-if="data.topDay.description"> ({{ data.topDay.description }})</template>
          </div>
        </div>
      </section>

      <div v-if="data.count === 0" class="card empty">
        <h2 class="section-title">Bu ay henüz kayıt yok</h2>
        <p>İlk harcamanı ekle; grafikler ve dağılım burada belirecek.</p>
        <button type="button" class="btn btn--primary" @click="openNew">
          <AppIcon name="plus" :stroke="3" />
          Harcama ekle
        </button>
      </div>

      <template v-else>
        <section class="charts">
          <div class="card stack">
            <div class="card-head">
              <h2 class="section-title">Nereye gitti?</h2>
              <NuxtLink to="/istatistikler" class="link-strong">Detay</NuxtLink>
            </div>
            <div class="donut-row">
              <DonutChart :segments="segments" :label="`${monthLabel(month)} kategori dağılımı`">
                <span class="center-top">{{ segments.length }} kategori</span>
                <span class="center-main mono">{{ money.compact(data.total) }}</span>
              </DonutChart>
              <ul class="legend">
                <li v-for="s in segments" :key="s.key">
                  <span class="swatch" :style="{ background: s.color }" aria-hidden="true" />
                  <span class="legend-name">{{ s.label }}</span>
                  <span class="mono legend-amt">{{ s.display }}</span>
                  <span class="mono legend-pct">{{ formatPercent((s.value / totalValue) * 100) }}</span>
                </li>
              </ul>
            </div>
          </div>

          <div class="card stack">
            <div class="card-head">
              <h2 class="section-title">Son 6 ay · {{ money.currency.value }}</h2>
              <span class="key"><span class="swatch hatch" aria-hidden="true" />Ay devam ediyor</span>
            </div>
            <BarChart :bars="bars" label="Son 6 ayın aylık toplam harcaması" />
          </div>
        </section>

        <section class="card">
          <div class="card-head">
            <h2 class="section-title">Son harcamalar</h2>
            <NuxtLink to="/harcamalar" class="link-strong">Tümünü gör</NuxtLink>
          </div>
          <ul class="recent">
            <li v-for="e in data.recent" :key="e.id">
              <button type="button" class="recent-row" :aria-label="`${e.description} kaydını düzenle`" @click="openEdit(e)">
                <span class="mono muted recent-date">{{ formatDayShort(e.date) }}</span>
                <span class="recent-desc">{{ e.description }}</span>
                <CategoryTag :id="e.category" />
                <span class="recent-amt">
                  <span class="mono strong">{{ money.format(e.amounts) }}</span>
                  <span class="mono muted tiny">{{ money.alt(e.amounts) }}</span>
                </span>
              </button>
            </li>
          </ul>
        </section>
      </template>
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
.month-nav {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-width: 0;
}

.tiles {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 260px), 1fr));
  gap: var(--space-5);
}
.tile {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-6);
  background: var(--color-surface);
  border: var(--rule);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
}
.tile--hero {
  grid-column: span 2;
  background: var(--color-accent);
  color: var(--color-on-accent);
  padding: var(--space-6) var(--space-7);
}
@media (max-width: 640px) {
  .tile--hero {
    grid-column: auto;
  }
}
.tile-label {
  font-weight: 600;
  font-size: var(--text-base);
}
.hero-num {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: var(--text-hero);
  letter-spacing: -0.04em;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  overflow-wrap: anywhere;
}
.hero-dec {
  font-size: 0.58em;
}
.hero-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2) var(--space-4);
  font-size: var(--text-base);
}
.tile-num {
  font-weight: 600;
  font-size: clamp(24px, 2.4vw + 8px, 32px);
  letter-spacing: -0.02em;
  overflow-wrap: anywhere;
}
.small {
  font-size: 14px;
}
.tile p {
  margin: 0;
}

.charts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 460px), 1fr));
  gap: var(--space-5);
}
.stack {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}
.link-strong {
  font-weight: 600;
  font-size: var(--text-base);
  white-space: nowrap;
}
.donut-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: var(--space-7);
}
.center-top {
  font-size: var(--text-sm);
  color: var(--color-muted);
}
.center-main {
  font-weight: 600;
  font-size: var(--text-lg);
}
.legend {
  list-style: none;
  margin: 0;
  padding: 0;
  flex: 1 1 220px;
  min-width: 0;
}
.legend li {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 0;
  border-bottom: 2px solid var(--color-rule);
}
.legend li:last-child {
  border-bottom: 0;
}
.legend-name {
  flex: 1;
  min-width: 0;
  font-weight: 500;
}
.legend-amt {
  font-size: 14px;
}
.legend-pct {
  width: 52px;
  text-align: right;
  font-size: var(--text-sm);
  color: var(--color-muted);
}
.key {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-sm);
  color: var(--color-muted);
}
.hatch {
  background: repeating-linear-gradient(135deg, var(--color-accent) 0 3px, var(--color-surface) 3px 6px);
}

.recent {
  list-style: none;
  margin: var(--space-3) 0 0;
  padding: 0;
}
.recent li + li {
  border-top: 2px solid var(--color-rule);
}
.recent-row {
  width: 100%;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2) var(--space-4);
  min-height: 60px;
  padding: 8px;
  border: 0;
  background: transparent;
  color: var(--color-ink);
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.recent-row:hover {
  background: var(--color-row-hover);
}
.recent-date {
  width: 64px;
  font-size: var(--text-sm);
}
.recent-desc {
  flex: 1 1 160px;
  min-width: 0;
  font-weight: 500;
}
.recent-amt {
  margin-left: auto;
  min-width: 120px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}
.strong {
  font-weight: 600;
}
.tiny {
  font-size: var(--text-xs);
}
</style>
