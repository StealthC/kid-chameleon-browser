<template>
  <div class="bg-default flex h-full min-h-0 flex-col">
    <header
      class="border-default flex h-11 shrink-0 items-center gap-1.5 overflow-hidden border-b px-2.5"
    >
      <div class="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto">
        <span class="text-primary font-mono text-xs font-medium">
          {{ addressFormat(resourceAddress) }}
        </span>
        <UBadge
          v-if="resource"
          color="neutral"
          variant="subtle"
          size="sm"
          :label="getNameForType(resource.type)"
          class="hidden sm:inline-flex"
        />
        <UBadge
          v-if="resource?.name"
          color="neutral"
          variant="outline"
          size="sm"
          :label="resource.name"
          class="hidden max-w-40 lg:inline-flex"
        />
        <UBadge
          v-if="resource?.confidence === 'possible'"
          color="warning"
          variant="subtle"
          size="sm"
          label="Possible"
          class="hidden xl:inline-flex"
          title="Heuristic discovery; verify references before relying on this resource."
        />
        <UBadge
          v-if="resource?.loaded"
          color="neutral"
          variant="subtle"
          size="sm"
          label="Decoded"
          class="hidden xl:inline-flex"
        />
      </div>

      <div class="ms-auto flex shrink-0 items-center gap-1">
        <div class="flex items-center gap-0.5">
          <UTooltip text="History back (Alt+Left)">
            <UButton
              icon="i-heroicons-arrow-left"
              color="neutral"
              variant="ghost"
              size="xs"
              square
              :disabled="!canGoBack"
              aria-label="History back"
              @click="goBack"
            />
          </UTooltip>
          <span class="text-dimmed hidden font-mono text-[10px] xl:inline">
            {{ historyPosition }}
          </span>
          <UTooltip text="History forward (Alt+Right)">
            <UButton
              icon="i-heroicons-arrow-right"
              color="neutral"
              variant="ghost"
              size="xs"
              square
              :disabled="!canGoForward"
              aria-label="History forward"
              @click="goForward"
            />
          </UTooltip>
        </div>

        <USeparator orientation="vertical" class="h-4" />

        <div class="flex items-center gap-0.5">
          <UTooltip text="Previous in filtered list">
            <UButton
              icon="i-heroicons-chevron-up"
              color="neutral"
              variant="ghost"
              size="xs"
              square
              :disabled="previousInList === null"
              aria-label="Previous resource in filtered list"
              @click="goToListOffset(-1)"
            />
          </UTooltip>
          <span class="text-dimmed hidden font-mono text-[10px] xl:inline">
            {{ listPosition }}
          </span>
          <UTooltip text="Next in filtered list">
            <UButton
              icon="i-heroicons-chevron-down"
              color="neutral"
              variant="ghost"
              size="xs"
              square
              :disabled="nextInList === null"
              aria-label="Next resource in filtered list"
              @click="goToListOffset(1)"
            />
          </UTooltip>
        </div>

        <USeparator orientation="vertical" class="h-4" />

        <div class="hidden items-center gap-0.5 xl:flex">
          <UTooltip text="Previous related resource">
            <UButton
              icon="i-heroicons-arrow-uturn-left"
              color="neutral"
              variant="ghost"
              size="xs"
              square
              :disabled="previousRelated === null"
              aria-label="Previous related resource"
              @click="goToRelated(-1)"
            />
          </UTooltip>
          <span class="text-dimmed hidden font-mono text-[10px] xl:inline">
            {{ relatedPosition }}
          </span>
          <UTooltip text="Next related resource">
            <UButton
              icon="i-heroicons-arrow-uturn-right"
              color="neutral"
              variant="ghost"
              size="xs"
              square
              :disabled="nextRelated === null"
              aria-label="Next related resource"
              @click="goToRelated(1)"
            />
          </UTooltip>
        </div>

        <USeparator orientation="vertical" class="h-4" />

        <UTooltip v-if="canCompare" :text="compareEnabled ? 'Close comparison' : 'Compare with…'">
          <UButton
            icon="i-heroicons-arrows-right-left"
            :color="compareEnabled ? 'primary' : 'neutral'"
            :variant="compareEnabled ? 'soft' : 'ghost'"
            size="xs"
            square
            :aria-pressed="compareEnabled"
            aria-label="Toggle comparison"
            @click="compareEnabled = !compareEnabled"
          />
        </UTooltip>

        <UTooltip :text="dockOpen ? 'Hide data dock' : 'Show data dock'">
          <UButton
            icon="i-heroicons-table-cells"
            :color="dockOpen ? 'primary' : 'neutral'"
            :variant="dockOpen ? 'soft' : 'ghost'"
            size="xs"
            square
            :aria-pressed="dockOpen"
            aria-label="Toggle data dock"
            @click="dockOpen = !dockOpen"
          />
        </UTooltip>
      </div>
    </header>

    <div class="min-h-0 flex-1 overflow-hidden p-2">
      <div v-if="isPending" class="flex h-full items-center justify-center">
        <div class="flex flex-col items-center gap-2">
          <UIcon name="i-heroicons-arrow-path" class="text-primary size-7 animate-spin" />
          <p class="text-muted text-xs">Decoding resource…</p>
        </div>
      </div>

      <UAlert
        v-else-if="isError"
        color="error"
        variant="subtle"
        icon="i-heroicons-exclamation-triangle"
        title="Error loading resource"
        :description="error?.message"
        class="m-2"
      />

      <div v-else-if="resource" class="flex h-full min-h-0 flex-col">
        <div
          class="min-h-0 flex-1"
          :class="
            compareEnabled && canCompare
              ? 'grid grid-rows-2 gap-2 xl:grid-cols-2 xl:grid-rows-1'
              : ''
          "
        >
          <section
            class="border-default bg-elevated/20 h-full min-h-0 overflow-hidden rounded-lg border p-1.5"
          >
            <VisualResourceView :resource="resource" />
          </section>
          <section
            v-if="compareEnabled && canCompare"
            class="border-default bg-elevated/20 h-full min-h-0 overflow-hidden rounded-lg border p-1.5"
          >
            <ResourceComparePanel :current-resource="resource" />
          </section>
        </div>
      </div>

      <UEmpty
        v-else
        icon="i-heroicons-cursor-arrow-rays"
        title="Select a resource"
        description="Pick a resource from the browser to inspect its preview, metadata and raw bytes."
        class="h-full"
      />
    </div>

    <section
      v-if="dockOpen"
      class="border-default bg-muted/20 flex h-[40%] max-h-[34rem] min-h-[15rem] shrink-0 flex-col border-t"
    >
      <div class="border-default flex h-9 shrink-0 items-center gap-2 border-b px-2">
        <UTabs
          :model-value="dockTab"
          :items="dockTabs"
          :content="false"
          size="xs"
          variant="link"
          class="min-w-0 flex-1"
          @update:model-value="setDockTab"
        />
        <UButton
          icon="i-heroicons-chevron-down"
          color="neutral"
          variant="ghost"
          size="xs"
          square
          aria-label="Hide data dock"
          @click="dockOpen = false"
        />
      </div>

      <div class="min-h-0 flex-1 overflow-hidden">
        <div v-if="dockTab === 'data'" class="h-full overflow-auto p-2">
          <HexView
            v-if="hexData"
            title="Input data"
            :data="hexData.inputData"
            :address="hexData.inputAddress"
            :declared-size="hexData.declaredSize"
            class="h-full"
          />
          <p v-else class="text-muted p-3 text-xs">
            No byte range is declared for this resource, so hex inspection is unavailable.
          </p>
        </div>

        <div v-else-if="dockTab === 'metadata'" class="h-full overflow-auto p-2">
          <ResourceMetadataPanel
            v-if="resource"
            :resource="resource"
            :reference-count="referencesWithKind.length"
            :referenced-by-count="referencedByWithKind.length"
          />
        </div>

        <div v-else class="grid h-full gap-2 overflow-auto p-2 lg:grid-cols-2">
          <AppPanel title="References" icon="i-heroicons-arrow-up-right" :padded="false">
            <template #actions>
              <UBadge
                color="neutral"
                variant="subtle"
                size="sm"
                :label="String(referencesWithKind.length)"
              />
            </template>
            <ul class="divide-default min-h-0 flex-1 divide-y overflow-y-auto">
              <li
                v-for="reference in referencesWithKind"
                :key="`${reference.resource.baseAddress}-${reference.kind}`"
                class="hover:bg-elevated/60"
              >
                <NuxtLink
                  class="flex items-center justify-between gap-2 px-3 py-1.5"
                  :to="getResourceRoute(reference.resource.baseAddress)"
                >
                  <span class="text-default min-w-0 truncate text-xs">
                    {{ getNormalizedName(reference.resource) }}
                  </span>
                  <UBadge color="neutral" variant="outline" size="sm" :label="reference.kind" />
                </NuxtLink>
              </li>
              <li v-if="referencesWithKind.length === 0" class="text-muted px-3 py-4 text-xs">
                No references mapped.
              </li>
            </ul>
          </AppPanel>

          <AppPanel title="Referenced by" icon="i-heroicons-arrow-down-left" :padded="false">
            <template #actions>
              <UBadge
                color="neutral"
                variant="subtle"
                size="sm"
                :label="String(referencedByWithKind.length)"
              />
            </template>
            <ul class="divide-default min-h-0 flex-1 divide-y overflow-y-auto">
              <li
                v-for="reference in referencedByWithKind"
                :key="`${reference.resource.baseAddress}-${reference.kind}`"
                class="hover:bg-elevated/60"
              >
                <NuxtLink
                  class="flex items-center justify-between gap-2 px-3 py-1.5"
                  :to="getResourceRoute(reference.resource.baseAddress)"
                >
                  <span class="text-default min-w-0 truncate text-xs">
                    {{ getNormalizedName(reference.resource) }}
                  </span>
                  <UBadge color="neutral" variant="outline" size="sm" :label="reference.kind" />
                </NuxtLink>
              </li>
              <li v-if="referencedByWithKind.length === 0" class="text-muted px-3 py-4 text-xs">
                No resources point to this address.
              </li>
            </ul>
          </AppPanel>
        </div>
      </div>
    </section>

    <button
      v-else
      type="button"
      class="border-default hover:bg-elevated/50 flex h-8 shrink-0 items-center justify-between gap-2 border-t px-3 text-left transition-colors"
      @click="dockOpen = true"
    >
      <span class="text-muted flex items-center gap-2 text-[11px]">
        <UIcon name="i-heroicons-table-cells" class="size-3.5" />
        Data dock
      </span>
      <span class="text-dimmed flex items-center gap-2 font-mono text-[10px]">
        {{ hexData ? `${hexData.inputData.length.toLocaleString()} bytes` : 'no byte range' }}
        <UIcon name="i-heroicons-chevron-up" class="size-3.5" />
      </span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, toRefs, watch } from 'vue'
