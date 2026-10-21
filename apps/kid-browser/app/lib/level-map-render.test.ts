import { describe, expect, it, vi } from 'vitest'
import { LEVEL_CELL_SIZE, type LevelMap } from '@repo/kid-util'
import { renderLevelMap } from './level-map-render'
import {
  blockKindColor,
  createDefaultLevelMapLayers,
  terrainColor,
  type LevelMapLayerState,
} from './level-map-view'

type ContextCall = { style: unknown; args: unknown[] }

function createContext() {
  const strokeCalls: ContextCall[] = []
  const fillCalls: ContextCall[] = []
  const context = {
    fillStyle: '',
    strokeStyle: '',
    globalAlpha: 1,
    lineWidth: 1,
    font: '',
    imageSmoothingEnabled: true,
    setTransform: vi.fn(),
    clearRect: vi.fn(),
    fillRect: vi.fn((...args: unknown[]) => {
      fillCalls.push({ style: context.fillStyle, args })
    }),
    strokeRect: vi.fn((...args: unknown[]) => {
      strokeCalls.push({ style: context.strokeStyle, args })
    }),
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    rect: vi.fn(),
    clip: vi.fn(),
    drawImage: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    setLineDash: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    fillText: vi.fn(),
  }
  return {
    context: context as unknown as CanvasRenderingContext2D,
    state: context,
    strokeCalls,
    fillCalls,
  }
}

/** One-cell level with a layout byte, a block and (optionally) a block stream. */
function createMap(): LevelMap {
  return {
    header: { widthInBlocks: 1, heightInBlocks: 1, yOffsetInBlocks: 0 },
    layout: {
      widthBlocks: 1,
      heightBlocks: 1,
      cells: new Uint8Array([7]),
      emptyRowCount: 0,
      copiedByteCount: 1,
      missingByteCount: 0,
      consistent: true,
    },
    blockStream: {
      blocks: [
        {
          kind: 0x09,
          x: 0,
          y: 0,
          isHidden: false,
          isDisguised: false,
          prize: 0,
          warpMap: 0,
          warpX: 0,
          warpY: 0,
          dirUp: false,
          dirRight: false,
          dirDown: false,
          dirLeft: false,
          collisionMod: 0,
          startDelay: 0,
          visibleDuration: 0,
          hiddenDuration: 0,
        },
      ],
    },
  } as unknown as LevelMap
}

function createLayers(overrides: Partial<LevelMapLayerState> = {}): LevelMapLayerState {
  return {
    ...createDefaultLevelMapLayers(),
    background: false,
    backgroundAnchors: false,
    enemies: false,
    markers: false,
    blocks: false,
    grid: false,
    ...overrides,
  }
}

const view = {
  cssWidth: 100,
  cssHeight: 100,
  devicePixelRatio: 1,
  scale: 0.1,
  offsetX: 0,
  offsetY: 0,
  hover: null,
}

describe('renderLevelMap foreground layers', () => {
  it('keeps ROM foreground art when Foreground layout is disabled', () => {
    const { context, state, fillCalls } = createContext()
    const foreground = {} as HTMLCanvasElement

    renderLevelMap(
      context,
      createMap(),
      createLayers({ graphics: true, terrain: false }),
      view,
      { foreground },
    )

    expect(state.drawImage).toHaveBeenCalledWith(foreground, 0, 0)
    // Canvas clear + world backdrop only; no generated terrain cells.
    expect(fillCalls.map((call) => call.style)).not.toContain(terrainColor(7))
    expect(fillCalls).toHaveLength(2)
  })

  it('prefers ROM art over the generated ramp when both foreground layers are on', () => {
    const { context, state, fillCalls } = createContext()
    const foreground = {} as HTMLCanvasElement

    renderLevelMap(
      context,
      createMap(),
      createLayers({ graphics: true, terrain: true }),
      view,
      { foreground },
    )

    expect(state.drawImage).toHaveBeenCalledWith(foreground, 0, 0)
    expect(fillCalls.map((call) => call.style)).not.toContain(terrainColor(7))
  })

  it('hides ROM foreground art when the ROM tiles layer is disabled', () => {
    const { context, state, fillCalls } = createContext()

    renderLevelMap(
      context,
      createMap(),
      createLayers({ graphics: false, terrain: true }),
      view,
      { foreground: {} as HTMLCanvasElement },
    )

    expect(state.drawImage).not.toHaveBeenCalled()
    expect(fillCalls.at(-1)).toEqual({
      style: terrainColor(7),
      args: [0, 0, LEVEL_CELL_SIZE, LEVEL_CELL_SIZE],
    })
  })
})

describe('renderLevelMap layer controls', () => {
  it('skips the cell grid when the grid layer is off', () => {
    const { context, state } = createContext()

    renderLevelMap(
      context,
      createMap(),
      createLayers({ graphics: false, terrain: false }),
      { ...view, scale: 1 },
    )

    expect(state.moveTo).not.toHaveBeenCalled()
  })

  it('draws the cell grid when the layer is on and cells are readable', () => {
    const { context, state } = createContext()

    renderLevelMap(
      context,
      createMap(),
      createLayers({ graphics: false, terrain: false, grid: true }),
      { ...view, scale: 1 },
    )

    expect(state.moveTo).toHaveBeenCalled()
  })

  it('hides block outlines when the block-outline layer is off', () => {
    const { context, strokeCalls } = createContext()

    renderLevelMap(
      context,
      createMap(),
      createLayers({ graphics: true, terrain: false, blocks: true, blockBorders: false }),
      view,
      { foreground: {} as HTMLCanvasElement },
    )

    expect(strokeCalls.some((call) => call.args[0] === 1 && call.args[1] === 1)).toBe(false)
  })

  it('shows ROM block art only while the Blocks layer is enabled', () => {
    const { context, state } = createContext()
    const blockTexture = {} as HTMLCanvasElement
    const foregroundTexture = { width: 16 } as HTMLCanvasElement

    renderLevelMap(
      context,
      createMap(),
      createLayers({ graphics: true, terrain: false, blocks: true, blockBorders: false }),
      view,
      { foreground: foregroundTexture, blocks: blockTexture },
    )

    expect(state.drawImage).toHaveBeenCalledWith(blockTexture, 0, 0)

    state.drawImage.mockClear()
    renderLevelMap(
      context,
      createMap(),
      createLayers({ graphics: true, terrain: false, blocks: false, blockBorders: true }),
      view,
      { foreground: foregroundTexture, blocks: blockTexture },
    )

    expect(state.drawImage).toHaveBeenCalledTimes(1)
    expect(state.drawImage).toHaveBeenCalledWith(foregroundTexture, 0, 0)
  })

  it('colour-codes block outlines when the border layer is on', () => {
    const { context, strokeCalls } = createContext()

    renderLevelMap(
      context,
      createMap(),
      createLayers({ graphics: true, terrain: false, blocks: true, blockBorders: true }),
      view,
      { foreground: {} as HTMLCanvasElement },
    )

    const blockOutline = strokeCalls.find(
      (call) => call.args[0] === 1 && call.args[1] === 1,
    )
    expect(blockOutline?.style).toBe(blockKindColor(0x09))
  })
})
