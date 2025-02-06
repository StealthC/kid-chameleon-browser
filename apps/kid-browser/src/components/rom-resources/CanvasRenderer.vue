<template>
  <canvas ref="canvasElement" :width="width * zoom" :height="height * zoom"></canvas>
</template>

<script setup lang="ts">
import { ref, toRefs, useTemplateRef, watch, watchEffect } from 'vue'

export type Props = {
  width: number
  height: number
  initialZoom?: number
  updateKey?: any
}

const defaultZoom = 2
const props = defineProps<Props>()
const { width, height, initialZoom, updateKey } = toRefs(props)
const canvas = useTemplateRef('canvasElement')
const zoom = ref(initialZoom.value ?? defaultZoom)

const emit = defineEmits<{
  update: [ctx: CanvasRenderingContext2D]
}>()

const draw = (canvas: HTMLCanvasElement) => {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  drawWithCtx(ctx)
}

const drawWithCtx = (ctx: CanvasRenderingContext2D) => {
  ctx.resetTransform()
  ctx.imageSmoothingEnabled = false
  ctx.clearRect(0, 0, width.value, height.value)
  ctx.scale(zoom.value, zoom.value)
  emit('update', ctx)
}

const refresh = () => {
  if (canvas.value) {
    draw(canvas.value)
  }
}

defineExpose({ refresh })

// Single watch for changes to the canvas element, zoom, width, and height
watch(
  () => ({
    canvas: canvas.value,
    updateKey: updateKey.value,
    zoom: zoom.value,
    width: width.value,
    height: height.value,
  }),
  (/* newValues, oldValues */) => {
    if (canvas.value) {
      draw(canvas.value)
    }
  },
  { immediate: true, flush: 'post' }
)
</script>

<style scoped></style>
