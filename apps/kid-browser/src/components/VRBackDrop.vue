<template>
  <div
    :class="{
      'scale-200 opacity-0': !rom,
      'scale-100 opacity-50': rom,
    }"
    class="vr-backdrop transition-[opacity scale] absolute top-0 left-0 -z-50 h-screen w-screen bg-cover bg-center bg-no-repeat duration-1000 ease-out"
  ></div>
</template>

<script setup lang="ts">
import useRomStore from '@/stores/romStore'
import { storeToRefs } from 'pinia'

const { rom } = storeToRefs(useRomStore())
</script>

<style scoped>
.vr-backdrop {
  background-image: url('@/assets/vr-backdrop.png');
  image-rendering: pixelated;
}
</style>
