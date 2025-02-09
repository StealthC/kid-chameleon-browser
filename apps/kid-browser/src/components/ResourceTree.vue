<template>
  <Tree
    :value="nodes"
    v-model:selectionKeys="selectedKey"
    @node-select="OnNodeSelect"
    selection-mode="single"
  ></Tree>
</template>

<script setup lang="ts">
import { useResourceLoader } from '@/composables/resource-loader'
import { getNormalizedName } from '@/utils'
import Tree, { type TreeSelectionKeys } from 'primevue/tree'
import type { TreeNode } from 'primevue/treenode'
import { computed, ref } from 'vue'
const emit = defineEmits<{
  selected: [resource: number]
}>()

const loader = useResourceLoader()
const spriteFramesList = loader.value.getResourceListOfTypeQuery([
  'linked-sprite-frame',
  'unlinked-sprite-frame',
])
const tileSheetList = loader.value.getResourceListOfTypeQuery('sheet')
const planeList = loader.value.getResourceListOfTypeQuery('plane')
const levelHeadersList = loader.value.getResourceListOfTypeQuery('level-header')

const selectedKey = ref<TreeSelectionKeys | undefined>(undefined)

const levelHeaders = computed(() => {
  if (!levelHeadersList.data.value) {
    return []
  }
  return levelHeadersList.data.value.map((levelHeader) => ({
    key: `${levelHeader.baseAddress}`,
    label: `${getNormalizedName(levelHeader)}`,
    selectable: true,
    data: levelHeader.baseAddress,
  }))
})

const spriteFrames = computed(() => {
  if (!spriteFramesList.data.value) {
    return []
  }
  return spriteFramesList.data.value.map((spriteFrame) => ({
    key: `${spriteFrame.baseAddress}`,
    label: `${getNormalizedName(spriteFrame)}`,
    selectable: true,
    data: spriteFrame.baseAddress,
  }))
})

const tileSheets = computed(() => {
  if (!tileSheetList.data.value) {
    return []
  }
  return tileSheetList.data.value.map((tileSheet) => ({
    key: `${tileSheet.baseAddress}`,
    label: `${getNormalizedName(tileSheet)}`,
    selectable: true,
    data: tileSheet.baseAddress,
  }))
})

const planes = computed(() => {
  if (!planeList.data.value) {
    return []
  }
  return planeList.data.value.map((plane) => ({
    key: `${plane.baseAddress}`,
    label: `${getNormalizedName(plane)}`,
    selectable: true,
    data: plane.baseAddress,
  }))
})

const nodes = computed(() => {
  return [
    {
      label: 'Sprite Frames',
      key: 'spriteFrames',
      selectable: false,
      children: spriteFrames.value,
    },
    {
      label: 'Tile Sheets',
      key: 'tileSheets',
      selectable: false,
      children: tileSheets.value,
    },
    {
      label: 'Planes',
      key: 'planes',
      selectable: false,
      children: planes.value,
    },
    {
      label: 'Level Headers',
      key: 'levelHeaders',
      selectable: false,
      children: levelHeaders.value,
    },
  ] as TreeNode[]
})
const OnNodeSelect = (node: TreeNode) => {
  if (node.data) {
    emit('selected', node.data)
  }
}
</script>

<style scoped></style>
