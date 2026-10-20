<template>
  <div class="h-full overflow-auto">
    <GlassPanel class="h-full" :header="title">
      <div v-if="isPending" class="flex h-full w-full items-center justify-center text-center">
        <div class="border-primary h-12 w-12 animate-spin rounded-full border-4 border-t-transparent"></div>
      </div>
      <div v-else-if="isError" class="rounded bg-red-900/50 p-3 text-red-300">
        Error loading resource:
        <div class="mt-1 font-mono text-white">{{ error?.message }}</div>
      </div>
      <ScrollArea v-else class="h-full pe-3">
        <div class="flex h-full flex-col items-stretch justify-start gap-3">
          <div class="border-border/60 flex flex-wrap items-center justify-between gap-2 rounded-md border bg-slate-900/60 px-3 py-2">
            <div class="flex min-w-0 flex-wrap items-center gap-2">
              <p class="text-muted-foreground font-mono text-sm">{{ addressFormat(resourceAddress) }}</p>
              <Badge v-if="resource" variant="outline">
                {{ getNameForType(resource.type) }}
              </Badge>
              <Badge
                v-if="resource?.confidence === 'possible'"
                variant="outline"
                class="border-amber-400/50 text-amber-200 uppercase"
                title="Heuristic discovery; verify references before relying on this resource."
              >
                Possible
              </Badge>
              <Badge v-if="resource?.loaded" variant="secondary" class="uppercase">Decoded</Badge>
            </div>

            <div class="flex flex-wrap items-center gap-1">
              <Button
                size="icon-sm"
                variant="ghost"
                :disabled="!canGoBack"
                aria-label="History back"
                title="History back (Alt+Left)"
                @click="goBack"
              >
                <Icon name="heroicons:arrow-left-solid" class="size-4" />
              </Button>
              <span class="text-muted-foreground px-1 text-[10px]">History {{ historyPosition }}</span>
              <Button
                size="icon-sm"
                variant="ghost"
                :disabled="!canGoForward"
                aria-label="History forward"
                title="History forward (Alt+Right)"
                @click="goForward"
              >
                <Icon name="heroicons:arrow-right-solid" class="size-4" />
              </Button>

              <span class="mx-1 h-4 w-px bg-white/15"></span>

              <Button
                size="icon-sm"
                variant="ghost"
                :disabled="previousInList === null"
                aria-label="Previous resource in filtered list"
                title="Previous in filtered list"
                @click="goToListOffset(-1)"
              >
                <Icon name="heroicons:chevron-up-solid" class="size-4" />
              </Button>
              <span class="text-muted-foreground px-1 text-[10px]">List {{ listPosition }}</span>
              <Button
                size="icon-sm"
                variant="ghost"
                :disabled="nextInList === null"
                aria-label="Next resource in filtered list"
                title="Next in filtered list"
                @click="goToListOffset(1)"
              >
                <Icon name="heroicons:chevron-down-solid" class="size-4" />
              </Button>

              <span class="mx-1 h-4 w-px bg-white/15"></span>

              <span class="text-muted-foreground text-[10px]">Related</span>
              <Button
                size="icon-sm"
                variant="ghost"
                :disabled="previousRelated === null"
                aria-label="Previous related resource"
                title="Previous related resource"
                @click="goToRelated(-1)"
              >
                <Icon name="heroicons:arrow-uturn-left-solid" class="size-4" />
              </Button>
              <span class="text-muted-foreground px-1 text-[10px]">{{ relatedPosition }}</span>
              <Button
                size="icon-sm"
                variant="ghost"
                :disabled="nextRelated === null"
                aria-label="Next related resource"
                title="Next related resource"
                @click="goToRelated(1)"
              >
                <Icon name="heroicons:arrow-uturn-right-solid" class="size-4" />
              </Button>
            </div>
          </div>

          <div class="border-border/60 rounded-md border bg-indigo-950/55 p-3">
            <div class="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p class="text-sm font-semibold">Preview</p>
              <Button
                v-if="canCompare"
                size="sm"
                :variant="compareEnabled ? 'secondary' : 'ghost'"
                @click="compareEnabled = !compareEnabled"
              >
                {{ compareEnabled ? 'Close comparison' : 'Compare…' }}
              </Button>
            </div>
            <div :class="compareEnabled ? 'grid gap-3 2xl:grid-cols-2' : ''">
              <VisualResourceView v-if="resource" :resource="resource" />
              <div v-else class="text-muted-foreground flex h-full items-center justify-center text-sm">
                No dedicated viewer for this resource type.
              </div>
              <ResourceComparePanel v-if="compareEnabled && resource" :current-resource="resource" />
            </div>
          </div>

          <ResourceMetadataPanel
            v-if="resource"
            :resource="resource"
            :reference-count="referencesWithKind.length"
            :referenced-by-count="referencedByWithKind.length"
          />

          <div class="grid gap-3 lg:grid-cols-2">
            <HexView
              v-if="hexData"
              title="Input Data"
              :data="hexData.inputData"
              :address="hexData.inputAddress"
              :declared-size="hexData.declaredSize"
            />
            <GlassPanel v-else class="h-auto">
              <p class="text-muted-foreground p-2 text-sm">
                No byte range is declared for this resource, so hex inspection is unavailable.
              </p>
            </GlassPanel>

            <div class="flex flex-col gap-3">
              <GlassPanel header="References" class="h-auto max-h-64">
                <ScrollArea class="h-full pe-3">
                  <ul class="space-y-1">
                    <li v-for="reference in referencesWithKind" :key="`${reference.resource.baseAddress}-${reference.kind}`"
                      class="hover:bg-accent rounded-md px-2 py-1">
                      <div class="flex items-center justify-between gap-2">
                        <NuxtLink class="block min-w-0 truncate text-sm"
                          :to="getResourceRoute(reference.resource.baseAddress)">
                          {{ getNormalizedName(reference.resource) }}
                        </NuxtLink>
                        <Badge variant="outline" class="px-1.5 py-0 text-[10px] uppercase tracking-wide">
                          {{ reference.kind }}
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
                    <li v-for="reference in referencedByWithKind" :key="`${reference.resource.baseAddress}-${reference.kind}`"
                      class="hover:bg-accent rounded-md px-2 py-1">
                      <div class="flex items-center justify-between gap-2">
                        <NuxtLink class="block min-w-0 truncate text-sm"
                          :to="getResourceRoute(reference.resource.baseAddress)">
                          {{ getNormalizedName(reference.resource) }}
                        </NuxtLink>
                        <Badge variant="outline" class="px-1.5 py-0 text-[10px] uppercase tracking-wide">
                          {{ reference.kind }}
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
    </GlassPanel>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, toRefs, watch } from 'vue'
