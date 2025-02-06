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
import { getCellImageBytes, type SheetRomResourceLoaded } from '@repo/kid-util'
import Panel from 'primevue/panel'
import InputNumber from 'primevue/inputnumber'
import CanvasRenderer from './CanvasRenderer.vue'

const drawCell = async (ctx: CanvasRenderingContext2D, id: number = 0, x: number = 0, y: number = 0) => {
  if (!values.value) {
    return
  }
  const { data } = values.value
  const cellImage = await createImageBitmap(new ImageData(getCellImageBytes(id, data), 8, 8))
  ctx.drawImage(cellImage, x * 8, y * 8, 8, 8)
}

const draw = async (ctx: CanvasRenderingContext2D) => {
  if (!values.value) {
    return
  }
  const { columns, rows, cellsTotal } = values.value
  for (let x = 0; x < columns; x++) {
    for (let y = 0; y < rows; y++) {
      const cellIndex = x + y * columns
      if (cellIndex < cellsTotal) {
        await drawCell(ctx, cellIndex, x, y)
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
  const data = resource.value.data
  const cellsTotal = data.length / (8 * 4)
  const rows = Math.ceil(cellsTotal / columns.value)

  return {
    data,
    columns: columns.value,
    rows,
    cellsTotal,
  }
})
</script>

<style scoped></style>
