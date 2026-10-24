<script setup lang="ts">
const { user } = useAuthUser()
const isAdmin = computed(() => user.value?.role === 'admin')
</script>

<template>
  <div class="shell">
    <AppSidebar />
    <main class="main">
      <slot />
    </main>
    <template v-if="!isAdmin">
      <CurrencyPicker />
      <ExpenseModal />
    </template>
    <ToastHost />
  </div>
</template>

<style scoped>
.shell {
  display: flex;
  min-height: 100vh;
  min-height: 100dvh;
}
.main {
  flex: 1 1 560px;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-7);
  padding: var(--space-8) var(--space-10) 120px;
}
@media (max-width: 900px) {
  .shell {
    flex-direction: column;
  }
  .main {
    flex: 1 1 auto;
    padding: var(--space-6) var(--space-4) 120px;
  }
}
</style>
