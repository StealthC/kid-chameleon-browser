<template>
  <div
    ref="containerRef"
    class="border-border/60 relative h-full min-h-0 w-full overflow-hidden rounded-lg border bg-slate-950/70"
    :aria-busy="showLoading"
  >
    <canvas
      ref="canvasRef"
      class="block h-full w-full touch-none"
      :class="dragging ? 'cursor-grabbing' : 'cursor-grab'"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @pointerleave="onPointerLeave"
      @wheel="onWheel"
      @dblclick="fitToView"
    />

    <div
      v-if="showLoading"
      class="absolute inset-0 z-10 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
      role="status"
      aria-live="polite"
    >
      <div class="flex items-center gap-2 rounded-md bg-slate-950/90 px-3 py-2 shadow-lg">
        <span
          class="size-4 shrink-0 animate-spin rounded-full border-2 border-slate-500 border-t-slate-100"
          aria-hidden="true"
        />
        <span class="text-xs font-medium text-slate-100">Composing level map…</span>
      </div>
    </div>

    <div class="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-2">
      <div class="pointer-events-auto flex items-center gap-1 rounded-md bg-slate-950/80 p-1 backdrop-blur">
        <Button variant="ghost" size="sm" title="Zoom out" @click="zoomBy(1 / 1.3)">−</Button>
        <Button variant="ghost" size="sm" title="Zoom in" @click="zoomBy(1.3)">+</Button>
        <Button variant="ghost" size="sm" title="Fit level" @click="fitToView">Fit</Button>
        <span class="mx-1 h-4 w-px bg-white/10" aria-hidden="true" />
        <Button
          variant="ghost"
          size="sm"
          title="Toggle cell grid"
          :aria-pressed="layers.grid"
          :class="layerButtonClass(layers.grid)"
          @click="toggleLayer('grid')"
        >
          Grid
        </Button>
        <Button
          variant="ghost"
          size="sm"
          title="Toggle colour-coded block outlines"
          :aria-pressed="layers.blockBorders"
          :class="layerButtonClass(layers.blockBorders)"
          @click="toggleLayer('blockBorders')"
        >
          Outlines
        </Button>
      </div>
      <span class="rounded-md bg-slate-950/80 px-2 py-1 font-mono text-[11px] text-slate-300 backdrop-blur">
        {{ zoomLabel }} · {{ widthBlocks }}×{{ heightBlocks }} cells
      </span>
    </div>

    <div
      v-if="!hasLayout"
      class="pointer-events-none absolute inset-0 flex items-center justify-center bg-slate-950/70 p-4 text-center"
    >
      <div class="max-w-sm">
        <p class="text-sm font-semibold">Foreground layout unavailable</p>
        <p class="text-muted-foreground mt-1 text-xs">
          {{ map.layoutError ?? 'The level-tiles resource could not be decoded.' }}
        </p>
        <p v-if="map.blockStream || map.enemies" class="text-muted-foreground mt-2 text-xs">
          Blocks and entities still use the level header dimensions.
        </p>
      </div>
    </div>

    <div class="pointer-events-none absolute inset-x-0 bottom-0 border-t border-white/5 bg-slate-950/85 px-2 py-1">
      <p class="truncate font-mono text-[11px] text-slate-300">{{ hoverText }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { LEVEL_CELL_SIZE, levelBlockKindName, type LevelMap } from '@repo/kid-util'
import { Button } from '~/components/ui/button'
import { renderLevelMap } from '~/lib/level-map-render'
import { getLevelMapTextures, type LevelMapTextures } from '~/lib/level-map-textures'
import {
  findLevelBlockAt,
  type LevelMapLayerId,
  type LevelMapLayerState,
} from '~/lib/level-map-view'

const props = withDefaults(
  defineProps<{
    map: LevelMap
    layers: LevelMapLayerState
    loading?: boolean
  }>(),
  { loading: false },
)

const emit = defineEmits<{
  'update:layers': [layers: LevelMapLayerState]
}>()

const containerRef = ref<HTMLDivElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
const size = ref({ width: 0, height: 0 })
const scale = ref(1)
const offset = ref({ x: 0, y: 0 })
const hover = ref<{ x: number; y: number } | null>(null)
const dragging = ref(false)
const textures = ref<LevelMapTextures>({})
const composingTextures = ref(false)

const showLoading = computed(() => props.loading || composingTextures.value)

function layerButtonClass(active: boolean): string {
  return active ? 'bg-white/10 text-slate-50' : 'opacity-60'
}

function toggleLayer(id: LevelMapLayerId) {
  emit('update:layers', { ...props.layers, [id]: !props.layers[id] })
}

const MIN_SCALE = 0.04
const MAX_SCALE = 8
const LEVEL_PIXEL_SIZE = LEVEL_CELL_SIZE

let lastPointer: { x: number; y: number } | null = null
let frameHandle = 0
let didFit = false
let userAdjustedView = false
let resizeObserver: ResizeObserver | null = null
let textureToken = 0

/**
 * Waits for the browser to paint the loading state. `requestAnimationFrame` is the reliable signal,
 * with a timer as fallback because frames stop in a background tab.
 */
function nextFrame(): Promise<void> {
  return new Promise((resolve) => {
    let settled = false
    const finish = () => {
      if (settled) {
        return
      }
      settled = true
      resolve()
    }
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(finish)
    }
    setTimeout(finish, 50)
  })
}

