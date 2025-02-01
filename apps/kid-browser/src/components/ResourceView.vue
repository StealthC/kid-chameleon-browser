<template>
  <Panel header="Resource Viewer">
    <TileSheetView v-if="tileSheetResource" :tileSheet="tileSheetResource" />
  </Panel>
</template>

<script setup lang="ts">
import { Panel } from 'primevue'
import { PackedTileSheet, RawTileSheet, type Resource } from '@repo/kid-util'
import { computed, toRefs } from 'vue'
import TileSheetView from './TileSheetView.vue'

interface Props {
  resource: Resource
}
const props = defineProps<Props>()
const { resource } = toRefs(props)

const tileSheetResource = computed(() => {
  if (resource.value instanceof RawTileSheet || resource.value instanceof PackedTileSheet) {
    return resource.value
  }
  return null
})
</script>

<style scoped></style>
