<template>
  <UDashboardPanel id="levels" :ui="{ body: 'gap-0 overflow-hidden p-0 sm:p-0' }">
    <template #header>
      <UDashboardNavbar title="Levels" icon="i-heroicons-map">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #trailing>
          <UBadge
            color="neutral"
            variant="subtle"
            size="sm"
            :label="`${levelItems.length} levels`"
          />
        </template>

        <template #right>
          <UButton
            v-if="!isDesktop && levelItems.length > 0"
            icon="i-heroicons-list-bullet"
            color="neutral"
            variant="soft"
            size="sm"
            @click="mobileLevelsOpen = true"
          >
            Levels
          </UButton>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <RequiresRom>
        <div class="flex h-full min-h-0">
          <USplitter
            v-if="isDesktop"
            id="levels-split"
            auto-save-id="kid-browser-levels-split"
            :items="splitItems"
            class="h-full w-full"
          >
            <template #levels="{ collapsed, expand }">
              <aside class="border-default h-full w-full min-w-0 border-e">
                <LevelMapBrowser v-if="!collapsed" @select="onLevelSelect" />
                <div v-else class="flex h-full flex-col items-center gap-2 py-3">
                  <UTooltip text="Expand level browser">
                    <UButton
                      icon="i-heroicons-chevron-double-right"
                      color="neutral"
                      variant="ghost"
                      size="xs"
                      square
                      aria-label="Expand level browser"
                      @click="expand()"
                    />
                  </UTooltip>
                  <UBadge
                    color="neutral"
                    variant="subtle"
                    size="sm"
                    :label="String(levelItems.length)"
                  />
                  <UTooltip text="Level maps">
                    <UIcon name="i-heroicons-map" class="text-muted size-4" />
                  </UTooltip>
                </div>
              </aside>
            </template>

            <template #map>
              <LevelMapWorkspace
                :map="map"
                :layers="layers"
                :title="levelTitle"
                :loading="mapLoading"
                :error="mapError"
                @update:layers="layers = $event"
              />
            </template>
          </USplitter>

          <div v-else class="h-full w-full min-w-0">
            <LevelMapWorkspace
              :map="map"
              :layers="layers"
              :title="levelTitle"
              :loading="mapLoading"
              :error="mapError"
              @update:layers="layers = $event"
            />
          </div>
        </div>

        <USlideover
          v-model:open="mobileLevelsOpen"
          title="Levels"
          side="left"
          :ui="{ content: 'w-full max-w-xs', body: 'p-0' }"
        >
          <template #body>
            <LevelMapBrowser @select="mobileLevelsOpen = false" />
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
import { isLoadedResource, type LevelHeaderRomResourceLoaded } from '@repo/kid-util'
import { useLevelIndex, useLevelMap } from '~/composables/useLevelMap'
import { createDefaultLevelMapLayers, type LevelMapLayerState } from '~/lib/level-map-view'

useHead({ title: 'Levels · Kid Chameleon Browser' })

const route = useRoute()
const { levels } = useLevelIndex()
const isDesktop = useMediaQuery('(min-width: 1024px)')
const mobileLevelsOpen = ref(false)

const levelItems = computed(() =>
  levels.value.map((resource) => {
    const loaded = isLoadedResource(resource)
      ? (resource as LevelHeaderRomResourceLoaded)
      : undefined
    return {
      address: resource.baseAddress,
      levelIndex: resource.levelIndex ?? 0,
      name: resource.name ?? `Level 0x${(resource.levelIndex ?? 0).toString(16)}`,
      widthBlocks: loaded?.widthInBlocks ?? 0,
      heightBlocks: (loaded?.heightInBlocks ?? 0) + (loaded?.yOffsetInBlocks ?? 0),
      theme: loaded?.themeIndex ?? 0,
    }
  }),
)

const selectedLevelIndex = computed<number | null>(() => {
  const raw = route.query.level
  const parsed = typeof raw === 'string' ? Number.parseInt(raw, 16) : Number.NaN
  if (Number.isFinite(parsed)) {
    const match = levelItems.value.find((level) => level.levelIndex === parsed)
    if (match) {
      return match.levelIndex
    }
  }
  return levelItems.value[0]?.levelIndex ?? null
})

const selectedLevel = computed(
  () => levelItems.value.find((level) => level.levelIndex === selectedLevelIndex.value) ?? null,
)

const mapQuery = useLevelMap(computed(() => selectedLevel.value?.address ?? null))
const map = computed(() => mapQuery.data.value ?? null)
const mapLoading = computed(() => mapQuery.isLoading.value || mapQuery.isFetching.value)
const mapError = computed(() => (mapQuery.error.value ? mapQuery.error.value.message : null))
const levelTitle = computed(
  () =>
    map.value?.titleCard?.titleText ||
    map.value?.header.name ||
    `Level 0x${(map.value?.header.levelIndex ?? 0).toString(16).toUpperCase()}`,
)

const layers = ref<LevelMapLayerState>(createDefaultLevelMapLayers())

const splitItems: SplitterItem[] = [
  {
    id: 'level-browser',
    slot: 'levels',
    sizeUnit: 'px',
    defaultSize: 286,
    minSize: 230,
    maxSize: 440,
    collapsible: true,
    collapsedSize: 48,
  },
  {
    id: 'level-map',
    slot: 'map',
  },
]

watch(selectedLevelIndex, () => {
  layers.value = createDefaultLevelMapLayers()
})

watch(
  () => route.fullPath,
  () => {
    mobileLevelsOpen.value = false
  },
)

function onLevelSelect() {
  mobileLevelsOpen.value = false
}
</script>
