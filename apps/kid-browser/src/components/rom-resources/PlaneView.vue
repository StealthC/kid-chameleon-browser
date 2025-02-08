<template>
  <div class="flex h-full w-full flex-row">
    <div class="flex flex-col items-center">
      <InputNumber
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
const columns = ref(props.columns ?? 16)
const loader = useResourceLoader()
const relatedSheets = loader.value.useGetRelatedResourcesQuery(resource, true, 'sheet')

const selectedSheet = computed(() => {
  if (sheet.value) {
    return sheet.value
  }
  if (relatedSheets.data.value && relatedSheets.data.value.length > 0) {
    return relatedSheets.data.value[0] as SheetRomResourceLoaded
  } else {
    return null
  }
})

const computedValues = computed(() => {
  const width = columns.value * 8
  const height = (resource.value.tiles.length / columns.value) * 8
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
    KidImageData.fromPlane(resource.value, selectedSheet.value, columns.value),
  )
  ctx.drawImage(bitmap, 0, 0)
  return
}
</script>

<style scoped></style>
