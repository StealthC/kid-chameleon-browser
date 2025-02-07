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
import { addressFormat } from '@/utils'
import Tree, { type TreeSelectionKeys } from 'primevue/tree'
import type { TreeNode } from 'primevue/treenode'
import { computed, ref } from 'vue'
const emit = defineEmits<{
  selected: [resource: number]
}>()

const loader = useResourceLoader()
const spriteFramesList = loader.value.getResourceListOfTypeQuery(['linked-sprite-frame', 'unlinked-sprite-frame'])
const tileSheetList = loader.value.getResourceListOfTypeQuery('sheet')
const selectedKey = ref<TreeSelectionKeys | undefined>(undefined)
const spriteFrames = computed(() => {
  if (!spriteFramesList.data.value) {
    return []
  }
  return spriteFramesList.data.value.map((spriteFrame) => ({
    key: `${spriteFrame}`,
    label: `${addressFormat(spriteFrame)}`,
    selectable: true,
    data: spriteFrame,
  }))
})

const tileSheets = computed(() => {
  if (!tileSheetList.data.value) {
    return []
  }
  return tileSheetList.data.value.map((tileSheet) => ({
    key: `${tileSheet}`,
    label: `${addressFormat(tileSheet)}`,
    selectable: true,
    data: tileSheet,
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
  ] as TreeNode[]
})
const OnNodeSelect = (node: TreeNode) => {
  if (node.data) {
    emit('selected', node.data)
  }
}
</script>

<style scoped></style>
