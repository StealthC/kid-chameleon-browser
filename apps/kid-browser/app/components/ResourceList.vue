<template>
  <div class="bg-default flex h-full min-h-0 flex-col">
    <header class="border-default flex h-11 shrink-0 items-center gap-2 border-b px-3">
      <UIcon name="i-heroicons-squares-2x2" class="text-primary size-4" />
      <h2 class="text-highlighted text-sm font-semibold">Resources</h2>
      <UBadge
        color="neutral"
        variant="subtle"
        size="sm"
        :label="`${filteredCount} / ${totalResources}`"
      />
      <div class="ms-auto flex items-center gap-1">
        <UTooltip v-if="hasActiveFilters" text="Clear filters">
          <UButton
            icon="i-heroicons-x-mark"
            color="neutral"
            variant="ghost"
            size="xs"
            square
            aria-label="Clear filters"
            @click="clearFilter"
          />
        </UTooltip>
      </div>
    </header>

    <div class="border-default shrink-0 space-y-2 border-b p-2">
      <UInput
        v-model="searchQuery"
        icon="i-heroicons-magnifying-glass"
        size="sm"
        placeholder="Search name, type or address…"
        aria-label="Search resources"
        class="w-full"
      />

      <div class="grid grid-cols-2 gap-1.5">
        <USelect
          :model-value="selectedTypeValue"
          :items="typeItems"
          size="sm"
          class="w-full"
          aria-label="Filter by type"
          @update:model-value="setSelectedType"
        />
        <USelect
          :model-value="sortOrder"
          :items="sortItems"
          size="sm"
          class="w-full"
          aria-label="Sort resources"
          @update:model-value="setSortOrder"
        />
        <USelect
          :model-value="confidenceFilter"
          :items="confidenceItems"
          size="sm"
          class="w-full"
          aria-label="Filter by discovery confidence"
          @update:model-value="setConfidenceFilter"
        />
        <USelect
          :model-value="loadedFilter"
          :items="loadedItems"
          size="sm"
          class="w-full"
          aria-label="Filter by decode state"
          @update:model-value="setLoadedFilter"
        />
      </div>

      <div class="flex items-start justify-between gap-2">
        <p class="text-dimmed text-[10px] leading-tight">
          Address search accepts $A09FE, 0xA09FE or A09FE.
        </p>
        <UButton
          v-if="hasActiveFilters"
          label="Clear"
          color="neutral"
          variant="link"
          size="xs"
          class="shrink-0 px-0"
          @click="clearFilter"
        />
      </div>
    </div>

    <div class="shrink-0 px-2 pt-1.5">
      <UTabs
        :model-value="activeTab"
        :items="tabItems"
        :content="false"
        size="xs"
        variant="link"
        class="w-full"
        @update:model-value="setActiveTab"
      />
    </div>

    <div class="min-h-0 flex-1 overflow-y-auto p-1">
      <template v-if="activeTab === 'resources'">
        <NuxtLink
          v-for="resource in filteredResources"
          :key="resource.address"
          :to="getResourceRoute(resource.address)"
          class="group flex items-center gap-2 rounded-md border px-2 py-1.5 transition-colors"
          :class="
            selectedAddress === resource.address
              ? 'border-primary/40 bg-primary/10'
              : 'hover:bg-elevated/70 border-transparent'
          "
          :aria-current="selectedAddress === resource.address ? 'page' : undefined"
          :title="`${resource.name} · ${resource.typeLabel} · ${formatCompactSize(resource.size)}`"
          @click="emit('navigate', resource.address)"
        >
          <span class="min-w-0 flex-1">
            <span class="flex items-baseline justify-between gap-2">
              <span class="text-default group-hover:text-highlighted truncate text-xs font-medium">
                {{ resource.name }}
              </span>
              <span class="text-muted shrink-0 font-mono text-[10px]">
                {{ addressFormat(resource.address) }}
              </span>
            </span>
            <span class="mt-0.5 flex flex-wrap items-center gap-1">
              <span class="text-dimmed text-[10px] tracking-wide uppercase">
                {{ resource.typeLabel }}
              </span>
              <UBadge
                v-if="resource.confidence === 'possible'"
                color="warning"
                variant="subtle"
                size="sm"
                label="Possible"
              />
              <UBadge
                v-if="resource.loaded"
                color="neutral"
                variant="subtle"
                size="sm"
                label="Decoded"
              />
              <span v-if="resource.size !== null" class="text-dimmed font-mono text-[10px]">
                {{ formatCompactSize(resource.size) }}
              </span>
            </span>
          </span>
        </NuxtLink>

        <div v-if="filteredResources.length === 0" class="px-3 py-8">
          <UEmpty
            icon="i-heroicons-magnifying-glass"
            size="sm"
            title="No matches"
            description="Try a broader search or clear the active filters."
          >
            <template #actions>
              <UButton
                v-if="hasActiveFilters"
                label="Clear filters"
                color="neutral"
                variant="soft"
                size="xs"
                @click="clearFilter"
              />
            </template>
          </UEmpty>
        </div>
      </template>

      <template v-else>
        <button
          v-for="resource in resourceList"
          :key="resource.type"
          type="button"
          class="group hover:bg-elevated/70 flex w-full items-center justify-between gap-2 rounded-md border border-transparent px-2 py-2 text-left transition-colors"
          @click="selectType(resource.type)"
        >
          <span class="text-default group-hover:text-highlighted truncate text-xs font-medium">
            {{ getNameForType(resource.type) }}
          </span>
          <UBadge color="neutral" variant="subtle" size="sm" :label="String(resource.count)" />
        </button>
        <p v-if="resourceList.length === 0" class="text-muted px-3 py-8 text-center text-xs">
          No resource types discovered in this ROM.
        </p>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useResourcesIndex } from '~/composables/useResourcesIndex'
