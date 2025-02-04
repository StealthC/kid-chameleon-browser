<template>
  <Panel @toggle="onToggle" :collapsed="minimized" class="md-cart">
    <template #header>
      <div
        v-if="romDetails"
        @click="onToggle"
        class="mx-auto flex h-16 w-9/12 cursor-pointer select-none items-center justify-center text-center"
      >
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
            class="overflow-hidden text-ellipsis whitespace-nowrap pt-1 text-right font-mono text-muted-color"
          >
            {{ romDetails.sha256 }}
          </p>
        </div>
      </div>
      <div
        v-else
        @click="onToggle"
        class="mx-auto flex h-16 w-9/12 cursor-pointer select-none flex-col items-center justify-center text-center text-white"
      >
        <p class="font-bold">Load ROM</p>
        <div class="text-xs text-gray-400">Click Here</div>
      </div>
    </template>
    <div>
      <div
        class="mx-auto flex w-9/12 items-center justify-center pb-1 text-center text-xs text-white md:text-sm"
      >
        <div v-if="!rom">
          <p>First, select a Kid Chameleon ROM to start.</p>
          <p class="text-gray-400">ROM Hacks are partially supported.</p>
        </div>
      </div>
      <ReadFile @load="onFileRead" />
    </div>
    <template #footer>
      <div
        class="mx-auto flex w-9/12 flex-col items-center justify-evenly gap-2 text-center text-xs text-gray-400"
      >
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
import { useRouter } from 'vue-router'

const minimized = ref(true)
const { rom, romDetails } = storeToRefs(useRomStore())
const { loadRom } = useRomStore()
const toast = useToast()
const router = useRouter()

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
    router.push('/rom')
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
