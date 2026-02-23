<template>
  <div class="flex h-full w-full flex-row gap-2">
    <div v-if="useColumns" class="flex flex-col items-center gap-1">
      <button @click="columns++" class="px-2 text-lg leading-none">+</button>
      <input
        type="number"
        v-model="columns"
        class="w-16 bg-transparent text-center text-sm outline-none"
        :min="1"
        :max="255"
      />
      <button @click="columns = Math.max(1, columns - 1)" class="px-2 text-lg leading-none">
        −
      </button>
    </div>
    <div class="flex flex-grow items-center justify-center">
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
import { computed, ref, toRefs } from 'vue'
import {
  KidImageData,
  type PaletteRomResourceLoaded,
  type PlaneRomResourceLoaded,
  type SheetRomResourceLoaded,
} from '@repo/kid-util'
import { bitmapFromKidImageData } from '~/utils/index'
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
const loader = useResourceLoader()
const related = loader.value.getReferencesResourcesLoadedQuery(resource)

const selectedSheet = computed(() => {
  if (sheet.value) return sheet.value
  if (related.data.value) {
    const relatedSheet = related.data.value.find((r) => r.type === 'sheet')
    return relatedSheet ? (relatedSheet as SheetRomResourceLoaded) : null
  }
  return null
})

const selectedPalette = computed(() => {
  if (related.data.value) {
    const relatedPalette = related.data.value.find((r) => r.type === 'palette')
    return relatedPalette ? (relatedPalette as PaletteRomResourceLoaded) : undefined
  }
  return undefined
})

const computedValues = computed(() => {
  const width = calculatedColumns.value * 8
  const height = (resource.value.tiles.length / calculatedColumns.value) * 8
  return { plane: resource.value, sheet: selectedSheet.value, width, height }
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
