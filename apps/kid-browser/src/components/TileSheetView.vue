<template>
  <Panel header="Tile Sheet">
    <div class="flex h-full w-full flex-row">
      <div class="flex flex-col items-center">
        <label for="columns">Columns:</label>
        <InputNumber
          v-model="columns"
          showButtons
          buttonLayout="vertical"
          size="small"
          :min="1"
          :max="255"
        ></InputNumber>
        <label for="zoom">Scale:</label>
        <InputNumber
          v-model="zoom"
          showButtons
          buttonLayout="vertical"
          size="small"
          :min="1"
          :max="4"
        ></InputNumber>
      </div>
      <div class="flex flex-grow items-center justify-center">
        <canvas ref="canvas" :width="columns * 8 * zoom" :height="rows * 8 * zoom" />
      </div>
    </div>
  </Panel>
</template>

<script setup lang="ts">
import { computed, ref, toRefs, useTemplateRef, watchEffect } from 'vue'
import {
  bytesToPixels,
  getCellImageBytes,
  type LoadedResource,
  type SheetResource,
} from '@repo/kid-util'
import Panel from 'primevue/panel'
import InputNumber from 'primevue/inputnumber'

const canvas = useTemplateRef('canvas')
const context = ref<CanvasRenderingContext2D | null>(null)
const zoom = ref(2)

const drawCell = (ctx: CanvasRenderingContext2D, id: number = 0, x: number = 0, y: number = 0) => {
  const cellImage = new ImageData(getCellImageBytes(id, pixels.value), 8, 8)
  const tempCanvas = new OffscreenCanvas(8, 8)
  const tempCtx = tempCanvas.getContext('2d')

  if (tempCtx) {
    tempCtx.putImageData(cellImage, 0, 0)
    ctx.drawImage(tempCanvas, x * 8, y * 8, 8, 8)
  }
}

const draw = () => {
  if (canvas.value) {
    if (!context.value) {
      context.value = canvas.value.getContext('2d')
    }
    const ctx = context.value
    if (ctx) {
      ctx.resetTransform()
      ctx.imageSmoothingEnabled = false
      ctx.scale(zoom.value, zoom.value)
      ctx.clearRect(0, 0, columns.value * 8, rows.value * 8)
      for (let x = 0; x < columns.value; x++) {
        for (let y = 0; y < rows.value; y++) {
          const cellIndex = x + y * columns.value
          if (cellIndex < cellsTotal.value) {
            drawCell(ctx, cellIndex, x, y)
          }
        }
      }
    } else {
      console.error('Could not get 2D context from canvas')
    }
  }
}

interface Props {
  tileSheet: LoadedResource<SheetResource>
  columns?: number
}

const props = defineProps<Props>()

const { tileSheet } = toRefs(props)

const columns = ref(props.columns ?? 16)
const pixels = computed(() => {
  return bytesToPixels(tileSheet.value.data!)
})
const cellsTotal = computed(() => pixels.value.length / (8 * 8))
const rows = computed(() => Math.ceil(cellsTotal.value / columns.value))

watchEffect(
  () => {
    if (
      canvas.value &&
      tileSheet.value &&
      pixels.value &&
      columns.value &&
      rows.value &&
      zoom.value
    ) {
      draw()
    }
  },
  { flush: 'post' },
)
</script>

<style scoped></style>
