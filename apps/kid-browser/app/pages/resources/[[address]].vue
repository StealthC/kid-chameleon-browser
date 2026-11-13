<template>
  <UDashboardPanel id="resources" :ui="{ body: 'gap-0 overflow-hidden p-0 sm:p-0' }">
    <template #header>
      <UDashboardNavbar title="Resources" icon="i-heroicons-squares-2x2">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UButton
            v-if="!isDesktop && rom && selectedResource !== null"
            icon="i-heroicons-list-bullet"
            color="neutral"
            variant="soft"
            size="sm"
            @click="mobileListOpen = true"
          >
            Browser
          </UButton>
          <UButton v-if="!rom" icon="i-heroicons-arrow-up-tray" size="sm" @click="openRomDialog">
            Load ROM
          </UButton>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <RequiresRom>
        <div class="flex h-full min-h-0">
          <USplitter
            v-if="isDesktop"
            id="resources-split"
            :items="splitItems"
            class="h-full w-full"
          >
            <template #browser="{ collapsed, expand, collapse }">
              <aside class="border-default h-full w-full min-w-0 border-e">
                <ResourceList
                  v-if="!collapsed"
                  collapsible
                  @navigate="onResourceNavigate"
                  @collapse="collapse()"
                />
                <div v-else class="flex h-full flex-col items-center gap-2 py-3">
                  <UTooltip text="Expand resource browser">
                    <UButton
                      icon="i-heroicons-chevron-double-right"
                      color="neutral"
                      variant="ghost"
                      size="xs"
                      square
                      aria-label="Expand resource browser"
                      @click="expand()"
                    />
                  </UTooltip>
                  <UBadge
                    color="neutral"
                    variant="subtle"
                    size="sm"
                    :label="String(filteredCount)"
                    class="font-mono"
                  />
                  <UTooltip text="Search resources">
                    <UButton
                      icon="i-heroicons-magnifying-glass"
                      color="neutral"
                      variant="ghost"
                      size="xs"
                      square
                      aria-label="Search resources"
                      @click="expand()"
                    />
                  </UTooltip>
                </div>
              </aside>
            </template>

            <template #detail>
              <div class="h-full w-full min-w-0">
                <ResourceView
                  v-if="selectedResource !== null"
                  :resource-address="selectedResource"
                />
                <div v-else-if="rawAddress" class="flex h-full items-center justify-center p-6">
                  <UAlert
                    color="warning"
                    variant="subtle"
                    icon="i-heroicons-exclamation-triangle"
                    title="Invalid resource address"
                    description="Use a hexadecimal address, or return to the resource list."
                    class="max-w-md"
                  >
                    <template #actions>
                      <UButton to="/resources" color="neutral" variant="soft" size="sm">
                        Browse resources
                      </UButton>
                    </template>
                  </UAlert>
                </div>
                <div v-else class="flex h-full items-center justify-center p-6">
                  <UEmpty
                    icon="i-heroicons-cursor-arrow-rays"
                    title="Select a resource"
                    :description="`Browse ${totalResources.toLocaleString()} discovered resources and inspect previews, metadata, references and raw bytes.`"
                  />
                </div>
              </div>
            </template>
          </USplitter>

          <div v-else class="h-full w-full min-w-0">
            <ResourceView v-if="selectedResource !== null" :resource-address="selectedResource" />
            <div v-else-if="rawAddress" class="flex h-full items-center justify-center p-6">
              <UAlert
                color="warning"
                variant="subtle"
                icon="i-heroicons-exclamation-triangle"
                title="Invalid resource address"
                description="Use a hexadecimal address, or return to the resource list."
              />
            </div>
            <div v-else class="flex h-full flex-col items-center justify-center gap-3 p-6">
              <UEmpty
                icon="i-heroicons-squares-2x2"
                title="Browse resources"
                description="Open the resource browser to search and filter the ROM resources."
              >
                <template #actions>
                  <UButton icon="i-heroicons-list-bullet" @click="mobileListOpen = true">
                    Open resource browser
                  </UButton>
                </template>
              </UEmpty>
            </div>
          </div>
        </div>

        <USlideover
          v-model:open="mobileListOpen"
          title="Resource browser"
          side="left"
          :ui="{ content: 'w-full max-w-sm', body: 'p-0' }"
        >
          <template #body>
            <ResourceList @navigate="mobileListOpen = false" />
          </template>
        </USlideover>
      </RequiresRom>
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
import type { SplitterItem } from '@nuxt/ui'
import { useMediaQuery } from '@vueuse/core'
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import useRomStore from '~/stores/romStore'
import { useResourcesIndex } from '~/composables/useResourcesIndex'
import { parseAddressOrNull } from '~/utils/index'

useHead({ title: 'Resources · Kid Chameleon Browser' })

definePageMeta({
  key: 'resources-browser',
})

const route = useRoute()
const { rom } = storeToRefs(useRomStore())
const { filteredCount, totalResources } = useResourcesIndex()
const { openRomDialog } = useRomDialog()

const isDesktop = useMediaQuery('(min-width: 1024px)')
const mobileListOpen = ref(false)

const rawAddress = computed(() => route.params.address)
const selectedResource = computed(() =>
  typeof rawAddress.value === 'string' ? parseAddressOrNull(rawAddress.value) : null,
)
const splitItems: SplitterItem[] = [
  {
    id: 'resource-browser',
    slot: 'browser',
    sizeUnit: 'px',
    defaultSize: 316,
    minSize: 240,
    maxSize: 520,
    collapsible: true,
    collapsedSize: 48,
  },
  {
    id: 'resource-detail',
    slot: 'detail',
  },
]

watch(
  () => route.fullPath,
  () => {
    mobileListOpen.value = false
  },
)

function onResourceNavigate() {
  mobileListOpen.value = false
}
</script>
