import { beforeAll, describe, expect, test } from 'vitest'
import { crc32 } from './hash'
import type { Rom } from './kid-rom'
import {
  buildLevelLayoutGrid,
  decodeLevelBlocks,
  levelBlockKindName,
  levelGridDimensions,
  loadLevelMap,
} from './level-map'
import { loadTestRom } from './test-rom-helper'

describe('level grid geometry', () => {
  test('matches the ROM dimensions for a 10x2 screen level', () => {
    // Reference: utils/go-kid/export/kid-asset.go GridDimensions and its test fixture.
    expect(levelGridDimensions(10, 2, 0)).toEqual({
      widthBlocks: 200,
      heightBlocks: 28,
      streamRowCount: 28,
      emptyRowCount: 0,
    })
  })

  test('adds two blank rows per y-offset unit', () => {
    expect(levelGridDimensions(6, 4, 1)).toEqual({
      widthBlocks: 120,
      heightBlocks: 58,
      streamRowCount: 56,
      emptyRowCount: 2,
    })
  })
})

describe('buildLevelLayoutGrid', () => {
  const gridDimensions = (widthBlocks: number, streamRowCount: number, emptyRowCount = 0) => ({
    widthBlocks,
    heightBlocks: emptyRowCount + streamRowCount,
    streamRowCount,
    emptyRowCount,
  })

  test('keeps an exact stream as the grid', () => {
    const layout = new Uint8Array(3 * 14).map((_, index) => index + 1)
    const grid = buildLevelLayoutGrid(layout, gridDimensions(3, 14))
    expect(grid.consistent).toBe(true)
    expect(grid.missingByteCount).toBe(0)
    expect(Array.from(grid.cells)).toEqual(Array.from(layout))
  })

  test('shifts the stream down by the y-offset and leaves the top rows blank', () => {
    const layout = new Uint8Array(3 * 14).map((_, index) => index + 1)
    const grid = buildLevelLayoutGrid(layout, gridDimensions(3, 14, 2))
    expect(grid.heightBlocks).toBe(16)
    expect(grid.emptyRowCount).toBe(2)
    expect(grid.consistent).toBe(true)
    expect(Array.from(grid.cells.subarray(0, 6))).toEqual([0, 0, 0, 0, 0, 0])
    expect(Array.from(grid.cells.subarray(6))).toEqual(Array.from(layout))
  })

  test('truncates extra bytes and reports the mismatch', () => {
    const layout = new Uint8Array(3 * 14 + 4).map((_, index) => index + 1)
    const grid = buildLevelLayoutGrid(layout, gridDimensions(3, 14))
    expect(grid.consistent).toBe(false)
    expect(grid.missingByteCount).toBe(0)
    expect(grid.copiedByteCount).toBe(3 * 14)
    expect(Array.from(grid.cells)).toEqual(Array.from(layout.subarray(0, 3 * 14)))
  })

  test('zero-pads a short stream and counts the cells without data', () => {
    const grid = buildLevelLayoutGrid(new Uint8Array([7, 8]), gridDimensions(2, 14))
    expect(grid.consistent).toBe(false)
    expect(grid.copiedByteCount).toBe(2)
    expect(grid.missingByteCount).toBe(2 * 14 - 2)
    expect(grid.cells[0]).toBe(7)
    expect(grid.cells[1]).toBe(8)
    expect(grid.cells[2]).toBe(0)
  })
})

describe('decodeLevelBlocks', () => {
  test('accepts an immediate end-of-stream marker', () => {
    // 0x40 magic, 0x55 -> xBits=5/yBits=5, then isHidden=0 + kind=0x1F (bits 0b011111).
    const result = decodeLevelBlocks(new Uint8Array([0x40, 0x55, 0x7c, 0xff]))
    expect(result.error).toBeUndefined()
    expect(result.complete).toBe(true)
    expect(result.blocks).toEqual([])
    expect(result.xBits).toBe(5)
    expect(result.yBits).toBe(5)
  })

  test('rejects a wrong magic byte', () => {
    const result = decodeLevelBlocks(new Uint8Array([0x41, 0x55, 0x1f]))
    expect(result.complete).toBe(false)
    expect(result.error).toContain('magic')
  })

  test('stops on kinds without a reference decoder', () => {
    // isHidden=0 + kind=0x08 (bits 0b001000), not decoded by utils/go-kid/data/level.go.
    const result = decodeLevelBlocks(new Uint8Array([0x40, 0x55, 0x20, 0x00, 0x00]))
    expect(result.complete).toBe(false)
    expect(result.blocks).toEqual([])
    expect(result.error).toContain('0x08')
  })

  test('labels every known block kind', () => {
    expect(levelBlockKindName(0x00)).toBe('Rock')
    expect(levelBlockKindName(0x10)).toBe('Collision modifier')
    expect(levelBlockKindName(0x1f)).toBe('Unknown 0x1f')
  })
})

