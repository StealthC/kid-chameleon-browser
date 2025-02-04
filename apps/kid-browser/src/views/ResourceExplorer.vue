<script setup lang="ts">
import ResourceTree from '@/components/ResourceTree.vue'
import type { LoadedResource, BaseResource } from '@repo/kid-util'
import { ref } from 'vue'
import ResourceView from '@/components/ResourceView.vue'

const selectedResource = ref<LoadedResource<BaseResource> | null>(null)

const loadResource = (resource: LoadedResource<BaseResource>) => {
  selectedResource.value = resource
}
</script>
<template>
  <main class="flex h-full w-full flex-row">
    <div class="w-80 overflow-y-auto">
      <ResourceTree @selected="loadResource" />
    </div>
    <div class="h-full flex-grow overflow-auto">
      <ResourceView v-if="selectedResource != null" :resource="selectedResource" />
    </div>
  </main>
</template>