/**
 * Converts the indexed ROM pixel buffers into canvases off the list of synchronous work the query
 * already did. Yielding one frame lets the loading overlay paint before the conversion runs.
 */
async function composeTextures() {
  const token = ++textureToken
  const map = props.map
  composingTextures.value = true
  textures.value = {}
  await nextFrame()
  if (token !== textureToken) {
    return
  }
  textures.value = getLevelMapTextures(map)
  composingTextures.value = false
  scheduleDraw()
}

const layout = computed(() => props.map.layout)
const hasLayout = computed(() => !!layout.value)
const widthBlocks = computed(
  () => layout.value?.widthBlocks ?? props.map.header.widthInBlocks,
)
const heightBlocks = computed(
  () =>
    layout.value?.heightBlocks ??
    props.map.header.heightInBlocks + props.map.header.yOffsetInBlocks,
)
const worldWidth = computed(() => Math.max(1, widthBlocks.value * LEVEL_PIXEL_SIZE))
const worldHeight = computed(() => Math.max(1, heightBlocks.value * LEVEL_PIXEL_SIZE))
const zoomLabel = computed(() => `${Math.round(scale.value * 100)}%`)

const hoverText = computed(() => {
  if (!hover.value) {
    return 'Drag to pan · wheel or buttons to zoom · double-click to fit'
  }
  const { x, y } = hover.value
  const parts = [`cell ${x},${y}`]
  const grid = layout.value
  if (grid) {
    const index = y * widthBlocks.value + x
    const value = grid.cells[index] ?? 0
    const streamStart = grid.emptyRowCount * grid.widthBlocks
    const streamEnd = streamStart + grid.copiedByteCount
    if (y < grid.emptyRowCount) {
      parts.push('blank y-offset row')
    } else if (index >= streamEnd) {
      parts.push('no layout data (short stream)')
    } else {
      parts.push(`skin ${value} (0x${value.toString(16).padStart(2, '0')})`)
    }
  }
  const block = findLevelBlockAt(props.map, x, y)
  if (block) {
    const flags = [
      block.isHidden ? 'hidden' : '',
      block.isDisguised ? 'disguised' : '',
      block.kind === 0x10 ? `mod ${block.collisionMod}` : '',
      block.kind === 0x01 ? `prize ${block.prize}` : '',
      block.kind === 0x04 ? `warp map ${block.warpMap}` : '',
    ].filter(Boolean)
    parts.push(`block ${levelBlockKindName(block.kind)}${flags.length ? ` (${flags.join(', ')})` : ''}`)
  }
  const enemiesHere = (props.map.enemies?.objects ?? []).filter(
    (object) =>
      Math.floor(object.xPosition / LEVEL_PIXEL_SIZE) === x &&
      Math.floor(object.yPosition / LEVEL_PIXEL_SIZE) === y,
  )
  if (enemiesHere.length > 0) {
    parts.push(`enemy type 0x${enemiesHere[0]?.enemyTypeOrKind.toString(16)}`)
  }
  return parts.join(' · ')
})

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function fitToView() {
  if (size.value.width <= 0 || size.value.height <= 0) {
    return
  }
  const padding = 16
  const nextScale = clamp(
    Math.min(
      (size.value.width - padding) / worldWidth.value,
      (size.value.height - padding) / worldHeight.value,
    ),
    MIN_SCALE,
    MAX_SCALE,
  )
  scale.value = nextScale
  offset.value = {
    x: (worldWidth.value - size.value.width / nextScale) / 2,
    y: (worldHeight.value - size.value.height / nextScale) / 2,
  }
  didFit = true
  userAdjustedView = false
  scheduleDraw()
}

function clampOffset() {
  const viewWidth = size.value.width / scale.value
  const viewHeight = size.value.height / scale.value
  const maxOffsetX = worldWidth.value - viewWidth / 2
  const minOffsetX = -viewWidth / 2
  const maxOffsetY = worldHeight.value - viewHeight / 2
  const minOffsetY = -viewHeight / 2
  offset.value = {
    x:
      maxOffsetX < minOffsetX
        ? (worldWidth.value - viewWidth) / 2
        : clamp(offset.value.x, minOffsetX, maxOffsetX),
    y:
      maxOffsetY < minOffsetY
        ? (worldHeight.value - viewHeight) / 2
        : clamp(offset.value.y, minOffsetY, maxOffsetY),
  }
}

