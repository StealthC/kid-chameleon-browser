<template>
  <div
    :class="
      expanded
        ? 'bg-default/95 fixed inset-0 z-50 flex flex-col p-2 backdrop-blur-sm sm:p-4'
        : 'h-full w-full'
    "
  >
    <div class="relative flex h-full min-h-0 flex-col gap-2 xl:flex-row">
      <div
        class="border-default bg-muted/20 relative min-h-0 flex-1 overflow-hidden rounded-lg border p-1.5"
      >
        <div
          class="border-default bg-default/85 absolute top-2 right-2 z-20 flex items-center gap-1 rounded-md border p-0.5 backdrop-blur"
        >
          <UTooltip :text="sidebarOpen ? 'Hide viewer controls' : 'Show viewer controls'">
            <UButton
              :icon="sidebarOpen ? 'i-heroicons-x-mark' : 'i-heroicons-adjustments-horizontal'"
              color="neutral"
              variant="ghost"
              size="xs"
              square
              :aria-pressed="sidebarOpen"
              aria-label="Toggle viewer controls"
              @click="sidebarOpen = !sidebarOpen"
            />
          </UTooltip>
          <UTooltip :text="expanded ? 'Restore panel size' : 'Expand viewer'">
            <UButton
              :icon="
                expanded ? 'i-heroicons-arrows-pointing-in' : 'i-heroicons-arrows-pointing-out'
              "
              color="neutral"
              variant="ghost"
              size="xs"
              square
              :aria-label="expanded ? 'Restore panel size' : 'Expand viewer'"
              @click="expanded = !expanded"
            />
          </UTooltip>
        </div>

        <slot name="viewer" :expanded="expanded" />
      </div>

      <div
        v-if="sidebarOpen"
        class="absolute inset-0 z-20 bg-black/40 backdrop-blur-sm xl:hidden"
        aria-hidden="true"
        @click="sidebarOpen = false"
      />

      <aside
        v-if="sidebarOpen"
        class="border-default bg-default/95 xl:bg-elevated/30 absolute inset-y-0 right-0 z-30 flex w-80 max-w-[calc(100%-1rem)] flex-col overflow-hidden rounded-lg border shadow-2xl backdrop-blur xl:static xl:z-auto xl:h-auto xl:w-80 xl:max-w-none xl:shadow-none"
      >
        <header class="border-default flex h-9 shrink-0 items-center gap-2 border-b px-3">
          <UIcon name="i-heroicons-adjustments-horizontal" class="text-primary size-4" />
          <p class="text-muted text-[10px] font-semibold tracking-widest uppercase">
            Viewer controls
          </p>
          <UButton
            icon="i-heroicons-x-mark"
            color="neutral"
            variant="ghost"
            size="xs"
            square
            class="ms-auto"
            aria-label="Hide viewer controls"
            @click="sidebarOpen = false"
          />
        </header>
        <div class="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
          <slot name="sidebar" :expanded="expanded" />
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useMediaQuery, useStorage } from '@vueuse/core'

const expanded = defineModel<boolean>('expanded', { default: false })
const isWide = useMediaQuery('(min-width: 1280px)')
const sidebarOpen = useStorage('kid-browser-viewer-controls', isWide.value)
</script>
