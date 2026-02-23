<template>
  <div class="flex h-full min-h-0 w-full flex-col gap-3">
    <div v-if="useColumns" class="flex items-center justify-end gap-2">
      <Input type="number" v-model.number="columns" class="w-24 text-center" :min="1" :max="255" />
      <Button size="icon-sm" variant="secondary" @click="columns++">
        <Icon name="heroicons:plus-solid" class="size-4" />
      </Button>
      <Button size="icon-sm" variant="secondary" @click="columns = Math.max(1, columns - 1)">
        <Icon name="heroicons:minus-solid" class="size-4" />
      </Button>
    </div>

    <div
      class="border-border/60 flex min-h-0 flex-1 items-center justify-center overflow-auto rounded-md border bg-slate-950/60 p-2"
    >
      <CanvasRenderer
        v-if="computedValues"
        :width="computedValues.width"
        :height="computedValues.height"
        :update-key="computedValues"
        @update="draw"
      ></CanvasRenderer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, toRefs } from 'vue'
import {
  KidImageData,
  type PaletteRomResourceLoaded,
  type PlaneRomResourceLoaded,
  type SheetRomResourceLoaded,
} from '@repo/kid-util'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { bitmapFromKidImageData } from '~/utils/index'
import { useResourceLoader } from '~/composables/useResourceLoader'

export type Props = {
  resource: PlaneRomResourceLoaded
  sheet?: SheetRomResourceLoaded
  columns?: number
}

const props = defineProps<Props>()
const { resource, sheet } = toRefs(props)
const useColumns = computed(() => !resource.value.width)
const columns = ref(props.columns ?? 16)
const calculatedColumns = computed(() => (useColumns.value ? columns.value : resource.value.width!))
const loader = useResourceLoader()
const resourceAddress = computed(() => resource.value.baseAddress)
const related = loader.getReferencesResourcesLoadedQuery(resourceAddress)

const selectedSheet = computed(() => {
  if (sheet.value) return sheet.value
  if (related.data.value) {
    const relatedSheet = related.data.value.find((r) => r.type === 'sheet')
    return relatedSheet ? (relatedSheet as SheetRomResourceLoaded) : null
  }
  return null
})

const selectedPalette = computed(() => {
  if (related.data.value) {
    const relatedPalette = related.data.value.find((r) => r.type === 'palette')
    return relatedPalette ? (relatedPalette as PaletteRomResourceLoaded) : undefined
  }
  return undefined
})

const computedValues = computed(() => {
  const width = calculatedColumns.value * 8
  const height = (resource.value.tiles.length / calculatedColumns.value) * 8
  return { plane: resource.value, sheet: selectedSheet.value, width, height }
})

const draw = async (ctx: CanvasRenderingContext2D) => {
  if (!selectedSheet.value) return
  const bitmap = await bitmapFromKidImageData(
    KidImageData.fromPlane(resource.value, selectedSheet.value, calculatedColumns.value),
    selectedPalette.value,
  )
  ctx.drawImage(bitmap, 0, 0)
}
</script>
