<template>
  <div class="flex h-full min-h-0 flex-col gap-3">
    <div class="flex flex-wrap items-center justify-between gap-2 rounded-md border border-white/15 bg-black/20 px-3 py-2 text-xs text-slate-200">
      <div class="flex flex-wrap items-center gap-2">
        <span class="font-medium text-slate-100">Pixi Plane Viewer</span>
        <span class="text-slate-300">Wheel: zoom</span>
        <span class="text-slate-300">Drag: pan</span>
        <span class="text-slate-300">Click: inspect tile</span>
      </div>
      <div class="flex items-center gap-2">
        <button class="rounded border border-white/20 px-2 py-1 hover:bg-white/10" type="button" @click="zoomOut">-</button>
        <button class="rounded border border-white/20 px-2 py-1 hover:bg-white/10" type="button" @click="resetView">Reset</button>
        <button class="rounded border border-white/20 px-2 py-1 hover:bg-white/10" type="button" @click="zoomIn">+</button>
      </div>
    </div>

    <div class="flex flex-wrap items-center gap-3 rounded-md border border-white/15 bg-black/20 px-3 py-2 text-xs text-slate-200">
      <label class="flex items-center gap-2">
        <span class="text-slate-300">Plane</span>
        <select v-model="selectedPlaneAddress" class="rounded border border-white/20 bg-slate-900 px-2 py-1 text-xs">
          <option v-if="planeOptions.length === 0" value="">No planes found</option>
          <option v-for="option in planeOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
        </select>
      </label>

      <label class="flex items-center gap-2">
        <input v-model="showImage" type="checkbox" />
        <span>Image layer</span>
      </label>
      <label class="flex items-center gap-2">
        <input v-model="showGrid" type="checkbox" />
        <span>Grid layer</span>
      </label>
      <label class="flex items-center gap-2">
        <input v-model="showSelection" type="checkbox" />
        <span>Selection layer</span>
      </label>
    </div>

    <div class="grid grid-cols-1 gap-3 md:grid-cols-[1fr_280px] md:items-stretch">
      <div ref="host" class="h-[60vh] min-h-[360px] overflow-hidden rounded-lg border border-white/20 bg-slate-950/70" />
      <div class="rounded-lg border border-white/20 bg-slate-950/70 p-3 text-sm text-slate-200">
        <p class="text-xs uppercase tracking-wider text-slate-400">Inspector</p>
        <p class="mt-2 font-mono text-xs text-emerald-300">{{ selectedLabel }}</p>
        <p class="mt-3 text-xs text-slate-300">{{ renderSummary }}</p>
        <p class="mt-3 text-xs text-slate-400">This is now rendering a real ROM plane with linked sheet/palette.</p>
        <p v-if="initError" class="mt-3 text-xs text-red-300">{{ initError }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import 'pixi.js/events'

import { Application, Container, Graphics, Rectangle, SCALE_MODES, Sprite, Texture } from 'pixi.js'
import { Viewport } from 'pixi-viewport'
import {
  KidImageData,
  type Palette,
  isLoadedResource,
  isPaletteResource,
  isPlaneResource,
  isSheetResource,
  type PlaneRomResourceLoaded,
  type SheetRomResourceLoaded,
} from '@repo/kid-util'
import { storeToRefs } from 'pinia'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import useRomStore from '~/stores/romStore'
import { getNormalizedName } from '~/utils/index'

const host = ref<HTMLDivElement | null>(null)
const selectedLabel = ref('Nothing selected')
const initError = ref<string | null>(null)
const renderSummary = ref('Load a ROM to render a real plane.')

const selectedPlaneAddress = ref<string>('')
const showImage = ref(true)
const showGrid = ref(true)
const showSelection = ref(true)

const romStore = useRomStore()
const { rom, romSessionKey } = storeToRefs(romStore)

let app: Application | null = null
let viewport: Viewport | null = null
let world: Container | null = null
let planeLayer: Container | null = null
let gridLayer: Graphics | null = null
let selectionLayer: Graphics | null = null
let selectionState: { x: number; y: number; columns: number; tileSize: number; tilesLength: number } | null = null
const planeChunkTextures: Texture[] = []
let renderToken = 0
let worldWidth = 1024
let worldHeight = 1024
const MIN_SCALE = 1
const MAX_SCALE = 16

const planeOptions = computed(() => {
  if (!rom.value) {
    return [] as { value: string; label: string }[]
  }
  return rom.value.resources.getResourcesByType('plane').map((resource) => ({
    value: String(resource.baseAddress),
    label: getNormalizedName(resource),
  }))
})

function destroyWorldContent() {
  world?.removeChildren().forEach((child) => child.destroy({ children: true }))
  planeLayer = null
  gridLayer = null
  selectionLayer = null
  selectionState = null
  for (const texture of planeChunkTextures) {
    texture.destroy(true)
  }
  planeChunkTextures.length = 0
}

function buildChunkedPlaneLayer(image: KidImageData, palette?: Palette): Container {
  const layer = new Container()
  const chunkSize = 1024

  const fullCanvas = document.createElement('canvas')
  fullCanvas.width = image.width
  fullCanvas.height = image.height
  const fullContext = fullCanvas.getContext('2d')
  if (!fullContext) {
    throw new Error('Could not get 2D context for plane render')
  }

  const rgba = image.getRGBAData(palette)
  fullContext.putImageData(new ImageData(rgba, image.width, image.height), 0, 0)

  for (let y = 0; y < image.height; y += chunkSize) {
    for (let x = 0; x < image.width; x += chunkSize) {
      const width = Math.min(chunkSize, image.width - x)
      const height = Math.min(chunkSize, image.height - y)
      const chunkCanvas = document.createElement('canvas')
      chunkCanvas.width = width
      chunkCanvas.height = height
      const chunkContext = chunkCanvas.getContext('2d')
      if (!chunkContext) {
        continue
      }
      chunkContext.drawImage(fullCanvas, x, y, width, height, 0, 0, width, height)
      const texture = Texture.from(chunkCanvas)
      texture.source.scaleMode = SCALE_MODES.NEAREST
      planeChunkTextures.push(texture)

      const sprite = new Sprite(texture)
      sprite.x = x
      sprite.y = y
      layer.addChild(sprite)
    }
  }

  return layer
}

function ensureSelectionLayer() {
  if (!world || !selectionLayer) {
    return
  }
  selectionLayer.clear()
  if (!showSelection.value || !selectionState) {
    return
  }
  selectionLayer.rect(
    selectionState.x * selectionState.tileSize,
    selectionState.y * selectionState.tileSize,
    selectionState.tileSize,
    selectionState.tileSize,
  )
  selectionLayer.stroke({ color: 0xffd166, width: 1, alpha: 0.95 })
}

function buildGrid(columns: number, rows: number, tileSize: number) {
  if (!world) {
    return
  }
  gridLayer = new Graphics()
  if (showGrid.value) {
    for (let x = 0; x <= columns; x++) {
      const px = x * tileSize
      gridLayer.moveTo(px, 0)
      gridLayer.lineTo(px, rows * tileSize)
    }
    for (let y = 0; y <= rows; y++) {
      const py = y * tileSize
      gridLayer.moveTo(0, py)
      gridLayer.lineTo(columns * tileSize, py)
    }
    gridLayer.stroke({ color: 0x60a5fa, width: 1, alpha: 0.23 })
  }
  world.addChild(gridLayer)
}

async function renderSelectedPlane() {
  const token = ++renderToken
  if (!rom.value) {
    renderSummary.value = 'ROM is not loaded yet.'
    destroyWorldContent()
    return
  }
  if (!selectedPlaneAddress.value) {
    renderSummary.value = 'ROM loaded, but no plane is selected.'
    destroyWorldContent()
    return
  }
  if (!world || !viewport || !host.value) {
    renderSummary.value = 'Viewer is not initialized yet.'
    destroyWorldContent()
    return
  }

  try {

  const planeAddress = Number(selectedPlaneAddress.value)
  const loadedPlane = await rom.value.resources.getResourceLoaded(planeAddress)
  if (!loadedPlane || !isLoadedResource(loadedPlane) || !isPlaneResource(loadedPlane)) {
    renderSummary.value = `Plane 0x${planeAddress.toString(16)} could not be loaded.`
    destroyWorldContent()
    return
  }

  const related = await rom.value.resources.getReferencesResourcesLoaded(planeAddress)
  const fallbackSheetBase = rom.value.resources.getResourcesByType('sheet')[0]
  const fallbackPaletteBase = rom.value.resources.getResourcesByType('palette')[0]
  const fallbackSheet = fallbackSheetBase
    ? await rom.value.resources.getResourceLoaded(fallbackSheetBase.baseAddress)
    : undefined
  const fallbackPalette = fallbackPaletteBase
    ? await rom.value.resources.getResourceLoaded(fallbackPaletteBase.baseAddress)
    : undefined
  const sheet =
    (related.find((entry) => isLoadedResource(entry) && isSheetResource(entry)) as
      | SheetRomResourceLoaded
      | undefined) ??
    (fallbackSheet && isLoadedResource(fallbackSheet) ? fallbackSheet : undefined)
  const palette =
    related.find((entry) => isLoadedResource(entry) && isPaletteResource(entry)) ??
    (fallbackPalette && isLoadedResource(fallbackPalette) ? fallbackPalette : undefined)

  if (!sheet) {
    renderSummary.value = `Plane 0x${planeAddress.toString(16)} has no linked sheet.`
    destroyWorldContent()
    return
  }

  const plane = loadedPlane as PlaneRomResourceLoaded
  const columns = plane.width || 64
  const rows = Math.max(1, Math.ceil(plane.tiles.length / columns))
  const tileSize = 8
  const image = KidImageData.fromPlane(plane, sheet, columns)
  if (token !== renderToken) {
    return
  }

  destroyWorldContent()

  planeLayer = buildChunkedPlaneLayer(image, palette)
  planeLayer.visible = showImage.value
  world.addChild(planeLayer)

  worldWidth = image.width
  worldHeight = image.height
  buildGrid(columns, rows, tileSize)

  selectionLayer = new Graphics()
  world.addChild(selectionLayer)

  selectionState = {
    x: 0,
    y: 0,
    columns,
    tileSize,
    tilesLength: plane.tiles.length,
  }

  viewport.resize(host.value.clientWidth || 1, host.value.clientHeight || 1, worldWidth, worldHeight)
  viewport.hitArea = new Rectangle(0, 0, worldWidth, worldHeight)
  viewport.moveCenter(worldWidth / 2, worldHeight / 2)
  viewport.fitWorld(true)
  viewport.setZoom(Math.max(MIN_SCALE, viewport.scale.x), true)
  const margin = 128
  viewport.clamp({
    left: -margin,
    top: -margin,
    right: worldWidth + margin,
    bottom: worldHeight + margin,
    underflow: 'center',
  })
  viewport.clampZoom({ minScale: MIN_SCALE, maxScale: MAX_SCALE })

  ensureSelectionLayer()

  renderSummary.value = `Rendered ${getNormalizedName(plane)} (${columns}x${rows} tiles, ${planeChunkTextures.length} chunk textures)${palette ? ' with palette' : ' without palette'}.`
  initError.value = null
  } catch (error) {
    initError.value = error instanceof Error ? error.message : 'Failed to render selected plane'
    renderSummary.value = 'Rendering failed for selected plane.'
    console.error('[PixiViewportDemo] renderSelectedPlane', error)
    destroyWorldContent()
  }
}

function zoomIn() {
  if (!viewport) return
  viewport.setZoom(viewport.scale.x * 1.2, true)
}

function zoomOut() {
  if (!viewport) return
  viewport.setZoom(Math.max(MIN_SCALE, viewport.scale.x / 1.2), true)
}

function resetView() {
  if (!viewport) return
  viewport.moveCenter(worldWidth / 2, worldHeight / 2)
  viewport.fitWorld(true)
  viewport.setZoom(Math.max(MIN_SCALE, viewport.scale.x), true)
}

async function initPixi() {
  if (!host.value || app) {
    return
  }

  try {
    app = new Application()
    await app.init({
      resizeTo: host.value,
      background: '#0b1220',
      antialias: false,
      preference: 'webgl',
    })

    host.value.replaceChildren(app.canvas)

    if (!app.renderer.events) {
      throw new Error('Pixi EventSystem is unavailable; viewport input cannot start')
    }

    viewport = new Viewport({
      screenWidth: Math.max(1, host.value.clientWidth),
      screenHeight: Math.max(1, host.value.clientHeight),
      worldWidth,
      worldHeight,
      events: app.renderer.events,
      passiveWheel: false,
      ticker: app.ticker,
    })

    viewport.eventMode = 'static'
    viewport
      .drag()
      .pinch()
      .wheel({ smooth: 3 })
      .decelerate()
      .clampZoom({ minScale: MIN_SCALE, maxScale: MAX_SCALE })
    viewport.on('pointertap', async (event) => {
      if (!viewport || !selectionLayer || !selectionState) {
        return
      }
      const worldPoint = viewport.toWorld(event.global)
      const tileX = Math.floor(worldPoint.x / selectionState.tileSize)
      const tileY = Math.floor(worldPoint.y / selectionState.tileSize)
      if (tileX < 0 || tileY < 0 || tileX >= selectionState.columns) {
        return
      }
      const tileIndex = tileY * selectionState.columns + tileX
      if (tileIndex < 0 || tileIndex >= selectionState.tilesLength) {
        return
      }
      selectionState.x = tileX
      selectionState.y = tileY
      ensureSelectionLayer()
      const planeAddress = Number(selectedPlaneAddress.value)
      const loadedPlane = await rom.value?.resources.getResourceLoaded(planeAddress)
      if (loadedPlane && isLoadedResource(loadedPlane) && isPlaneResource(loadedPlane)) {
        const tileValue = loadedPlane.tiles[tileIndex] ?? 0
        selectedLabel.value = `tile(${tileX},${tileY}) idx=${tileIndex} value=0x${tileValue.toString(16).toUpperCase()}`
      }
    })

    world = new Container()
    viewport.addChild(world)
    app.stage.addChild(viewport)

    initError.value = null
  } catch (error) {
    initError.value = error instanceof Error ? error.message : 'Failed to initialize Pixi viewer'
    console.error('[PixiViewportDemo]', error)
  }
}

watch(
  romSessionKey,
  () => {
    const firstPlane = planeOptions.value[0]
    selectedPlaneAddress.value = firstPlane ? firstPlane.value : ''
    selectedLabel.value = 'Nothing selected'
    void renderSelectedPlane()
  },
  { immediate: true },
)

watch(
  rom,
  () => {
    if (!selectedPlaneAddress.value) {
      const firstPlane = planeOptions.value[0]
      if (firstPlane) {
        selectedPlaneAddress.value = firstPlane.value
      }
    }
    void renderSelectedPlane()
  },
)

watch(selectedPlaneAddress, async () => {
  await renderSelectedPlane()
})

watch([showImage, showGrid, showSelection], async ([imageLayer, grid, selection]) => {
  if (planeLayer) {
    planeLayer.visible = imageLayer
  }
  if (gridLayer) {
    gridLayer.visible = grid
  }
  if (selectionLayer) {
    selectionLayer.visible = selection
  }
  if (!planeLayer || !gridLayer || !selectionLayer) {
    await renderSelectedPlane()
  } else {
    ensureSelectionLayer()
  }
})

onMounted(async () => {
  await romStore.initFromStorage()
  await initPixi()
  if (!selectedPlaneAddress.value) {
    const firstPlane = planeOptions.value[0]
    if (firstPlane) {
      selectedPlaneAddress.value = firstPlane.value
    }
  }
  await renderSelectedPlane()
})

onBeforeUnmount(() => {
  destroyWorldContent()
  world?.destroy({ children: true })
  world = null
  viewport?.destroy({ children: true })
  viewport = null
  app?.destroy(true)
  app = null
})
</script>
