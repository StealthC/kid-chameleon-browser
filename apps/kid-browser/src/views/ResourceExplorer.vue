<script setup lang="ts">
import ResourceTree from '@/components/ResourceTree.vue'
import { ref } from 'vue'
import ResourceView from '@/components/ResourceView.vue'

const selectedResource = ref<number | null>(null)

const loadResource = (resource: number) => {
  selectedResource.value = resource
}
</script>
<template>
  <main class="flex h-full w-full flex-row px-2 sm:px-0">
    <div class="w-80 overflow-y-auto">
      <ResourceTree @selected="loadResource" />
    </div>
    <div class="h-full flex-grow overflow-auto">
      <ResourceView v-if="selectedResource != null" :resource-address="selectedResource" />
    </div>
  </main>
</template>
