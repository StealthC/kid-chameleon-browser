<template>
  <div class="h-full overflow-hidden">
    <GlassPanel class="h-full" :header="title">
      <div class="flex h-full w-full items-center justify-center text-center" v-if="isPending">
        <ProgressSpinner />
      </div>
      <div v-else-if="isError" class="h-full">
        <Message severity="error">
          Error loading resource:
          <div class="font-mono text-white">{{ resource.error.value?.message }}</div>
        </Message>
      </div>
      <div v-else class="flex h-full flex-col gap-2">
        <div class="h-full flex-1">
          <component
            v-if="componentValues"
            :is="componentValues.viewerComponent"
            v-bind="componentValues.props"
          />
        </div>
        <div class="grid shrink gap-2 overflow-y-auto lg:grid-cols-2">
          <HexView
            v-if="hexData"
            title="input Data"
            :data="hexData.inputData"
            :address="hexData.inputAddress"
          />
          <div class="flex flex-col gap-2">
            <GlassPanel header="References:">
              <ul>
                <li v-for="ref in references" :key="ref.baseAddress">
                  <RouterLink
                    class="hover:bg-white/10 hover:text-yellow-400"
                    :to="{
                      name: 'resources',
                      params: { address: addressFormat(ref.baseAddress) },
                    }"
                  >
                    {{ getNormalizedName(ref) }}
                  </RouterLink>
                </li>
              </ul>
            </GlassPanel>
            <GlassPanel header="Referenced By:">
              <ul>
                <li v-for="ref in references" :key="ref.baseAddress">
                  <!--  TODO: Fix this, add referenced by -->
                  <RouterLink
                    class="hover:bg-white/10 hover:text-yellow-400"
                    :to="{
                      name: 'resources',
                      params: { address: addressFormat(ref.baseAddress) },
                    }"
                  >
                    {{ getNormalizedName(ref) }}
                  </RouterLink>
                </li>
              </ul>
            </GlassPanel>
          </div>
        </div>
      </div>
    </GlassPanel>
  </div>
</template>

<script setup lang="ts">
import { useResourceLoader } from '@/composables/resource-loader'
import useRomStore from '@/stores/romStore'
import {
  isLoadedResource,
  isPlaneResource,
  isSheetResource,
  isSpriteFrameResource,
} from '@repo/kid-util'
import { storeToRefs } from 'pinia'
import { computed, defineAsyncComponent, toRefs } from 'vue'
import HexView from './HexView.vue'
import { addressFormat, getNameForType, getNormalizedName } from '@/utils'
import GlassPanel from './GlassPanel.vue'
import ProgressSpinner from 'primevue/progressspinner'
import Message from 'primevue/message'

interface Props {
  resourceAddress: number
}
const props = defineProps<Props>()
const { resourceAddress } = toRefs(props)
const { rom } = storeToRefs(useRomStore())
const resourceLoader = useResourceLoader()
const resource = resourceLoader.value.useGetResourceLoadedQuery(resourceAddress)
const referencesQuery = resourceLoader.value.getReferencesResourcesQuery(resourceAddress)
const references = computed(() => (referencesQuery.data.value ? referencesQuery.data.value : []))
const { isError, isPending } = resource

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
const planeComponent = defineAsyncComponent(
  () => import('@/components/rom-resources/PlaneView.vue'),
)

const componentValues = computed(() => {
  if (!resource.data.value || !isLoadedResource(resource.data.value)) {
    return null
  }
  if (isSheetResource(resource.data.value!)) {
    return {
      viewerComponent: tileSheetComponent,
      props: { resource: resource.data.value },
    }
  } else if (isSpriteFrameResource(resource.data.value!)) {
    return {
      viewerComponent: spriteFrameComponent,
      props: { resource: resource.data.value },
    }
  } else if (isPlaneResource(resource.data.value!)) {
    return {
      viewerComponent: planeComponent,
      props: { resource: resource.data.value },
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
