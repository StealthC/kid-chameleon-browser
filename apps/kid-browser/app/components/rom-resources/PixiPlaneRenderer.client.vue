<template>
  <div ref="host" class="h-full w-full overflow-hidden rounded-md bg-slate-950/70" />
</template>

<script setup lang="ts">
import 'pixi.js/events'

import { Application, Container, Graphics, Rectangle, SCALE_MODES, Sprite, Texture } from 'pixi.js'
import { Viewport } from 'pixi-viewport'
import {
  KidImageData,
  type Palette,
  type PaletteRomResourceLoaded,
  type PlaneRomResourceLoaded,
  type PlaneRomResourceTile,
  type SheetRomResourceLoaded,
} from '@repo/kid-util'
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

type Props = {
  plane: PlaneRomResourceLoaded
  sheet: SheetRomResourceLoaded | null
  palette?: PaletteRomResourceLoaded
  columns: number
  showGrid?: boolean
  showSelection?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showGrid: true,
  showSelection: true,
})

const emit = defineEmits<{
  tileSelect: [payload: { x: number; y: number; index: number; tile: PlaneRomResourceTile }]
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
let selection: { x: number; y: number; tileSize: number; columns: number } | null = null

const MIN_SCALE = 1
const MAX_SCALE = 16
const TILE_SIZE = 8

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
    throw new Error('Could not create 2D context for Pixi plane rendering')
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

function drawGrid(columns: number, rows: number) {
  if (!gridLayer) return
  gridLayer.clear()
  if (!props.showGrid) return
  for (let x = 0; x <= columns; x++) {
    const px = x * TILE_SIZE
    gridLayer.moveTo(px, 0)
    gridLayer.lineTo(px, rows * TILE_SIZE)
  }
  for (let y = 0; y <= rows; y++) {
    const py = y * TILE_SIZE
    gridLayer.moveTo(0, py)
    gridLayer.lineTo(columns * TILE_SIZE, py)
  }
  gridLayer.stroke({ color: 0x60a5fa, width: 1, alpha: 0.22 })
}

function drawSelection() {
  if (!selectionLayer) return
  selectionLayer.clear()
  if (!props.showSelection || !selection) return
  selectionLayer.rect(selection.x * selection.tileSize, selection.y * selection.tileSize, selection.tileSize, selection.tileSize)
  selectionLayer.stroke({ color: 0xffd166, width: 1, alpha: 0.95 })
}

function fitViewportToWorld() {
  if (!viewport) {
    return
  }
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
}

function resizeRendererToHost() {
  if (!app || !viewport || !host.value) {
    return
  }
  const width = Math.max(1, host.value.clientWidth)
  const height = Math.max(1, host.value.clientHeight)
  app.renderer.resize(width, height)
  app.canvas.style.width = `${width}px`
  app.canvas.style.height = `${height}px`
  viewport.resize(width, height, worldWidth, worldHeight)
  fitViewportToWorld()
}

async function renderPlane() {
  const token = ++renderToken
  if (!host.value || !viewport || !world || !props.sheet) return

  const image = KidImageData.fromPlane(props.plane, props.sheet, props.columns)
  if (token !== renderToken) return

  clearWorld()

  imageLayer = buildImageLayer(image, props.palette)
  world.addChild(imageLayer)

  const rows = Math.max(1, Math.ceil(props.plane.tiles.length / props.columns))
  worldWidth = image.width
  worldHeight = image.height

  gridLayer = new Graphics()
  world.addChild(gridLayer)
  drawGrid(props.columns, rows)

  selectionLayer = new Graphics()
  world.addChild(selectionLayer)

  selection = { x: 0, y: 0, tileSize: TILE_SIZE, columns: props.columns }
  drawSelection()

  viewport.resize(host.value.clientWidth || 1, host.value.clientHeight || 1, worldWidth, worldHeight)
  viewport.hitArea = new Rectangle(0, 0, worldWidth, worldHeight)
  fitViewportToWorld()
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
    if (!selection || !props.showSelection) return
    const worldPoint = viewport!.toWorld(event.global)
    const tileX = Math.floor(worldPoint.x / selection.tileSize)
    const tileY = Math.floor(worldPoint.y / selection.tileSize)
    if (tileX < 0 || tileY < 0 || tileX >= selection.columns) return
    const index = tileY * selection.columns + tileX
    if (index < 0 || index >= props.plane.tiles.length) return
    const tile = props.plane.tiles[index]
    if (!tile) return
    selection.x = tileX
    selection.y = tileY
    drawSelection()
    emit('tileSelect', { x: tileX, y: tileY, index, tile })
  })

  world = new Container()
  viewport.addChild(world)
  app.stage.addChild(viewport)
}

watch(() => [props.plane.baseAddress, props.sheet?.baseAddress, props.palette?.baseAddress, props.columns], () => {
  void renderPlane()
})

watch(() => props.showGrid, () => {
  const rows = Math.max(1, Math.ceil(props.plane.tiles.length / props.columns))
  drawGrid(props.columns, rows)
})

watch(() => props.showSelection, () => {
  drawSelection()
})

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
  await renderPlane()
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
