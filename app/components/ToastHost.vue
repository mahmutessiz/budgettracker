<script setup lang="ts">
const { toast, dismiss } = useToast()

async function runAction() {
  const action = toast.value?.action
  dismiss()
  await action?.()
}
</script>

<template>
  <div class="toast-region" role="status" aria-live="polite">
    <div v-if="toast" :key="toast.id" class="toast" :data-tone="toast.tone">
      <AppIcon :name="toast.tone === 'error' ? 'alert' : 'check'" :stroke="3" />
      <span class="msg">{{ toast.message }}</span>
      <button v-if="toast.actionLabel" type="button" class="action" @click="runAction">{{ toast.actionLabel }}</button>
      <button type="button" class="close" aria-label="Bildirimi kapat" @click="dismiss">
        <AppIcon name="close" :size="16" :stroke="3" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.toast-region {
  position: fixed;
  left: 50%;
  bottom: var(--space-6);
  transform: translateX(-50%);
  z-index: 40;
  width: max-content;
  max-width: calc(100vw - 32px);
  pointer-events: none;
}
.toast {
  pointer-events: auto;
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-height: 52px;
  padding: 0 6px 0 16px;
  border: var(--rule);
  border-radius: var(--radius);
  background: var(--color-ink);
  color: var(--color-surface);
  box-shadow: 4px 4px 0 var(--color-accent);
  font-weight: 500;
}
.toast[data-tone='error'] {
  background: var(--color-up);
  color: var(--color-ink);
  box-shadow: var(--shadow);
}
.msg {
  min-width: 0;
}
.action {
  min-height: 40px;
  padding: 0 14px;
  border: var(--rule-thin);
  border-color: var(--color-accent);
  border-radius: var(--radius-sm);
  background: var(--color-accent);
  color: var(--color-on-accent);
  font: 600 var(--text-base) var(--font-body);
  cursor: pointer;
  white-space: nowrap;
}
.close {
  width: 40px;
  height: 40px;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: inherit;
  cursor: pointer;
}
.close:hover {
  background: color-mix(in srgb, var(--color-surface) 14%, transparent);
}
@media (max-width: 640px) {
  .toast-region {
    bottom: 96px;
  }
}
</style>
