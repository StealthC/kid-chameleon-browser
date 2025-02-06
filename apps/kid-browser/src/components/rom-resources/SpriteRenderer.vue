<template>
  <CanvasRenderer
    v-if="computedValues"
    :width="computedValues.columns * 8"
    :height="computedValues.rows * 8"
    :update-key="computedValues"
    @update="draw"
  ></CanvasRenderer>
</template>

<script setup lang="ts">
import { bytesToPixels, getCellImageBytes } from '@repo/kid-util'
import { computed, toRefs } from 'vue'
import CanvasRenderer from './CanvasRenderer.vue'

export type Props = {
  bytes?: Uint8Array
  width: number
  height: number
  tileId?: number
  xOffset?: number
  yOffset?: number
}

const props = defineProps<Props>()
const { bytes, width, height } = toRefs(props)
const tileId = computed(() => props.tileId ?? 0)

const computedValues = computed(() => {
  if (!bytes.value || !width.value || !height.value) {
    return null
  }
  const columns = Math.ceil(width.value / 8.0)
  const rows = Math.ceil(height.value / 8.0)
  const size = columns * rows * 8 * 4
  const start = tileId.value * 8 * 4
  const end = start + size
  if (bytes.value.length < start || bytes.value.length < end) {
    return null
  }
  const sliceBytes = bytes.value.subarray(start, end)
  const pixels = bytesToPixels(sliceBytes)
  return { columns, rows, pixels }
})

const draw = (ctx: CanvasRenderingContext2D) => {
  if (!computedValues.value) {
    return
  }
  let cellIndex = 0
  const quadWidth = Math.ceil(computedValues.value.columns / 4.0)
  const quadHeight = Math.ceil(computedValues.value.rows / 4.0)
  for (let qy = 0; qy < quadHeight; qy++) {
    for (let qx = 0; qx < quadWidth; qx++) {
      for (let x = qx * 4; x < Math.min(qx * 4 + 4, computedValues.value.columns); x++) {
        for (let y = qy * 4; y < Math.min(qy * 4 + 4, computedValues.value.rows); y++) {
          drawCell(ctx, cellIndex++, x, y)
        }
      }
    }
  }
}

const drawCell = (ctx: CanvasRenderingContext2D, id: number = 0, x: number = 0, y: number = 0) => {
  if (!computedValues.value) {
    return
  }
  const cellImage = new ImageData(getCellImageBytes(id, computedValues.value.pixels), 8, 8)
  const tempCanvas = new OffscreenCanvas(8, 8)
  const tempCtx = tempCanvas.getContext('2d')
  if (tempCtx) {
    tempCtx.putImageData(cellImage, 0, 0)
    ctx.drawImage(tempCanvas, x * 8, y * 8, 8, 8)
  }
}
</script>

<style scoped></style>
