<template>
  <Panel header="Graphics">
    <Button severity="secondary" @click="draw" class="p-button-outlined pb-4">Refresh</Button>
    <div class="flex justify-center items-center">
      <canvas ref="canvas" :width="columns * 8" :height="rows * 8" />
    </div>
  </Panel>
</template>

<script setup lang="ts">
import { computed, ref, toRefs, useTemplateRef, watch, watchEffect, type Ref } from 'vue'
import Button from 'primevue/button'
import { bytesToPixels, getCellImageBytes, type Resource } from '@repo/kid-util'
import { Panel } from 'primevue'

const canvas = useTemplateRef('canvas')
const context = ref<CanvasRenderingContext2D | null>(null)
const zoom = ref(1)

const drawCell = (ctx: CanvasRenderingContext2D, id: number = 0, x: number = 0, y: number = 0) => {
  const cellImage = new ImageData(getCellImageBytes(id, pixels.value), 8, 8)
  ctx.putImageData(cellImage, x * 8, y * 8)
}

const draw = () => {
  if (canvas.value) {
    if (!context.value) {
      context.value = canvas.value.getContext('2d')
    }
    const ctx = context.value
    if (ctx) {
      console.log("drawing")
      ctx.fillStyle = 'green'
      ctx.fillRect(0, 0, columns.value * 8, rows.value * 8)
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
  tileSheet: Resource
  columns?: number
}

const props = defineProps<Props>()

const { tileSheet } = toRefs(props)

const columns = computed(() => props.columns ?? 16)
const pixels = computed(() => {
  return bytesToPixels(tileSheet.value.getData())
})
const cellsTotal = computed(() => pixels.value.length / (8 * 8))
const rows = computed(() => Math.ceil(cellsTotal.value / columns.value))

watchEffect(() => {
  if (canvas.value && tileSheet.value && pixels.value && columns.value && rows.value) {
      draw()
  }
}, { flush: 'post' })
</script>

<style scoped></style>
