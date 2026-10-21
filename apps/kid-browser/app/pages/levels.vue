<template>
  <RequiresRom>
    <main class="grid min-h-full gap-3 lg:h-full lg:grid-cols-[17rem_minmax(0,1fr)]">
      <aside class="border-border/60 flex h-64 min-h-0 flex-col overflow-hidden rounded-lg border bg-slate-900/60 lg:h-full">
        <div class="flex items-center justify-between gap-2 border-b border-white/5 px-3 py-2">
          <p class="text-xs font-semibold tracking-wide uppercase">Levels</p>
          <Badge variant="outline">{{ levelItems.length }}</Badge>
        </div>
        <div class="min-h-0 flex-1 overflow-y-auto p-1">
          <button
            v-for="level in levelItems"
            :key="level.address"
            type="button"
            class="flex w-full flex-col items-start gap-0.5 rounded-md px-2 py-1.5 text-left transition-colors"
            :class="
              level.levelIndex === selectedLevelIndex
                ? 'bg-sky-500/20 text-slate-50'
                : 'text-slate-300 hover:bg-white/5'
            "
            @click="selectLevel(level.levelIndex)"
          >
            <span class="flex w-full items-baseline justify-between gap-2">
              <span class="truncate text-xs font-medium">{{ level.name }}</span>
              <span class="text-muted-foreground font-mono text-[10px]">
                0x{{ level.levelIndex.toString(16).toUpperCase().padStart(2, '0') }}
              </span>
            </span>
            <span class="text-muted-foreground font-mono text-[10px]">
              {{ level.widthBlocks }}×{{ level.heightBlocks }} cells · theme {{ level.theme }}
            </span>
          </button>
          <p v-if="levelItems.length === 0" class="text-muted-foreground p-3 text-xs">
            No level headers were discovered in this ROM.
          </p>
        </div>
        <p class="text-muted-foreground border-t border-white/5 px-3 py-2 text-[10px] leading-tight">
          One row per unique header address; duplicate or invalid level indices share a header.
        </p>
      </aside>

      <section class="flex min-h-0 flex-col gap-3">
        <div v-if="map" class="border-border/60 flex flex-wrap items-center gap-2 rounded-lg border bg-slate-900/60 px-3 py-2">
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-semibold">{{ levelTitle }}</p>
            <p class="text-muted-foreground font-mono text-[11px]">
              header {{ addressFormat(map.headerAddress) }} · tiles
              {{ addressFormat(map.header.tilesDataPtr) }} · blocks
              {{ addressFormat(map.header.blocksDataPtr) }}
            </p>
          </div>
          <Badge variant="outline">0x{{ map.header.levelIndex.toString(16).toUpperCase().padStart(2, '0') }}</Badge>
          <Badge variant="outline">{{ map.header.width }}×{{ map.header.height }} screens</Badge>
          <Badge variant="outline">theme {{ map.header.themeIndex }}</Badge>
          <Badge v-if="map.graphics" variant="outline">ROM tiles</Badge>
          <Badge v-else-if="map.graphicsError" variant="outline">colour fallback</Badge>
          <Badge variant="outline">background {{ map.header.backgroundType }}</Badge>
          <Badge v-if="map.graphics?.background" variant="outline">
            {{ map.graphics.background.format }} background
          </Badge>
          <Badge v-if="map.header.murderWall" variant="outline">
            murder wall {{ map.header.murderWallVariant ? 'right' : 'left' }}
          </Badge>
          <Badge v-if="map.header.misc" variant="outline">misc {{ map.header.misc }}</Badge>
          <NuxtLink
            class="text-primary text-xs underline"
            :to="getResourceRoute(map.headerAddress)"
          >
            Open header resource
          </NuxtLink>
        </div>

        <div v-if="map" class="grid min-h-0 flex-1 gap-3 xl:grid-cols-[minmax(0,1fr)_21rem]">
          <div class="min-h-[26rem] xl:min-h-0">
            <LevelMapViewer
              :map="map"
              :layers="layers"
              :loading="mapLoading"
              @update:layers="layers = $event"
            />
          </div>
          <div class="min-h-[20rem] xl:min-h-0">
            <LevelMapLegend :map="map" :layers="layers" @update:layers="layers = $event" />
          </div>
        </div>
        <div
          v-else-if="mapLoading"
          class="border-border/60 flex min-h-[24rem] flex-1 items-center justify-center rounded-lg border bg-slate-900/40 p-4"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <div class="flex flex-col items-center gap-3 text-center">
            <span
              class="size-8 animate-spin rounded-full border-2 border-slate-600 border-t-slate-200"
              aria-hidden="true"
            />
            <p class="text-sm font-medium">Decoding level map…</p>
            <p class="text-muted-foreground max-w-sm text-xs">
              Header, foreground layout, blocks, enemies and ROM tile art are being composed.
            </p>
          </div>
        </div>
        <div
          v-else-if="mapError"
          class="border-destructive/60 bg-destructive/10 flex min-h-[24rem] flex-1 items-center justify-center rounded-lg border p-4 text-center"
        >
          <div>
            <p class="text-sm font-semibold">Could not decode this level</p>
            <p class="text-muted-foreground mt-1 text-xs">{{ mapError }}</p>
          </div>
        </div>
        <div
          v-else
          class="border-border/60 flex min-h-[24rem] flex-1 items-center justify-center rounded-lg border bg-slate-900/40"
        >
          <p class="text-muted-foreground text-sm">Select a level to inspect its map.</p>
        </div>
      </section>
    </main>
  </RequiresRom>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { isLoadedResource, type LevelHeaderRomResourceLoaded } from '@repo/kid-util'
import { Badge } from '~/components/ui/badge'
import { useLevelIndex, useLevelMap } from '~/composables/useLevelMap'
import {
  createDefaultLevelMapLayers,
  type LevelMapLayerState,
} from '~/lib/level-map-view'
import { addressFormat, getResourceRoute } from '~/utils/index'

const route = useRoute()
const router = useRouter()
const { levels } = useLevelIndex()

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

function selectLevel(levelIndex: number) {
  router.replace({ query: { ...route.query, level: levelIndex.toString(16) } })
}

const mapQuery = useLevelMap(computed(() => selectedLevel.value?.address ?? null))
const map = computed(() => mapQuery.data.value ?? null)
const mapLoading = computed(() => mapQuery.isLoading.value || mapQuery.isFetching.value)
const mapError = computed(() =>
  mapQuery.error.value ? mapQuery.error.value.message : null,
)
const levelTitle = computed(
  () =>
    map.value?.titleCard?.titleText ||
    map.value?.header.name ||
    `Level 0x${(map.value?.header.levelIndex ?? 0).toString(16).toUpperCase()}`,
)

const layers = ref<LevelMapLayerState>(createDefaultLevelMapLayers())

// Layer visibility is presentation state; start each level from the same defaults.
watch(selectedLevelIndex, () => {
  layers.value = createDefaultLevelMapLayers()
})
</script>
