<template>
  <div class="md-cart">
    <div @click="onToggle" class="cursor-pointer pt-4">
      <header class="mx-auto w-9/12 p-2 text-center text-white">
        <slot name="header">{{ header }}</slot>
      </header>
    </div>
    <div
      :class="{
        'max-h-0': inserted,
        'max-h-72': !inserted,
      }"
      class="overflow-hidden transition-[max-height] duration-500"
    >
      <main class="mx-auto w-9/12 p-2 text-white">
        <slot>
          <p>Example Content</p>
          <p>Example Content</p>
          <p>Example Content</p>
          <p>Example Content</p>
          <p>Example Content</p>
          <p>Example Content</p>
          <p>Example Content</p>
        </slot>
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

const props = defineProps<Props>()
const { header } = props
const inserted = defineModel('inserted', { type: Boolean, default: false })

const onToggle = () => {
  inserted.value = !inserted.value
}
</script>

<style scoped>
.md-cart {
  background-color: transparent;
  border: none;
  background-image: url('@/assets/md-cart.png');
  background-size: cover;
}
</style>
