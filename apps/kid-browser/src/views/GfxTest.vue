<script setup lang="ts">
import GfxView from '@/components/GfxView.vue'
import ResourceTree from '@/components/ResourceTree.vue'
import { PackedTileSheet, RawTileSheet, type Resource, type TileSheetResource } from '@repo/kid-util'
import { ref } from 'vue'

const selectedResource = ref<Resource | null>(null)

const loadResource = (resource: Resource) => {
  if (resource instanceof RawTileSheet || resource instanceof PackedTileSheet) {
    selectedResource.value = resource as Resource
  }
}
</script>
<template>
  <main>
    <div class="flex">
      <div>
        <ResourceTree @selected="loadResource" />
      </div>
      <div class="flex-grow">
        <GfxView v-if="selectedResource != null" :tileSheet="selectedResource" />
      </div>
    </div>
  </main>
</template>
