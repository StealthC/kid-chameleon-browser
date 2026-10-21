<template>
  <div class="border-border/60 flex min-h-0 flex-col gap-3 overflow-y-auto rounded-lg border bg-slate-900/60 p-3">
    <section class="flex flex-col gap-2">
      <h2 class="text-muted-foreground text-xs font-semibold tracking-wide uppercase">Layers</h2>
      <label
        v-for="layer in LEVEL_MAP_LAYERS"
        :key="layer.id"
        class="flex cursor-pointer items-start gap-2 rounded-md px-1 py-1 hover:bg-white/5"
      >
        <input
          type="checkbox"
          class="mt-0.5 size-3.5 accent-sky-400"
          :checked="layers[layer.id]"
          @change="toggleLayer(layer.id, ($event.target as HTMLInputElement).checked)"
        />
        <span class="min-w-0">
          <span class="flex items-baseline justify-between gap-2">
            <span class="text-xs font-medium">{{ layer.label }}</span>
            <span class="text-muted-foreground font-mono text-[10px]">{{ layerCount(layer.id) }}</span>
          </span>
          <span class="text-muted-foreground block text-[11px] leading-tight">{{ layer.description }}</span>
        </span>
      </label>
    </section>

    <section v-if="map.graphics" class="flex flex-col gap-2">
      <h2 class="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
        ROM theme {{ map.graphics.theme.themeIndex }}
      </h2>
      <div class="flex flex-wrap gap-1">
        <span
          v-for="(color, index) in map.graphics.theme.palette.rgba"
          :key="index"
          class="border-border/40 size-5 shrink-0 rounded-sm border"
          :style="{
            backgroundColor: `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${color[3] / 255})`,
            backgroundImage:
              color[3] === 0
                ? 'repeating-conic-gradient(rgba(148,163,184,0.35) 0% 25%, transparent 0% 50%) 50% / 6px 6px'
                : undefined,
          }"
          :title="`#${index} · CRAM ${index === 0 ? 'transparent/backdrop' : `0x${(map.graphics.theme.palette.rawColors[index - 1] ?? 0).toString(16).padStart(4, '0')}`}`"
        />
      </div>
      <p class="text-muted-foreground font-mono text-[11px] leading-tight">
        palette 0x{{ map.graphics.theme.palette.address.toString(16) }} ·
        {{ map.graphics.theme.palette.rawColors.length }} colors ·
        {{ map.graphics.theme.palette.pixelRemap ? 'ROM palette map' : 'identity map' }}
      </p>
      <p class="text-muted-foreground text-[11px] leading-tight">
        {{ map.graphics.theme.tileSet.tiles.length }} theme tiles ·
        {{ map.graphics.theme.commonBlocks.tileSet.tiles.length }} block tiles ·
        {{ map.graphics.theme.mappingEntryCount }} metatiles decoded.
      </p>
      <p v-if="map.graphics.background" class="text-muted-foreground text-[11px] leading-tight">
        Background: {{ map.graphics.background.format }} · type
        {{ map.graphics.background.backgroundType }} ·
        {{ map.graphics.background.widthTiles }}×{{ map.graphics.background.heightTiles }} tiles
        <span v-if="map.graphics.background.missingTileCount > 0">
          · {{ map.graphics.background.missingTileCount }} tiles unresolved
        </span>
      </p>
      <p v-else class="text-muted-foreground text-[11px] leading-tight">
        Background art unavailable; background anchors remain available as a layer.
      </p>
    </section>

    <section v-if="summary" class="flex flex-col gap-2">
      <h2 class="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
        Foreground layout
      </h2>
      <p class="text-muted-foreground text-[11px] leading-tight">
        Generated colour ramp keyed by the layout byte (theme block skin index). This is the
        fallback used when the ROM theme tiles cannot be decoded.
      </p>
      <div class="flex flex-col gap-1">
        <div
          v-for="entry in summary.terrainValues.slice(0, 8)"
          :key="entry.value"
          class="flex items-center gap-2 font-mono text-[11px]"
        >
          <span
            class="border-border/40 size-3 shrink-0 rounded-sm border"
            :style="{ backgroundColor: terrainColor(entry.value) }"
          />
          <span class="w-12">#{{ entry.value }}</span>
          <span class="text-muted-foreground">{{ entry.count }} cells</span>
        </div>
        <p v-if="summary.terrainValues.length > 8" class="text-muted-foreground text-[11px]">
          +{{ summary.terrainValues.length - 8 }} more distinct values
        </p>
        <p v-if="summary.terrainValues.length === 0" class="text-muted-foreground text-[11px]">
          No decoded cells.
        </p>
      </div>
      <div class="border-border/40 flex flex-col gap-1 rounded-md border p-2 text-[11px]">
        <span class="flex items-center gap-2">
          <span class="size-3 shrink-0 rounded-sm" :style="{ backgroundColor: EMPTY_ROW_COLOR }" />
          <span class="text-muted-foreground">blank y-offset rows ({{ summary.emptyRowCount }})</span>
        </span>
        <span class="flex items-center gap-2">
          <span class="size-3 shrink-0 rounded-sm" :style="{ backgroundColor: MISSING_DATA_COLOR }" />
          <span class="text-muted-foreground">no layout data ({{ summary.missingCells }} cells)</span>
        </span>
      </div>
    </section>

    <section v-if="summary && summary.blockKinds.length > 0" class="flex flex-col gap-2">
      <h2 class="text-muted-foreground text-xs font-semibold tracking-wide uppercase">Block kinds</h2>
      <div class="flex flex-col gap-1">
        <div
          v-for="kind in summary.blockKinds"
          :key="kind.value"
          class="flex items-center gap-2 text-[11px]"
        >
          <span
            class="border-border/40 size-3 shrink-0 rounded-sm border"
            :style="{ backgroundColor: kind.color }"
          />
          <span class="min-w-0 flex-1 truncate">{{ kind.label }}</span>
          <span class="text-muted-foreground font-mono">{{ kind.count }}</span>
        </div>
      </div>
      <p class="text-muted-foreground text-[11px] leading-tight">
        Hidden blocks are drawn translucent with a dashed outline. Collision modifiers (0x10) are
        drawn as a small inner square.
      </p>
    </section>

    <section v-if="summary && summary.enemyTypes.length > 0" class="flex flex-col gap-2">
      <h2 class="text-muted-foreground text-xs font-semibold tracking-wide uppercase">Enemy types</h2>
      <div class="flex flex-wrap gap-x-3 gap-y-1 font-mono text-[11px]">
        <span v-for="type in summary.enemyTypes.slice(0, 10)" :key="type.value">
          0x{{ type.value.toString(16) }}: {{ type.count }}
        </span>
        <span v-if="summary.enemyTypes.length > 10" class="text-muted-foreground">
          +{{ summary.enemyTypes.length - 10 }} more
        </span>
      </div>
      <p class="text-muted-foreground text-[11px] leading-tight">
        Positions are level pixels from the enemy layout. The header advertises
        {{ map.enemies?.h1ObjectCountRaw ?? 0 }} objects;
        {{ summary.enemyCount }} entries were decoded from the pointer-table gap.
      </p>
    </section>

    <section v-if="summary" class="flex flex-col gap-1">
      <h2 class="text-muted-foreground text-xs font-semibold tracking-wide uppercase">Markers</h2>
      <span class="flex items-center gap-2 text-[11px]">
        <span class="size-3 rounded-full" :style="{ backgroundColor: PLAYER_MARKER_COLOR }" />
        Player start ({{ summary.playerStart.x }}, {{ summary.playerStart.y }} px)
      </span>
      <span class="flex items-center gap-2 text-[11px]">
        <span class="size-3 rounded-full" :style="{ backgroundColor: FLAG_MARKER_COLOR }" />
        Exit flag ({{ summary.flag.x }}, {{ summary.flag.y }} px)
      </span>
      <span class="flex items-center gap-2 text-[11px]">
        <span class="size-3 rounded-full" :style="{ backgroundColor: BACKGROUND_MARKER_COLOR }" />
        Background anchors ({{ summary.backgroundPlacements }}): background-map tiles ×8 px, chunk
        extents not decoded.
      </span>
    </section>

    <section v-if="gaps.length > 0" class="flex flex-col gap-1">
      <h2 class="text-xs font-semibold tracking-wide text-amber-300 uppercase">Gaps / limits</h2>
      <ul class="text-muted-foreground flex flex-col gap-1 text-[11px] leading-tight">
        <li v-for="gap in gaps" :key="gap">• {{ gap }}</li>
      </ul>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { levelBlockKindName, type LevelMap } from '@repo/kid-util'
