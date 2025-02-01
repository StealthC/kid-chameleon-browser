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
import { PackedTileSheet, type Resource } from '@repo/kid-util'
import { storeToRefs } from 'pinia'
import Tree, { type TreeSelectionKeys } from 'primevue/tree'
import type { TreeNode } from 'primevue/treenode'
import { computed, ref } from 'vue'
const emit = defineEmits<{
  selected: [resource: Resource]
}>()
const { romResources } = storeToRefs(useRomStore())
const selectedKey = ref<TreeSelectionKeys | undefined>(undefined)
const nodes = computed(() => {
  if (!romResources.value) return []
  return [
    {
      label: 'Tile Sheets',
      selectable: false,
      children: romResources.value.tileSheets.map((tileSheet, index) => ({
        key: `0x${tileSheet.baseAddress.toString(16)}`,
        label: `0x${tileSheet.baseAddress.toString(16)} (${tileSheet instanceof PackedTileSheet ? 'Packed' : 'Raw'})`,
        selectable: true,
        data: tileSheet,
      })),
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
