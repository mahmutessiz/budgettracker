<script setup lang="ts">
import type { CurrencyCode } from '#shared/utils/currency'

const money = useMoney()
const open = ref(false)
const root = ref<HTMLElement>()
const trigger = ref<HTMLButtonElement>()

const pillRate = computed(() => {
  const code = money.currency.value === 'TRY' ? 'USD' : money.currency.value
  const r = money.rates.value.rates[code]
  return r ? `1${currencySymbol(code)} = ${formatAmount(1 / r, 'TRY')}` : ''
})

const updatedLabel = computed(() => {
  const { date, fetchedAt } = money.rates.value
  if (!date) return 'güncel kur alınamadı'
  const fetched = fetchedAt ? new Date(fetchedAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : ''
  return `güncel ECB kuru ${formatDateTR(date)}${fetched ? ` · kontrol ${fetched}` : ''}`
})

function pick(code: CurrencyCode) {
  money.select(code)
  open.value = false
  trigger.value?.focus()
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape' && open.value) {
    open.value = false
    trigger.value?.focus()
  }
}
function onPointer(e: PointerEvent) {
  if (open.value && root.value && !root.value.contains(e.target as Node)) open.value = false
}
onMounted(() => {
  document.addEventListener('keydown', onKey)
  document.addEventListener('pointerdown', onPointer)
})
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKey)
  document.removeEventListener('pointerdown', onPointer)
})
</script>

<template>
  <div ref="root" class="picker">
    <div v-if="open" id="currency-menu" class="menu" role="group" aria-label="Gösterim para birimi">
      <div class="menu-head">
        <span>Gösterim para birimi</span>
        <span class="menu-sub">kayıt anının kuruyla</span>
      </div>
      <button
        v-for="c in CURRENCIES"
        :key="c.code"
        type="button"
        class="opt"
        :aria-pressed="money.currency.value === c.code"
        @click="pick(c.code)"
      >
        <span class="sym" aria-hidden="true">{{ c.symbol }}</span>
        <span class="opt-text">
          <span class="opt-code">{{ c.code }}</span>
          <span class="opt-name">{{ c.name }}</span>
        </span>
        <span class="mono opt-rate">{{ c.code === 'TRY' ? 'kayıt birimi' : money.rateLabel(c.code) }}</span>
      </button>
      <p class="menu-foot">
        Her harcama girildiği günün kuruyla saklanır; kur değişse de geçmiş tutarlar değişmez.<br />
        Sağdaki değerler: {{ updatedLabel }} (Frankfurter)
        <template v-if="money.rates.value.stale && money.rates.value.date"><br />Güncel kura ulaşılamadı, son bilinen kur gösteriliyor.</template>
      </p>
    </div>

    <button
      ref="trigger"
      type="button"
      class="trigger"
      :aria-expanded="open"
      aria-controls="currency-menu"
      :aria-label="`Para birimi: ${money.currency.value}. Değiştir`"
      @click="open = !open"
    >
      <span class="sym sym--round" aria-hidden="true">{{ currencySymbol(money.currency.value) }}</span>
      <span>{{ money.currency.value }}</span>
      <span v-if="pillRate" class="mono trigger-rate">{{ pillRate }}</span>
      <AppIcon name="chevron-up" :size="16" :stroke="3" />
    </button>
  </div>
</template>

<style scoped>
.picker {
  position: fixed;
  right: var(--space-6);
  bottom: var(--space-6);
  z-index: 30;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--space-3);
}

.trigger {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-height: 56px;
  padding: 0 16px 0 8px;
  border: var(--rule);
  border-radius: 999px;
  background: var(--color-accent);
  color: var(--color-on-accent);
  box-shadow: var(--shadow);
  font: 600 var(--text-md) var(--font-body);
  cursor: pointer;
  white-space: nowrap;
  transition:
    transform var(--dur-fast) var(--ease-out),
    box-shadow var(--dur-fast) var(--ease-out);
}
.trigger:hover {
  transform: translate(-2px, -2px);
  box-shadow: var(--shadow-lg);
}
.trigger:active {
  transform: translate(3px, 3px);
  box-shadow: 1px 1px 0 var(--color-ink);
}
.trigger svg {
  transition: transform var(--dur) var(--ease-out);
}
.trigger[aria-expanded='true'] svg {
  transform: rotate(180deg);
}
.trigger-rate {
  font-weight: 500;
  font-size: var(--text-sm);
}

.sym {
  color: var(--color-ink);
  width: 34px;
  height: 34px;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  border: var(--rule-thin);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 18px;
}
.sym--round {
  width: 38px;
  height: 38px;
  border-radius: 50%;
}

.menu {
  width: min(320px, calc(100vw - 48px));
  background: var(--color-surface);
  border: var(--rule);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
}
.menu-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: 12px 16px;
  background: var(--color-ink);
  color: var(--color-surface);
  font-weight: 600;
}
.menu-sub {
  font-size: var(--text-xs);
  font-weight: 400;
  color: var(--color-grid);
}
.opt {
  width: 100%;
  min-height: 56px;
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: 0 16px;
  border: 0;
  border-bottom: var(--rule-thin);
  background: var(--color-surface);
  color: var(--color-ink);
  font: 500 var(--text-base) var(--font-body);
  text-align: left;
  cursor: pointer;
}
.opt:hover {
  background: var(--color-accent-soft);
}
.opt[aria-pressed='true'] {
  background: var(--color-accent);
  color: var(--color-on-accent);
}
.opt-text {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.opt-code {
  font-weight: 600;
}
.opt-name {
  font-size: var(--text-xs);
  color: var(--color-muted);
}
.opt[aria-pressed='true'] .opt-name {
  color: var(--color-on-accent);
}
.opt-rate {
  font-size: var(--text-sm);
}
.menu-foot {
  margin: 0;
  padding: 10px 16px;
  font-size: var(--text-xs);
  line-height: 1.5;
  color: var(--color-muted);
}

@media (max-width: 480px) {
  .picker {
    right: var(--space-4);
    bottom: var(--space-4);
  }
  .trigger-rate {
    display: none;
  }
}
</style>
