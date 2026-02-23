<template>
  <div class="flex flex-col gap-2 rounded-lg border border-white/20 p-3">
    <div class="text-sm font-bold">Tile Sheet</div>
    <div class="flex h-full w-full flex-row gap-2">
      <div class="flex flex-col items-center gap-2">
        <button
          @click="useColumns = !useColumns"
          class="w-full rounded border border-white/30 px-2 py-1 text-xs hover:bg-white/10"
        >
          {{ useColumns ? 'Columns' : 'Rows' }}
        </button>
        <div class="flex flex-col items-center">
          <button @click="value++" class="px-2 text-lg leading-none">+</button>
          <input
            type="number"
            v-model="value"
            class="w-16 bg-transparent text-center text-sm outline-none"
            :min="1"
            :max="255"
          />
          <button @click="value = Math.max(1, value - 1)" class="px-2 text-lg leading-none">
            −
          </button>
        </div>
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
  </div>
</template>

<script setup lang="ts">
import { computed, ref, toRefs } from 'vue'
import { KidImageData, type SheetRomResourceLoaded } from '@repo/kid-util'
import { bitmapFromKidImageData } from '~/utils/index'

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
  if (!resource.value) return null
  const cellsTotal = resource.value.tiles.length
  const columns =
    valueMode.value === 'columns' ? value.value : Math.ceil(cellsTotal / value.value)
  const rows = valueMode.value === 'rows' ? value.value : Math.ceil(cellsTotal / value.value)
  return { columns, rows, cellsTotal }
})

const draw = async (ctx: CanvasRenderingContext2D) => {
  if (!values.value) return
  const sheetImage = KidImageData.fromSheet(resource.value, valueMode.value, value.value)
  const bitmap = await bitmapFromKidImageData(sheetImage)
  ctx.drawImage(bitmap, 0, 0)
}
</script>
