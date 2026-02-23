<template>
  <RequiresRom>
    <main class="flex h-full w-full flex-row px-2 sm:px-0">
      <div class="h-full">
        <ResourceList />
      </div>
      <div class="h-full flex-grow overflow-auto ps-2">
        <ResourceView v-if="selectedResource != null" :resource-address="selectedResource" />
      </div>
    </main>
  </RequiresRom>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { getAddressNumber } from '~/utils/index'

const route = useRoute()
const selectedResource = computed(() =>
  route.params.address ? getAddressNumber(route.params.address as string) : null,
)
</script>
