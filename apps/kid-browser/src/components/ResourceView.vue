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
import type {
  LoadedRomResource,
  SheetRomResourceLoaded,
  SpriteFrameRomResourceLoaded,
} from '@repo/kid-util'
import { computed, toRefs } from 'vue'
import TileSheetView from './TileSheetView.vue'
import SpriteFrameView from './SpriteFrameView.vue'

interface Props {
  resource: LoadedRomResource
}
const props = defineProps<Props>()
const { resource } = toRefs(props)
const componentValues = computed(() => {
  if (resource.value.type === 'sheet') {
    return {
      viewerComponent: TileSheetView,
      props: { tileSheet: resource.value as SheetRomResourceLoaded },
    }
  } else if (resource.value.type.includes('sprite-frame')) {
    return {
      viewerComponent: SpriteFrameView,
      props: { spriteFrame: resource.value as SpriteFrameRomResourceLoaded },
    }
  }
  return null
})
</script>

<style scoped></style>
