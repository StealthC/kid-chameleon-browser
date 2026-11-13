<template>
  <ExpandableViewerLayout v-model:expanded="isExpanded">
    <template #viewer="{ expanded }">
      <PixiImageViewportRenderer
        :key="`${resource.baseAddress}-${expanded ? 'expanded' : 'normal'}`"
        v-if="image"
        :image="image"
        :palette="selectedPalette"
        :show-grid="showGrid"
        :show-selection="showSelection"
        :cell-size="8"
        :columns="values?.columns ?? 0"
        :selectable-count="values?.cellsTotal ?? 0"
        :reset-key="`${valueMode}-${value}`"
        @cell-select="onCellSelect"
        @clear-selection="onClearSelection"
      />
      <div v-else class="text-muted flex h-full items-center justify-center text-xs">
        This sheet has no renderable tiles.
      </div>
    </template>

    <template #sidebar>
      <ViewerSidebarSection title="Inspector">
        <p class="text-primary font-mono text-xs">{{ selectedTileText }}</p>
        <p class="text-muted mt-1 text-[11px]">
          {{ values?.columns ?? 0 }} × {{ values?.rows ?? 0 }} tiles ·
          {{ values?.cellsTotal ?? 0 }} total
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

      <ViewerSidebarSection title="Layout">
        <UButton
          :icon="useColumns ? 'i-heroicons-table-cells' : 'i-heroicons-view-columns'"
          color="neutral"
          variant="soft"
          size="sm"
          block
          @click="useColumns = !useColumns"
        >
          {{ useColumns ? 'Columns mode' : 'Rows mode' }}
        </UButton>
        <div class="flex items-center gap-1">
          <UInput
            v-model.number="value"
            type="number"
            size="xs"
            class="min-w-0 flex-1 text-center font-mono"
            :min="1"
            :max="255"
            aria-label="Tile count per row or column"
          />
          <UButton
            icon="i-heroicons-plus"
            color="neutral"
            variant="soft"
            size="xs"
            square
            aria-label="Increase count"
            @click="value++"
          />
          <UButton
            icon="i-heroicons-minus"
            color="neutral"
            variant="soft"
            size="xs"
            square
            aria-label="Decrease count"
            @click="value = Math.max(1, value - 1)"
          />
        </div>
      </ViewerSidebarSection>

      <ViewerSidebarSection v-if="paletteOptions.length > 1" title="Palette">
        <USelect
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
  KidImageData,
  isLoadedResource,
  isPaletteResource,
  type PaletteRomResourceLoaded,
  type SheetRomResourceLoaded,
} from '@repo/kid-util'
import { useResourceLoader } from '~/composables/useResourceLoader'
import { getNormalizedName } from '~/utils/index'

interface Props {
  resource: SheetRomResourceLoaded
  value?: number
  mode?: 'rows' | 'columns'
}

const props = defineProps<Props>()
const { resource } = toRefs(props)
const value = ref(props.value ?? 16)
const useColumns = ref(props.mode === 'columns')
const valueMode = computed(() => (useColumns.value ? 'columns' : 'rows'))
const selectedPaletteKey = ref<string>('')
const previousNonUvCount = ref(0)
const showGrid = ref(true)
const showSelection = ref(true)
const isExpanded = ref(false)
const selectedTileIndex = ref<number | null>(null)
const loader = useResourceLoader()
const references = loader.getReferencesResourcesLoadedQuery(
  computed(() => resource.value.baseAddress),
)

const availablePalettes = computed(() => {
  const related = references.data.value ?? []
  const list = related.filter(
    (candidate) => isLoadedResource(candidate) && isPaletteResource(candidate),
  )
  return list as PaletteRomResourceLoaded[]
})

const paletteOptions = computed(() => {
  return [
    { key: 'uv', label: 'UV' },
    ...availablePalettes.value.map((palette) => ({
      key: String(palette.baseAddress),
      label: getNormalizedName(palette),
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

const selectedPalette = computed<PaletteRomResourceLoaded | undefined>(() => {
  if (selectedPaletteKey.value === 'uv') {
    return undefined
  }
  return availablePalettes.value.find(
    (palette) => String(palette.baseAddress) === selectedPaletteKey.value,
  )
})

const values = computed(() => {
  const cellsTotal = resource.value.tiles.length
  const columns = valueMode.value === 'columns' ? value.value : Math.ceil(cellsTotal / value.value)
  const rows = valueMode.value === 'rows' ? value.value : Math.ceil(cellsTotal / value.value)
  return {
    columns,
    rows,
    cellsTotal,
  }
})

const image = computed(() => {
  return KidImageData.fromSheet(resource.value, valueMode.value, value.value)
})

const selectedTileText = computed(() => {
  if (selectedTileIndex.value === null) {
    return 'Nothing selected'
  }
  return `tileIndex=${selectedTileIndex.value} (0x${selectedTileIndex.value.toString(16).toUpperCase()})`
})

function onCellSelect(payload: { x: number; y: number; index: number }) {
  selectedTileIndex.value = payload.index
}

function onClearSelection() {
  selectedTileIndex.value = null
}

watch([value, useColumns], () => {
  selectedTileIndex.value = null
})
</script>
