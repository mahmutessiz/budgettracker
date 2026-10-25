<script setup lang="ts">
const { categoryOf } = useCategories()
const props = defineProps<{ id: string }>()
const cat = computed(() => categoryOf(props.id))
</script>

<template>
  <span class="cat-tag">
    <span class="swatch swatch--dot" :style="{ background: cat.cssColor }" aria-hidden="true" />
    {{ cat.name }}
  </span>
</template>
