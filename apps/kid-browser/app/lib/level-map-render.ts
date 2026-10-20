import { LEVEL_CELL_SIZE, type LevelMap } from '@repo/kid-util'
import {
  BACKGROUND_MARKER_COLOR,
  EMPTY_ROW_COLOR,
  ENEMY_COLOR,
  FLAG_MARKER_COLOR,
  MISSING_DATA_COLOR,
  PLAYER_MARKER_COLOR,
  blockKindColor,
  terrainColor,
  type LevelMapLayerState,
} from './level-map-view'

/** Camera/backing-store state for one frame. All values are in CSS pixels. */
export type LevelMapRenderView = {
  cssWidth: number
  cssHeight: number
  devicePixelRatio: number
  scale: number
  offsetX: number
  offsetY: number
  hover: { x: number; y: number } | null
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function levelDimensions(map: LevelMap) {
  const widthBlocks = map.layout?.widthBlocks ?? map.header.widthInBlocks
  const heightBlocks =
    map.layout?.heightBlocks ?? map.header.heightInBlocks + map.header.yOffsetInBlocks
  return {
    widthBlocks,
    heightBlocks,
    worldWidth: Math.max(1, widthBlocks * LEVEL_CELL_SIZE),
    worldHeight: Math.max(1, heightBlocks * LEVEL_CELL_SIZE),
  }
}

/**
 * Draws one level-map frame: terrain grid, block placements, enemies, spawn/flag markers and
 * background anchors. Colours are the generated index ramp from `level-map-view`, not ROM art.
 */
export function renderLevelMap(
  context: CanvasRenderingContext2D,
  map: LevelMap,
  layers: LevelMapLayerState,
  view: LevelMapRenderView,
): void {
  const { cssWidth, cssHeight, devicePixelRatio: dpr, scale, offsetX, offsetY, hover } = view
  const { widthBlocks, heightBlocks, worldWidth, worldHeight } = levelDimensions(map)
  const pixelWidth = Math.max(1, Math.round(cssWidth * dpr))
  const pixelHeight = Math.max(1, Math.round(cssHeight * dpr))

  context.setTransform(1, 0, 0, 1, 0, 0)
  context.clearRect(0, 0, pixelWidth, pixelHeight)
  context.fillStyle = '#020617'
  context.fillRect(0, 0, pixelWidth, pixelHeight)
  context.setTransform(dpr * scale, 0, 0, dpr * scale, -offsetX * dpr * scale, -offsetY * dpr * scale)
  const lineWidth = 1 / scale

  context.fillStyle = '#0b1220'
  context.fillRect(0, 0, worldWidth, worldHeight)

  const viewWidth = cssWidth / scale
  const viewHeight = cssHeight / scale
  const columnStart = clamp(Math.floor(offsetX / LEVEL_CELL_SIZE), 0, widthBlocks)
  const columnEnd = clamp(Math.ceil((offsetX + viewWidth) / LEVEL_CELL_SIZE), 0, widthBlocks)
  const rowStart = clamp(Math.floor(offsetY / LEVEL_CELL_SIZE), 0, heightBlocks)
  const rowEnd = clamp(Math.ceil((offsetY + viewHeight) / LEVEL_CELL_SIZE), 0, heightBlocks)

  if (layers.terrain && map.layout) {
    const grid = map.layout
    const streamStart = grid.emptyRowCount * grid.widthBlocks
    const streamEnd = streamStart + grid.copiedByteCount
    for (let y = rowStart; y < rowEnd; y++) {
      for (let x = columnStart; x < columnEnd; x++) {
        const index = y * grid.widthBlocks + x
        const isBlankRow = y < grid.emptyRowCount
        const isMissing = index >= streamEnd
        context.fillStyle = isBlankRow
          ? EMPTY_ROW_COLOR
          : isMissing
            ? MISSING_DATA_COLOR
            : terrainColor(grid.cells[index] ?? 0)
        context.fillRect(
          x * LEVEL_CELL_SIZE,
          y * LEVEL_CELL_SIZE,
          LEVEL_CELL_SIZE,
          LEVEL_CELL_SIZE,
        )
        if (isMissing && scale > 0.3) {
          context.strokeStyle = 'rgba(2, 6, 23, 0.55)'
          context.lineWidth = lineWidth
          context.beginPath()
          context.moveTo(x * LEVEL_CELL_SIZE, y * LEVEL_CELL_SIZE)
          context.lineTo((x + 1) * LEVEL_CELL_SIZE, (y + 1) * LEVEL_CELL_SIZE)
          context.stroke()
        }
      }
    }
  }

  if (layers.background) {
    const markerRadius = 4 / scale
    context.strokeStyle = BACKGROUND_MARKER_COLOR
    context.lineWidth = lineWidth
    for (const placement of map.background?.placements ?? []) {
      const x = placement.xRaw * 8
      const y = placement.yRaw * 8
      if (
        x < offsetX - markerRadius ||
        y < offsetY - markerRadius ||
        x > offsetX + viewWidth + markerRadius ||
        y > offsetY + viewHeight + markerRadius
      ) {
        continue
      }
      context.strokeRect(x - markerRadius, y - markerRadius, markerRadius * 2, markerRadius * 2)
    }
  }

  if (layers.blocks) {
    context.lineWidth = lineWidth
    for (const block of map.blockStream?.blocks ?? []) {
      if (
        block.x < columnStart - 1 ||
        block.x > columnEnd ||
        block.y < rowStart - 1 ||
        block.y > rowEnd
      ) {
        continue
      }
      const x = block.x * LEVEL_CELL_SIZE
      const y = block.y * LEVEL_CELL_SIZE
      context.globalAlpha = block.isHidden ? 0.35 : 0.85
      context.fillStyle = blockKindColor(block.kind)
      if (block.kind === 0x10) {
        context.fillRect(x + 5, y + 5, LEVEL_CELL_SIZE - 10, LEVEL_CELL_SIZE - 10)
      } else {
        context.fillRect(x + 1, y + 1, LEVEL_CELL_SIZE - 2, LEVEL_CELL_SIZE - 2)
      }
      context.globalAlpha = 1
      context.strokeStyle = block.isHidden ? '#f8fafc' : 'rgba(2, 6, 23, 0.8)'
      if (block.isHidden) {
        context.setLineDash([3 / scale, 2 / scale])
      }
      context.strokeRect(x + 1, y + 1, LEVEL_CELL_SIZE - 2, LEVEL_CELL_SIZE - 2)
      context.setLineDash([])
    }
  }

  if (layers.enemies) {
    const radius = 5 / scale
    context.lineWidth = lineWidth
    for (const object of map.enemies?.objects ?? []) {
      const x = object.xPosition
      const y = object.yPosition
      if (
        x < offsetX - radius ||
        y < offsetY - radius ||
        x > offsetX + viewWidth + radius ||
        y > offsetY + viewHeight + radius
      ) {
        continue
      }
      context.beginPath()
      context.arc(x, y, radius, 0, Math.PI * 2)
      context.fillStyle = ENEMY_COLOR
      context.fill()
      context.strokeStyle = 'rgba(255, 255, 255, 0.8)'
      context.stroke()
    }
  }

  if (layers.markers) {
    drawMarker(context, map.header.playerX, map.header.playerY, PLAYER_MARKER_COLOR, 'P1', scale)
    drawMarker(context, map.header.flagX, map.header.flagY, FLAG_MARKER_COLOR, 'FLAG', scale)
  }

  if (hover) {
    context.strokeStyle = 'rgba(248, 250, 252, 0.95)'
    context.lineWidth = 2 / scale
    context.strokeRect(
      hover.x * LEVEL_CELL_SIZE,
      hover.y * LEVEL_CELL_SIZE,
      LEVEL_CELL_SIZE,
      LEVEL_CELL_SIZE,
    )
  }

  if (scale * LEVEL_CELL_SIZE >= 9) {
    context.strokeStyle = 'rgba(148, 163, 184, 0.14)'
    context.lineWidth = lineWidth
    context.beginPath()
    for (let x = columnStart; x <= columnEnd; x++) {
      context.moveTo(x * LEVEL_CELL_SIZE, rowStart * LEVEL_CELL_SIZE)
      context.lineTo(x * LEVEL_CELL_SIZE, rowEnd * LEVEL_CELL_SIZE)
    }
    for (let y = rowStart; y <= rowEnd; y++) {
      context.moveTo(columnStart * LEVEL_CELL_SIZE, y * LEVEL_CELL_SIZE)
      context.lineTo(columnEnd * LEVEL_CELL_SIZE, y * LEVEL_CELL_SIZE)
    }
    context.stroke()
  }

  context.strokeStyle = 'rgba(148, 163, 184, 0.5)'
  context.lineWidth = 1.5 * lineWidth
  context.strokeRect(0, 0, worldWidth, worldHeight)
}

function drawMarker(
  context: CanvasRenderingContext2D,
  pixelX: number,
  pixelY: number,
  color: string,
  label: string,
  scale: number,
) {
  const radius = 7 / scale
  context.strokeStyle = color
  context.fillStyle = color
  context.lineWidth = 2 / scale
  context.beginPath()
  context.moveTo(pixelX - radius, pixelY)
  context.lineTo(pixelX + radius, pixelY)
  context.moveTo(pixelX, pixelY - radius)
  context.lineTo(pixelX, pixelY + radius)
  context.stroke()
  context.beginPath()
  context.arc(pixelX, pixelY, radius * 0.45, 0, Math.PI * 2)
  context.fill()
  if (scale > 0.3) {
    context.font = `${10 / scale}px ui-monospace, monospace`
    context.fillStyle = color
    context.fillText(label, pixelX + radius, pixelY - radius)
  }
}
