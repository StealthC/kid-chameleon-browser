<template>
  <ExpandableViewerLayout v-model:expanded="isExpanded">
    <template #viewer="{ expanded }">
      <PixiImageViewportRenderer
        :key="`${resource.baseAddress}-${expanded ? 'expanded' : 'normal'}`"
        v-if="image"
        :image="image"
        :palette="palette ?? undefined"
        :show-grid="showGrid"
        :show-selection="showSelection"
        :cell-size="8"
        :columns="tileColumns"
        :selectable-count="tileColumns * tileRows"
        :reset-key="`${resource.baseAddress}-${sheetString}-${resource.width}x${resource.height}`"
        @cell-select="onCellSelect"
        @clear-selection="onClearSelection"
      />
      <div v-else class="flex h-full min-h-[280px] items-center justify-center text-xs text-slate-300">
        Select a sheet to preview this sprite frame.
      </div>
    </template>

    <template #sidebar>
      <div class="flex items-center justify-between gap-2">
        <p class="text-sm font-semibold">Sprite Frame — {{ resourceName }}</p>
        <Badge variant="outline">{{ needSheet ? 'Needs sheet' : 'Embedded' }}</Badge>
      </div>

      <ViewerSidebarSection title="Inspector">
        <p class="font-mono text-xs text-emerald-300">{{ selectedCellText }}</p>
      </ViewerSidebarSection>

      <ViewerSidebarSection title="Layers">
        <label class="flex items-center gap-2 text-xs">
          <input v-model="showGrid" type="checkbox" />
          <span>Grid</span>
        </label>
        <label class="flex items-center gap-2 text-xs">
          <input v-model="showSelection" type="checkbox" />
          <span>Selection</span>
        </label>
      </ViewerSidebarSection>

      <Select v-if="needSheet" v-model="sheetString">
        <SelectTrigger>
          <SelectValue placeholder="Select a tile sheet" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem v-for="s in sheets" :key="s.key" :value="String(s.value)">{{ s.name }}</SelectItem>
        </SelectContent>
      </Select>

      <Select v-if="paletteOptions.length > 1" v-model="selectedPaletteKey">
        <SelectTrigger>
          <SelectValue placeholder="Select palette" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem v-for="option in paletteOptions" :key="option.key" :value="option.key">
            {{ option.label }}
          </SelectItem>
        </SelectContent>
      </Select>

      <div class="border-border/60 rounded border bg-slate-950/60 p-2">
        <Table>
          <TableBody>
            <TableRow v-for="row in rows" :key="row.label">
              <TableCell class="text-muted-foreground text-xs">{{ row.label }}</TableCell>
              <TableCell class="font-mono text-xs">{{ row.value }}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </template>
  </ExpandableViewerLayout>
</template>

<script setup lang="ts">
import {
  KidImageData,
  isLinkedSpriteFrameResource,
  isLoadedResource,
  isPaletteResource,
  isSheetResource,
  type PaletteRomResourceLoaded,
  type SpriteFrameRomResourceLoaded,
} from '@repo/kid-util'
import { computed, ref, toRefs, watch } from 'vue'
import { Badge } from '~/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { Table, TableBody, TableCell, TableRow } from '~/components/ui/table'
import { addressFormat, getNormalizedName } from '~/utils/index'
import { useResourceLoader } from '~/composables/useResourceLoader'

interface Props {
  resource: SpriteFrameRomResourceLoaded
}

const props = defineProps<Props>()
const { resource } = toRefs(props)
const sheet = ref<number | null>(null)
const sheetString = computed({
  get: () => (sheet.value === null ? '' : String(sheet.value)),
  set: (value: string) => {
    sheet.value = value ? Number(value) : null
  },
})
const resourceLoader = useResourceLoader()
const sheetList = resourceLoader.getResourceListOfTypeQuery('sheet')
const isSheetSelected = computed(() => sheet.value !== null)
const loadedSheet = resourceLoader.useGetResourceLoadedQuery(sheet, isSheetSelected)
const selectedSheetReferences = resourceLoader.getReferencesResourcesLoadedQuery(sheet, isSheetSelected)
const spriteReferences = resourceLoader.getReferencesResourcesLoadedQuery(
  computed(() => resource.value.baseAddress),
)
const selectedPaletteKey = ref<string>('')
const previousNonUvCount = ref(0)
const showGrid = ref(true)
const showSelection = ref(true)
const isExpanded = ref(false)
const selectedCell = ref<number | null>(null)

const sheets = computed(() => {
  if (!sheetList.data.value) return []
  return sheetList.data.value.map((s) => ({
    key: s.baseAddress,
    name: getNormalizedName(s),
    value: s.baseAddress,
  }))
})

const resourceName = computed(() => `0x${resource.value.baseAddress.toString(16)}`)
const needSheet = computed(() => !isLinkedSpriteFrameResource(resource.value))
const tileId = computed(() =>
  !isLinkedSpriteFrameResource(resource.value) ? resource.value.tileId : 0,
)

const bytes = computed(() => {
  if (isLinkedSpriteFrameResource(resource.value)) return resource.value.data
  if (
    loadedSheet.data.value &&
    isLoadedResource(loadedSheet.data.value) &&
    isSheetResource(loadedSheet.data.value)
  ) {
    return loadedSheet.data.value.data
  }
  return null
})

const tileColumns = computed(() => Math.ceil(resource.value.width / 8.0))
const tileRows = computed(() => Math.ceil(resource.value.height / 8.0))

const image = computed(() => {
  if (!bytes.value) {
    return null
  }
  return KidImageData.fromSprite(bytes.value, resource.value.width, resource.value.height, tileId.value)
})

const availablePalettes = computed<PaletteRomResourceLoaded[]>(() => {
  const map = new Map<number, PaletteRomResourceLoaded>()
  for (const candidate of selectedSheetReferences.data.value ?? []) {
    if (isLoadedResource(candidate) && isPaletteResource(candidate)) {
      map.set(candidate.baseAddress, candidate)
    }
  }
  for (const candidate of spriteReferences.data.value ?? []) {
    if (isLoadedResource(candidate) && isPaletteResource(candidate)) {
      map.set(candidate.baseAddress, candidate)
    }
  }
  return Array.from(map.values())
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

const palette = computed<PaletteRomResourceLoaded | null>(() => {
  if (selectedPaletteKey.value === 'uv') {
    return null
  }
  return (
    availablePalettes.value.find((candidate) => String(candidate.baseAddress) === selectedPaletteKey.value) ??
    null
  )
})

const selectedCellText = computed(() => {
  if (selectedCell.value === null) {
    return 'Nothing selected'
  }
  return `cell=${selectedCell.value} (0x${selectedCell.value.toString(16).toUpperCase()})`
})

const rows = computed(() => [
  { label: 'CRC32', value: addressFormat(resource.value.hash) },
  { label: 'Resource Index', value: addressFormat(resource.value.tableIndex ?? 0) },
  { label: 'Tile ID', value: addressFormat(tileId.value) },
  { label: 'Width', value: String(resource.value.width) },
  { label: 'Height', value: String(resource.value.height) },
  { label: 'X Offset', value: String(resource.value.xOffset) },
  { label: 'Y Offset', value: String(resource.value.yOffset) },
])

function onCellSelect(payload: { index: number }) {
  selectedCell.value = payload.index
}

function onClearSelection() {
  selectedCell.value = null
}

watch([sheet, () => resource.value.baseAddress], () => {
  selectedCell.value = null
})
</script>
