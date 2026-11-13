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
          <UBadge class="shrink-0 whitespace-nowrap" color="neutral" variant="subtle" size="sm">
            background {{ map.header.backgroundType }}
          </UBadge>
          <UBadge
            class="shrink-0 whitespace-nowrap"
            v-if="map.graphics?.background"
            color="neutral"
            variant="subtle"
            size="sm"
            :label="`${map.graphics.background.format} bg`"
          />
          <UBadge
            class="shrink-0 whitespace-nowrap"
            v-if="map.header.murderWall"
            color="warning"
            variant="subtle"
            size="sm"
            :label="`murder wall ${map.header.murderWallVariant ? 'right' : 'left'}`"
          />
          <UBadge
            class="shrink-0 whitespace-nowrap"
            v-if="map.header.misc"
            color="neutral"
            variant="subtle"
            size="sm"
          >
            misc {{ map.header.misc }}
          </UBadge>
          <NuxtLink
            class="text-primary shrink-0 text-[11px] hover:underline"
            :to="getResourceRoute(map.headerAddress)"
          >
            Header resource
          </NuxtLink>
        </template>
      </div>

      <div class="flex shrink-0 items-center gap-1">
        <UButton
          v-if="showLegendButton"
          icon="i-heroicons-square-3-stack-3d"
          color="neutral"
          :variant="legendOpen && isXl ? 'soft' : 'ghost'"
          size="xs"
          :aria-pressed="isXl ? legendOpen : undefined"
          aria-label="Toggle layers and legend"
          @click="toggleLegend"
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
          <p class="text-muted text-[10px] font-semibold tracking-widest uppercase">
            Layers &amp; legend
          </p>
          <UButton
            icon="i-heroicons-x-mark"
            color="neutral"
            variant="ghost"
            size="xs"
            square
            class="ms-auto"
            aria-label="Hide layers and legend"
            @click="legendOpen = false"
          />
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

      <aside
        v-else-if="map"
        class="border-default hidden w-11 shrink-0 flex-col items-center gap-2 border-s py-2 xl:flex"
      >
        <UTooltip text="Show layers and legend">
          <UButton
            icon="i-heroicons-square-3-stack-3d"
            color="neutral"
            variant="ghost"
            size="xs"
            square
            aria-label="Show layers and legend"
            @click="legendOpen = true"
          />
        </UTooltip>
        <span class="text-dimmed text-[9px] tracking-widest uppercase [writing-mode:vertical-rl]">
          Layers
        </span>
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
import { useMediaQuery, useStorage } from '@vueuse/core'
import { computed, ref } from 'vue'
import type { LevelMap } from '@repo/kid-util'
import type { LevelMapLayerState } from '~/lib/level-map-view'
import { addressFormat, getResourceRoute } from '~/utils/index'

const props = defineProps<{
  map: LevelMap | null
  layers: LevelMapLayerState
  title: string
  loading?: boolean
  error?: string | null
}>()

const emit = defineEmits<{
  'update:layers': [layers: LevelMapLayerState]
}>()

const isXl = useMediaQuery('(min-width: 1280px)')
const legendOpen = useStorage('kid-browser-levels-legend', true)
const mobileLegendOpen = ref(false)

const showLegendButton = computed(() => props.map !== null)

function toggleLegend() {
  if (isXl.value) {
    legendOpen.value = !legendOpen.value
  } else {
    mobileLegendOpen.value = true
  }
}
</script>
