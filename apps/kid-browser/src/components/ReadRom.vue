<template>
  <MegaDriveCart v-model:inserted="inserted">
    <template #header>
      <div v-if="romDetails" class="items-center justify-center text-center select-none">
        <div class="flex flex-col truncate">
          <p
            v-if="romDetails.known"
            class="text-xl font-bold"
            :class="{
              'text-green-500': !romDetails.known.hack,
              'text-amber-500': romDetails.known.hack,
            }"
          >
            {{ romDetails.known.name }}
          </p>
          <p v-else class="font-bold text-red-500">Unknown</p>
          <p
            class="text-muted-color overflow-hidden pt-1 text-right font-mono text-ellipsis whitespace-nowrap"
          >
            {{ romDetails.sha256 }}
          </p>
        </div>
      </div>
      <div v-else class="flex-col items-center justify-center text-center text-white select-none">
        <p class="font-bold">Load ROM</p>
        <div class="text-xs text-gray-400">Click Here</div>
      </div>
    </template>
    <div>
      <div class="flex items-center justify-center pb-1 text-center text-xs text-white md:text-sm">
        <div v-if="!rom">
          <p>First, select a Kid Chameleon ROM to start.</p>
          <p class="text-gray-400">ROM Hacks are partially supported.</p>
        </div>
      </div>
      <div class="flex items-center justify-center gap-2">
        <ReadFile @load="onFileRead" />
        <button
          v-if="rom"
          @click="unloadRom"
          class="box-content cursor-pointer rounded-lg border border-amber-500 p-2 text-amber-500 hover:bg-amber-900"
        >
          Unload
        </button>
      </div>
    </div>
    <template #footer>
      <div
        class="flex flex-col items-center justify-evenly gap-2 text-center text-xs text-gray-400"
      >
        <div class="flex-1">The ROM is loaded only in your browser.</div>
        <div class="flex-1">All copyrights belong to their respective owners.</div>
      </div>
    </template>
  </MegaDriveCart>
</template>

<script setup lang="ts">
import useRomStore from '@/stores/romStore'
import ReadFile from './ReadFile.vue'
import { storeToRefs } from 'pinia'
import { ref } from 'vue'
import MegaDriveCart from './MegaDriveCart.vue'


const { rom, romDetails, romFullLoaded, romLoading } = storeToRefs(useRomStore())
const { loadRom, unloadRom } = useRomStore()
const inserted = ref<boolean>(!romFullLoaded.value && !romLoading.value)

const onFileRead = (bytes: ArrayBuffer) => {
  try {
    loadRom(new Uint8Array(bytes))
    inserted.value = true
  } catch (e) {
    console.error(e)
  }
}
</script>

<style scoped></style>
