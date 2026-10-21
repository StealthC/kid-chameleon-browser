import {
  LEVEL_CELL_SIZE,
  LEVEL_DECODED_BLOCK_KINDS,
  levelBlockKindName,
  type LevelBlockPlacement,
  type LevelMap,
} from '@repo/kid-util'

/**
 * Presentation helpers for the level map viewer. Kept out of the SFCs so the canvas and the
 * legend share one source of colours, layer ids and summaries.
 *
 * `graphics` draws the ROM theme tile sheet with the level theme palette; `terrain` is only the
 * generated colour ramp used when the ROM art is unavailable or its layer is off. Keeping them
 * separate lets the generated colours be hidden without hiding the ROM tiles.
 */

export type LevelMapLayerId =
  | 'graphics'
  | 'terrain'
  | 'blocks'
  | 'blockBorders'
  | 'grid'
  | 'enemies'
  | 'markers'
  | 'background'
  | 'backgroundAnchors'

export type LevelMapLayerState = Record<LevelMapLayerId, boolean>

export type LevelMapLayerDefinition = {
  id: LevelMapLayerId
  label: string
  description: string
}

export const LEVEL_MAP_LAYERS: LevelMapLayerDefinition[] = [
  {
    id: 'graphics',
    label: 'ROM tiles',
    description:
      'Theme tile sheet drawn with the level palette (VDP metatiles and special-block dictionary).',
  },
  {
    id: 'terrain',
    label: 'Foreground layout',
    description:
      'Generated colour ramp keyed by the layout byte. Fallback only: it never hides ROM tiles.',
  },
  {
    id: 'blocks',
    label: 'Blocks',
    description: 'Placed blocks from the bitstream (rock, prize, lift, ...).',
  },
  {
    id: 'blockBorders',
    label: 'Block outlines',
    description: 'Show or hide the colour-coded outlines around special blocks.',
  },
  {
    id: 'grid',
    label: 'Grid',
    description: 'Cell grid lines, drawn only when cells are large enough on screen.',
  },
  {
    id: 'enemies',
    label: 'Enemies',
    description: 'Object placements from the enemy layout, in level pixels.',
  },
  {
    id: 'markers',
    label: 'Spawn & flag',
    description: 'Player start and exit flag from the level header, in level pixels.',
  },
  {
    id: 'background',
    label: 'Background art',
    description: 'Composed chunked/layered background, drawn with its own ROM palette.',
  },
  {
    id: 'backgroundAnchors',
    label: 'Background anchors',
    description: 'Chunk placement anchors from the background layout (background-map tiles).',
  },
]

export function createDefaultLevelMapLayers(): LevelMapLayerState {
  return {
    graphics: true,
    terrain: true,
    blocks: true,
    blockBorders: true,
    grid: true,
    enemies: true,
    markers: true,
    background: true,
    backgroundAnchors: false,
  }
}

const terrainColors = (() => {
  const colors: string[] = []
  for (let value = 0; value < 256; value++) {
    if (value === 0) {
      colors.push('#1e293b')
      continue
    }
    // Sequential hue over the byte range keeps neighbouring skin indices close in colour, so a
    // contiguous terrain area reads as one band instead of random confetti.
    const hue = Math.round((value / 256) * 360)
    const lightness = 30 + ((value >> 5) & 3) * 6
    colors.push(`hsl(${hue} 34% ${lightness}%)`)
  }
  return colors
})()

export function terrainColor(value: number): string {
  return terrainColors[value & 0xff] ?? '#1e293b'
}

export const BLOCK_KIND_COLORS: Record<number, string> = {
  0x00: '#94a3b8',
  0x01: '#facc15',
  0x02: '#7dd3fc',
  0x03: '#c084fc',
  0x04: '#fb923c',
  0x05: '#e2e8f0',
  0x06: '#f472b6',
  0x07: '#2dd4bf',
  0x08: '#ef4444',
  0x09: '#a3e635',
  0x0a: '#f87171',
  0x0b: '#38bdf8',
  0x0c: '#fbbf24',
  0x0d: '#ef4444',
  0x0e: '#ef4444',
  0x0f: '#ef4444',
  0x10: '#e879f9',
}

export function blockKindColor(kind: number): string {
  return BLOCK_KIND_COLORS[kind] ?? '#ef4444'
}

export function blockBorderColor(layers: LevelMapLayerState, kind: number): string | null {
  return layers.blockBorders ? blockKindColor(kind) : null
}

/** Cell size below which grid lines would cover the terrain instead of framing it. */
export const GRID_MIN_CELL_PIXELS = 9

