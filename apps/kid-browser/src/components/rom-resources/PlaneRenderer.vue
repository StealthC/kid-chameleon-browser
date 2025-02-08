<template>
  <CanvasRenderer
    v-if="computedValues"
    :width="computedValues.width"
    :height="computedValues.height"
    :update-key="computedValues"
    @update="draw"
  ></CanvasRenderer>
</template>

<script setup lang="ts">
import { computed, toRefs } from 'vue'
import CanvasRenderer from './CanvasRenderer.vue'
import { KidImageData, type PlaneRomResourceLoaded, type SheetRomResourceLoaded } from '@repo/kid-util'
import { bitmapFromKidImageData } from '@/utils'

export type Props = {
  plane?: PlaneRomResourceLoaded
  sheet?: SheetRomResourceLoaded
  widthInTiles: number
}

const props = defineProps<Props>()
const { plane, sheet, widthInTiles } = toRefs(props)

const computedValues = computed(() => {
  if (!plane.value || !sheet.value) {
    return null
  }
  const width = widthInTiles.value * 8
  const height = (plane.value.tiles.length / (widthInTiles.value)) * 8
  return {
    width,
    height
  }
})

const draw = async (ctx: CanvasRenderingContext2D) => {
  if (!computedValues.value) {
    return
  }
  const bitmap = await bitmapFromKidImageData(
    KidImageData.fromPlane(plane.value!, sheet.value!, widthInTiles.value)
  )
  ctx.drawImage(bitmap, 0, 0)
  return
}
</script>

<style scoped></style>
