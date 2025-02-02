<template>
  <Panel :header="`Sprite Frame - ${resourceName}`">
    <SpriteRenderer v-if="bytes" :bytes="bytes" :tile-id="tileId" :width="spriteFrame.data.width" :height="spriteFrame.data.height" />
    <Panel header="Details" class="font-mono text-xs">
      <ul>
        <li>Resource Index: 0x{{ (spriteFrame.tableIndex ?? 0).toString(16) }}</li>
        <li>Tile ID: 0x{{ tileId.toString(16) }}</li>
        <li>Width: {{ spriteFrame.data.width }}</li>
        <li>Height: {{ spriteFrame.data.height }}</li>
        <li>X Offset: {{ spriteFrame.data.xOffset }}</li>
        <li>Y Offset: {{ spriteFrame.data.yOffset }}</li>
      </ul>
    </Panel>
  </Panel>
</template>

<script setup lang="ts">
import { PlayerSpriteFrameResource, SpriteFrameResource } from '@repo/kid-util';
import { computed, toRefs } from 'vue';
import Panel from 'primevue/panel'
import SpriteRenderer from './SpriteRenderer.vue';

interface Props {
  spriteFrame: SpriteFrameResource | PlayerSpriteFrameResource
}

const props = defineProps<Props>()
const { spriteFrame } = toRefs(props)
const resourceName = computed(() => `0x${spriteFrame.value.baseAddress.toString(16)}`)
const tileId = computed(() =>
{
  if (spriteFrame.value instanceof SpriteFrameResource) {
    return spriteFrame.value.data.tileId
  }
  return 0
}
)
const bytes = computed(() => {
  if (spriteFrame.value instanceof PlayerSpriteFrameResource) {
    return spriteFrame.value.data.data
  }
  return null
})


</script>

<style scoped>

</style>
