<script setup lang="ts">
export interface Bar {
  key: string
  /** Eksen etiketi: "Eki" */
  label: string
  /** Erişilebilir ad ve ipucu başlığı: "Ekim 2026" */
  title: string
  /** Gösterim biriminde değer */
  value: number
  display: string
  compact: string
  partial?: boolean
}

const props = withDefaults(
  defineProps<{
    bars: Bar[]
    height?: number
    label: string
    average?: { value: number; label: string } | null
  }>(),
  { height: 240, average: null },
)

const active = ref<string | null>(null)

function niceStep(x: number) {
  if (x <= 0) return 1
  const e = 10 ** Math.floor(Math.log10(x))
  const f = x / e
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * e
}

const scale = computed(() => {
  const max = Math.max(...props.bars.map((b) => b.value), props.average?.value ?? 0, 0)
  const step = niceStep(max / 5)
  const top = Math.max(step, Math.ceil((max * 1.08) / step) * step)
  const ticks: { y: number; label: string }[] = []
  for (let v = 0; v <= top + step / 1000; v += step) {
    ticks.push({ y: Math.round(props.height - (v / top) * props.height), label: formatCompactNumber(v) })
  }
  return { top, ticks }
})

const maxKey = computed(() => {
  const complete = props.bars.filter((b) => !b.partial && b.value > 0)
  return complete.reduce<Bar | null>((m, b) => (!m || b.value > m.value ? b : m), null)?.key ?? null
})

const avgY = computed(() =>
  props.average ? Math.round(props.height - (props.average.value / scale.value.top) * props.height) : null,
)

function barHeight(b: Bar) {
  if (b.value <= 0) return 0
  return Math.max(4, Math.round((b.value / scale.value.top) * props.height))
}
</script>

<template>
  <figure class="chart" :aria-label="label" role="group">
    <div class="y-axis" aria-hidden="true" :style="{ height: `${height}px` }">
      <span v-for="t in scale.ticks" :key="t.y" class="mono" :style="{ top: `${t.y - 8}px` }">{{ t.label }}</span>
    </div>

    <div class="plot" :style="{ height: `${height + 28}px` }">
      <div v-for="t in scale.ticks.slice(1)" :key="t.y" class="grid" aria-hidden="true" :style="{ top: `${t.y}px` }" />

      <div class="bars" :style="{ height: `${height}px` }">
        <div
          v-for="b in bars"
          :key="b.key"
          class="col"
          tabindex="0"
          :aria-label="`${b.title}: ${b.display}${b.partial ? ', ay devam ediyor' : ''}`"
          @pointerenter="active = b.key"
          @pointerleave="active = null"
          @focus="active = b.key"
          @blur="active = null"
        >
          <div class="bar" :data-partial="b.partial" :style="{ height: `${barHeight(b)}px` }">
            <div v-if="active === b.key" class="tip" role="presentation">
              <div class="tip-title">{{ b.title }}</div>
              <div class="mono">{{ b.display }}{{ b.key === maxKey ? ' · en yüksek' : '' }}</div>
            </div>
            <span v-else-if="b.key === maxKey || b.partial" class="direct mono" aria-hidden="true">{{ b.compact }}</span>
          </div>
        </div>
      </div>

      <template v-if="average && avgY !== null">
        <div class="avg" aria-hidden="true" :style="{ top: `${avgY}px` }" />
        <span class="avg-label mono" aria-hidden="true" :style="{ top: `${avgY - 26}px` }">{{ average.label }}</span>
      </template>

      <div class="x-axis" aria-hidden="true">
        <span v-for="b in bars" :key="b.key" :data-current="b.partial">{{ b.label }}</span>
      </div>
    </div>
  </figure>
</template>

<style scoped>
.chart {
  margin: var(--space-7) 0 0;
  display: flex;
  gap: var(--space-3);
  min-width: 0;
}
.y-axis {
  position: relative;
  width: 40px;
  flex: none;
  font-size: var(--text-xs);
  color: var(--color-muted);
}
.y-axis span {
  position: absolute;
  right: 0;
}
.plot {
  position: relative;
  flex: 1;
  min-width: 0;
}
.grid {
  position: absolute;
  left: 0;
  right: 0;
  border-top: 1px dashed var(--color-grid);
}
.bars {
  position: absolute;
  inset: 0 0 auto;
  display: flex;
  align-items: stretch;
  justify-content: space-around;
  gap: 6px;
  border-bottom: var(--rule);
}
.col {
  flex: 1;
  min-width: 0;
  max-width: 64px;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  outline-offset: 2px;
}
.col:focus-visible {
  outline: 3px solid var(--color-focus);
}
.bar {
  position: relative;
  width: 100%;
  max-width: 56px;
  background: var(--color-accent);
  border: var(--rule);
  border-bottom: 0;
  border-radius: 4px 4px 0 0;
}
.bar[data-partial='true'] {
  background: repeating-linear-gradient(135deg, var(--color-accent) 0 6px, var(--color-surface) 6px 12px);
}
.col:hover .bar,
.col:focus-visible .bar {
  background-color: var(--color-accent-soft);
}
.direct {
  position: absolute;
  bottom: calc(100% + 6px);
  left: 50%;
  transform: translateX(-50%);
  font-weight: 600;
  font-size: var(--text-sm);
  white-space: nowrap;
}
.tip {
  position: absolute;
  bottom: calc(100% + 10px);
  left: 50%;
  transform: translateX(-50%);
  z-index: 2;
  white-space: nowrap;
  background: var(--color-ink);
  color: var(--color-surface);
  border-radius: 6px;
  padding: 6px 10px;
  font-size: var(--text-sm);
  box-shadow: 3px 3px 0 var(--color-focus);
  pointer-events: none;
}
.tip-title {
  font-weight: 600;
}
.avg {
  position: absolute;
  left: 0;
  right: 0;
  border-top: 3px dashed var(--color-focus);
  pointer-events: none;
}
.avg-label {
  position: absolute;
  left: 4px;
  background: var(--color-surface);
  border: 2px solid var(--color-focus);
  border-radius: 6px;
  padding: 1px 8px;
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--color-focus-ink);
  pointer-events: none;
}
.x-axis {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 22px;
  display: flex;
  justify-content: space-around;
  gap: 6px;
  font-size: var(--text-sm);
  color: var(--color-muted);
}
.x-axis span {
  flex: 1;
  min-width: 0;
  max-width: 64px;
  overflow: hidden;
  text-align: center;
  white-space: nowrap;
}
.x-axis span[data-current='true'] {
  font-weight: 600;
  color: var(--color-ink);
}
@media (max-width: 520px) {
  .bars,
  .x-axis {
    gap: 3px;
  }
  .x-axis {
    font-size: 11px;
  }
  .y-axis {
    width: 30px;
  }
}
</style>
