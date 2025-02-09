<template>
  <div class="flex h-full w-full flex-row">
    <div class="flex flex-col items-center">
      <InputNumber
        v-if="useColumns"
        v-model="columns"
        showButtons
        buttonLayout="vertical"
        size="small"
        :min="1"
        :max="255"
      ></InputNumber>
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
import CanvasRenderer from './CanvasRenderer.vue'
import InputNumber from 'primevue/inputnumber'
import {
  KidImageData,
  type PaletteRomResourceLoaded,
  type PlaneRomResourceLoaded,
  type SheetRomResourceLoaded,
} from '@repo/kid-util'
import { bitmapFromKidImageData } from '@/utils'
import { useResourceLoader } from '@/composables/resource-loader'

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
const related = loader.value.useGetRelatedResourcesQuery(resource, true)

const selectedSheet = computed(() => {
  if (sheet.value) {
    return sheet.value
  }
  if (related.data.value) {
    const relatedSheet = related.data.value.find((r) => r.type === 'sheet')
    if (!relatedSheet) {
      return null
    }
    return relatedSheet as SheetRomResourceLoaded
  } else {
    return null
  }
})

const selectedPalette = computed(() => {
  if (related.data.value) {
    const relatedPalette = related.data.value.find((r) => r.type === 'palette')
    if (!relatedPalette) {
      return undefined
    }
    return relatedPalette as PaletteRomResourceLoaded
  } else {
    return undefined
  }
})

const computedValues = computed(() => {
  const width = calculatedColumns.value * 8
  const height = (resource.value.tiles.length / calculatedColumns.value) * 8
  return {
    plane: resource.value,
    sheet: selectedSheet.value,
    width,
    height,
  }
})

const draw = async (ctx: CanvasRenderingContext2D) => {
  if (!selectedSheet.value) {
    return
  }
  const bitmap = await bitmapFromKidImageData(
    KidImageData.fromPlane(resource.value, selectedSheet.value, calculatedColumns.value),
    selectedPalette.value,
  )
  ctx.drawImage(bitmap, 0, 0)
  return
}
</script>

<style scoped></style>
