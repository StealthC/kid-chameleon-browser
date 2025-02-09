<template>
  <CanvasRenderer
    v-if="computedValues"
    :width="width"
    :height="height"
    :update-key="computedValues"
    @update="draw"
  ></CanvasRenderer>
</template>

<script setup lang="ts">
import { KidImageData } from '@repo/kid-util'
import { computed, toRefs } from 'vue'
import CanvasRenderer from './CanvasRenderer.vue'
import { bitmapFromKidImageData } from '@/utils'

export type Props = {
  bytes: Uint8Array
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
  return {
    tileId: tileId.value,
    columns,
    rows,
    width: width.value,
    height: height.value,
    bytes: bytes.value,
  }
})

const draw = async (ctx: CanvasRenderingContext2D) => {
  if (!computedValues.value) {
    return
  }
  const { tileId, width, height, bytes } = computedValues.value
  const bitmap = await bitmapFromKidImageData(KidImageData.fromSprite(bytes, width, height, tileId))
  ctx.drawImage(bitmap, 0, 0)
  return
}
</script>

<style scoped></style>
