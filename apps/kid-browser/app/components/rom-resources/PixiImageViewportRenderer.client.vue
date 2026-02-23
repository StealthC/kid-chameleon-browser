<template>
  <div ref="host" class="h-full w-full overflow-hidden rounded-md bg-slate-950/70" />
</template>

<script setup lang="ts">
import 'pixi.js/events'

import { Application, Container, Graphics, Rectangle, SCALE_MODES, Sprite, Texture } from 'pixi.js'
import { Viewport } from 'pixi-viewport'
import { type KidImageData, type Palette } from '@repo/kid-util'
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

type Props = {
  image: KidImageData | null
  palette?: Palette
  showGrid?: boolean
  showSelection?: boolean
  cellSize?: number
  columns?: number
  selectableCount?: number
  resetKey?: string | number
}

const props = withDefaults(defineProps<Props>(), {
  showGrid: false,
  showSelection: false,
  cellSize: 8,
  columns: 0,
  selectableCount: 0,
  resetKey: '',
})

const emit = defineEmits<{
  cellSelect: [payload: { x: number; y: number; index: number }]
  clearSelection: []
}>()

const host = ref<HTMLDivElement | null>(null)

let app: Application | null = null
let viewport: Viewport | null = null
let resizeObserver: ResizeObserver | null = null
let resizeRaf = 0
let world: Container | null = null
let imageLayer: Container | null = null
let gridLayer: Graphics | null = null
let selectionLayer: Graphics | null = null
const chunkTextures: Texture[] = []
let renderToken = 0
let worldWidth = 256
let worldHeight = 256
let previousWorldWidth = 0
let previousWorldHeight = 0
let selection: { x: number; y: number; cellSize: number; columns: number } | null = null

const MIN_SCALE = 1
const MAX_SCALE = 16

function clearWorld() {
  world?.removeChildren().forEach((child) => child.destroy({ children: true }))
  imageLayer = null
  gridLayer = null
  selectionLayer = null
  selection = null
  for (const texture of chunkTextures) {
    texture.destroy(true)
  }
  chunkTextures.length = 0
}

function buildImageLayer(image: KidImageData, palette?: Palette): Container {
  const layer = new Container()
  const chunkSize = 1024

  const fullCanvas = document.createElement('canvas')
  fullCanvas.width = image.width
  fullCanvas.height = image.height
  const fullContext = fullCanvas.getContext('2d')
  if (!fullContext) {
    throw new Error('Could not create 2D context for Pixi image rendering')
  }

  fullContext.putImageData(new ImageData(image.getRGBAData(palette), image.width, image.height), 0, 0)

  for (let y = 0; y < image.height; y += chunkSize) {
    for (let x = 0; x < image.width; x += chunkSize) {
      const width = Math.min(chunkSize, image.width - x)
      const height = Math.min(chunkSize, image.height - y)
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const context = canvas.getContext('2d')
      if (!context) continue
      context.drawImage(fullCanvas, x, y, width, height, 0, 0, width, height)
      const texture = Texture.from(canvas)
      texture.source.scaleMode = SCALE_MODES.NEAREST
      chunkTextures.push(texture)

      const sprite = new Sprite(texture)
      sprite.x = x
      sprite.y = y
      layer.addChild(sprite)
    }
  }

  return layer
}

function drawGrid() {
  if (!gridLayer) return
  gridLayer.clear()
  const columns = props.columns
  const cellSize = props.cellSize
  if (!props.showGrid || !columns || cellSize <= 0) return
  const rows = Math.max(1, Math.ceil((props.selectableCount || columns) / columns))
  for (let x = 0; x <= columns; x++) {
    const px = x * cellSize
    gridLayer.moveTo(px, 0)
    gridLayer.lineTo(px, rows * cellSize)
  }
  for (let y = 0; y <= rows; y++) {
    const py = y * cellSize
    gridLayer.moveTo(0, py)
    gridLayer.lineTo(columns * cellSize, py)
  }
  gridLayer.stroke({ color: 0x60a5fa, width: 1, alpha: 0.22 })
}

function drawSelection() {
  if (!selectionLayer) return
  selectionLayer.clear()
  if (!props.showSelection || !selection) return
  selectionLayer.rect(
    selection.x * selection.cellSize,
    selection.y * selection.cellSize,
    selection.cellSize,
    selection.cellSize,
  )
  selectionLayer.stroke({ color: 0xffd166, width: 1, alpha: 0.95 })
}

function fitViewportToWorld() {
  if (!viewport) return
  viewport.moveCenter(worldWidth / 2, worldHeight / 2)
  viewport.fitWorld(true)
  viewport.setZoom(Math.max(MIN_SCALE, viewport.scale.x), true)
  applyViewportBounds()
}

function applyViewportBounds() {
  if (!viewport) return
  const margin = 128
  viewport.clamp({
    left: -margin,
    top: -margin,
    right: worldWidth + margin,
    bottom: worldHeight + margin,
    underflow: 'center',
  })
  viewport.clampZoom({ minScale: MIN_SCALE, maxScale: MAX_SCALE })
}

