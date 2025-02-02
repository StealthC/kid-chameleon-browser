<template>
  <Panel header="Resource Viewer">
    <component
      v-if="componentValues"
      :is="componentValues.viewerComponent"
      v-bind="componentValues.props"
    />
  </Panel>
</template>

<script setup lang="ts">
import { Panel } from 'primevue'
import {
  PackedTileSheet,
  PlayerSpriteFrameResource,
  RawTileSheet,
  SpriteFrameResource,
  type Resource,
} from '@repo/kid-util'
import { computed, toRefs } from 'vue'
import TileSheetView from './TileSheetView.vue'
import SpriteFrameView from './SpriteFrameView.vue'

interface Props {
  resource: Resource
}
const props = defineProps<Props>()
const { resource } = toRefs(props)
const componentValues = computed(() => {
  if (resource.value instanceof RawTileSheet || resource.value instanceof PackedTileSheet) {
    return { viewerComponent: TileSheetView, props: { tileSheet: resource.value } }
  } else if (
    resource.value instanceof SpriteFrameResource ||
    resource.value instanceof PlayerSpriteFrameResource
  ) {
    return { viewerComponent: SpriteFrameView, props: { spriteFrame: resource.value } }
  }
  return null
})
</script>

<style scoped></style>
