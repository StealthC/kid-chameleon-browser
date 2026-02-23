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
        <div class="mt-1 font-mono text-white">{{ error?.message }}</div>
      </div>
      <div v-else class="flex h-full min-h-0 flex-col overflow-hidden">
        <ScrollArea class="min-h-0 flex-1 pe-2">
          <div class="flex min-h-0 flex-col gap-3">
            <div
              class="border-border/60 flex items-center justify-between gap-2 rounded-md border bg-slate-900/60 px-3 py-2"
            >
              <p class="text-muted-foreground text-sm">{{ addressFormat(resourceAddress) }}</p>
              <div class="flex items-center gap-2">
                <Badge v-if="resource" variant="outline">
                  {{ getNameForType(resource.type) }}
                </Badge>
                <Badge
                  v-if="resource?.confidence === 'possible'"
                  variant="secondary"
                  class="uppercase"
                >
                  Possible
                </Badge>
              </div>
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
              <div class="flex flex-col gap-3">
                <GlassPanel header="References" class="h-auto max-h-64">
                  <ScrollArea class="h-full pe-3">
                    <ul class="space-y-1">
                      <li
                        v-for="ref in referencesWithKind"
                        :key="`${ref.resource.baseAddress}-${ref.kind}`"
                        class="hover:bg-accent rounded-md px-2 py-1"
                      >
                        <div class="flex items-center justify-between gap-2">
                          <NuxtLink
                            class="block min-w-0 truncate text-sm"
                            :to="getResourceRoute(ref.resource.baseAddress)"
                          >
                            {{ getNormalizedName(ref.resource) }}
                          </NuxtLink>
                          <Badge
                            variant="outline"
                            class="px-1.5 py-0 text-[10px] uppercase tracking-wide"
                          >
                            {{ ref.kind }}
                          </Badge>
                        </div>
                      </li>
                      <li v-if="referencesWithKind.length === 0" class="text-muted-foreground text-sm">
                        No references mapped.
                      </li>
                    </ul>
                  </ScrollArea>
                </GlassPanel>
                <GlassPanel header="Referenced By" class="h-auto max-h-64">
                  <ScrollArea class="h-full pe-3">
                    <ul class="space-y-1">
                      <li
                        v-for="ref in referencedByWithKind"
                        :key="`${ref.resource.baseAddress}-${ref.kind}`"
                        class="hover:bg-accent rounded-md px-2 py-1"
                      >
                        <div class="flex items-center justify-between gap-2">
                          <NuxtLink
                            class="block min-w-0 truncate text-sm"
                            :to="getResourceRoute(ref.resource.baseAddress)"
                          >
                            {{ getNormalizedName(ref.resource) }}
                          </NuxtLink>
                          <Badge
                            variant="outline"
                            class="px-1.5 py-0 text-[10px] uppercase tracking-wide"
                          >
                            {{ ref.kind }}
                          </Badge>
                        </div>
                      </li>
                      <li v-if="referencedByWithKind.length === 0" class="text-muted-foreground text-sm">
                        No resources point to this address.
                      </li>
                    </ul>
                  </ScrollArea>
                </GlassPanel>
              </div>
            </div>
          </div>
        </ScrollArea>
      </div>
    </GlassPanel>
  </div>
</template>

<script setup lang="ts">
import { useResourceDetails } from '~/composables/useResourceDetails'
import { Badge } from '~/components/ui/badge'
import { ScrollArea } from '~/components/ui/scroll-area'
import {
  isAnimationResource,
  isAnimationStepResource,
  isLevelBackgroundLayoutResource,
  isLevelEnemyLayoutResource,
  isLoadedResource,
  isPaletteResource,
  isPlaneResource,
  isSheetResource,
  isSpriteFrameResource,
} from '@repo/kid-util'
import { computed, defineAsyncComponent, toRefs } from 'vue'
import { addressFormat, getNameForType, getNormalizedName, getResourceRoute } from '~/utils/index'

interface Props {
  resourceAddress: number
}
const props = defineProps<Props>()
const { resourceAddress } = toRefs(props)
const { resource, error, referencesWithKind, referencedByWithKind, isError, isPending, title, hexData } =
  useResourceDetails(resourceAddress)

const tileSheetComponent = defineAsyncComponent(
  () => import('~/components/rom-resources/TileSheetView.vue'),
)
const spriteFrameComponent = defineAsyncComponent(
  () => import('~/components/rom-resources/SpriteFrameView.vue'),
)
const planeComponent = defineAsyncComponent(
  () => import('~/components/rom-resources/PlaneView.vue'),
)
const animationComponent = defineAsyncComponent(
  () => import('~/components/rom-resources/AnimationView.vue'),
)
const animationStepComponent = defineAsyncComponent(
  () => import('~/components/rom-resources/AnimationStepView.vue'),
)
const paletteComponent = defineAsyncComponent(
  () => import('~/components/rom-resources/PaletteView.vue'),
)
const unknownComponent = defineAsyncComponent(
  () => import('~/components/rom-resources/UnknownView.vue'),
)
const levelEnemyLayoutComponent = defineAsyncComponent(
  () => import('~/components/rom-resources/LevelEnemyLayoutView.vue'),
)
const levelBackgroundLayoutComponent = defineAsyncComponent(
  () => import('~/components/rom-resources/LevelBackgroundLayoutView.vue'),
)

const componentValues = computed(() => {
  if (!resource.value) return null
  if (resource.value.type === 'unknown') {
    return { viewerComponent: unknownComponent, props: { resource: resource.value } }
  }
  if (!isLoadedResource(resource.value)) return null
  if (isSheetResource(resource.value)) {
    return { viewerComponent: tileSheetComponent, props: { resource: resource.value } }
  } else if (isSpriteFrameResource(resource.value)) {
    return { viewerComponent: spriteFrameComponent, props: { resource: resource.value } }
  } else if (isPlaneResource(resource.value)) {
    return { viewerComponent: planeComponent, props: { resource: resource.value } }
  } else if (isAnimationResource(resource.value)) {
    return { viewerComponent: animationComponent, props: { resource: resource.value } }
  } else if (isAnimationStepResource(resource.value)) {
    return { viewerComponent: animationStepComponent, props: { resource: resource.value } }
  } else if (isPaletteResource(resource.value)) {
    return { viewerComponent: paletteComponent, props: { resource: resource.value } }
  } else if (isLevelBackgroundLayoutResource(resource.value)) {
    return { viewerComponent: levelBackgroundLayoutComponent, props: { resource: resource.value } }
  } else if (isLevelEnemyLayoutResource(resource.value)) {
    return { viewerComponent: levelEnemyLayoutComponent, props: { resource: resource.value } }
  }
  return null
})
</script>
