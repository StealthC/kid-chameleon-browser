<template>
  <div class="flex h-full min-h-0 w-full flex-col">
    <div class="border-default flex h-11 shrink-0 items-center gap-2 border-b px-3">
      <div class="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto">
        <div class="min-w-0 shrink-0">
          <p class="text-highlighted truncate text-sm font-semibold">
            {{ map ? title : 'Level maps' }}
          </p>
          <p v-if="map" class="text-muted truncate font-mono text-[10px]">
            {{ addressFormat(map.headerAddress) }} · {{ map.header.width }}×{{ map.header.height }}
            screens
          </p>
        </div>

        <template v-if="map">
          <UBadge class="shrink-0 whitespace-nowrap" color="neutral" variant="subtle" size="sm">
            0x{{ map.header.levelIndex.toString(16).toUpperCase().padStart(2, '0') }}
          </UBadge>
          <UBadge class="shrink-0 whitespace-nowrap" color="neutral" variant="subtle" size="sm">
            theme {{ map.header.themeIndex }}
          </UBadge>
          <UBadge
            class="shrink-0 whitespace-nowrap"
            :color="map.graphics ? 'success' : map.graphicsError ? 'warning' : 'neutral'"
            variant="subtle"
            size="sm"
            :label="
              map.graphics ? 'ROM tiles' : map.graphicsError ? 'Colour fallback' : 'No graphics'
            "
          />
          <UBadge
            class="hidden shrink-0 whitespace-nowrap xl:inline-flex"
            color="neutral"
            variant="subtle"
            size="sm"
          >
            background {{ map.header.backgroundType }}
          </UBadge>
          <UBadge
            class="hidden shrink-0 whitespace-nowrap xl:inline-flex"
            v-if="map.graphics?.background"
            color="neutral"
            variant="subtle"
            size="sm"
            :label="`${map.graphics.background.format} bg`"
          />
          <UBadge
            class="hidden shrink-0 whitespace-nowrap xl:inline-flex"
            v-if="map.header.murderWall"
            color="warning"
            variant="subtle"
            size="sm"
            :label="`murder wall ${map.header.murderWallVariant ? 'right' : 'left'}`"
          />
          <UBadge
            class="hidden shrink-0 whitespace-nowrap xl:inline-flex"
            v-if="map.header.misc"
            color="neutral"
            variant="subtle"
            size="sm"
          >
            misc {{ map.header.misc }}
          </UBadge>
          <NuxtLink
            class="text-primary hidden shrink-0 text-[11px] hover:underline xl:inline"
            :to="getResourceRoute(map.headerAddress)"
          >
            Header resource
          </NuxtLink>
        </template>
      </div>

      <div class="flex shrink-0 items-center gap-1">
        <UButton
          v-if="map"
          class="xl:hidden"
          icon="i-heroicons-square-3-stack-3d"
          color="neutral"
          variant="ghost"
          size="xs"
          aria-label="Show layers and legend"
          @click="mobileLegendOpen = true"
        >
          <span class="hidden sm:inline">Layers</span>
        </UButton>
      </div>
    </div>

    <div class="flex min-h-0 flex-1">
      <div class="min-h-0 min-w-0 flex-1 p-2">
        <LevelMapViewer
          v-if="map"
          :map="map"
          :layers="layers"
          :loading="loading"
          @update:layers="emit('update:layers', $event)"
        />
        <div v-else-if="loading" class="flex h-full items-center justify-center">
          <div class="flex flex-col items-center gap-3 text-center">
            <UIcon name="i-heroicons-arrow-path" class="text-primary size-8 animate-spin" />
            <p class="text-highlighted text-sm font-medium">Decoding level map…</p>
            <p class="text-muted max-w-sm text-xs">
              Header, foreground layout, blocks, enemies and ROM tile art are being composed.
            </p>
          </div>
        </div>
        <div v-else-if="error" class="flex h-full items-center justify-center p-4">
          <UAlert
            color="error"
            variant="subtle"
            icon="i-heroicons-exclamation-triangle"
            title="Could not decode this level"
            :description="error"
            class="max-w-md"
          />
        </div>
        <div v-else class="flex h-full items-center justify-center p-4">
          <UEmpty
            icon="i-heroicons-map"
            title="Select a level"
            description="Choose a level from the browser to compose its map."
          />
        </div>
      </div>

      <aside
        v-if="legendOpen && map"
        class="border-default hidden w-80 shrink-0 flex-col border-s xl:flex"
      >
        <header class="border-default flex h-11 shrink-0 items-center gap-2 border-b px-3">
          <UIcon name="i-heroicons-square-3-stack-3d" class="text-primary size-4" />
          <h2 class="text-highlighted text-sm font-semibold">Layers &amp; legend</h2>
          <UTooltip text="Collapse layers and legend">
            <UButton
              icon="i-heroicons-x-mark"
              color="neutral"
              variant="ghost"
              size="xs"
              square
              class="ms-auto"
              aria-label="Collapse layers and legend"
              @click="legendOpen = false"
            />
          </UTooltip>
        </header>
        <div class="min-h-0 flex-1 overflow-y-auto">
          <LevelMapLegend
            v-if="map"
            :map="map"
            :layers="layers"
            @update:layers="emit('update:layers', $event)"
          />
        </div>
      </aside>

      <aside v-else-if="map" class="border-default hidden w-12 shrink-0 flex-col border-s xl:flex">
        <button
          type="button"
          class="group hover:bg-elevated/50 flex h-full w-full flex-col items-center gap-3 py-3 transition-colors"
          aria-label="Expand layers and legend"
          @click="legendOpen = true"
        >
          <UIcon name="i-heroicons-square-3-stack-3d" class="text-primary size-4" />
          <span
            class="text-dimmed text-[9px] font-semibold tracking-widest uppercase [writing-mode:vertical-rl]"
          >
            Layers &amp; legend
          </span>
        </button>
      </aside>
    </div>

    <USlideover
      v-model:open="mobileLegendOpen"
      title="Layers & legend"
      side="right"
      :ui="{ content: 'w-full max-w-sm' }"
    >
      <template #body>
        <LevelMapLegend
          v-if="map"
          :map="map"
          :layers="layers"
          @update:layers="emit('update:layers', $event)"
        />
      </template>
    </USlideover>
  </div>
</template>

<script setup lang="ts">
import { useStorage } from '@vueuse/core'
import { ref } from 'vue'
import type { LevelMap } from '@repo/kid-util'
import type { LevelMapLayerState } from '~/lib/level-map-view'
import { addressFormat, getResourceRoute } from '~/utils/index'

defineProps<{
  map: LevelMap | null
  layers: LevelMapLayerState
  title: string
  loading?: boolean
  error?: string | null
}>()

const emit = defineEmits<{
  'update:layers': [layers: LevelMapLayerState]
}>()

const legendOpen = useStorage('kid-browser-levels-legend', true)
const mobileLegendOpen = ref(false)
</script>
