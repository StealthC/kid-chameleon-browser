import { beforeAll, describe, expect, test } from 'vitest'
import { crc32 } from './hash'
import { mdColorToRgba, mdPaletteToRgba } from './kid-graphics'
import type { Rom } from './kid-rom'
import type { LevelBlockPlacement } from './level-map'
import {
  blockSkinsForPlacement,
  findThemePaletteMaps,
  indexedTileImageToRgba,
  loadLevelGraphics,
  loadLevelThemeGraphics,
} from './level-graphics'
import { loadLevelMap, type LevelMap } from './level-map'
import { loadTestRom } from './test-rom-helper'

describe('Mega Drive palette conversion', () => {
  test('uses the VDP DAC levels, not a linear 3-bit ramp', () => {
    // ROM: CRAM words are 0BBBGGGRRR; utils/go-kid data/palette.go BrightnessModeIndex[0].
    expect(mdColorToRgba(0x0000)).toEqual([0, 0, 0, 255])
    expect(mdColorToRgba(0x0eee)).toEqual([255, 255, 255, 255])
    expect(mdColorToRgba(0x0e62)).toEqual([52, 116, 255, 255])
    expect(mdColorToRgba(0x0824)).toEqual([87, 52, 144, 255])
    expect(mdPaletteToRgba([0x0000, 0x0eee])).toEqual([
      [0, 0, 0, 255],
      [255, 255, 255, 255],
    ])
  })
})

describe('ROM palette maps', () => {
  let rom: Rom | null = null

  beforeAll(async () => {
    rom = await loadTestRom({ context: 'palette map checks' })
    if (rom) {
      await rom.loadResources()
    }
  })

  test('discovers the foreground maps selected by LoadLevelGame', () => {
    if (!rom) {
      console.warn('Skipping test: ROM file not found.')
      return
    }
    const maps = findThemePaletteMaps(rom, 'foreground')
    expect(maps.get(10)).toBe(0x1444a)
    expect(maps.get(9)).toBe(0x1445a)
    expect(maps.get(7)).toBe(0x1449a)
    expect(Array.from(rom.bytes.subarray(0x1445a, 0x1446a))).toEqual([
      0, 1, 11, 12, 13, 6, 10, 9, 13, 7, 14, 2, 3, 4, 8, 15,
    ])
  })

  test('discovers the background maps', () => {
    if (!rom) {
      console.warn('Skipping test: ROM file not found.')
      return
    }
    const maps = findThemePaletteMaps(rom, 'background')
    expect(maps.get(9)).toBe(0x1448a)
    expect(maps.get(7)).toBe(0x144aa)
    expect(maps.get(3)).toBe(0x144ba)
  })
})

describe('theme graphics', () => {
  let rom: Rom | null = null

  beforeAll(async () => {
    rom = await loadTestRom({ context: 'theme graphics checks' })
    if (rom) {
      await rom.loadResources()
    }
  })

  test('decodes the Woods theme palette, tiles and mapping table', async () => {
    if (!rom) {
      console.warn('Skipping test: ROM file not found.')
      return
    }
    const theme = await loadLevelThemeGraphics(rom, 9, 254)

    expect(theme.palette.address).toBe(0x7b7b0)
    expect(theme.palette.rawColors).toEqual([
      0x0000, 0x0022, 0x0466, 0x0688, 0x0acc, 0x068c, 0x0004, 0x0060, 0x04a0, 0x04e4, 0x0026,
      0x0248, 0x046a, 0x0648, 0x0eee,
    ])
    expect(theme.palette.pixelRemap).toEqual([
      0, 1, 11, 12, 13, 6, 10, 9, 13, 7, 14, 2, 3, 4, 8, 15,
    ])
    expect(theme.palette.rgba[0]).toEqual([0, 0, 0, 0])
    expect(theme.palette.rgba[1]).toEqual([0, 0, 0, 255])
    expect(theme.palette.rgba[6]).toEqual([206, 144, 116, 255])
    expect(theme.palette.rgba[15]).toEqual([255, 255, 255, 255])

    expect(theme.mappingAddress).toBe(0x7fe94)
    expect(theme.mappingEntryCount).toBe(255)
    expect(theme.tileSet.address).toBe(0x902c2)
    expect(theme.tileSet.tileBase).toBe(0xbc)
    expect(theme.tileSet.tiles.length).toBe(355)
    expect(theme.commonBlocks.mappingAddress).toBe(0x7b8dc)
    expect(theme.commonBlocks.tileSet.address).toBe(0x992e4)
    expect(theme.commonBlocks.tileSet.tileBase).toBe(0x220)
    expect(theme.commonBlocks.tileSet.tiles.length).toBe(211)
  })
})

