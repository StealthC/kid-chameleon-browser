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
      <div v-else class="flex h-full min-h-[280px] items-center justify-center text-xs text-slate-300">
        Plane has no related sheet to render.
      </div>
    </template>

    <template #sidebar>
      <p class="text-xs uppercase tracking-wider text-slate-400">Inspector</p>
      <p class="font-mono text-xs text-emerald-300">{{ selectedTileText }}</p>

      <div class="space-y-2">
        <p class="text-xs uppercase tracking-wider text-slate-400">Layers</p>
        <label class="flex items-center gap-2 text-xs">
          <input v-model="showGrid" type="checkbox" />
          <span>Grid</span>
        </label>
        <label class="flex items-center gap-2 text-xs">
          <input v-model="showSelection" type="checkbox" />
          <span>Selection</span>
        </label>
      </div>

      <div class="space-y-2">
        <p class="text-xs uppercase tracking-wider text-slate-400">Options</p>
        <template v-if="useColumns">
          <div class="flex items-center gap-2">
            <Input type="number" v-model.number="columns" class="w-24 text-center" :min="1" :max="255" />
            <Button size="icon-sm" variant="secondary" @click="columns++">
              <Icon name="heroicons:plus-solid" class="size-4" />
            </Button>
            <Button size="icon-sm" variant="secondary" @click="columns = Math.max(1, columns - 1)">
              <Icon name="heroicons:minus-solid" class="size-4" />
            </Button>
          </div>
        </template>

        <Select v-if="paletteOptions.length > 1" v-model="selectedPaletteKey">
          <SelectTrigger class="w-full">
            <SelectValue placeholder="Select palette" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem v-for="option in paletteOptions" :key="option.key" :value="option.key">
              {{ option.label }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
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
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { getNormalizedName } from '~/utils/index'
import { useResourceLoader } from '~/composables/useResourceLoader'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'

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
const selectedTile = ref<{ x: number; y: number; index: number; tile: PlaneRomResourceTile } | null>(
  null,
)
const loader = useResourceLoader()
const resourceAddress = computed(() => resource.value.baseAddress)
const related = loader.getReferencesResourcesLoadedQuery(resourceAddress)

const selectedSheet = computed(() => {
  if (sheet.value) return sheet.value
  if (related.data.value) {
    const relatedSheet = related.data.value.find((r) => r.type === 'sheet')
    return relatedSheet ? (relatedSheet as SheetRomResourceLoaded) : null
  }
  return null
})

const selectedPalette = computed(() => {
  if (selectedPaletteKey.value === 'uv') {
    return undefined
  }
  return availablePalettes.value.find((palette) => String(palette.baseAddress) === selectedPaletteKey.value)
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
    .toUpperCase()} pal=${tile.palette} pri=${tile.priority ? 1 : 0} xFlip=${tile.xFlip ? 1 : 0} yFlip=${tile.yFlip ? 1 : 0}`
})

const onTileSelect = (payload: { x: number; y: number; index: number; tile: PlaneRomResourceTile }) => {
  selectedTile.value = payload
}

const onClearSelection = () => {
  selectedTile.value = null
}
</script>
