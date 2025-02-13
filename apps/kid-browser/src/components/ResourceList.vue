<template>
  <GlassPanel class="h-full w-full max-w-sm overflow-hidden">
    <div class="flex h-full w-full flex-row overflow-hidden">
      <div
        :class="{
          'max-w-0 scale-0': minimized,
          'max-w-sm scale-100 pe-4': !minimized,
        }"
        class="h-full w-full grow overflow-hidden transition-[max-width]"
      >
        <div v-if="selectedType === null" class="h-full w-full overflow-hidden">
          <div
            v-for="resource in resourceList"
            @click="selectType(resource.type)"
            :key="resource.type"
            class="group flex cursor-pointer flex-row justify-between gap-2 p-2 select-none hover:bg-white/10"
          >
            <p class="text-md font-bold group-hover:text-yellow-400">
              {{ getNameForType(resource.type) }}
            </p>
            <p class="text-right text-gray-400">{{ resource.count }}</p>
          </div>
        </div>
        <div v-else class="flex h-full min-h-72 w-full flex-col items-start overflow-hidden">
          <div
            @click="selectType(null)"
            class="flex cursor-pointer flex-row justify-between gap-2 p-2 font-bold select-none hover:bg-white/10 hover:text-yellow-400"
          >
            <div>{{ '< ' }}{{ getNameForType(selectedType) }}</div>
          </div>
          <div class="w-full overflow-y-auto">
            <RouterLink
              v-for="resource in resourcesForType"
              :key="resource.address"
              :to="{
                name: 'resources',
                params: { address: addressFormat(resource.address) },
              }"
              class="group flex cursor-pointer flex-row justify-between gap-2 p-2 select-none hover:bg-white/10"
            >
              <p class="text-md font-bold group-hover:text-yellow-400">
                {{ resource.name }}
              </p>
            </RouterLink>
          </div>
        </div>
      </div>

      <div
        @click="toggleMinimized"
        class="flex max-w-3 cursor-pointer items-center justify-center font-bold whitespace-nowrap uppercase"
      >
        <div class="rotate-90 text-gray-300 select-none">RESOURCES</div>
      </div>
    </div>
  </GlassPanel>
</template>

<script setup lang="ts">
import useRomStore from '@/stores/romStore'
import { storeToRefs } from 'pinia'
import { computed, ref } from 'vue'
import GlassPanel from './GlassPanel.vue'
import { getNameForType, getNormalizedName, addressFormat } from '@/utils'
import { type ResourceType } from '@repo/kid-util'

const minimized = defineModel('minimized', {
  type: Boolean,
  default: false,
})

const { rom } = storeToRefs(useRomStore())
const selectedType = ref<ResourceType | null>(null)
const resourcesForType = ref<Resource[]>([])

const toggleMinimized = () => {
  minimized.value = !minimized.value
}

type ResourceList = {
  type: ResourceType
  count: number
}

type Resource = {
  address: number
  name: string
}

const selectType = (type: ResourceType | null) => {
  selectedType.value = type
  if (type) {
    resourcesForType.value = Array.from(rom.value!.resources.resourcesByType.get(type)!).map(
      (address) => {
        const resource = rom.value!.resources.getResource(address)!
        return {
          address,
          name: getNormalizedName(resource, true),
        } as Resource
      },
    )
  } else {
    resourcesForType.value = []
  }
}

const resourceList = computed(() => {
  return Array.from(rom.value!.resources.resourcesByType.entries())
    .map(([type, resources]) => {
      return {
        type,
        count: resources.size,
      }
    })
    .filter(({ count }) => count > 0) as ResourceList[]
})
</script>

<style scoped></style>