describe('ROM level maps', () => {
  let rom: Rom | null = null

  beforeAll(async () => {
    rom = await loadTestRom({ context: 'Level map checks' })
    if (rom) {
      await rom.loadResources()
    }
  })

  const findHeader = (levelIndex: number) => {
    const header = rom?.resources
      .getResourcesByType('level-header')
      .find((resource) => resource.levelIndex === levelIndex)
    if (!header) {
      throw new Error(`level header ${levelIndex} was not discovered`)
    }
    return header
  }

  test('composes Blue Lake Woods I (level 0) from the ROM', async () => {
    if (!rom) {
      console.warn('Skipping test: ROM file not found.')
      return
    }

    const map = await loadLevelMap(rom, findHeader(0).baseAddress)

    expect(map.header.width).toBe(10)
    expect(map.header.height).toBe(2)
    expect(map.header.yOffset).toBe(0)
    expect(map.titleCard?.titleText).toContain('BLUE LAKE WOODS')

    expect(map.layoutError).toBeUndefined()
    expect(map.layout?.widthBlocks).toBe(200)
    expect(map.layout?.heightBlocks).toBe(28)
    expect(map.layout?.emptyRowCount).toBe(0)
    expect(map.layout?.consistent).toBe(true)
    expect(map.layout?.missingByteCount).toBe(0)
    // CRC of the go-kid `cells` grid for level-00 (levels-all export).
    expect(crc32(map.layout?.cells ?? new Uint8Array())).toBe(0xd8be1bdd)

    expect(map.blockStreamError).toBeUndefined()
    expect(map.blockStream?.error).toBeUndefined()
    expect(map.blockStream?.complete).toBe(true)
    expect(map.blockStream?.xBits).toBe(8)
    expect(map.blockStream?.yBits).toBe(5)
    expect(map.blockStream?.outOfGridCount).toBe(0)
    expect(map.blockStream?.blocks.length).toBe(91)
    const blockSum = (map.blockStream?.blocks ?? []).reduce(
      (total, block) => ({ x: total.x + block.x, y: total.y + block.y }),
      { x: 0, y: 0 },
    )
    expect(blockSum).toEqual({ x: 9177, y: 1174 })
    expect(map.blockStream?.blocks[0]).toMatchObject({ kind: 0, x: 160, y: 7 })

    expect(map.enemiesError).toBeUndefined()
    expect(map.enemies?.h1ObjectCountRaw).toBe(4)
    // Discovery widens the count from the pointer-table gap (see
    // research-docs/levels/enemy-count-discrepancies.md), so more entries are parsed than the
    // header byte advertises.
    expect(map.enemies?.objectCount).toBe(6)
    expect(map.enemies?.objects[0]).toMatchObject({
      enemyTypeOrKind: 13,
      behaviorFlags: 255,
      hitPointsPlusOne: 0,
      xPosition: 1192,
      yPosition: 143,
    })
  })

  test('keeps the blank y-offset rows of The Nightmare Peaks 2 (level 0x29)', async () => {
    if (!rom) {
      console.warn('Skipping test: ROM file not found.')
      return
    }

    const map = await loadLevelMap(rom, findHeader(0x29).baseAddress)

    expect(map.header.yOffset).toBe(1)
    expect(map.layout?.widthBlocks).toBe(120)
    expect(map.layout?.heightBlocks).toBe(58)
    expect(map.layout?.emptyRowCount).toBe(2)
    expect(map.layout?.consistent).toBe(true)
    expect(
      Array.from(map.layout?.cells.subarray(0, 240) ?? [1]).every((value) => value === 0),
    ).toBe(true)
    // CRC of the go-kid `cells` grid for level-29 (levels-all export).
    expect(crc32(map.layout?.cells ?? new Uint8Array())).toBe(0xa7e5c184)

    expect(map.blockStream?.complete).toBe(true)
    expect(map.blockStream?.outOfGridCount).toBe(0)
    expect(map.blockStream?.blocks.length).toBe(250)
  })

  test('decodes a block stream whose input size was not inferred (level 0x65)', async () => {
    if (!rom) {
      console.warn('Skipping test: ROM file not found.')
      return
    }

    const map = await loadLevelMap(rom, findHeader(0x65).baseAddress)

    // Discovery only infers a block size from the next pointer, so this last pointer has none;
    // the fallback reads until the 0x1F terminator. 71 placements matches the go-kid export.
    expect(map.blockStreamNote).toBeTruthy()
    expect(map.blockStreamError).toBeUndefined()
    expect(map.blockStream?.complete).toBe(true)
    expect(map.blockStream?.blocks.length).toBe(71)
    expect(map.blockStream?.outOfGridCount).toBe(0)
  })
})
