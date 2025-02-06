<template>
  <Tree
    :value="nodes"
    v-model:selectionKeys="selectedKey"
    @node-select="OnNodeSelect"
    selection-mode="single"
  ></Tree>
</template>

<script setup lang="ts">
import useRomStore from '@/stores/rom'
import { storeToRefs } from 'pinia'
import Tree, { type TreeSelectionKeys } from 'primevue/tree'
import type { TreeNode } from 'primevue/treenode'
import { computed, ref } from 'vue'
const emit = defineEmits<{
  selected: [resource: string]
}>()

const { romResources } = storeToRefs(useRomStore())
const selectedKey = ref<TreeSelectionKeys | undefined>(undefined)
const spriteFrames = computed(() => {
  if (!romResources.value) return []
  return romResources.value.spriteFrames.map((spriteFrame) => ({
    key: `${spriteFrame}`,
    label: `$${spriteFrame.toUpperCase()}`,
    selectable: true,
    data: spriteFrame,
  }))
})

const tileSheets = computed(() => {
  if (!romResources.value) return []
  return romResources.value.tileSheets.map((tileSheet) => ({
    key: `${tileSheet}`,
    label: `$${tileSheet.toUpperCase()}`,
    selectable: true,
    data: tileSheet,
  }))
})

const nodes = computed(() => {
  if (!romResources.value) return []
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
