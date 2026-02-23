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
        <p class="text-xs uppercase tracking-wider text-slate-400">Layout</p>
        <div class="gap-2 items-stretch flex flex-col">
          <Button variant="outline" size="sm" @click="useColumns = !useColumns">
            <Icon name="heroicons:adjustments-horizontal-solid" class="size-4" />
            {{ useColumns ? 'Columns mode' : 'Rows mode' }}
          </Button>
          <div class="col-span-2 flex flex-row items-center justify-end gap-2 md:col-span-1">
            <Input type="number" v-model.number="value" class="text-center" :min="1" :max="255" />
            <Button size="icon-sm" variant="secondary" @click="value++">
              <Icon name="heroicons:plus-solid" class="size-4" />
            </Button>
            <Button size="icon-sm" variant="secondary" @click="value = Math.max(1, value - 1)">
              <Icon name="heroicons:minus-solid" class="size-4" />
            </Button>
          </div>
        </div>
      </div>

      <div class="space-y-2" v-if="paletteOptions.length > 1">
        <p class="text-xs uppercase tracking-wider text-slate-400">Palette</p>
        <Select v-model="selectedPaletteKey">
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
  KidImageData,
  isLoadedResource,
  isPaletteResource,
  type PaletteRomResourceLoaded,
  type SheetRomResourceLoaded,
} from '@repo/kid-util'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
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
const references = loader.getReferencesResourcesLoadedQuery(computed(() => resource.value.baseAddress))

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
  return availablePalettes.value.find((palette) => String(palette.baseAddress) === selectedPaletteKey.value)
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
