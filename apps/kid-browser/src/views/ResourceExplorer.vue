<script setup lang="ts">
import ResourceTree from '@/components/ResourceTree.vue'
import type {
  LoadedResource,
  BaseResource,
} from '@repo/kid-util'
import { ref } from 'vue'
import ResourceView from '@/components/ResourceView.vue'

const selectedResource = ref<LoadedResource<BaseResource> | null>(null)

const loadResource = (resource: LoadedResource<BaseResource>) => {
  selectedResource.value = resource
}
</script>
<template>
  <main class="flex flex-row h-full w-full">
    <div class="overflow-y-auto w-80">
      <ResourceTree @selected="loadResource" />
    </div>
    <div class="flex-grow h-full overflow-auto">
      <ResourceView v-if="selectedResource != null" :resource="selectedResource" />
    </div>
  </main>
</template>