export function shouldDrawGrid(layers: LevelMapLayerState, cellPixelSize: number): boolean {
  return layers.grid && cellPixelSize >= GRID_MIN_CELL_PIXELS
}

export const ENEMY_COLOR = '#fb7185'
export const PLAYER_MARKER_COLOR = '#4ade80'
export const FLAG_MARKER_COLOR = '#fbbf24'
export const BACKGROUND_MARKER_COLOR = '#22d3ee'
export const EMPTY_ROW_COLOR = '#0f172a'
export const MISSING_DATA_COLOR = '#334155'

export type CountedValue = {
  value: number
  count: number
}

export type LevelMapBlockKindCount = CountedValue & {
  label: string
  color: string
}

export type LevelMapSummary = {
  widthBlocks: number
  heightBlocks: number
  totalCells: number
  emptyRowCount: number
  emptyRowCells: number
  missingCells: number
  terrainValues: CountedValue[]
  terrainDistinctValues: number
  blockKinds: LevelMapBlockKindCount[]
  undecodedBlockKinds: number[]
  blockCount: number
  enemyCount: number
  enemyTypes: CountedValue[]
  backgroundPlacements: number
  playerStart: { x: number; y: number }
  flag: { x: number; y: number }
}

/**
 * Aggregates what the map actually contains so the legend and gap warnings describe decoded data
 * instead of assumptions. Counts are computed from the composed `LevelMap`.
 */
export function summarizeLevelMap(map: LevelMap): LevelMapSummary {
  const layout = map.layout
  const widthBlocks = layout?.widthBlocks ?? 0
  const heightBlocks = layout?.heightBlocks ?? 0
  const totalCells = widthBlocks * heightBlocks
  const emptyRowCount = layout?.emptyRowCount ?? 0
  const emptyRowCells = emptyRowCount * widthBlocks
  const missingCells = layout?.missingByteCount ?? 0

  const terrainCounts = new Map<number, number>()
  if (layout) {
    const streamStart = emptyRowCells
    const streamEnd = streamStart + layout.copiedByteCount
    for (let index = streamStart; index < streamEnd; index++) {
      const value = layout.cells[index] ?? 0
      terrainCounts.set(value, (terrainCounts.get(value) ?? 0) + 1)
    }
  }
  const terrainValues = Array.from(terrainCounts.entries())
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value - b.value)

  const blockKindCounts = new Map<number, number>()
  const blocks = map.blockStream?.blocks ?? []
  for (const block of blocks) {
    blockKindCounts.set(block.kind, (blockKindCounts.get(block.kind) ?? 0) + 1)
  }
  const blockKinds = Array.from(blockKindCounts.entries())
    .map(([value, count]) => ({
      value,
      count,
      label: levelBlockKindName(value),
      color: blockKindColor(value),
    }))
    .sort((a, b) => b.count - a.count || a.value - b.value)

  const enemyTypeCounts = new Map<number, number>()
  for (const object of map.enemies?.objects ?? []) {
    enemyTypeCounts.set(
      object.enemyTypeOrKind,
      (enemyTypeCounts.get(object.enemyTypeOrKind) ?? 0) + 1,
    )
  }
  const enemyTypes = Array.from(enemyTypeCounts.entries())
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value - b.value)

  const undecodedBlockKinds = blockKinds
    .filter(
      (kind) =>
        !LEVEL_DECODED_BLOCK_KINDS.includes(
          kind.value as (typeof LEVEL_DECODED_BLOCK_KINDS)[number],
        ),
    )
    .map((kind) => kind.value)

  return {
    widthBlocks,
    heightBlocks,
    totalCells,
    emptyRowCount,
    emptyRowCells,
    missingCells,
    terrainValues,
    terrainDistinctValues: terrainValues.length,
    blockKinds,
    undecodedBlockKinds,
    blockCount: blocks.length,
    enemyCount: map.enemies?.objects.length ?? 0,
    enemyTypes,
    backgroundPlacements: map.background?.placements.length ?? 0,
    playerStart: { x: map.header.playerX, y: map.header.playerY },
    flag: { x: map.header.flagX, y: map.header.flagY },
  }
}

/** First block occupying a cell, if any. Blocks replace each other per cell when decoded. */
export function findLevelBlockAt(
  map: LevelMap,
  x: number,
  y: number,
): LevelBlockPlacement | undefined {
  return map.blockStream?.blocks.find((block) => block.x === x && block.y === y)
}

/** Cell coordinate of a level pixel position. */
export function levelCellAtPixel(pixelX: number, pixelY: number): { x: number; y: number } {
  return {
    x: Math.floor(pixelX / LEVEL_CELL_SIZE),
    y: Math.floor(pixelY / LEVEL_CELL_SIZE),
  }
}
