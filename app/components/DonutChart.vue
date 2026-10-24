<script setup lang="ts">
export interface DonutSegment {
  key: string
  label: string
  value: number
  color: string
  /** Üzerine gelince ortada gösterilecek tutar */
  display: string
}

const props = withDefaults(defineProps<{ segments: DonutSegment[]; size?: number; label: string }>(), { size: 260 })

const hovered = ref<string | null>(null)

const geometry = computed(() => {
  const c = props.size / 2
  const R = c - 18
  const r = R * 0.55
  return { c, R, r }
})

const paths = computed(() => {
  const { c, R, r } = geometry.value
  const total = props.segments.reduce((s, x) => s + x.value, 0)
  if (total <= 0) return []
  const visible = props.segments.filter((s) => s.value > 0)
  const pt = (rad: number, a: number) => `${(c + rad * Math.cos(a)).toFixed(2)} ${(c + rad * Math.sin(a)).toFixed(2)}`

  if (visible.length === 1) {
    const s = visible[0]!
    const d = `M${c - R} ${c}a${R} ${R} 0 1 0 ${2 * R} 0a${R} ${R} 0 1 0 ${-2 * R} 0Z M${c - r} ${c}a${r} ${r} 0 1 1 ${2 * r} 0a${r} ${r} 0 1 1 ${-2 * r} 0Z`
    return [{ ...s, d, pct: 100 }]
  }

  let a0 = -Math.PI / 2
  return visible.map((s) => {
    const a1 = a0 + (s.value / total) * Math.PI * 2
    const large = a1 - a0 > Math.PI ? 1 : 0
    const d = `M${pt(R, a0)} A${R} ${R} 0 ${large} 1 ${pt(R, a1)} L${pt(r, a1)} A${r} ${r} 0 ${large} 0 ${pt(r, a0)} Z`
    a0 = a1
    return { ...s, d, pct: (s.value / total) * 100 }
  })
})

const active = computed(() => paths.value.find((p) => p.key === hovered.value) ?? null)
</script>

<template>
  <figure class="donut" :style="{ width: `${size}px`, maxWidth: '100%' }">
    <svg role="img" :aria-label="label" width="100%" :viewBox="`0 0 ${size} ${size}`">
      <circle
        v-if="!paths.length"
        :cx="geometry.c"
        :cy="geometry.c"
        :r="(geometry.R + geometry.r) / 2"
        class="empty-ring"
        :stroke-width="geometry.R - geometry.r"
      />
      <path
        v-for="p in paths"
        :key="p.key"
        :d="p.d"
        :style="{ fill: p.color }"
        fill-rule="evenodd"
        stroke-width="3"
        stroke-linejoin="round"
        class="seg"
        :data-dim="hovered !== null && hovered !== p.key"
        @pointerenter="hovered = p.key"
        @pointerleave="hovered = null"
      >
        <title>{{ p.label }}: {{ p.display }} ({{ formatPercent(p.pct) }})</title>
      </path>
    </svg>
    <figcaption class="center" aria-hidden="true">
      <template v-if="active">
        <span class="center-top">{{ active.label }}</span>
        <span class="center-main mono">{{ active.display }}</span>
        <span class="center-top">{{ formatPercent(active.pct) }}</span>
      </template>
      <slot v-else />
    </figcaption>
  </figure>
</template>

<style scoped>
.donut {
  position: relative;
  margin: 0;
  flex: none;
  aspect-ratio: 1;
}
.donut svg {
  display: block;
  height: auto;
}
.empty-ring {
  fill: none;
  stroke: var(--color-rule);
}
.seg {
  stroke: var(--color-ink);
  cursor: default;
  transition: opacity var(--dur-fast) var(--ease-out);
}
.seg[data-dim='true'] {
  opacity: 0.35;
}
.center {
  position: absolute;
  inset: 22%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  pointer-events: none;
}
.center-top {
  font-size: var(--text-sm);
  color: var(--color-muted);
}
.center-main {
  font-weight: 600;
  font-size: 17px;
  overflow-wrap: anywhere;
}
</style>
