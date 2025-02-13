<template>
  <div
    :class="[
      'flex flex-col rounded-lg border-2 border-white bg-blue-900/90 p-4 pt-2',
      $attrs.class,
    ]"
  >
    <slot name="header shrink">
      <div class="text-xl font-bold" v-if="header">{{ header }}</div>
    </slot>
    <slot></slot>
  </div>
</template>

<script setup lang="ts">
type Props = {
  header?: string
}

const { header } = defineProps<Props>()
</script>

<style scoped></style>
