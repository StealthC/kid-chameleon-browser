<template>
  <div class="h-full overflow-auto">
    <Panel header="Resource Viewer">
      <div class="mx-auto flex max-w-5xl flex-col gap-4">
        <component
          v-if="componentValues"
          :is="componentValues?.viewerComponent"
          v-bind="componentValues?.props"
        />
        {{ addressFormat(resourceAddress) }}
        <div class="grid gap-2 lg:grid-cols-2">
          <HexView
            v-if="hexData.inputData"
            title="input Data"
            :data="hexData.inputData"
            :address="hexData.inputAddress"
          />
        </div>
      </div>
    </Panel>
  </div>
</template>

<script setup lang="ts">
import { useResourceLoader } from '@/composables/resource-loader'
import useRomStore from '@/stores/rom'
import { isLoadedResource, isSheetResource, isSpriteFrameResource, type SheetRomResourceLoaded, type SpriteFrameRomResourceLoaded } from '@repo/kid-util'
import { storeToRefs } from 'pinia'
import { computed, defineAsyncComponent, toRefs } from 'vue'
import HexView from './HexView.vue'
import { addressFormat } from '@/utils'
import { Panel } from 'primevue'

interface Props {
  resourceAddress: number
}
const props = defineProps<Props>()
const { resourceAddress } = toRefs(props)
const { rom } = storeToRefs(useRomStore())
const resourceLoader = useResourceLoader()
const resource = resourceLoader.value.useGetResourceQuery(resourceAddress, true)

const componentValues = computed(() => {
  if (!loadedResource.value) {
    return null
  } else if (isSheetResource(loadedResource.value)) {
    return {
      viewerComponent: defineAsyncComponent(() => import('@/components/rom-resources/TileSheetView.vue')),
      props: { resource: loadedResource.value as SheetRomResourceLoaded },
    }
  } else if (isSpriteFrameResource(loadedResource.value)) {
    return {
      viewerComponent: defineAsyncComponent(() => import('@/components/rom-resources/SpriteFrameView.vue')),
      props: { resource: loadedResource.value as SpriteFrameRomResourceLoaded },
    }
  }
  return null
})

const loadedResource = computed(() => {
  if (!resource.data.value || !isLoadedResource(resource.data.value)) {
    return null
  } else {
    return resource.data.value
  }
})

const hexData = computed(() => {
  if (!loadedResource.value || !rom.value) {
    return {
      inputData: null,
      inputAddress: null,
    }
  } else {
    return {
      inputData: rom.value.bytes.subarray(
        loadedResource.value.baseAddress,
        loadedResource.value.baseAddress + loadedResource.value.inputSize,
      ),
      inputAddress: loadedResource.value.baseAddress,
    }
  }
})
</script>

<style scoped></style>
