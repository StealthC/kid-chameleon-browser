<script setup lang="ts">
import GfxView from '@/components/GfxView.vue'
import useRomStore from '@/stores/rom';
import { bytesToPixels } from '@repo/kid-util';
import { storeToRefs } from 'pinia';
import { ref, watchEffect } from 'vue';

const {rom} = storeToRefs(useRomStore() )
const gfxData = ref<Uint8Array|null>(null)

watchEffect(() => {
  if (rom.value) {
    const unpackData = rom.value.unpackKidFormat(rom.value.readAssetPtrTable()[1016] as number)
    const pixels = bytesToPixels(unpackData.output)
    gfxData.value = pixels
  }
})
</script>
<template>
  <main>
    <GfxView v-if="gfxData != null" :bytes="gfxData" />
  </main>
</template>
