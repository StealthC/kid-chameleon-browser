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
      </div>
      <div class="flex flex-grow items-center justify-center">
        <CanvasRenderer
          v-if="values"
          :width="values.columns * 8"
          :height="values.rows * 8"
          :update-key="values"
          @update="draw"
        />
      </div>
    </div>
  </Panel>
</template>

<script setup lang="ts">
import { computed, ref, toRefs } from 'vue'
import { bytesToPixels, getCellImageBytes, type SheetRomResourceLoaded } from '@repo/kid-util'
import Panel from 'primevue/panel'
import InputNumber from 'primevue/inputnumber'
import CanvasRenderer from './CanvasRenderer.vue'

const drawCell = (ctx: CanvasRenderingContext2D, id: number = 0, x: number = 0, y: number = 0) => {
  if (!values.value) {
    return
  }
  const { pixels } = values.value
  const cellImage = new ImageData(getCellImageBytes(id, pixels), 8, 8)
  const tempCanvas = new OffscreenCanvas(8, 8)
  const tempCtx = tempCanvas.getContext('2d')

  if (tempCtx) {
    tempCtx.putImageData(cellImage, 0, 0)
    ctx.drawImage(tempCanvas, x * 8, y * 8, 8, 8)
  }
}

const draw = (ctx: CanvasRenderingContext2D) => {
  if (!values.value) {
    return
  }
  const { columns, rows, cellsTotal } = values.value
  for (let x = 0; x < columns; x++) {
    for (let y = 0; y < rows; y++) {
      const cellIndex = x + y * columns
      if (cellIndex < cellsTotal) {
        drawCell(ctx, cellIndex, x, y)
      }
    }
  }
}

interface Props {
  resource: SheetRomResourceLoaded
  columns?: number
}

const props = defineProps<Props>()

const { resource } = toRefs(props)
const columns = ref(props.columns ?? 16)

const values = computed(() => {
  if (!resource.value) {
    return null
  }
  const pixels = bytesToPixels(resource.value.data)
  const cellsTotal = pixels.length / (8 * 8)
  const rows = Math.ceil(cellsTotal / columns.value)

  return {
    pixels,
    columns: columns.value,
    rows,
    cellsTotal,
  }
})
</script>

<style scoped></style>
