<template>
  <Panel :toggleable="!!rom" @toggle="onToggle" :collapsed="minimized" >
    <template #header>
      <div v-if="romDetails" class="text-center w-full">
        <p
          v-if="romDetails.known"
          class="font-bold"
          :class="{
            'text-green-500': !romDetails.known.hack,
            'text-amber-500': romDetails.known.hack,
          }"
        >
          {{ romDetails.known.name }}
        </p>
        <p v-else class="text-red-500 font-bold">Unknown</p>
      </div>
      <div v-else class="text-center w-full">
        <p class="font-bold">Load ROM</p>
      </div>
    </template>
    <div>
      <div class="pb-4">
        <div v-if="!rom">
          <p class="text-center">First, select a Kid Chameleon ROM to start.</p>
          <p class="text-muted-color text-sm text-center">ROM Hacks are currently not supported.</p>
        </div>
      </div>
      <ReadFile @load="onFileRead" />
    </div>
    <template #footer>
      <div class="text-muted-color text-center text-xs">
        <p>ROMs are not stored remotely.</p>
        <p>They are only loaded in your browser.</p>
        <p>All copyrights belong to their respective owners.</p>
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

<style scoped></style>
