<template>
  <div class="h-full min-h-0 overflow-hidden">
    <GlassPanel class="h-full" :header="title">
      <div v-if="isPending" class="flex h-full w-full items-center justify-center text-center">
        <div
          class="border-primary h-12 w-12 animate-spin rounded-full border-4 border-t-transparent"
        ></div>
      </div>
      <div v-else-if="isError" class="rounded bg-red-900/50 p-3 text-red-300">
        Error loading resource:
        <div class="mt-1 font-mono text-white">{{ resource.error.value?.message }}</div>
      </div>
      <div v-else class="flex h-full min-h-0 flex-col overflow-hidden">
        <ScrollArea class="min-h-0 flex-1 pe-2">
          <div class="flex min-h-0 flex-col gap-3">
            <div
              class="border-border/60 flex items-center justify-between gap-2 rounded-md border bg-slate-900/60 px-3 py-2"
            >
              <p class="text-muted-foreground text-sm">{{ addressFormat(resourceAddress) }}</p>
              <Badge v-if="resource.data.value" variant="outline">
                {{ getNameForType(resource.data.value.type) }}
              </Badge>
            </div>

            <div
              class="border-border/60 min-h-[240px] overflow-auto rounded-md border bg-slate-950/55 p-3"
            >
              <component
                v-if="componentValues"
                :is="componentValues.viewerComponent"
                v-bind="componentValues.props"
              />
              <div
                v-else
                class="text-muted-foreground flex h-full items-center justify-center text-sm"
              >
                No dedicated viewer for this resource type.
              </div>
            </div>

            <div class="grid gap-3 lg:grid-cols-2">
              <HexView
                v-if="hexData"
                title="Input Data"
                :data="hexData.inputData"
                :address="hexData.inputAddress"
              />
              <GlassPanel header="References" class="h-auto max-h-64">
                <ScrollArea class="h-full pe-3">
                  <ul class="space-y-1">
                    <li
                      v-for="ref in references"
                      :key="ref.baseAddress"
                      class="hover:bg-accent rounded-md px-2 py-1"
                    >
                      <NuxtLink
                        class="block text-sm"
                        :to="{
                          name: 'resources-address',
                          params: { address: addressFormat(ref.baseAddress) },
                        }"
                      >
                        {{ getNormalizedName(ref) }}
                      </NuxtLink>
                    </li>
                    <li v-if="references.length === 0" class="text-muted-foreground text-sm">
                      No references mapped.
                    </li>
                  </ul>
                </ScrollArea>
              </GlassPanel>
            </div>
          </div>
        </ScrollArea>
      </div>
    </GlassPanel>
  </div>
</template>

<script setup lang="ts">
import { useResourceLoader } from '~/composables/useResourceLoader'
import useRomStore from '~/stores/romStore'
import { Badge } from '~/components/ui/badge'
import { ScrollArea } from '~/components/ui/scroll-area'
import {
  isLoadedResource,
  isPlaneResource,
  isSheetResource,
  isSpriteFrameResource,
} from '@repo/kid-util'
import { storeToRefs } from 'pinia'
import { computed, defineAsyncComponent, toRefs } from 'vue'
import { addressFormat, getNameForType, getNormalizedName } from '~/utils/index'

interface Props {
  resourceAddress: number
}
const props = defineProps<Props>()
const { resourceAddress } = toRefs(props)
const { rom } = storeToRefs(useRomStore())
const resourceLoader = useResourceLoader()
const resource = resourceLoader.value.useGetResourceLoadedQuery(resourceAddress)
const referencesQuery = resourceLoader.value.getReferencesResourcesQuery(resourceAddress)
const references = computed(() => referencesQuery.data.value ?? [])
const { isError, isPending } = resource

const title = computed(() => {
  let str = `Resource Viewer: (${addressFormat(resourceAddress.value)})`
  if (resource.data.value) {
    str += ` - ${getNameForType(resource.data.value.type)}`
    if (resource.data.value.name) str += ` - ${resource.data.value.name}`
  }
  return str
})

const tileSheetComponent = defineAsyncComponent(
  () => import('~/components/rom-resources/TileSheetView.vue'),
)
const spriteFrameComponent = defineAsyncComponent(
  () => import('~/components/rom-resources/SpriteFrameView.vue'),
)
const planeComponent = defineAsyncComponent(
  () => import('~/components/rom-resources/PlaneView.vue'),
)

const componentValues = computed(() => {
  if (!resource.data.value || !isLoadedResource(resource.data.value)) return null
  if (isSheetResource(resource.data.value)) {
    return { viewerComponent: tileSheetComponent, props: { resource: resource.data.value } }
  } else if (isSpriteFrameResource(resource.data.value)) {
    return { viewerComponent: spriteFrameComponent, props: { resource: resource.data.value } }
  } else if (isPlaneResource(resource.data.value)) {
    return { viewerComponent: planeComponent, props: { resource: resource.data.value } }
  }
  return null
})

const hexData = computed(() => {
  if (!resource.data.value || !isLoadedResource(resource.data.value)) return null
  return {
    inputData: rom.value!.bytes.subarray(
      resource.data.value.baseAddress,
      resource.data.value.baseAddress + resource.data.value.inputSize,
    ),
    inputAddress: resource.data.value.baseAddress,
  }
})
</script>
