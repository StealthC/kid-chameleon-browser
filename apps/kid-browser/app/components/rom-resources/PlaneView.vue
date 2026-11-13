<template>
  <ExpandableViewerLayout v-model:expanded="isExpanded">
    <template #viewer="{ expanded }">
      <PixiPlaneRenderer
        :key="`${resource.baseAddress}-${expanded ? 'expanded' : 'normal'}`"
        v-if="selectedSheet"
        :plane="resource"
        :sheet="selectedSheet"
        :palette="selectedPalette"
        :columns="calculatedColumns"
        :show-grid="showGrid"
        :show-selection="showSelection"
        @tile-select="onTileSelect"
        @clear-selection="onClearSelection"
      />
      <div v-else class="text-muted flex h-full min-h-40 items-center justify-center text-xs">
        Plane has no related sheet to render.
      </div>
    </template>

    <template #sidebar>
      <ViewerSidebarSection title="Inspector">
        <p class="text-primary font-mono text-xs">{{ selectedTileText }}</p>
        <p class="text-muted mt-1 text-[11px]">
          {{ resource.width ? `${resource.width} tiles wide` : `${columns} columns` }}
        </p>
      </ViewerSidebarSection>

      <ViewerSidebarSection title="Layers">
        <div class="flex items-center justify-between gap-2 text-xs">
          <span class="text-muted">Grid</span>
          <USwitch v-model="showGrid" size="sm" />
        </div>
        <div class="flex items-center justify-between gap-2 text-xs">
          <span class="text-muted">Selection</span>
          <USwitch v-model="showSelection" size="sm" />
        </div>
      </ViewerSidebarSection>

      <ViewerSidebarSection title="Options">
        <div v-if="useColumns" class="flex items-center gap-1">
          <UInput
            v-model.number="columns"
            type="number"
            size="xs"
            class="min-w-0 flex-1 text-center font-mono"
            :min="1"
            :max="255"
            aria-label="Number of columns"
          />
          <UButton
            icon="i-heroicons-plus"
            color="neutral"
            variant="soft"
            size="xs"
            square
            aria-label="Increase columns"
            @click="columns++"
          />
          <UButton
            icon="i-heroicons-minus"
            color="neutral"
            variant="soft"
            size="xs"
            square
            aria-label="Decrease columns"
            @click="columns = Math.max(1, columns - 1)"
          />
        </div>

        <USelect
          v-if="paletteOptions.length > 1"
          v-model="selectedPaletteKey"
          :items="paletteSelectItems"
          size="sm"
          class="w-full"
          placeholder="Select palette"
          aria-label="Select palette"
        />
      </ViewerSidebarSection>
    </template>
  </ExpandableViewerLayout>
</template>

<script setup lang="ts">
import { computed, ref, toRefs, watch } from 'vue'
import {
  isLoadedResource,
  isPaletteResource,
  type PaletteRomResourceLoaded,
  type PlaneRomResourceLoaded,
  type PlaneRomResourceTile,
  type SheetRomResourceLoaded,
} from '@repo/kid-util'
import { getNormalizedName } from '~/utils/index'
import { useResourceLoader } from '~/composables/useResourceLoader'

export type Props = {
  resource: PlaneRomResourceLoaded
  sheet?: SheetRomResourceLoaded
  columns?: number
}

const props = defineProps<Props>()
const { resource, sheet } = toRefs(props)
const useColumns = computed(() => !resource.value.width)
const columns = ref(props.columns ?? 16)
const calculatedColumns = computed(() => (useColumns.value ? columns.value : resource.value.width!))
const selectedPaletteKey = ref<string>('')
const previousNonUvCount = ref(0)
const showGrid = ref(true)
const showSelection = ref(true)
const isExpanded = ref(false)
const selectedTile = ref<{
  x: number
  y: number
  index: number
  tile: PlaneRomResourceTile
} | null>(null)
const loader = useResourceLoader()
const resourceAddress = computed(() => resource.value.baseAddress)
const related = loader.getReferencesResourcesLoadedQuery(resourceAddress)

const selectedSheet = computed(() => {
  if (sheet.value) return sheet.value
  if (related.data.value) {
    const relatedSheet = related.data.value.find((entry) => entry.type === 'sheet')
    return relatedSheet ? (relatedSheet as SheetRomResourceLoaded) : null
  }
  return null
})

const selectedPalette = computed(() => {
  if (selectedPaletteKey.value === 'uv') {
    return undefined
  }
  return availablePalettes.value.find(
    (palette) => String(palette.baseAddress) === selectedPaletteKey.value,
  )
})

const availablePalettes = computed<PaletteRomResourceLoaded[]>(() => {
  const relatedData = related.data.value ?? []
  return relatedData.filter(
    (entry) => isLoadedResource(entry) && isPaletteResource(entry),
  ) as PaletteRomResourceLoaded[]
})

const paletteOptions = computed(() => {
  return [
    { key: 'uv', label: 'UV' },
    ...availablePalettes.value.map((entry) => ({
      key: String(entry.baseAddress),
      label: getNormalizedName(entry),
    })),
  ]
})

const paletteSelectItems = computed(() =>
  paletteOptions.value.map((option) => ({ label: option.label, value: option.key })),
)

watch(
  paletteOptions,
  (options) => {
    const nonUvOptions = options.filter((option) => option.key !== 'uv')
    const firstNonUv = nonUvOptions[0]

    if (selectedPaletteKey.value === '') {
      selectedPaletteKey.value = firstNonUv?.key ?? 'uv'
      previousNonUvCount.value = nonUvOptions.length
      return
    }

    if (
      selectedPaletteKey.value === 'uv' &&
      previousNonUvCount.value === 0 &&
      nonUvOptions.length > 0
    ) {
      selectedPaletteKey.value = firstNonUv.key
      previousNonUvCount.value = nonUvOptions.length
      return
    }

    const selectedStillExists = options.some((option) => option.key === selectedPaletteKey.value)
    if (selectedStillExists) {
      previousNonUvCount.value = nonUvOptions.length
      return
    }
    selectedPaletteKey.value = firstNonUv?.key ?? 'uv'
    previousNonUvCount.value = nonUvOptions.length
  },
  { immediate: true },
)

const selectedTileText = computed(() => {
  if (!selectedTile.value) {
    return 'Nothing selected'
  }
  const { x, y, index, tile } = selectedTile.value
  return `tile(${x},${y}) idx=${index} tile=0x${tile.tileIndex
    .toString(16)
    .toUpperCase()} pal=${tile.palette} pri=${tile.priority ? 1 : 0} xFlip=${
    tile.xFlip ? 1 : 0
  } yFlip=${tile.yFlip ? 1 : 0}`
})

function onTileSelect(payload: {
  x: number
  y: number
  index: number
  tile: PlaneRomResourceTile
}) {
  selectedTile.value = payload
}

function onClearSelection() {
  selectedTile.value = null
}
</script>