import {
  BACKGROUND_MARKER_COLOR,
  EMPTY_ROW_COLOR,
  FLAG_MARKER_COLOR,
  LEVEL_MAP_LAYERS,
  MISSING_DATA_COLOR,
  PLAYER_MARKER_COLOR,
  summarizeLevelMap,
  terrainColor,
  type LevelMapLayerId,
  type LevelMapLayerState,
} from '~/lib/level-map-view'

const props = defineProps<{
  map: LevelMap
  layers: LevelMapLayerState
}>()

const emit = defineEmits<{
  'update:layers': [layers: LevelMapLayerState]
}>()

const summary = computed(() => summarizeLevelMap(props.map))

function toggleLayer(id: LevelMapLayerId, checked: boolean) {
  emit('update:layers', { ...props.layers, [id]: checked })
}

function layerCount(id: LevelMapLayerId): string {
  const current = summary.value
  switch (id) {
    case 'terrain':
      return current ? `${current.widthBlocks}×${current.heightBlocks}` : '—'
    case 'blocks':
      return `${current?.blockCount ?? 0}`
    case 'enemies':
      return `${current?.enemyCount ?? 0}`
    case 'markers':
      return '2'
    case 'graphics':
      return props.map.graphics ? 'ROM' : '—'
    case 'background':
      return props.map.graphics?.background?.format ?? '—'
    case 'backgroundAnchors':
      return `${current?.backgroundPlacements ?? 0}`
    default:
      return ''
  }
}

