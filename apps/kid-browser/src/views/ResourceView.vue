<template>
  <div class="h-full overflow-auto">
    <div class="max-w-5xl mx-auto flex flex-col gap-4">
      {{ address }}
      <div class="grid lg:grid-cols-2 gap-2">
        <HexView
          v-if="inputData"
          title="input Data"
          :data="inputData"
          :address="resourceQuery.data.value?.baseAddress"
        />
        <HexView v-if="unpackedData" title="Unpacked Data" :data="unpackedData" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'
import { useQuery } from '@tanstack/vue-query'
import useRomStore from '@/stores/rom'
import { computed } from 'vue'
import HexView from '@/components/HexView.vue'
import type { DataResource } from '@repo/kid-util'

const route = useRoute()
const address = computed(() => route.params.address) // Torna reativo
const { rom } = useRomStore()
const inputData = computed(() => {
  if (!rom) {
    return null
  }
  if (resourceQuery.data.value) {
    if (resourceQuery.data.value.inputSize) {
      return rom.bytes.subarray(
        resourceQuery.data.value.baseAddress,
        resourceQuery.data.value.baseAddress + resourceQuery.data.value.inputSize,
      )
    }
  }
  return null
})
const unpackedData = computed(() => {
  if (!rom) {
    return null
  }
  if (resourceQuery.data.value) {
    if ((resourceQuery.data.value as DataResource).data) {
      return (resourceQuery.data.value as DataResource).data
    }
  }
  return null
})

const resourceQuery = useQuery({
  queryKey: ['resource', address],
  queryFn: async () => {
    if (!rom) {
      throw new Error('No ROM loaded')
    }
    return rom.getLoadedResource(parseInt(address.value as string, 16))
  },
})
</script>

<style scoped></style>