import { useEventListener } from '@vueuse/core'
import { useResourceDetails } from '~/composables/useResourceDetails'
import { useResourceNavigation } from '~/composables/useResourceNavigation'
import { useResourcesIndex } from '~/composables/useResourcesIndex'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { ScrollArea } from '~/components/ui/scroll-area'
import { addressFormat, getNameForType, getNormalizedName, getResourceRoute } from '~/utils/index'
import { isVisualResourceType } from '~/utils/resourceVisuals'

interface Props {
  resourceAddress: number
}
const props = defineProps<Props>()
const { resourceAddress } = toRefs(props)
const { resource, error, referencesWithKind, referencedByWithKind, isError, isPending, title, hexData } =
  useResourceDetails(resourceAddress)

const { filteredResources } = useResourcesIndex()
const {
  canGoBack,
  canGoForward,
  historyPosition,
  recordVisit,
  navigateToAddress,
  goBack,
  goForward,
} = useResourceNavigation()

const compareEnabled = ref(false)

watch(resourceAddress, (address) => recordVisit(address), { immediate: true })

const listIndex = computed(() =>
  filteredResources.value.findIndex((entry) => entry.address === resourceAddress.value),
)
const listPosition = computed(() =>
  listIndex.value === -1 ? 'not filtered in' : `${listIndex.value + 1} / ${filteredResources.value.length}`,
)
const previousInList = computed(() => {
  if (listIndex.value <= 0) {
    return null
  }
  return filteredResources.value[listIndex.value - 1]?.address ?? null
})
const nextInList = computed(() => {
  const nextIndex = listIndex.value + 1
  if (nextIndex <= 0) {
    return null
  }
  return filteredResources.value[nextIndex]?.address ?? null
})

const relatedAddresses = computed(() => {
  const addresses = new Set<number>()
  for (const entry of referencesWithKind.value) {
    addresses.add(entry.resource.baseAddress)
  }
  for (const entry of referencedByWithKind.value) {
    addresses.add(entry.resource.baseAddress)
  }
  return Array.from(addresses).sort((a, b) => a - b)
})

const relatedIndex = computed(() =>
  relatedAddresses.value.findIndex((address) => address === resourceAddress.value),
)
const relatedPosition = computed(() =>
  relatedAddresses.value.length === 0
    ? 'none'
    : relatedIndex.value === -1
      ? `0 / ${relatedAddresses.value.length}`
      : `${relatedIndex.value + 1} / ${relatedAddresses.value.length}`,
)
const previousRelated = computed(() => {
  if (relatedIndex.value > 0) {
    return relatedAddresses.value[relatedIndex.value - 1] ?? null
  }
  return null
})
const nextRelated = computed(() => {
  if (relatedIndex.value === -1) {
    return relatedAddresses.value[0] ?? null
  }
  return relatedAddresses.value[relatedIndex.value + 1] ?? null
})

const canCompare = computed(() => resource.value !== null && isVisualResourceType(resource.value.type))

watch(
  () => resource.value?.type,
  (type) => {
    if (type === undefined || !isVisualResourceType(type)) {
      compareEnabled.value = false
    }
  },
)

function goToListOffset(offset: number) {
  const target = offset < 0 ? previousInList.value : nextInList.value
  if (target !== null) {
    void navigateToAddress(target)
  }
}

function goToRelated(offset: number) {
  const target = offset < 0 ? previousRelated.value : nextRelated.value
  if (target !== null) {
    void navigateToAddress(target)
  }
}

if (import.meta.client) {
  useEventListener(window, 'keydown', (event) => {
    if (!event.altKey || event.defaultPrevented) {
      return
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      void goBack()
    } else if (event.key === 'ArrowRight') {
      event.preventDefault()
      void goForward()
    }
  })
}
</script>
