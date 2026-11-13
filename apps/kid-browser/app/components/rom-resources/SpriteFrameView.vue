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
      <div v-else class="text-muted flex h-full min-h-40 items-center justify-center text-xs">
        {{
          needSheet
            ? 'Select a sheet to preview this sprite frame.'
            : 'No graphics available for this frame.'
        }}
      </div>
    </template>

    <template #sidebar>
      <div class="flex items-center justify-between gap-2">
        <p class="text-highlighted text-xs font-semibold">Sprite Frame · {{ resourceName }}</p>
        <UBadge
          :color="needSheet ? 'warning' : 'neutral'"
          variant="subtle"
          size="sm"
          :label="needSheet ? 'Needs sheet' : 'Embedded'"
        />
      </div>

      <ViewerSidebarSection title="Inspector">
        <p class="text-primary font-mono text-xs">{{ selectedCellText }}</p>
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

      <ViewerSidebarSection v-if="needSheet" title="Tile sheet">
        <USelect
          v-model="sheetString"
          :items="sheetSelectItems"
          size="sm"
          class="w-full"
          placeholder="Select a tile sheet"
          aria-label="Select tile sheet"
        />
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

      <ViewerSidebarSection title="Frame">
        <dl class="border-default overflow-hidden rounded-md border">
          <div
            v-for="row in rows"
            :key="row.label"
            class="border-default grid grid-cols-[7rem_minmax(0,1fr)] border-b last:border-b-0"
          >
            <dt class="bg-muted/30 text-muted px-2 py-1 text-[11px]">{{ row.label }}</dt>
            <dd class="text-highlighted px-2 py-1 font-mono text-[11px]">{{ row.value }}</dd>
          </div>
        </dl>
      </ViewerSidebarSection>
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
const selectedSheetReferences = resourceLoader.getReferencesResourcesLoadedQuery(
  sheet,
  isSheetSelected,
)
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

const sheetSelectItems = computed(() =>
  sheets.value.map((entry) => ({ label: entry.name, value: String(entry.value) })),
)

const resourceName = computed(() => addressFormat(resource.value.baseAddress))
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
  return KidImageData.fromSprite(
    bytes.value,
    resource.value.width,
    resource.value.height,
    tileId.value,
  )
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

const palette = computed<PaletteRomResourceLoaded | null>(() => {
  if (selectedPaletteKey.value === 'uv') {
    return null
  }
  return (
    availablePalettes.value.find(
      (candidate) => String(candidate.baseAddress) === selectedPaletteKey.value,
    ) ?? null
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
  { label: 'Resource index', value: addressFormat(resource.value.tableIndex ?? 0) },
  { label: 'Tile ID', value: addressFormat(tileId.value) },
  { label: 'Width', value: String(resource.value.width) },
  { label: 'Height', value: String(resource.value.height) },
  { label: 'X offset', value: String(resource.value.xOffset) },
  { label: 'Y offset', value: String(resource.value.yOffset) },
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
