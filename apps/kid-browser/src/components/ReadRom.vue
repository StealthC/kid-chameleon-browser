<template>
  <Panel @toggle="onToggle" :collapsed="minimized" class="md-cart">
    <template #header>
      <div
        v-if="romDetails"
        @click="onToggle"
        class="text-center w-9/12 mx-auto h-16 flex items-center justify-center cursor-pointer"
      >
        <div class="truncate flex flex-col">
          <p
            v-if="romDetails.known"
            class="font-bold text-xl"
            :class="{
              'text-green-500': !romDetails.known.hack,
              'text-amber-500': romDetails.known.hack,
            }"
          >
            {{ romDetails.known.name }}
          </p>
          <p v-else class="text-red-500 font-bold">Unknown</p>
          <p
            class="text-right text-muted-color font-mono overflow-hidden text-ellipsis whitespace-nowrap pt-1"
          >
            {{ romDetails.sha256 }}
          </p>
        </div>
      </div>
      <div v-else class="text-center w-9/12 mx-auto flex items-center justify-center">
        <p class="font-bold">Load ROM</p>
      </div>
    </template>
    <div>
      <div class="text-center w-9/12 mx-auto flex items-center justify-center text-xs md:text-sm pb-1">
        <div v-if="!rom">
          <p>First, select a Kid Chameleon ROM to start.</p>
          <p class="text-muted-color">ROM Hacks are partially supported.</p>
        </div>
      </div>
      <ReadFile @load="onFileRead" />
    </div>
    <template #footer>
      <div class="text-center w-9/12 mx-auto flex flex-col items-center justify-evenly gap-2 text-muted-color text-xs">
        <div class="flex-1">The ROM is loaded only in your browser.</div>
        <div class="flex-1">All copyrights belong to their respective owners.</div>
      </div>
    </template>
  </Panel>
</template>

<script setup lang="ts">
import useRomStore from '@/stores/rom'
import ReadFile from './ReadFile.vue'
import { storeToRefs } from 'pinia'
import { useToast } from 'primevue/usetoast'
import { ref } from 'vue'
import { Panel } from 'primevue'

const minimized = ref(false)
const { rom, romDetails } = storeToRefs(useRomStore())
const { loadRom } = useRomStore()
const toast = useToast()

const onToggle = () => {
  minimized.value = !minimized.value
}

const onFileRead = (bytes: ArrayBuffer) => {
  try {
    loadRom(new Uint8Array(bytes))
    toast.add({
      severity: 'success',
      summary: 'ROM Loaded',
      detail: 'ROM File has been loaded successfully',
      life: 2000,
    })
    minimized.value = true
  } catch (e) {
    console.error(e)
  }
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
