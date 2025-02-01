<script setup lang="ts">
import ResourceTree from '@/components/ResourceTree.vue'
import {
  type Resource,
} from '@repo/kid-util'
import { ref } from 'vue'
import ResourceView from '@/components/ResourceView.vue'

const selectedResource = ref<Resource | null>(null)

const loadResource = (resource: Resource) => {
  selectedResource.value = resource as Resource
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