describe('special block skins', () => {
  const base: LevelBlockPlacement = {
    kind: 0x00,
    x: 2,
    y: 3,
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
  }

  test('maps block types to the words LoadLevelBlocks writes', () => {
    expect(blockSkinsForPlacement(base, 0)).toEqual([{ skin: 0x01, offsetX: 0, offsetY: 0 }])
    expect(blockSkinsForPlacement({ ...base, kind: 0x01, isDisguised: true }, 0)).toEqual([
      { skin: 0x01, offsetX: 0, offsetY: 0 },
    ])
    expect(blockSkinsForPlacement({ ...base, kind: 0x01 }, 0)).toEqual([
      { skin: 0x02, offsetX: 0, offsetY: 0 },
    ])
    expect(blockSkinsForPlacement({ ...base, kind: 0x04 }, 0)).toEqual([
      { skin: 0x07, offsetX: 0, offsetY: 0 },
      { skin: 0x08, offsetX: 1, offsetY: 0 },
    ])
    expect(blockSkinsForPlacement({ ...base, kind: 0x06 }, 0)[0]?.skin).toBe(0x0c)
    expect(blockSkinsForPlacement({ ...base, kind: 0x06 }, 7)[0]?.skin).toBe(0x0e)
    expect(blockSkinsForPlacement({ ...base, kind: 0x09 }, 0)).toEqual([
      { skin: 0x19, offsetX: 0, offsetY: 0 },
    ])
    expect(
      blockSkinsForPlacement({ ...base, kind: 0x0a, dirUp: true, dirLeft: true }, 0)[0]?.skin,
    ).toBe(0x1c + 0x1 + 0x8)
    expect(blockSkinsForPlacement({ ...base, kind: 0x0b }, 0)[0]?.skin).toBe(0x2c)
    expect(blockSkinsForPlacement({ ...base, kind: 0x10 }, 0)).toBeNull()
    expect(blockSkinsForPlacement({ ...base, kind: 0x00, isHidden: true }, 0)).toBeNull()
  })
})

describe('composed ROM level graphics', () => {
  let rom: Rom | null = null
  const maps = new Map<number, LevelMap>()

  beforeAll(async () => {
    rom = await loadTestRom({ context: 'level graphics checks' })
    if (!rom) {
      return
    }
    await rom.loadResources()
    for (const levelIndex of [0, 4]) {
      const header = rom.resources
        .getResourcesByType('level-header')
        .find((resource) => resource.levelIndex === levelIndex)
      if (!header) {
        throw new Error(`level header ${levelIndex} was not discovered`)
      }
      maps.set(levelIndex, await loadLevelMap(rom, header.baseAddress))
    }
  })

  test('composes the Woods foreground and independent block art layer', () => {
    if (!rom) {
      console.warn('Skipping test: ROM file not found.')
      return
    }
    const map = maps.get(0)
    const graphics = map?.graphics
    expect(graphics).toBeDefined()
    expect(map?.graphicsError).toBeUndefined()
    expect(graphics?.foreground.width).toBe(3200)
    expect(graphics?.foreground.height).toBe(448)
    expect(graphics?.blocks.width).toBe(graphics?.foreground.width)
    expect(graphics?.blocks.height).toBe(graphics?.foreground.height)
    expect(graphics?.blocks.pixels.some((pixel) => pixel !== 0)).toBe(true)
    expect(graphics?.foreground.pixels[0]).toBe(9)
  })

  test('composes the layered Woods background with its palette', () => {
    if (!rom) {
      console.warn('Skipping test: ROM file not found.')
      return
    }
    expect(maps.get(0)?.background?.format).toBe('layered')
    const background = maps.get(0)?.graphics?.background
    expect(background).toMatchObject({
      format: 'layered',
      backgroundType: 9,
      sourceAddress: 0x6fb56,
      widthTiles: 64,
      heightTiles: 35,
      missingTileCount: 0,
    })
    expect(crc32(background?.image.pixels ?? new Uint8Array())).toBe(0xc11aa2af)
    expect(background?.palette[0]).toEqual([52, 116, 255, 255])
    expect(background?.palette[7]).toEqual([0, 116, 52, 255])
    expect(background?.palette[9]).toEqual([0, 144, 52, 255])
    expect(background?.palette[15]).toEqual([87, 52, 144, 255])
    expect(background?.backdrop).toEqual([52, 116, 255, 255])
  })

  test('composes a chunked background (Cave, type 8)', () => {
    if (!rom) {
      console.warn('Skipping test: ROM file not found.')
      return
    }
    expect(maps.get(4)?.background?.format).toBe('chunked')
    const background = maps.get(4)?.graphics?.background
    expect(background).toMatchObject({
      format: 'chunked',
      backgroundType: 8,
      widthTiles: 50,
      heightTiles: 105,
      missingTileCount: 0,
    })
    expect(crc32(background?.image.pixels ?? new Uint8Array())).toBe(0x784d397c)
  })

  test('composes every discovered level in the original ROM', async () => {
    if (!rom) {
      console.warn('Skipping test: ROM file not found.')
      return
    }
    const headers = [...rom.resources.getResourcesByType('level-header')].sort(
      (left, right) => left.levelIndex - right.levelIndex,
    )
    expect(headers.length).toBeGreaterThan(0)

    for (const header of headers) {
      const map = await loadLevelMap(rom, header.baseAddress)
      expect(map.graphicsError, `level ${header.levelIndex} foreground`).toBeUndefined()
      expect(map.graphics, `level ${header.levelIndex} graphics`).toBeDefined()
      expect(map.graphics?.backgroundError, `level ${header.levelIndex} background`).toBeUndefined()
      expect(map.graphics?.background?.missingTileCount, `level ${header.levelIndex} tiles`).toBe(0)
    }
  })

  test('keeps index 0 transparent when converting the foreground', () => {
    const rgba = indexedTileImageToRgba(
      { width: 2, height: 1, pixels: new Uint8Array([0, 1]) },
      [
        [0, 0, 0, 255],
        [255, 0, 0, 255],
      ],
      { transparentIndexZero: true },
    )
    expect(Array.from(rgba)).toEqual([0, 0, 0, 0, 255, 0, 0, 255])
  })
})
