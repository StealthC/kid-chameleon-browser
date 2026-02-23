<template>
  <div
    class="border-border/60 flex h-full min-h-0 flex-col gap-3 rounded-lg border bg-slate-900/60 p-3"
  >
    <div class="flex items-center justify-between gap-2">
      <p class="text-sm font-semibold">Sprite Frame — {{ resourceName }}</p>
      <Badge variant="outline">{{ needSheet ? 'Needs sheet' : 'Embedded' }}</Badge>
    </div>

    <Select v-if="needSheet" v-model="sheetString">
      <SelectTrigger>
        <SelectValue placeholder="Select a tile sheet" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem v-for="s in sheets" :key="s.key" :value="String(s.value)">{{
          s.name
        }}</SelectItem>
      </SelectContent>
    </Select>

    <div
      class="border-border/60 flex max-h-[24rem] items-center justify-center overflow-auto rounded-md border bg-slate-950/60 p-2"
    >
      <SpriteRenderer
        v-if="bytes"
        :bytes="bytes"
        :tile-id="tileId"
        :width="resource.width"
        :height="resource.height"
      />
      <p v-else class="text-muted-foreground text-sm">
        Select a sheet to preview this sprite frame.
      </p>
    </div>

    <div class="border-border/60 rounded border bg-slate-950/60 p-2">
      <Table>
        <TableBody>
          <TableRow v-for="row in rows" :key="row.label">
            <TableCell class="text-muted-foreground text-xs">{{ row.label }}</TableCell>
            <TableCell class="font-mono text-xs">{{ row.value }}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  isLinkedSpriteFrameResource,
  isLoadedResource,
  isSheetResource,
  type SpriteFrameRomResourceLoaded,
} from '@repo/kid-util'
import { computed, ref, toRefs } from 'vue'
import { Badge } from '~/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { Table, TableBody, TableCell, TableRow } from '~/components/ui/table'
import { addressFormat, getNormalizedName } from '~/utils/index'
import { useResourceLoader } from '~/composables/useResourceLoader'

interface Props {
  resource: SpriteFrameRomResourceLoaded
}

const props = defineProps<Props>()
const { resource } = toRefs(props)
const sheet = ref<number | null>(null)
const sheetString = computed({
  get: () => (sheet.value === null ? '' : String(sheet.value)),
  set: (value: string) => {
    sheet.value = value ? Number(value) : null
  },
})
const resourceLoader = useResourceLoader()
const sheetList = resourceLoader.getResourceListOfTypeQuery('sheet')
const isSheetSelected = computed(() => sheet.value !== null)
const loadedSheet = resourceLoader.useGetResourceLoadedQuery(sheet, isSheetSelected)

const sheets = computed(() => {
  if (!sheetList.data.value) return []
  return sheetList.data.value.map((s) => ({
    key: s.baseAddress,
    name: getNormalizedName(s),
    value: s.baseAddress,
  }))
})

const resourceName = computed(() => `0x${resource.value.baseAddress.toString(16)}`)
const needSheet = computed(() => !isLinkedSpriteFrameResource(resource.value))
const tileId = computed(() =>
  !isLinkedSpriteFrameResource(resource.value) ? resource.value.tileId : 0,
)

const bytes = computed(() => {
  if (isLinkedSpriteFrameResource(resource.value)) return resource.value.data
  if (
    loadedSheet.data.value &&
    isLoadedResource(loadedSheet.data.value) &&
    isSheetResource(loadedSheet.data.value)
  ) {
    return loadedSheet.data.value.data
  }
  return null
})

const rows = computed(() => [
  { label: 'CRC32', value: addressFormat(resource.value.hash) },
  { label: 'Resource Index', value: addressFormat(resource.value.tableIndex ?? 0) },
  { label: 'Tile ID', value: addressFormat(tileId.value) },
  { label: 'Width', value: String(resource.value.width) },
  { label: 'Height', value: String(resource.value.height) },
  { label: 'X Offset', value: String(resource.value.xOffset) },
  { label: 'Y Offset', value: String(resource.value.yOffset) },
])
</script>