import { useEventListener, useStorage } from '@vueuse/core'
import { useResourceDetails } from '~/composables/useResourceDetails'
import { useResourceNavigation } from '~/composables/useResourceNavigation'
import { useResourcesIndex } from '~/composables/useResourcesIndex'
import { addressFormat, getNameForType, getNormalizedName, getResourceRoute } from '~/utils/index'
import { isVisualResourceType } from '~/utils/resourceVisuals'

type DockTab = 'data' | 'metadata' | 'references'

interface Props {
  resourceAddress: number
}

const props = defineProps<Props>()

const { resourceAddress } = toRefs(props)
const { resource, error, referencesWithKind, referencedByWithKind, isError, isPending, hexData } =
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

const dockOpen = useStorage('kid-browser-data-dock', true)
const dockTab = useStorage<DockTab>('kid-browser-data-tab', 'data')
const compareEnabled = ref(false)

const dockTabs = [
  { label: 'Data', value: 'data', icon: 'i-heroicons-code-bracket-square' },
  { label: 'Metadata', value: 'metadata', icon: 'i-heroicons-information-circle' },
  { label: 'References', value: 'references', icon: 'i-heroicons-link' },
]

function setDockTab(value: unknown) {
  dockTab.value = value as DockTab
}

watch(resourceAddress, (address) => recordVisit(address), { immediate: true })

const listIndex = computed(() =>
  filteredResources.value.findIndex((entry) => entry.address === resourceAddress.value),
)
const listPosition = computed(() =>
  listIndex.value === -1
    ? 'not filtered in'
    : `${listIndex.value + 1} / ${filteredResources.value.length}`,
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

const canCompare = computed(
  () => resource.value !== null && isVisualResourceType(resource.value.type),
)

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
