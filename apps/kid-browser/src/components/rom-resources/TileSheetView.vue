<template>
  <Panel header="Tile Sheet">
    <div class="flex h-full w-full flex-row">
      <div class="flex flex-col items-center">
        <ToggleButton class="w-full" v-model="useColumns" onLabel="Columns" offLabel="Rows" />
        <InputNumber
          v-model="value"
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
import { KidImageData, type SheetRomResourceLoaded } from '@repo/kid-util'
import Panel from 'primevue/panel'
import ToggleButton from 'primevue/togglebutton'
import InputNumber from 'primevue/inputnumber'
import CanvasRenderer from './CanvasRenderer.vue'
import { bitmapFromKidImageData } from '@/utils'

const draw = async (ctx: CanvasRenderingContext2D) => {
  if (!values.value) {
    return
  }
  const sheetImage = KidImageData.fromSheet(values.value.data, valueMode.value, value.value)
  const bitmap = await bitmapFromKidImageData(sheetImage)
  ctx.drawImage(bitmap, 0, 0)
}

interface Props {
  resource: SheetRomResourceLoaded
  value?: number
  mode?: 'rows' | 'columns'
}

const props = defineProps<Props>()

const { resource } = toRefs(props)
const value = ref(props.value ?? 16)
const useColumns = ref(props.mode === 'columns')

const valueMode = computed(() => (useColumns.value ? 'columns' : 'rows'))

const values = computed(() => {
  if (!resource.value) {
    return null
  }
  const data = resource.value.data
  const cellsTotal = data.length / (8 * 4)
  const columns = valueMode.value === 'columns' ? value.value : Math.ceil(cellsTotal / value.value)
  const rows = valueMode.value === 'rows' ? value.value : Math.ceil(cellsTotal / value.value)

  return {
    data,
    columns,
    rows,
    cellsTotal,
  }
})
</script>

<style scoped></style>
