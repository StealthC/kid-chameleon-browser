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
import type{
  BaseResource,
  LoadedResource,
  SheetResource,
  SpriteFrameResource
} from '@repo/kid-util'
import { computed, toRefs } from 'vue'
import TileSheetView from './TileSheetView.vue'
import SpriteFrameView from './SpriteFrameView.vue'

interface Props {
  resource: LoadedResource<BaseResource>
}
const props = defineProps<Props>()
const { resource } = toRefs(props)
const componentValues = computed(() => {
  if (resource.value.type === "sheet") {
    return { viewerComponent: TileSheetView, props: { tileSheet: resource.value as LoadedResource<SheetResource> } }
  } else if (resource.value.type === "sprite-frame") {
    return { viewerComponent: SpriteFrameView, props: { spriteFrame: resource.value as LoadedResource<SpriteFrameResource> } }
  }
  return null
})
</script>

<style scoped></style>
