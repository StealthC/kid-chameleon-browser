<template>
  <GlassPanel>
    <div
      v-for="resource in resourceList"
      :key="resource.type"
      class="flex cursor-pointer flex-row justify-between gap-2 p-2 select-none group hover:bg-white/10"
    >
      <p class="text-md font-bold group-hover:text-yellow-400">{{ getNameForType(resource.type) }}</p>
      <p class="text-right text-gray-400">{{ resource.count }}</p>
    </div>
  </GlassPanel>
</template>

<script setup lang="ts">
import useRomStore from '@/stores/romStore'
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import GlassPanel from './GlassPanel.vue'
import { getNameForType } from '@/utils'

const { rom } = storeToRefs(useRomStore())

const resourceList = computed(() => {
  return Array.from(rom.value!.resources.resourcesByType.entries())
    .map(([type, resources]) => {
      return {
        type,
        count: resources.size,
      }
    })
    .filter(({ count }) => count > 0)
})
</script>

<style scoped></style>
