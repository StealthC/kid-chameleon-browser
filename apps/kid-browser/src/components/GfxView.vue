<template>
  <Panel header="Graphics">
    <Button severity="secondary" @click="draw" class="p-button-outlined pb-4">Refresh</Button>
    <div class="flex justify-center items-center">
      <canvas ref="canvas" :width="columns*8" :height="rows*8" />
    </div>
  </Panel>
</template>

<script setup lang="ts">
import { computed, ref, useTemplateRef, watchEffect } from 'vue'
import Button from 'primevue/button'
import { getCellImageBytes } from '@repo/kid-util'
import { Panel } from 'primevue'

const canvas = useTemplateRef('canvas')
const ctx = ref<CanvasRenderingContext2D | null>(null)
const zoom = ref(1)

watchEffect(() => {
  if (canvas.value) {
    const c = canvas.value.getContext('2d')
    ctx.value = c
    draw()
  }
})

const drawCell = (ctx: CanvasRenderingContext2D, id: number = 0, x: number = 0, y: number = 0) => {
  const cellImage = new ImageData(getCellImageBytes(id, bytes), 8, 8)
  ctx.putImageData(cellImage, x * 8, y * 8)
}

const draw = () => {
  if (ctx.value) {
    ctx.value.fillStyle = 'green'
    ctx.value.fillRect(0, 0, columns * 8, rows.value * 8)
    for (let x = 0; x < columns; x++) {
      for (let y = 0; y < rows.value; y++) {
        const cellIndex = x + y * columns
        if (cellIndex < cellsTotal.value) {
          drawCell(ctx.value, cellIndex, x, y)
        }
      }
    }
  }
}

interface Props {
  bytes: Uint8Array
  columns?: number
}

const { bytes, columns = 16 } = defineProps<Props>()
const cellsTotal = computed(() => bytes.length / (8*8))
const rows = computed(() => Math.ceil(cellsTotal.value / columns))
</script>

<style scoped></style>