import { addressFormat, getNameForType, getResourceRoute } from '~/utils/index'
import { formatCompactSize } from '~/utils/resourceSearch'

const emit = defineEmits<{
  navigate: [address: number]
}>()

const {
  activeTab,
  selectedTypeValue,
  searchQuery,
  sortOrder,
  confidenceFilter,
  loadedFilter,
  selectedAddress,
  resourceList,
  filteredResources,
  totalResources,
  filteredCount,
  hasActiveFilters,
  selectType,
  clearFilter,
} = useResourcesIndex()

function setSelectedType(value: unknown) {
  selectedTypeValue.value = value as typeof selectedTypeValue.value
}

function setSortOrder(value: unknown) {
  sortOrder.value = value as typeof sortOrder.value
}

function setConfidenceFilter(value: unknown) {
  confidenceFilter.value = value as typeof confidenceFilter.value
}

function setLoadedFilter(value: unknown) {
  loadedFilter.value = value as typeof loadedFilter.value
}

function setActiveTab(value: unknown) {
  activeTab.value = value as 'types' | 'resources'
}

const tabItems = [
  { label: 'Resources', value: 'resources', icon: 'i-heroicons-list-bullet' },
  { label: 'Types', value: 'types', icon: 'i-heroicons-tag' },
]

const typeItems = computed(() => [
  { label: 'All types', value: 'all' },
  ...resourceList.value.map((entry) => ({
    label: `${getNameForType(entry.type)} (${entry.count})`,
    value: entry.type,
  })),
])

const sortItems = [
  { label: 'Address', value: 'address' },
  { label: 'Name', value: 'name' },
  { label: 'Type', value: 'type' },
  { label: 'Size', value: 'size' },
]

const confidenceItems = [
  { label: 'Any confidence', value: 'all' },
  { label: 'Certain', value: 'certain' },
  { label: 'Possible', value: 'possible' },
  { label: 'Not recorded', value: 'unspecified' },
]

const loadedItems = [
  { label: 'Any decode state', value: 'all' },
  { label: 'Decoded', value: 'loaded' },
  { label: 'Not decoded', value: 'unloaded' },
]
</script>
