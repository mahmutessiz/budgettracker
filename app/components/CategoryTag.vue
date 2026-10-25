<script setup lang="ts">
const { categoryOf } = useCategories()
const props = defineProps<{ id: string }>()
const cat = computed(() => categoryOf(props.id))
</script>

<template>
  <span class="cat-tag">
    <AppIcon :name="cat.icon" :size="18" :style="{ color: cat.cssColor }" />
    {{ cat.name }}
  </span>
</template>