function resizeRendererToHost() {
  if (!app || !viewport || !host.value) return
  const width = Math.max(1, host.value.clientWidth)
  const height = Math.max(1, host.value.clientHeight)
  app.renderer.resize(width, height)
  app.canvas.style.width = `${width}px`
  app.canvas.style.height = `${height}px`
  viewport.resize(width, height, worldWidth, worldHeight)
  applyViewportBounds()
}

async function renderImage(options?: { preserveView?: boolean; preserveSelection?: boolean; forceFit?: boolean }) {
  const token = ++renderToken
  if (!host.value || !viewport || !world || !props.image) return

  const preserveView = options?.preserveView ?? true
  const preserveSelection = options?.preserveSelection ?? true
  const forceFit = options?.forceFit ?? false

  const previousView = preserveView
    ? {
        x: viewport.position.x,
        y: viewport.position.y,
        scaleX: viewport.scale.x,
        scaleY: viewport.scale.y,
      }
    : null
  const previousSelection = preserveSelection && selection ? { x: selection.x, y: selection.y } : null

  const image = props.image
  if (token !== renderToken) return

  clearWorld()
  imageLayer = buildImageLayer(image, props.palette)
  world.addChild(imageLayer)

  worldWidth = image.width
  worldHeight = image.height

  gridLayer = new Graphics()
  world.addChild(gridLayer)
  drawGrid()

  selectionLayer = new Graphics()
  world.addChild(selectionLayer)
  if (props.columns > 0 && props.cellSize > 0 && previousSelection) {
    const rows = Math.max(1, Math.ceil((props.selectableCount || props.columns) / props.columns))
    const x = Math.min(previousSelection.x, props.columns - 1)
    const y = Math.min(previousSelection.y, rows - 1)
    selection = { x: Math.max(0, x), y: Math.max(0, y), cellSize: props.cellSize, columns: props.columns }
  } else {
    selection = null
  }
  drawSelection()

  viewport.resize(host.value.clientWidth || 1, host.value.clientHeight || 1, worldWidth, worldHeight)
  viewport.hitArea = new Rectangle(0, 0, worldWidth, worldHeight)
  const worldSizeChanged = worldWidth !== previousWorldWidth || worldHeight !== previousWorldHeight

  if (
    preserveView &&
    previousView &&
    !worldSizeChanged &&
    !forceFit &&
    Number.isFinite(previousView.scaleX) &&
    Number.isFinite(previousView.scaleY)
  ) {
    viewport.scale.set(previousView.scaleX, previousView.scaleY)
    viewport.position.set(previousView.x, previousView.y)
    applyViewportBounds()
  } else {
    fitViewportToWorld()
  }

  previousWorldWidth = worldWidth
  previousWorldHeight = worldHeight
  resizeRendererToHost()
}

async function initPixi() {
  if (!host.value || app) return
  app = new Application()
  await app.init({ resizeTo: host.value, background: '#0b1220', antialias: false, preference: 'webgl' })
  host.value.replaceChildren(app.canvas)
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

  viewport.on('pointertap', (event) => {
    if (!props.showSelection || props.columns <= 0 || props.cellSize <= 0) return
    const worldPoint = viewport!.toWorld(event.global)
    const x = Math.floor(worldPoint.x / props.cellSize)
    const y = Math.floor(worldPoint.y / props.cellSize)
    if (x < 0 || y < 0 || x >= props.columns) {
      selection = null
      drawSelection()
      emit('clearSelection')
      return
    }
    const index = y * props.columns + x
    if (props.selectableCount > 0 && index >= props.selectableCount) {
      selection = null
      drawSelection()
      emit('clearSelection')
      return
    }
    if (!selection) {
      selection = { x, y, cellSize: props.cellSize, columns: props.columns }
    }
    selection.x = x
    selection.y = y
    drawSelection()
    emit('cellSelect', { x, y, index })
  })

  world = new Container()
  viewport.addChild(world)
  app.stage.addChild(viewport)
}

watch(
  () => [props.image, props.palette, props.columns, props.selectableCount],
  () => {
    void renderImage({ preserveView: true, preserveSelection: true })
  },
)

watch(
  () => props.resetKey,
  () => {
    void renderImage({ preserveView: false, preserveSelection: false, forceFit: true })
  },
)

watch(
  () => props.showGrid,
  () => {
    drawGrid()
  },
)

watch(
  () => props.showSelection,
  () => {
    drawSelection()
  },
)

onMounted(async () => {
  await initPixi()
  if (host.value) {
    resizeObserver = new ResizeObserver(() => {
      if (resizeRaf) {
        cancelAnimationFrame(resizeRaf)
      }
      resizeRaf = requestAnimationFrame(() => {
        resizeRendererToHost()
      })
    })
    resizeObserver.observe(host.value)
  }
  await renderImage({ preserveView: false, preserveSelection: false, forceFit: true })
})

onBeforeUnmount(() => {
  if (resizeRaf) {
    cancelAnimationFrame(resizeRaf)
    resizeRaf = 0
  }
  resizeObserver?.disconnect()
  resizeObserver = null
  clearWorld()
  world?.destroy({ children: true })
  world = null
  viewport?.destroy({ children: true })
  viewport = null
  app?.destroy(true)
  app = null
})
</script>
