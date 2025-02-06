<script setup lang="ts">
import ResourceTree from '@/components/ResourceTree.vue'
import { fromAddressString } from '@repo/kid-util'
import { ref } from 'vue'
import ResourceView from '@/components/ResourceView.vue'

const selectedResource = ref<string|null>(null)

const loadResource = (resource: string) => {
  selectedResource.value = resource
}
</script>
<template>
  <main class="flex h-full w-full flex-row">
    <div class="w-80 overflow-y-auto">
      <ResourceTree @selected="loadResource" />
    </div>
    <div class="h-full flex-grow overflow-auto">
      <ResourceView v-if="selectedResource != null" :resource-address="fromAddressString(selectedResource)" />
    </div>
  </main>
</template>
