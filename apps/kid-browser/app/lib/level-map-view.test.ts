import { describe, expect, it } from 'vitest'
import type { LevelMap } from '@repo/kid-util'
import {
  blockKindColor,
  findLevelBlockAt,
  levelCellAtPixel,
  summarizeLevelMap,
  terrainColor,
} from './level-map-view'

/** Minimal composed map: 2 empty rows, a 2x2 stream and one block/enemy/placement. */
function createMap(): LevelMap {
  return {
    headerAddress: 0x40816,
    header: {
      type: 'level-header',
      loaded: true,
      baseAddress: 0x40816,
      hash: 0,
      inputSize: 0x1c,
      levelIndex: 0,
      wordIndex: 0,
      width: 1,
      height: 1,
      yOffset: 1,
      widthInBlocks: 20,
      heightInBlocks: 14,
      yOffsetInBlocks: 2,
      themeIndex: 9,
      backgroundType: 9,
      backgroundMisc: 0,
      backgroundWidth: 64,
      playerX: 32,
      playerY: 256,
      flagX: 3152,
      flagY: 176,
      tilesDataPtr: 0x561d2,
      blocksDataPtr: 0x73af6,
      backgroundDataPtr: 0x6fb56,
      levelObjectsHeaderPtr: 0x792e8,
    },
    layout: {
      widthBlocks: 2,
      heightBlocks: 4,
      cells: new Uint8Array([0, 0, 0, 0, 7, 8, 7, 7]),
      emptyRowCount: 2,
      copiedByteCount: 4,
      missingByteCount: 0,
      consistent: true,
    },
    blockStream: {
      blocks: [
        {
          kind: 0x00,
          x: 1,
          y: 2,
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
        {
          kind: 0x08,
          x: 0,
          y: 3,
          isHidden: true,
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
      xBits: 2,
      yBits: 2,
      bitsRead: 32,
      bytesRead: 4,
      outOfGridCount: 0,
      complete: true,
    },
    enemies: {
      type: 'level-enemy-layout',
      loaded: true,
      baseAddress: 0x792f8,
      hash: 0,
      inputSize: 18,
      h1UnknownByte: 0x80,
      h1ObjectCountRaw: 2,
      objectCount: 1,
      objects: [
        {
          index: 0,
          enemyTypeOrKind: 13,
          behaviorFlags: 255,
          hitPointsPlusOne: 0,
          xPosition: 1192,
          yPosition: 143,
        },
      ],
    },
    background: {
      type: 'level-background-layout',
      loaded: true,
      baseAddress: 0x6fb56,
      hash: 0,
      inputSize: 8,
      backgroundType: 9,
      isPacked: true,
      format: 'chunked',
      placements: [],
    },
  } as unknown as LevelMap
}

describe('summarizeLevelMap', () => {
  it('counts only stream cells as terrain, excluding blank offset rows', () => {
    const summary = summarizeLevelMap(createMap())
    expect(summary.emptyRowCount).toBe(2)
    expect(summary.emptyRowCells).toBe(4)
    expect(summary.missingCells).toBe(0)
    expect(summary.terrainValues).toEqual([
      { value: 7, count: 3 },
      { value: 8, count: 1 },
    ])
    expect(summary.terrainDistinctValues).toBe(2)
  })

  it('reports block kinds, including ones without a reference decoder', () => {
    const summary = summarizeLevelMap(createMap())
    expect(summary.blockCount).toBe(2)
    expect(summary.blockKinds.map((kind) => kind.value).sort()).toEqual([0, 8])
    expect(summary.undecodedBlockKinds).toEqual([0x08])
    expect(summary.enemyCount).toBe(1)
    expect(summary.enemyTypes).toEqual([{ value: 13, count: 1 }])
  })

  it('exposes header markers and background placement count', () => {
    const summary = summarizeLevelMap(createMap())
    expect(summary.playerStart).toEqual({ x: 32, y: 256 })
    expect(summary.flag).toEqual({ x: 3152, y: 176 })
    expect(summary.backgroundPlacements).toBe(0)
  })
})

describe('map lookups', () => {
  it('finds a block by cell and converts pixels to cells', () => {
    const map = createMap()
    expect(findLevelBlockAt(map, 1, 2)?.kind).toBe(0x00)
    expect(findLevelBlockAt(map, 0, 2)).toBeUndefined()
    expect(levelCellAtPixel(1192, 143)).toEqual({ x: 74, y: 8 })
  })

  it('gives every block kind and terrain byte a stable colour', () => {
    expect(blockKindColor(0x10)).toMatch(/^#/)
    expect(blockKindColor(0x99)).toMatch(/^#/)
    expect(terrainColor(7)).toMatch(/^hsl/)
    expect(terrainColor(7)).toBe(terrainColor(7))
    expect(terrainColor(0)).toBe('#1e293b')
  })
})
