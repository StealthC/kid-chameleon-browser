<template>
  <div class="flex flex-col gap-2 rounded-lg border border-white/20 p-3">
    <div class="text-sm font-bold">Sprite Frame — {{ resourceName }}</div>
    <select
      v-if="needSheet"
      v-model="sheet"
      class="rounded border border-white/30 bg-blue-950 p-1 text-sm text-white"
    >
      <option :value="null" disabled>Select a tile sheet…</option>
      <option v-for="s in sheets" :key="s.key" :value="s.value">{{ s.name }}</option>
    </select>
    <SpriteRenderer
      v-if="bytes"
      :bytes="bytes"
      :tile-id="tileId"
      :width="resource.width"
      :height="resource.height"
    />
    <div class="rounded border border-white/20 p-2 font-mono text-xs">
      <ul>
        <li>CRC32: {{ addressFormat(resource.hash) }}</li>
        <li>Resource Index: {{ addressFormat(resource.tableIndex ?? 0) }}</li>
        <li>Tile ID: {{ addressFormat(tileId) }}</li>
        <li>Width: {{ resource.width }}</li>
        <li>Height: {{ resource.height }}</li>
        <li>X Offset: {{ resource.xOffset }}</li>
        <li>Y Offset: {{ resource.yOffset }}</li>
      </ul>
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
import { computed, ref, toRefs, type Ref } from 'vue'
import { addressFormat, getNormalizedName } from '~/utils/index'
import { useResourceLoader } from '~/composables/useResourceLoader'

interface Props {
  resource: SpriteFrameRomResourceLoaded
}

const props = defineProps<Props>()
const { resource } = toRefs(props)
const sheet = ref<number | null>(null)
const resourceLoader = useResourceLoader()
const sheetList = resourceLoader.value.getResourceListOfTypeQuery('sheet')
const isSheetSelected = computed(() => sheet.value !== null)
const loadedSheet = resourceLoader.value.useGetResourceLoadedQuery(
  sheet as Ref<number>,
  isSheetSelected,
)

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
</script>
