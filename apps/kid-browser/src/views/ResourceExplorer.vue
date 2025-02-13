<template>
  <main class="flex h-full w-full flex-row px-2 sm:px-0">
    <div class="my-aut h-full">
      <ResourceList />
    </div>
    <div class="h-full flex-grow overflow-auto ps-2">
      <ResourceView v-if="selectedResource != null" :resource-address="selectedResource" />
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import ResourceView from '@/components/ResourceView.vue'
import ResourceList from '@/components/ResourceList.vue'
import { useRoute } from 'vue-router'
import { getAddressNumber } from '@/utils'

const route = useRoute()
const selectedResource = computed(() =>
  route.params.address ? getAddressNumber(route.params.address as string) : null,
)
</script>