const gaps = computed(() => {
  const map = props.map
  const current = summary.value
  const list: string[] = []

  if (map.layoutError) {
    list.push(`Foreground layout: ${map.layoutError}`)
  }
  if (map.graphicsError) {
    list.push(`ROM tile graphics: ${map.graphicsError}. Showing generated colours.`)
  }
  if (map.graphics?.backgroundError) {
    list.push(`Background art: ${map.graphics.backgroundError}`)
  }
  if (map.graphics && !map.graphics.background) {
    list.push(
      'Background art could not be composed for this level; use the background-anchor layer for placement data.',
    )
  }
  if (map.graphics?.background && map.graphics.background.missingTileCount > 0) {
    list.push(
      `${map.graphics.background.missingTileCount} background tiles have no graphic in the theme sheets.`,
    )
  }
  if (map.layout && !map.layout.consistent) {
    list.push(
      `Layout stream length mismatch: copied ${map.layout.copiedByteCount} bytes, ${map.layout.missingByteCount} cells without data (the ROM would read stale RAM there).`,
    )
  }
  if (current && current.emptyRowCount > 0) {
    list.push(
      `${current.emptyRowCount} blank rows at the top come from the header y-offset; they are not stored in the layout stream.`,
    )
  }
  if (map.blockStreamError) {
    list.push(`Blocks: ${map.blockStreamError}`)
  }
  if (map.blockStreamNote) {
    list.push(map.blockStreamNote)
  }
  if (map.blockStream?.error) {
    list.push(`Block stream stopped: ${map.blockStream.error}`)
  }
  if (map.objectsHeaderError) {
    list.push(`Objects header: ${map.objectsHeaderError}`)
  }
  if (map.enemiesError) {
    list.push(`Enemy layout: ${map.enemiesError}`)
  }
  if (map.backgroundError) {
    list.push(`Background layout: ${map.backgroundError}`)
  }
  if (map.background?.indirect) {
    list.push(
      `Background uses an indirect reference (x shift ${map.background.indirect.xShiftRaw}, y shift ${map.background.indirect.yShiftRaw}); art applies the shift, anchors are drawn unshifted.`,
    )
  }
  if (map.graphics?.background) {
    list.push(
      'Background art is drawn from the map origin; the ROM scrolls it vertically at 1/4 of the camera speed.',
    )
  }
  if (current && current.undecodedBlockKinds.length > 0) {
    list.push(
      `Block kinds without a reference decoder: ${current.undecodedBlockKinds
        .map((kind) => `0x${kind.toString(16)} (${levelBlockKindName(kind)})`)
        .join(', ')}.`,
    )
  }
  if (map.blockStream && map.blockStream.outOfGridCount > 0) {
    list.push(
      `${map.blockStream.outOfGridCount} block placements fall outside the grid dimensions.`,
    )
  }
  return list
})
</script>
