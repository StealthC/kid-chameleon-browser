<script setup lang="ts">
import GfxView from '@/components/GfxView.vue'
import useRomStore from '@/stores/rom';
import { bytesToPixels, PackedTileSheet, Rom } from '@repo/kid-util';
import { storeToRefs } from 'pinia';
import { ref, watchEffect } from 'vue';

const {rom, romResources} = storeToRefs(useRomStore() )
const gfxData = ref<Uint8Array|null>(null)

watchEffect(() => {
  if (rom.value) {
    const testGfx = romResources.value.tileSheets[0]!
    const pixels = bytesToPixels(testGfx.getData())
    gfxData.value = pixels
  }
})
</script>
<template>
  <main>
    <GfxView v-if="gfxData != null" :bytes="gfxData" />
  </main>
</template>
