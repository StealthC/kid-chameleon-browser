<template>
  <RequiresRom>
    <main class="grid min-h-full min-h-0 gap-3 lg:h-full lg:grid-cols-[24rem_minmax(0,1fr)]">
      <div class="h-64 min-h-0 lg:h-full">
        <ResourceList />
      </div>
      <div class="min-h-[24rem] lg:h-full lg:overflow-auto">
        <ResourceView v-if="selectedResource !== null" :resource-address="selectedResource" />
        <GlassPanel v-else-if="rawAddress" class="flex h-full items-center justify-center text-center" role="alert">
          <div><p class="font-semibold">Invalid resource address</p><p class="text-muted-foreground mt-2 text-sm">Use a hexadecimal address, or return to the resource list.</p><NuxtLink class="text-primary mt-3 inline-block underline" to="/resources">Browse resources</NuxtLink></div>
        </GlassPanel>
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
import { computed } from 'vue'
import { parseAddressOrNull } from '~/utils/index'

definePageMeta({
  key: 'resources-browser',
})

const route = useRoute()
const rawAddress = computed(() => route.params.address)
const selectedResource = computed(() =>
  typeof rawAddress.value === 'string' ? parseAddressOrNull(rawAddress.value) : null,
)

</script>
