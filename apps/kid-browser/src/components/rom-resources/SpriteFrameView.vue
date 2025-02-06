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
import { isLinkedSpriteFrameResource, type SpriteFrameRomResourceLoaded } from '@repo/kid-util'
import { computed, ref, toRefs } from 'vue'
import Panel from 'primevue/panel'
import Select from 'primevue/select'
import SpriteRenderer from './SpriteRenderer.vue'
import useRomStore from '@/stores/rom'
import { storeToRefs } from 'pinia'
import { addressFormat } from '@/utils'

interface Props {
  resource: SpriteFrameRomResourceLoaded
}

const props = defineProps<Props>()
const { resource } = toRefs(props)
const sheet = ref(null)
const { romResources } = storeToRefs(useRomStore())
const sheets = computed(() => {
  if (romResources.value) {
    return romResources.value.tileSheets.map((sheet) => ({
      name: sheet,
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
  if (sheet.value) {
    return sheet.value
  }
  return null
})
</script>

<style scoped></style>
