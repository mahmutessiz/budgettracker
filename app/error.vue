<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()
const notFound = computed(() => props.error.statusCode === 404)
</script>

<template>
  <main class="err">
    <div class="box">
      <span class="code mono">{{ error.statusCode }}</span>
      <h1 class="page-title">{{ notFound ? 'Bu sayfa yok.' : 'Bir şey bozuldu.' }}</h1>
      <p class="muted">{{ notFound ? 'Adres yanlış olabilir.' : 'Sayfayı yenilemeyi dene; sürerse sunucu kayıtlarına bak.' }}</p>
      <button type="button" class="btn btn--primary" @click="clearError({ redirect: '/' })">Panele dön</button>
    </div>
  </main>
</template>

<style scoped>
.err {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-6) var(--space-4);
}
.box {
  max-width: 480px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-4);
  background: var(--color-surface);
  border: var(--rule);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-xl);
  padding: var(--space-8);
}
.code {
  border: var(--rule-thin);
  border-radius: 999px;
  padding: 2px 12px;
  background: var(--color-accent);
  color: var(--color-on-accent);
  font-weight: 600;
}
p {
  margin: 0;
}
</style>
