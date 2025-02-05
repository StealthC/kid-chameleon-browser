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
      :width="spriteFrame.width"
      :height="spriteFrame.height"
    />
    <Panel header="Details" class="font-mono text-xs">
      <ul>
        <li>CRC32: {{ addressFormat(spriteFrame.hash) }}</li>
        <li>Resource Index: {{ addressFormat(spriteFrame.tableIndex ?? 0) }}</li>
        <li>Tile ID: {{ addressFormat(tileId) }}</li>
        <li>Width: {{ spriteFrame.width }}</li>
        <li>Height: {{ spriteFrame.height }}</li>
        <li>X Offset: {{ spriteFrame.xOffset }}</li>
        <li>Y Offset: {{ spriteFrame.yOffset }}</li>
      </ul>
    </Panel>
  </Panel>
</template>

<script setup lang="ts">
import { isLinkedSpriteFrame, type LinkedSpriteFrameRomResourceLoaded, type SpriteFrameRomResourceLoaded, type UnlinkedSpriteFrameRomResourceLoaded } from '@repo/kid-util'
import { computed, ref, toRefs } from 'vue'
import Panel from 'primevue/panel'
import Select from 'primevue/select'
import SpriteRenderer from './SpriteRenderer.vue'
import useRomStore from '@/stores/rom'
import { storeToRefs } from 'pinia'
import { addressFormat } from '@/utils'

interface Props {
  spriteFrame: SpriteFrameRomResourceLoaded
}


const props = defineProps<Props>()
const { spriteFrame } = toRefs(props)
const sheet = ref(null)
const { romResources } = storeToRefs(useRomStore())
const sheets = computed(() => {
  if (romResources.value) {
    return romResources.value.tileSheets
      .filter((resource) => resource.loaded)
      .map((sheet) => ({
        name: sheet.baseAddress.toString(16),
        value: sheet.data,
      }))
  }
  return []
})
const resourceName = computed(() => `0x${spriteFrame.value.baseAddress.toString(16)}`)
const needSheet = computed(() => !isLinkedSpriteFrame(spriteFrame.value))
const tileId = computed(() => !isLinkedSpriteFrame(spriteFrame.value) ? spriteFrame.value.tileId : 0)
const bytes = computed(() => {
  if (isLinkedSpriteFrame(spriteFrame.value)) {
    return spriteFrame.value.data
  }
  if (sheet.value) {
    return sheet.value
  }
  return null
})
</script>

<style scoped></style>