function zoomBy(factor: number, focus?: { x: number; y: number }) {
  const center = focus ?? { x: size.value.width / 2, y: size.value.height / 2 }
  const worldBefore = {
    x: offset.value.x + center.x / scale.value,
    y: offset.value.y + center.y / scale.value,
  }
  const nextScale = clamp(scale.value * factor, MIN_SCALE, MAX_SCALE)
  scale.value = nextScale
  offset.value = {
    x: worldBefore.x - center.x / nextScale,
    y: worldBefore.y - center.y / nextScale,
  }
  userAdjustedView = true
  clampOffset()
  scheduleDraw()
}

function onWheel(event: WheelEvent) {
  event.preventDefault()
  const rect = canvasRef.value?.getBoundingClientRect()
  if (!rect) {
    return
  }
  const factor = Math.exp(-event.deltaY * 0.0015)
  zoomBy(factor, { x: event.clientX - rect.left, y: event.clientY - rect.top })
}

function updateHover(event: PointerEvent) {
  const rect = canvasRef.value?.getBoundingClientRect()
  if (!rect) {
    return
  }
  const worldX = offset.value.x + (event.clientX - rect.left) / scale.value
  const worldY = offset.value.y + (event.clientY - rect.top) / scale.value
  const x = Math.floor(worldX / LEVEL_PIXEL_SIZE)
  const y = Math.floor(worldY / LEVEL_PIXEL_SIZE)
  hover.value = x >= 0 && y >= 0 && x < widthBlocks.value && y < heightBlocks.value ? { x, y } : null
}

function onPointerDown(event: PointerEvent) {
  if (event.button !== 0) {
    return
  }
  dragging.value = true
  userAdjustedView = true
  lastPointer = { x: event.clientX, y: event.clientY }
  canvasRef.value?.setPointerCapture(event.pointerId)
}

function onPointerMove(event: PointerEvent) {
  if (dragging.value && lastPointer) {
    const deltaX = event.clientX - lastPointer.x
    const deltaY = event.clientY - lastPointer.y
    lastPointer = { x: event.clientX, y: event.clientY }
    offset.value = {
      x: offset.value.x - deltaX / scale.value,
      y: offset.value.y - deltaY / scale.value,
    }
    hover.value = null
    clampOffset()
    scheduleDraw()
    return
  }
  updateHover(event)
}

function onPointerUp(event: PointerEvent) {
  if (!dragging.value) {
    return
  }
  dragging.value = false
  lastPointer = null
  if (canvasRef.value?.hasPointerCapture(event.pointerId)) {
    canvasRef.value.releasePointerCapture(event.pointerId)
  }
  updateHover(event)
}

function onPointerLeave() {
  hover.value = null
}

function scheduleDraw() {
  if (frameHandle) {
    return
  }
  frameHandle = requestAnimationFrame(() => {
    frameHandle = 0
    draw()
  })
}

function draw() {
  const canvas = canvasRef.value
  const context = canvas?.getContext('2d')
  if (!canvas || !context) {
    return
  }
  const dpr = window.devicePixelRatio || 1
  const cssWidth = size.value.width
  const cssHeight = size.value.height
  if (cssWidth <= 0 || cssHeight <= 0) {
    return
  }
  const pixelWidth = Math.max(1, Math.round(cssWidth * dpr))
  const pixelHeight = Math.max(1, Math.round(cssHeight * dpr))
  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth
    canvas.height = pixelHeight
  }

  renderLevelMap(
    context,
    props.map,
    props.layers,
    {
      cssWidth,
      cssHeight,
      devicePixelRatio: dpr,
      scale: scale.value,
      offsetX: offset.value.x,
      offsetY: offset.value.y,
      hover: hover.value,
    },
    textures.value,
  )
}

function updateSize() {
  const container = containerRef.value
  if (!container) {
    return
  }
  size.value = { width: container.clientWidth, height: container.clientHeight }
  if (!didFit || !userAdjustedView) {
    nextTick(fitToView)
  }
  scheduleDraw()
}

onMounted(() => {
  updateSize()
  if (containerRef.value && typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(updateSize)
    resizeObserver.observe(containerRef.value)
  }
})

onBeforeUnmount(() => {
  textureToken++
  resizeObserver?.disconnect()
  if (frameHandle) {
    cancelAnimationFrame(frameHandle)
  }
})

watch(() => props.map, composeTextures, { immediate: true })

watch(
  () => props.map.headerAddress,
  () => {
    didFit = false
    userAdjustedView = false
    hover.value = null
    nextTick(fitToView)
  },
)

watch(
  [() => props.map, () => props.layers, size, scale, offset, hover],
  scheduleDraw,
  { deep: true },
)
</script>
