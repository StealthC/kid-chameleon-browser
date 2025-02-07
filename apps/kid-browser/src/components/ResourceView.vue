<template>
  <div class="h-full overflow-auto">
    <Panel :header="title">
      <div class="w-full text-center" v-if="isPending">
        <ProgressSpinner />
      </div>
      <div v-else-if="isError">
        <Message severity="error" text="Error loading resource" />
      </div>
      <div v-else>
        <component
          v-if="componentValues"
          :is="componentValues.viewerComponent"
          v-bind="componentValues.props"
        />
        <div class="grid gap-2 lg:grid-cols-2">
          <HexView
            v-if="hexData"
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
import {
  isLoadedResource,
  isSheetResource,
  isSpriteFrameResource,
  type SheetRomResourceLoaded,
  type SpriteFrameRomResourceLoaded,
} from '@repo/kid-util'
import { storeToRefs } from 'pinia'
import { computed, defineAsyncComponent, toRefs } from 'vue'
import HexView from './HexView.vue'
import { addressFormat, getNameForType } from '@/utils'
import { Panel, ProgressSpinner, Message } from 'primevue'

interface Props {
  resourceAddress: number
}
const props = defineProps<Props>()
const { resourceAddress } = toRefs(props)
const { rom } = storeToRefs(useRomStore())
const resourceLoader = useResourceLoader()
const resource = resourceLoader.value.useGetResourceQuery(resourceAddress, true)
const {isError, isPending} = resource

const title = computed(() => {
  let str = `Resource Viewer: (${addressFormat(resourceAddress.value)})`
  if (resource.data.value) {
    str += ` - ${getNameForType(resource.data.value.type)}`
    if (resource.data.value.name) {
      str += ` - ${resource.data.value.name}`
    }
  }
  return str
})

const tileSheetComponent = defineAsyncComponent(
  () => import('@/components/rom-resources/TileSheetView.vue'),
)
const spriteFrameComponent = defineAsyncComponent(
  () => import('@/components/rom-resources/SpriteFrameView.vue'),
)

const componentValues = computed(() => {
  if (isSheetResource(resource.data.value!)) {
    return {
      viewerComponent: tileSheetComponent,
      props: { resource: resource.data.value as SheetRomResourceLoaded },
    }
  } else if (isSpriteFrameResource(resource.data.value!)) {
    return {
      viewerComponent: spriteFrameComponent,
      props: { resource: resource.data.value as SpriteFrameRomResourceLoaded },
    }
  }
  return null
})

const hexData = computed(() => {
  if (!resource.data.value || !isLoadedResource(resource.data.value)) {
    return null
  }
  return {
    inputData: rom.value!.bytes.subarray(
      resource.data.value.baseAddress,
      resource.data.value.baseAddress + resource.data.value.inputSize,
    ),
    inputAddress: resource.data.value.baseAddress,
  }
})
</script>

<style scoped></style>
