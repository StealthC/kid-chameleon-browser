<template>
  <div class="md-cart">
    <button type="button" class="w-full cursor-pointer pt-4 text-inherit" :aria-expanded="!inserted" aria-controls="rom-loader-content" @click="onToggle">
      <header class="mx-auto w-9/12 p-2 text-center text-white">
        <slot name="header">{{ header }}</slot>
      </header>
    </button>
    <div
      id="rom-loader-content"
      :class="{
        'max-h-0': inserted,
        'max-h-72': !inserted,
      }"
      class="overflow-hidden transition-[max-height] duration-500"
    >
      <main class="mx-auto w-9/12 p-2 text-white">
        <slot></slot>
      </main>
      <footer class="mx-auto w-9/12 p-2 text-center text-xs text-gray-400">
        <slot name="footer"></slot>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
type Props = {
  header?: string
}
const { header } = defineProps<Props>()
const inserted = defineModel('inserted', { type: Boolean, default: false })
const onToggle = () => {
  inserted.value = !inserted.value
}
</script>

<style scoped>
.md-cart {
  background-color: transparent;
  border: none;
  background-image: url('/md-cart.png');
  background-size: cover;
}
</style>
