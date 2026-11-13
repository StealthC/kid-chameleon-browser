<template>
  <UDashboardPanel id="levels" :ui="{ body: 'gap-0 overflow-hidden p-0 sm:p-0' }">
    <template #header>
      <UDashboardNavbar title="Levels" icon="i-heroicons-map" class="lg:hidden">
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
            :items="splitItems"
            class="h-full w-full"
            :ui="{ handle: 'transition-colors hover:bg-elevated/40' }"
          >
            <template #levels="{ collapsed, expand, collapse }">
              <aside class="border-default h-full w-full min-w-0 border-e">
                <LevelMapBrowser
                  v-if="!collapsed"
                  collapsible
                  @select="onLevelSelect"
                  @collapse="collapse()"
                />
                <button
                  v-else
                  type="button"
                  class="group hover:bg-elevated/50 flex h-full w-full flex-col items-center gap-3 py-3 transition-colors"
                  aria-label="Expand level browser"
                  @click="expand()"
                >
                  <UIcon name="i-heroicons-map" class="text-primary size-4" />
                  <span
                    class="text-dimmed text-[9px] font-semibold tracking-widest uppercase [writing-mode:vertical-rl]"
                  >
                    Levels
                  </span>
                  <UBadge
                    color="neutral"
                    variant="subtle"
                    size="sm"
                    :label="String(levelItems.length)"
                  />
                </button>
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

            <template #resize-handle>
              <div class="flex h-full w-full items-center justify-center">
                <span
                  class="bg-accented group-hover:bg-primary/60 h-10 w-0.5 rounded-full opacity-0 transition-opacity group-hover:opacity-100"
                />
              </div>
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
