<template>
  <div class="flex h-full min-h-0 w-full flex-col gap-3">
    <div class="flex flex-wrap items-center justify-end gap-2">
      <template v-if="useColumns">
        <Input type="number" v-model.number="columns" class="w-24 text-center" :min="1" :max="255" />
        <Button size="icon-sm" variant="secondary" @click="columns++">
          <Icon name="heroicons:plus-solid" class="size-4" />
        </Button>
        <Button size="icon-sm" variant="secondary" @click="columns = Math.max(1, columns - 1)">
          <Icon name="heroicons:minus-solid" class="size-4" />
        </Button>
      </template>

      <Select v-if="paletteOptions.length > 1" v-model="selectedPaletteKey">
        <SelectTrigger class="w-56">
          <SelectValue placeholder="Select palette" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem v-for="option in paletteOptions" :key="option.key" :value="option.key">
            {{ option.label }}
          </SelectItem>
        </SelectContent>
      </Select>
    </div>

    <div
      class="border-border/60 flex min-h-0 flex-1 items-center justify-center overflow-auto rounded-md border bg-slate-950/60 p-2"
    >
      <CanvasRenderer
        v-if="computedValues"
        :width="computedValues.width"
        :height="computedValues.height"
        :update-key="computedValues"
        @update="draw"
      ></CanvasRenderer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, toRefs, watch } from 'vue'
import {
  KidImageData,
  isLoadedResource,
  isPaletteResource,
  type PaletteRomResourceLoaded,
  type PlaneRomResourceLoaded,
  type SheetRomResourceLoaded,
} from '@repo/kid-util'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { bitmapFromKidImageData, getNormalizedName } from '~/utils/index'
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

const computedValues = computed(() => {
  const width = calculatedColumns.value * 8
  const height = (resource.value.tiles.length / calculatedColumns.value) * 8
  return {
    plane: resource.value,
    sheet: selectedSheet.value,
    width,
    height,
    paletteKey: selectedPalette.value?.baseAddress ?? 'uv',
  }
})

const draw = async (ctx: CanvasRenderingContext2D) => {
  if (!selectedSheet.value) return
  const bitmap = await bitmapFromKidImageData(
    KidImageData.fromPlane(resource.value, selectedSheet.value, calculatedColumns.value),
    selectedPalette.value,
  )
  ctx.drawImage(bitmap, 0, 0)
}
</script>
