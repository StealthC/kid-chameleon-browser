<template>
  <div
    class="border-border/60 flex h-full min-h-0 flex-col gap-3 rounded-lg border bg-slate-900/60 p-3"
  >
    <div class="grid grid-cols-2 gap-2 md:grid-cols-[auto_9rem_auto] md:items-center">
      <Button variant="outline" size="sm" @click="useColumns = !useColumns">
        <Icon name="heroicons:adjustments-horizontal-solid" class="size-4" />
        {{ useColumns ? 'Columns mode' : 'Rows mode' }}
      </Button>
      <Input type="number" v-model.number="value" class="text-center" :min="1" :max="255" />
      <div class="col-span-2 flex items-center justify-end gap-2 md:col-span-1">
        <Button size="icon-sm" variant="secondary" @click="value++">
          <Icon name="heroicons:plus-solid" class="size-4" />
        </Button>
        <Button size="icon-sm" variant="secondary" @click="value = Math.max(1, value - 1)">
          <Icon name="heroicons:minus-solid" class="size-4" />
        </Button>
      </div>
    </div>

    <div
      class="border-border/60 flex min-h-0 flex-1 items-center justify-center overflow-auto rounded-md border bg-slate-950/60 p-2"
    >

        <CanvasRenderer
          v-if="values"
          :width="values.columns * 8"
          :height="values.rows * 8"
          :update-key="values"
          @update="draw"
        />

    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, toRefs } from 'vue'
import {
  KidImageData,
  isLoadedResource,
  isPaletteResource,
  type SheetRomResourceLoaded,
} from '@repo/kid-util'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { useResourceLoader } from '~/composables/useResourceLoader'
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
const loader = useResourceLoader()
const references = loader.getReferencesResourcesLoadedQuery(computed(() => resource.value.baseAddress))

const sheetPalette = computed(() => {
  const related = references.data.value ?? []
  return related.find(
    (candidate) => isLoadedResource(candidate) && isPaletteResource(candidate),
  )
})

const values = computed(() => {
  if (!resource.value) return null
  const cellsTotal = resource.value.tiles.length
  const columns = valueMode.value === 'columns' ? value.value : Math.ceil(cellsTotal / value.value)
  const rows = valueMode.value === 'rows' ? value.value : Math.ceil(cellsTotal / value.value)
  return { columns, rows, cellsTotal }
})

const draw = async (ctx: CanvasRenderingContext2D) => {
  if (!values.value) return
  const sheetImage = KidImageData.fromSheet(resource.value, valueMode.value, value.value)
  const bitmap = await bitmapFromKidImageData(sheetImage, sheetPalette.value)
  ctx.drawImage(bitmap, 0, 0)
}
</script>
