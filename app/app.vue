<script setup lang="ts">
const { pref } = useTheme()
useHead({
  htmlAttrs: { 'data-theme': computed(() => (pref.value === 'system' ? undefined : pref.value)) },
})
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
