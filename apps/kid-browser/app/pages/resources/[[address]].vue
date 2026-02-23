<template>
  <RequiresRom>
    <main class="grid h-full min-h-0 gap-3 lg:grid-cols-[24rem_minmax(0,1fr)]">
      <div class="min-h-0">
        <ResourceList />
      </div>
      <div class="min-h-0 overflow-hidden">
        <ResourceView v-if="selectedResource !== null" :resource-address="selectedResource" />
        <GlassPanel v-else class="flex h-full items-center justify-center text-center">
          <p class="text-muted-foreground text-sm">
            Select a resource to inspect details and raw data.
          </p>
        </GlassPanel>
      </div>
    </main>
  </RequiresRom>
</template>

<script setup lang="ts">
import { computed, watchEffect } from 'vue'
import { parseAddressOrNull } from '~/utils/index'

definePageMeta({
  key: 'resources-browser',
})

const route = useRoute()
const rawAddress = computed(() => route.params.address)
const selectedResource = computed(() =>
  typeof rawAddress.value === 'string' ? parseAddressOrNull(rawAddress.value) : null,
)

watchEffect(() => {
  if (rawAddress.value && selectedResource.value === null) {
    navigateTo('/resources', { replace: true })
  }
})
</script>
