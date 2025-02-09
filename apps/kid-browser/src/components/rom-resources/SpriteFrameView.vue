<template>
  <Panel :header="`Sprite Frame - ${resourceName}`">
    <Select
      v-if="needSheet"
      v-model="sheet"
      :options="sheets"
      optionLabel="name"
      optionValue="value"
    />
    <SpriteRenderer
      v-if="bytes"
      :bytes="bytes"
      :tile-id="tileId"
      :width="resource.width"
      :height="resource.height"
    />
    <Panel header="Details" class="font-mono text-xs">
      <ul>
        <li>CRC32: {{ addressFormat(resource.hash) }}</li>
        <li>Resource Index: {{ addressFormat(resource.tableIndex ?? 0) }}</li>
        <li>Tile ID: {{ addressFormat(tileId) }}</li>
        <li>Width: {{ resource.width }}</li>
        <li>Height: {{ resource.height }}</li>
        <li>X Offset: {{ resource.xOffset }}</li>
        <li>Y Offset: {{ resource.yOffset }}</li>
      </ul>
    </Panel>
  </Panel>
</template>

<script setup lang="ts">
import {
  isLinkedSpriteFrameResource,
  isLoadedResource,
  isSheetResource,
  type SpriteFrameRomResourceLoaded,
} from '@repo/kid-util'
import { computed, ref, toRefs, type Ref } from 'vue'
import Panel from 'primevue/panel'
import Select from 'primevue/select'
import SpriteRenderer from './SpriteRenderer.vue'
import { addressFormat } from '@/utils'
import { useResourceLoader } from '@/composables/resource-loader'

interface Props {
  resource: SpriteFrameRomResourceLoaded
}

const props = defineProps<Props>()
const { resource } = toRefs(props)
const sheet = ref<number | null>(null)
const resourceLoader = useResourceLoader()
const sheetList = resourceLoader.value.getResourceListOfTypeQuery('sheet')
const isSheetSelected = computed(() => sheet.value !== null)
const loadedSheet = resourceLoader.value.useGetResourceQuery(sheet as Ref<number>, true, {
  enabled: isSheetSelected,
})
const sheets = computed(() => {
  if (sheetList.data.value) {
    return sheetList.data.value.map((sheet) => ({
      name: addressFormat(sheet),
      value: sheet,
    }))
  }
  return []
})
const resourceName = computed(() => `0x${resource.value.baseAddress.toString(16)}`)
const needSheet = computed(() => !isLinkedSpriteFrameResource(resource.value))
const tileId = computed(() =>
  !isLinkedSpriteFrameResource(resource.value) ? resource.value.tileId : 0,
)
const bytes = computed(() => {
  if (isLinkedSpriteFrameResource(resource.value)) {
    return resource.value.data
  }
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

<style scoped></style>
