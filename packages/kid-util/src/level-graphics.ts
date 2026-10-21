import { mdColorToRgba, type KidImageData, type RGBA } from './kid-graphics'
import type {
  LevelBackgroundLayoutRomResourceLoaded,
  LevelHeaderRomResourceLoaded,
  SheetRomResourceLoaded,
} from './kid-resources'
import type { LevelBlockStreamResult, LevelLayoutGrid } from './level-map'
import type { Rom } from './kid-rom'
import { unpackEnigmaFormat } from './unpack-enigma'

/**
 * Level graphics composition from ROM data: theme tiles, the global block dictionary and the
 * per-level background (chunked or layered).
 *
 * ROM evidence:
 *
 * - `research-docs/2026/level-tilemap-and-metatile-reading.md` (skin -> 8-byte metatile mapping, four
 *   VDP name-table words per 16x16 cell).
 * - `research-docs/levels/background-rendering-and-parallax.md` (chunked vs layered backgrounds,
 *   strip list, palette slot placement).
 * - `utils/go-kid/data/tileset.go`, `export/kid-asset.go`, `export/level_background.go` and
 *   `export/aseprite/tileset.go` (reference decoders and palette remap behaviour).
 *
 * The decoders are deliberately address-agnostic: every table/pointer is resolved from
 * `KidDiscovery.knownAddresses`, so ROM hacks that move data still work as long as discovery finds
 * the tables.
 */

/** One 16x16 level cell is four 8x8 hardware tiles. */
const LEVEL_CELL_PIXELS = 16
/** Theme tile mappings and the block dictionary are 8 bytes (four big-endian VDP words). */
const METATILE_BYTES = 8
/** Theme foreground tiles are unpacked to VRAM 0x1780, i.e. VDP tile 0xBC. */
const THEME_TILE_BASE = 0xbc
/** Common block tiles are unpacked to VRAM 0x4400, i.e. VDP tile 0x220. */
const COMMON_BLOCK_TILE_BASE = 0x220
/** A layout skin byte can address at most 256 metatile entries. */
const MAX_METATILE_ENTRIES = 256
/** Layered background planes are 32x28 word grids at 64 bytes per row. */
const LAYERED_PLANE_ROW_WORDS = 32
const LAYERED_PLANE_ROWS = 28
/** A layered band is 64 VDP cells wide (32 from bank 0 + 32 from bank 1). */
const LAYERED_BAND_WORDS = 64
/** Background types 3/5/7/9 use the layered/strip format (header mask 0x02A8). */
const LAYERED_BACKGROUND_MASK = 0x02a8
/** Chunk definitions are small; reject corrupt dimensions before allocating. */
const MAX_CHUNK_TILES = 64 * 64

export type IndexedTileImage = {
  width: number
  height: number
  /** One palette index (0..15) per pixel. */
  pixels: Uint8Array
}

export type ThemePaletteGraphics = {
  address: number
  rawColors: number[]
  /** Pixel index -> CRAM slot from the ROM palette map, or `null` for the identity map. */
  pixelRemap: number[] | null
  /**
   * RGBA colors indexed by the CRAM slot. Theme tile pixels are baked through `pixelRemap` while
   * composing, exactly like `UnpackGFXWithPaletteMap`, so both theme and block pixels index this
   * raw LUT. Index 0 is transparent.
   */
  rgba: RGBA[]
}

export type ThemeTileSetGraphics = {
  address: number
  tileBase: number
  tiles: KidImageData[]
}

export type LevelThemeGraphics = {
  themeIndex: number
  palette: ThemePaletteGraphics
  mappingAddress: number
  mappingEntryCount: number
  tileSet: ThemeTileSetGraphics
  commonBlocks: {
    mappingAddress: number
    mappingEntryCount: number
    tileSet: ThemeTileSetGraphics
    /** Raw-index palette for the block sheet (the ROM does not palette-map it). Index 0 transparent. */
    rgba: RGBA[]
  }
}

export type LevelBackgroundGraphics = {
  format: 'chunked' | 'layered'
  backgroundType: number
  sourceAddress: number
  widthTiles: number
  heightTiles: number
  image: IndexedTileImage
  /** 16-color LUT indexed by the composed image's pixel value. */
  palette: RGBA[]
  backdrop: RGBA
  missingTileCount: number
}

export type LevelGraphics = {
  theme: LevelThemeGraphics
  /** Theme foreground without special-block replacements. */
  foreground: IndexedTileImage
  /** Sparse overlay containing special-block art and its original terrain underlay. */
  blocks: IndexedTileImage
  background?: LevelBackgroundGraphics
  backgroundError?: string
}

function getKnownAddress(rom: Rom, name: Parameters<Rom['discovery']['knownAddresses']['get']>[0]) {
  const address = rom.discovery.knownAddresses.get(name)
  if (address === undefined) {
    throw new Error(`discovery did not find ${name}`)
  }
  return address
}

function readPointer(rom: Rom, address: number, context: string): number {
  if (address <= 0 || address + 4 > rom.bytes.length) {
    throw new Error(`${context}: invalid pointer at 0x${address.toString(16)}`)
  }
  const pointer = rom.readPtr(address)
  if (pointer <= 0 || pointer >= rom.bytes.length) {
    throw new Error(`${context}: pointer at 0x${address.toString(16)} is 0x${pointer.toString(16)}`)
  }
  return pointer
}

function readWord(rom: Rom, address: number): number {
  return rom.data.getUint16(address, false)
}

/**
 * Finds the 16-entry palette maps the ROM applies while unpacking theme tile graphics.
 *
 * `LoadLevelGame` selects a map with `cmpi.w #<theme>,(0xFFFFF8AA).w ; bne.s +4 ; lea map(pc),a3`
 * for foreground tiles (`0xFFFFF8AA`) and the background equivalent (`0xFFFFF8AC`). Searching the
 * instruction sequence keeps this valid for ROM hacks that relocate the tables.
 *
 * ROM: `/rom.bin` LoadLevelGame @ `0x11A0E`; theme foreground maps at `0x1444A` (10), `0x1445A` (9)
 * and `0x1449A` (7); background maps at `0x144BA` (3), `0x144AA` (7) and `0x1448A` (9).
 */
export function findThemePaletteMaps(
  rom: Rom,
  target: 'foreground' | 'background',
): Map<number, number> {
  const memoryLowByte = target === 'foreground' ? 'aa' : 'ac'
  const pattern = `0c 78 00 ?? f8 ${memoryLowByte} 66 04 47 fa ?? ??`
  const maps = new Map<number, number>()
  for (const match of rom.createPatternFinder(pattern).findAll()) {
    const themeIndex = rom.data.getUint8(match + 3)
    const displacement = rom.data.getInt16(match + 10, false)
    const mapAddress = match + 10 + displacement
    if (mapAddress > 0 && mapAddress + 16 <= rom.bytes.length) {
      maps.set(themeIndex, mapAddress)
    }
  }
  return maps
}

const paletteMapCache = new WeakMap<
  Rom,
  { foreground: Map<number, number>; background: Map<number, number> }
>()

/** Cached `findThemePaletteMaps` result; each call scans the whole ROM once. */
export function getThemePaletteMaps(rom: Rom, target: 'foreground' | 'background') {
  let cached = paletteMapCache.get(rom)
  if (!cached) {
    cached = {
      foreground: findThemePaletteMaps(rom, 'foreground'),
      background: findThemePaletteMaps(rom, 'background'),
    }
    paletteMapCache.set(rom, cached)
  }
  return cached[target]
}

/** Reads a 16-entry palette map from ROM. Returns `null` for an identity (or invalid) map. */
export function readPaletteMap(rom: Rom, address: number | undefined): number[] | null {
  if (address === undefined || address <= 0 || address + 16 > rom.bytes.length) {
    return null
  }
  const map: number[] = []
  let isIdentity = true
  for (let i = 0; i < 16; i++) {
    const value = rom.data.getUint8(address + i)
    if (value > 0x0f) {
      return null
    }
    map.push(value)
    if (value !== i) {
      isIdentity = false
    }
  }
  return isIdentity ? null : map
}

async function loadSheet(rom: Rom, address: number, name: string): Promise<SheetRomResourceLoaded> {
  const existing = rom.resources.getResource(address)
  if (existing) {
    if (existing.type !== 'sheet') {
      throw new Error(`resource at 0x${address.toString(16)} is ${existing.type}, expected sheet`)
    }
    const loaded = await rom.resources.getResourceLoaded<'sheet'>(address)
    if (!loaded) {
      throw new Error(`sheet at 0x${address.toString(16)} did not load`)
    }
    return loaded
  }
  rom.resources.createResource(address, 'sheet', {
    packed: { format: 'kid' },
    name,
  })
  const loaded = await rom.resources.getResourceLoaded<'sheet'>(address)
  if (!loaded) {
    throw new Error(`sheet at 0x${address.toString(16)} did not load`)
  }
  return loaded
}

function tileSetFromSheet(address: number, sheet: SheetRomResourceLoaded, tileBase: number) {
  return {
    address,
    tileBase,
    tiles: sheet.tiles,
  } satisfies ThemeTileSetGraphics
}

/**
 * Resolves one theme's foreground graphics: CRAM palette (with its ROM palette map), the theme tile
 * sheet, its 8-byte metatile mapping table and the global special-block dictionary.
 */
export async function loadLevelThemeGraphics(
  rom: Rom,
  themeIndex: number,
  maxSkin: number,
): Promise<LevelThemeGraphics> {
  const themeBlocksTable = getKnownAddress(rom, 'themeBlocksPtrTable')
  const themeMappingsTable = getKnownAddress(rom, 'themeTileMappingsPtrTable')
  const themePaletteTable = getKnownAddress(rom, 'themePaletteWordTable')
  const levelMiscTable = getKnownAddress(rom, 'levelMiscPtrTable')
  const commonBlocksMappings = getKnownAddress(rom, 'commonBlocksMappingsWordTable')

  const themeSheetAddress = readPointer(
    rom,
    themeBlocksTable + themeIndex * 4,
    `theme ${themeIndex} graphics`,
  )
  const mappingAddress = readPointer(
    rom,
    themeMappingsTable + themeIndex * 4,
    `theme ${themeIndex} tile mappings`,
  )
  const paletteOffset = readWord(rom, themePaletteTable + themeIndex * 2)
  const paletteAddress = readPointer(
    rom,
    levelMiscTable + paletteOffset,
    `theme ${themeIndex} palette`,
  )
  const commonBlocksSheetAddress = readPointer(
    rom,
    levelMiscTable + 7 * 4,
    'common blocks graphics',
  )

  const [themeSheet, commonBlocksSheet] = await Promise.all([
    loadSheet(rom, themeSheetAddress, `Theme ${themeIndex} Level Tiles`),
    loadSheet(rom, commonBlocksSheetAddress, 'Common Blocks Graphics'),
  ])

  // LoadLevelGame writes 15 words starting at CRAM line 0, slot 1; slot 0 is the
  // backdrop/transparent index and is not part of this palette data.
  const rawColors: number[] = []
  for (let i = 0; i < 15; i++) {
    rawColors.push(readWord(rom, paletteAddress + i * 2))
  }
  const pixelRemap = readPaletteMap(rom, getThemePaletteMaps(rom, 'foreground').get(themeIndex))
  const rgba: RGBA[] = [[0, 0, 0, 0]]
  for (const color of rawColors) {
    rgba.push(mdColorToRgba(color))
  }

  const mappingEntryCount = Math.max(1, Math.min(MAX_METATILE_ENTRIES, Math.floor(maxSkin) + 1))

  return {
    themeIndex,
    palette: {
      address: paletteAddress,
      rawColors,
      pixelRemap,
      rgba,
    },
    mappingAddress,
    mappingEntryCount,
    tileSet: tileSetFromSheet(themeSheetAddress, themeSheet, THEME_TILE_BASE),
    commonBlocks: {
      mappingAddress: commonBlocksMappings,
      mappingEntryCount: 81,
      tileSet: tileSetFromSheet(
        commonBlocksSheetAddress,
        commonBlocksSheet,
        COMMON_BLOCK_TILE_BASE,
      ),
      rgba,
    },
  }
}

function readMetatile(rom: Rom, mappingAddress: number, index: number): number[] {
  const start = mappingAddress + index * METATILE_BYTES
  if (start < 0 || start + METATILE_BYTES > rom.bytes.length) {
    return []
  }
  return [
    readWord(rom, start),
    readWord(rom, start + 2),
    readWord(rom, start + 4),
    readWord(rom, start + 6),
  ]
}

function getTilePixel(tile: KidImageData, x: number, y: number): number {
  if (x < 0 || y < 0 || x >= tile.width || y >= tile.height) {
    return 0
  }
  const byte = tile.imageData[y * (tile.width / 2) + Math.floor(x / 2)] ?? 0
  return x % 2 === 0 ? byte >> 4 : byte & 0x0f
}

function drawTile(
  image: IndexedTileImage,
  tile: KidImageData | undefined,
  tileX: number,
  tileY: number,
  flipH: boolean,
  flipV: boolean,
  pixelRemap: number[] | null = null,
): void {
  if (!tile) {
    return
  }
  const width = Math.min(8, tile.width)
  const height = Math.min(8, tile.height)
  for (let y = 0; y < height; y++) {
    const destinationY = tileY + (flipV ? height - 1 - y : y)
    if (destinationY < 0 || destinationY >= image.height) {
      continue
    }
    for (let x = 0; x < width; x++) {
      const destinationX = tileX + (flipH ? width - 1 - x : x)
      if (destinationX < 0 || destinationX >= image.width) {
        continue
      }
      const pixel = getTilePixel(tile, x, y)
      image.pixels[destinationY * image.width + destinationX] = pixelRemap
        ? (pixelRemap[pixel] ?? pixel)
        : pixel
    }
  }
}

function copyCell(
  source: IndexedTileImage,
  destination: IndexedTileImage,
  cellX: number,
  cellY: number,
): void {
  const left = cellX * LEVEL_CELL_PIXELS
  const top = cellY * LEVEL_CELL_PIXELS
  for (let y = 0; y < LEVEL_CELL_PIXELS; y++) {
    const row = top + y
    if (row < 0 || row >= source.height || row >= destination.height) {
      continue
    }
    for (let x = 0; x < LEVEL_CELL_PIXELS; x++) {
      const column = left + x
      if (column < 0 || column >= source.width || column >= destination.width) {
        continue
      }
      const index = row * source.width + column
      destination.pixels[index] = source.pixels[index] ?? 0
    }
  }
}

/** Draws one 8-byte metatile at a 16x16 cell. */
function drawMetatile(
  rom: Rom,
  image: IndexedTileImage,
  mappingAddress: number,
  mappingIndex: number,
  tileSet: ThemeTileSetGraphics,
  cellX: number,
  cellY: number,
  pixelRemap: number[] | null,
): boolean {
  const words = readMetatile(rom, mappingAddress, mappingIndex)
  if (words.length !== 4) {
    return false
  }
  const left = cellX * LEVEL_CELL_PIXELS
  const top = cellY * LEVEL_CELL_PIXELS
  const corners = [
    { x: 0, y: 0 },
    { x: 8, y: 0 },
    { x: 0, y: 8 },
    { x: 8, y: 8 },
  ]
  for (let i = 0; i < 4; i++) {
    const word = words[i] ?? 0
    const tileIndex = (word & 0x7ff) - tileSet.tileBase
    const tile = tileSet.tiles[tileIndex]
    if (!tile) {
      continue
    }
    const corner = corners[i] ?? { x: 0, y: 0 }
    drawTile(
      image,
      tile,
      left + corner.x,
      top + corner.y,
      (word & 0x0800) !== 0,
      (word & 0x1000) !== 0,
      pixelRemap,
    )
  }
  return true
}

function directionMask(block: {
  dirUp: boolean
  dirRight: boolean
  dirDown: boolean
  dirLeft: boolean
}): number {
  return (
    (block.dirUp ? 0x1 : 0) |
    (block.dirRight ? 0x2 : 0) |
    (block.dirDown ? 0x4 : 0) |
    (block.dirLeft ? 0x8 : 0)
  )
}

/**
 * Special-block skin(s) written into `Level_Layout` by `LoadLevelBlocks`, value -> block mapping
 * entry. `null` means the placement has no visual replacement (collision modifiers) or is not
 * visible initially (hidden blocks).
 *
 * ROM: `research-docs/2026/level-layout-construction-and-collision-semantics.md` §Block types.
 */
export function blockSkinsForPlacement(
  block: LevelBlockStreamResult['blocks'][number],
  underlyingSkin: number,
): { skin: number; offsetX: number; offsetY: number }[] | null {
  if (block.isHidden) {
    return null
  }
  switch (block.kind) {
    case 0x00: // Rock: 0xE001 -> skin 0x01
      return [{ skin: 0x01, offsetX: 0, offsetY: 0 }]
    case 0x01: // Prize: disguised 0xE101 (rock look), visible 0xE102
      return [{ skin: block.isDisguised ? 0x01 : 0x02, offsetX: 0, offsetY: 0 }]
    case 0x02: // Ice: 0xE203 -> skin 0x03
      return [{ skin: 0x03, offsetX: 0, offsetY: 0 }]
    case 0x03: // Ghost: initial 0xE304 -> skin 0x04
      return [{ skin: 0x04, offsetX: 0, offsetY: 0 }]
    case 0x04: // Telepad: 0xE407 / 0xE408 -> skins 0x07 / 0x08
      return [
        { skin: 0x07, offsetX: 0, offsetY: 0 },
        { skin: 0x08, offsetX: 1, offsetY: 0 },
      ]
    case 0x05: // Steel: 0xE50B -> skin 0x0B
      return [{ skin: 0x0b, offsetX: 0, offsetY: 0 }]
    case 0x06: // Rubber: 0xE60C over empty terrain, 0xE60E over existing terrain
      return [{ skin: underlyingSkin === 0 ? 0x0c : 0x0e, offsetX: 0, offsetY: 0 }]
    case 0x07: // Shifting: 0xE710 -> skin 0x10
      return [{ skin: 0x10, offsetX: 0, offsetY: 0 }]
    case 0x09: // Mushroom: CommonBlockValueTable[9] selects dictionary entry 25.
      // ROM: /rom.bin 0x000122D8 CommonBlockValueTable stores 0xE919 for type 0x09;
      // its low byte 0x19 selects block dictionary entry 25 (one 16x16 cell).
      return [{ skin: 0x19, offsetX: 0, offsetY: 0 }]
    case 0x0a: // Vanishing/cannon: 0xEA1C + direction mask
      return [{ skin: 0x1c + directionMask(block), offsetX: 0, offsetY: 0 }]
    case 0x0b: // Lift: 0xEB2C -> skin 0x2C
      return [{ skin: 0x2c, offsetX: 0, offsetY: 0 }]
    case 0x0c: // Drill: 0xEC2D + direction mask
      return [{ skin: 0x2d + directionMask(block), offsetX: 0, offsetY: 0 }]
    default:
      // 0x10 changes collision only; 0x08/0x0D/0x0E/0x0F are unused by valid levels.
      return null
  }
}

/**
 * Composes the theme foreground at 16x16 cells (one cell = four 8x8 theme tiles).
 *
 * The output is palette-indexed and uses the theme tileset's pixel space; convert with
 * `theme.palette.rgba` (themes tiles) and `theme.commonBlocks.rgba` (blocks) — but both share the
 * same CRAM line 0, so a single RGBA LUT is enough at draw time.
 */
export function composeLevelForeground(
  rom: Rom,
  theme: LevelThemeGraphics,
  layout: LevelLayoutGrid,
): IndexedTileImage {
  const width = layout.widthBlocks * LEVEL_CELL_PIXELS
  const height = layout.heightBlocks * LEVEL_CELL_PIXELS
  const image: IndexedTileImage = {
    width,
    height,
    pixels: new Uint8Array(width * height),
  }

  const streamStart = layout.emptyRowCount * layout.widthBlocks
  const streamEnd = streamStart + layout.copiedByteCount
  for (let y = 0; y < layout.heightBlocks; y++) {
    for (let x = 0; x < layout.widthBlocks; x++) {
      const index = y * layout.widthBlocks + x
      if (index < streamStart || index >= streamEnd) {
        continue
      }
      const skin = layout.cells[index] ?? 0
      drawMetatile(
        rom,
        image,
        theme.mappingAddress,
        skin,
        theme.tileSet,
        x,
        y,
        theme.palette.pixelRemap,
      )
    }
  }

  return image
}

/** Composes special-block art as a transparent overlay, keeping each placed block independently toggleable. */
export function composeLevelBlockLayer(
  rom: Rom,
  theme: LevelThemeGraphics,
  layout: LevelLayoutGrid,
  foreground: IndexedTileImage,
  blockStream: LevelBlockStreamResult | undefined,
): IndexedTileImage {
  const image: IndexedTileImage = {
    width: foreground.width,
    height: foreground.height,
    pixels: new Uint8Array(foreground.pixels.length),
  }

  for (const block of blockStream?.blocks ?? []) {
    if (
      block.x < 0 ||
      block.y < 0 ||
      block.x >= layout.widthBlocks ||
      block.y >= layout.heightBlocks
    ) {
      continue
    }
    const underlying = layout.cells[block.y * layout.widthBlocks + block.x] ?? 0
    const skins = blockSkinsForPlacement(block, underlying)
    if (!skins) {
      continue
    }
    for (const entry of skins) {
      const cellX = block.x + entry.offsetX
      const cellY = block.y + entry.offsetY
      if (cellX < 0 || cellY < 0 || cellX >= layout.widthBlocks || cellY >= layout.heightBlocks) {
        continue
      }
      // Restore the underlying terrain into the overlay before painting the block, so enabling
      // Blocks matches the original replacement while disabling it reveals the untouched layout.
      copyCell(foreground, image, cellX, cellY)
      drawMetatile(
        rom,
        image,
        theme.commonBlocks.mappingAddress,
        entry.skin,
        theme.commonBlocks.tileSet,
        cellX,
        cellY,
        null,
      )
    }
  }

  return image
}

function backgroundHeightTiles(header: LevelHeaderRomResourceLoaded): number {
  const levelHeightTiles = (header.yOffset * 2 + header.height * 14) * 2
  return (levelHeightTiles >> 2) + 0x15
}

function readUint32(rom: Rom, address: number): number {
  if (address <= 0 || address + 4 > rom.bytes.length) {
    return 0
  }
  return rom.data.getUint32(address, false)
}

function readUint16(rom: Rom, address: number): number {
  if (address <= 0 || address + 2 > rom.bytes.length) {
    return 0
  }
  return rom.data.getUint16(address, false)
}

function readUint8(rom: Rom, address: number): number {
  if (address <= 0 || address >= rom.bytes.length) {
    return 0
  }
  return rom.data.getUint8(address)
}

type BackgroundTileSheets = {
  primary: ThemeTileSetGraphics
  fallback: ThemeTileSetGraphics[]
}

async function loadBackgroundSheets(
  rom: Rom,
  backgroundType: number,
  tileBase: number,
): Promise<BackgroundTileSheets> {
  const table = getKnownAddress(rom, 'themeBackgroundPtrTable')
  const primaryAddress = readPointer(rom, table + backgroundType * 4, 'background graphics')

  const candidateAddresses = new Set<number>([primaryAddress])
  // Entry 11 is the common background sheet in the original ROM; entries 0 and 12/13 cover the
  // default and Hills' alternate art. Load them lazily as fallbacks, in a deterministic order.
  for (const index of [0, 11, 12, 13]) {
    const address = readUint32(rom, table + index * 4)
    if (address > 0 && address < rom.bytes.length) {
      candidateAddresses.add(address)
    }
  }

  const ordered = [...candidateAddresses].filter((address) => address === primaryAddress)
  for (const address of candidateAddresses) {
    if (!ordered.includes(address)) {
      ordered.push(address)
    }
  }

  let primary: ThemeTileSetGraphics | undefined
  const fallback: ThemeTileSetGraphics[] = []
  for (const address of ordered) {
    try {
      const sheet = await loadSheet(rom, address, `Background Graphics 0x${address.toString(16)}`)
      const tileSet = tileSetFromSheet(address, sheet, tileBase)
      if (address === primaryAddress) {
        primary = tileSet
      } else {
        fallback.push(tileSet)
      }
    } catch {
      // A missing optional sheet only reduces the number of resolvable tiles.
    }
  }
  if (!primary) {
    throw new Error(`background graphics at 0x${primaryAddress.toString(16)} did not load`)
  }
  return { primary, fallback }
}

function resolveBackgroundTile(
  sheets: BackgroundTileSheets,
  tileId: number,
): KidImageData | undefined {
  return (
    sheets.primary.tiles[tileId] ??
    sheets.fallback.find((sheet) => sheet.tiles[tileId])?.tiles[tileId]
  )
}

function loadBackgroundPalette(
  rom: Rom,
  backgroundType: number,
): { palette: RGBA[]; backdrop: RGBA } {
  const table = getKnownAddress(rom, 'themeBackgroundPaletteWordTable')
  const levelMiscTable = getKnownAddress(rom, 'levelMiscPtrTable')
  const offset = readUint16(rom, table + backgroundType * 2)
  const paletteAddress = readPointer(rom, levelMiscTable + offset, 'background palette')
  const words: number[] = []
  for (let i = 0; i < 8; i++) {
    words.push(readWord(rom, paletteAddress + i * 2))
  }

  // ROM LoadLevelGame @ 0x11E16: W[0] is the screen backdrop; W[1..7] go to CRAM line-1 slots
  // 9..15. Background tile pixels are remapped to those slots (identity except themes 3/7/9).
  const slots = new Array<number>(16).fill(0)
  for (let i = 0; i < 7; i++) {
    slots[9 + i] = words[i + 1] ?? 0
  }
  // ROM FixSpecificBackgroundPalette @ 0x129AE: Woods swaps line-1 slots 8 and 10.
  if (backgroundType === 9) {
    const slot8 = slots[8] ?? 0
    slots[8] = slots[10] ?? 0
    slots[10] = slot8
  }
  const pixelRemap = readPaletteMap(rom, getThemePaletteMaps(rom, 'background').get(backgroundType))
  const palette = new Array<RGBA>(16)
  for (let i = 0; i < 16; i++) {
    const slot = (pixelRemap?.[i] ?? i) & 0x0f
    palette[i] = mdColorToRgba(slot === 0 ? (words[0] ?? 0) : (slots[slot] ?? 0))
  }
  return { palette, backdrop: mdColorToRgba(words[0] ?? 0) }
}

function pasteChunk(
  cells: Uint8Array,
  widthTiles: number,
  heightTiles: number,
  chunk: { width: number; height: number; tiles: Uint8Array },
  destinationX: number,
  destinationY: number,
): void {
  for (let y = 0; y < chunk.height; y++) {
    const targetY = destinationY + y
    if (targetY < 0 || targetY >= heightTiles) {
      continue
    }
    for (let x = 0; x < chunk.width; x++) {
      const targetX = destinationX + x
      if (targetX < 0 || targetX >= widthTiles) {
        continue
      }
      cells[targetY * widthTiles + targetX] = chunk.tiles[y * chunk.width + x] ?? 0
    }
  }
}

function drawBackgroundCells(
  image: IndexedTileImage,
  cells: Uint8Array,
  widthTiles: number,
  heightTiles: number,
  sheets: BackgroundTileSheets,
): number {
  let missing = 0
  for (let y = 0; y < heightTiles; y++) {
    for (let x = 0; x < widthTiles; x++) {
      const value = cells[y * widthTiles + x] ?? 0
      const tileId = value & 0x7f
      const tile = resolveBackgroundTile(sheets, tileId)
      if (!tile) {
        missing++
        continue
      }
      drawTile(image, tile, x * 8, y * 8, (value & 0x80) !== 0, false)
    }
  }
  return missing
}

async function composeChunkedBackground(
  rom: Rom,
  header: LevelHeaderRomResourceLoaded,
  background: LevelBackgroundLayoutRomResourceLoaded,
  backgroundType: number,
): Promise<LevelBackgroundGraphics | undefined> {
  const widthTiles = header.width * 10 + 0x1e
  const heightTiles = backgroundHeightTiles(header)
  if (widthTiles <= 0 || heightTiles <= 0) {
    return undefined
  }

  const planeTable = getKnownAddress(rom, 'themeBackgroundPlanePtrTable')
  const chunkTable = readUint32(rom, planeTable + backgroundType * 4)
  if (chunkTable <= 0 || chunkTable >= rom.bytes.length) {
    return undefined
  }

  const cells = new Uint8Array(widthTiles * heightTiles)
  const xShift = background.indirect?.xShiftRaw ?? 0
  const yShift = background.indirect?.yShiftRaw ?? 0
  for (const placement of background.placements) {
    const chunkAddress = readUint32(rom, chunkTable + placement.chunkIndexRaw * 4)
    if (chunkAddress <= 0 || chunkAddress + 4 > rom.bytes.length) {
      continue
    }
    const chunkWidth = readUint16(rom, chunkAddress)
    const chunkHeight = readUint16(rom, chunkAddress + 2)
    const tileCount = chunkWidth * chunkHeight
    if (chunkWidth <= 0 || chunkHeight <= 0 || tileCount > MAX_CHUNK_TILES) {
      continue
    }
    if (chunkAddress + 4 + tileCount > rom.bytes.length) {
      continue
    }
    const tiles = rom.bytes.subarray(chunkAddress + 4, chunkAddress + 4 + tileCount)
    pasteChunk(
      cells,
      widthTiles,
      heightTiles,
      { width: chunkWidth, height: chunkHeight, tiles },
      placement.xRaw - xShift,
      placement.yRaw - yShift,
    )
  }

  const sheets = await loadBackgroundSheets(rom, backgroundType, 0)
  const image: IndexedTileImage = {
    width: widthTiles * 8,
    height: heightTiles * 8,
    pixels: new Uint8Array(widthTiles * 8 * heightTiles * 8),
  }
  const missingTileCount = drawBackgroundCells(image, cells, widthTiles, heightTiles, sheets)
  const { palette, backdrop } = loadBackgroundPalette(rom, backgroundType)
  return {
    format: 'chunked',
    backgroundType,
    sourceAddress: header.backgroundDataPtr,
    widthTiles,
    heightTiles,
    image,
    palette,
    backdrop,
    missingTileCount,
  }
}

function decodeEnigmaPlane(rom: Rom, address: number): Uint16Array | undefined {
  if (address <= 0 || address >= rom.bytes.length) {
    return undefined
  }
  try {
    const { output } = unpackEnigmaFormat(rom.bytes.subarray(address), 0, 0)
    const view = new DataView(output.buffer, output.byteOffset, output.byteLength)
    const words = new Uint16Array(Math.floor(output.length / 2))
    for (let i = 0; i < words.length; i++) {
      words[i] = view.getUint16(i * 2, false)
    }
    return words
  } catch {
    return undefined
  }
}

function layeredPlaneRow(plane: Uint16Array | undefined, row: number): Uint16Array | undefined {
  if (!plane || row < 0 || row >= LAYERED_PLANE_ROWS) {
    return undefined
  }
  const start = row * LAYERED_PLANE_ROW_WORDS
  if (start + LAYERED_PLANE_ROW_WORDS > plane.length) {
    return undefined
  }
  return plane.subarray(start, start + LAYERED_PLANE_ROW_WORDS)
}

async function composeLayeredBackground(
  rom: Rom,
  header: LevelHeaderRomResourceLoaded,
  backgroundType: number,
): Promise<LevelBackgroundGraphics | undefined> {
  const widthTiles = LAYERED_BAND_WORDS
  const heightTiles = backgroundHeightTiles(header)
  if (heightTiles <= 0) {
    return undefined
  }

  const planeTable = getKnownAddress(rom, 'themeBackgroundPlanePtrTable')
  const subTable = readUint32(rom, planeTable + backgroundType * 4)
  if (subTable <= 0 || subTable >= rom.bytes.length) {
    return undefined
  }
  const planes: (Uint16Array | undefined)[] = []
  for (let i = 0; i < 3; i++) {
    planes.push(decodeEnigmaPlane(rom, readUint32(rom, subTable + i * 4)))
  }
  if (!planes[0] && !planes[1] && !planes[2]) {
    return undefined
  }

  const sheets = await loadBackgroundSheets(rom, backgroundType, 0)
  let plane2Sheets = sheets
  if (backgroundType === 3) {
    // ROM LoadLevelGame @ 0x12976: Hills' `strip >= 0x1c` bands use the separate hill_alt art.
    const table = getKnownAddress(rom, 'themeBackgroundPtrTable')
    const altAddress = readUint32(rom, table + 13 * 4)
    if (altAddress > 0 && altAddress < rom.bytes.length) {
      try {
        const altSheet = await loadSheet(rom, altAddress, 'Hills Alternate Background')
        plane2Sheets = {
          primary: tileSetFromSheet(altAddress, altSheet, 0),
          fallback: [sheets.primary, ...sheets.fallback],
        }
      } catch {
        // Keep the theme sheet when the alternate art is unavailable.
      }
    }
  }

  const image: IndexedTileImage = {
    width: widthTiles * 8,
    height: heightTiles * 8,
    pixels: new Uint8Array(widthTiles * 8 * heightTiles * 8),
  }

  // ROM UpdateBackgroundPlaneAndScroll @ 0x3038A: strip = BackgroundData[band+1]; Desert skips
  // byte 1 as well. strip < 0x1c selects bank0/bank1 rows; higher values select bank2.
  const skip = backgroundType === 5 ? 2 : 1
  let missingTileCount = 0
  for (let row = 0; row < heightTiles; row++) {
    const strip = readUint8(rom, header.backgroundDataPtr + skip + row)
    let band: Uint16Array
    let bandSheets = sheets
    if (strip < 0x1c) {
      band = new Uint16Array(LAYERED_BAND_WORDS)
      const left = layeredPlaneRow(planes[0], strip)
      const right = layeredPlaneRow(planes[1], strip)
      if (left) {
        band.set(left, 0)
      }
      if (right) {
        band.set(right, LAYERED_PLANE_ROW_WORDS)
      }
    } else {
      bandSheets = plane2Sheets
      const source = layeredPlaneRow(planes[2], strip - 0x1c)
      band = new Uint16Array(LAYERED_BAND_WORDS)
      if (source) {
        band.set(source, 0)
        band.set(source, LAYERED_PLANE_ROW_WORDS)
      }
    }

    for (let x = 0; x < LAYERED_BAND_WORDS; x++) {
      const word = band[x] ?? 0
      const tile = resolveBackgroundTile(bandSheets, word & 0x7ff)
      if (!tile) {
        if (word !== 0) {
          missingTileCount++
        }
        continue
      }
      drawTile(image, tile, x * 8, row * 8, (word & 0x0800) !== 0, (word & 0x1000) !== 0)
    }
  }

  const { palette, backdrop } = loadBackgroundPalette(rom, backgroundType)
  return {
    format: 'layered',
    backgroundType,
    sourceAddress: header.backgroundDataPtr,
    widthTiles,
    heightTiles,
    image,
    palette,
    backdrop,
    missingTileCount,
  }
}

/**
 * Composes a level's background art.
 *
 * The format is selected by the header background type mask (0x02A8), not by the
 * `backgroundIsPacked` name used by the resource loader: types 3/5/7/9 are the layered strip format
 * and the rest are chunk placements.
 */
export async function composeLevelBackground(
  rom: Rom,
  header: LevelHeaderRomResourceLoaded,
  background: LevelBackgroundLayoutRomResourceLoaded | undefined,
): Promise<LevelBackgroundGraphics | undefined> {
  if (!background) {
    return undefined
  }
  const backgroundType = header.backgroundType
  if (backgroundType < 0 || backgroundType > 10) {
    return undefined
  }
  const isLayered = ((1 << backgroundType) & LAYERED_BACKGROUND_MASK) !== 0
  if (isLayered) {
    return composeLayeredBackground(rom, header, backgroundType)
  }
  return composeChunkedBackground(rom, header, background, backgroundType)
}

/**
 * Loads and composes every ROM graphic needed by one level map. Foreground failures are fatal for
 * the graphics layer (the viewer keeps its generated-colour fallback); background failures are
 * reported through `backgroundError` so terrain still renders.
 */
export async function loadLevelGraphics(
  rom: Rom,
  header: LevelHeaderRomResourceLoaded,
  layout: LevelLayoutGrid,
  blockStream: LevelBlockStreamResult | undefined,
  background: LevelBackgroundLayoutRomResourceLoaded | undefined,
): Promise<LevelGraphics> {
  let maxSkin = 0
  for (let i = 0; i < layout.cells.length; i++) {
    const value = layout.cells[i] ?? 0
    if (value > maxSkin) {
      maxSkin = value
    }
  }

  const theme = await loadLevelThemeGraphics(rom, header.themeIndex, maxSkin)
  const foreground = composeLevelForeground(rom, theme, layout)
  const blocks = composeLevelBlockLayer(rom, theme, layout, foreground, blockStream)

  let backgroundGraphics: LevelBackgroundGraphics | undefined
  let backgroundError: string | undefined
  try {
    backgroundGraphics = await composeLevelBackground(rom, header, background)
  } catch (error) {
    backgroundError = error instanceof Error ? error.message : String(error)
  }

  return {
    theme,
    foreground,
    blocks,
    background: backgroundGraphics,
    backgroundError,
  }
}

/** Converts an indexed image to RGBA using a 16-entry palette. */
export function indexedTileImageToRgba(
  image: IndexedTileImage,
  palette: RGBA[],
  options: { transparentIndexZero?: boolean } = {},
): Uint8ClampedArray {
  const rgba = new Uint8ClampedArray(image.width * image.height * 4)
  for (let pixel = 0; pixel < image.pixels.length; pixel++) {
    const index = (image.pixels[pixel] ?? 0) & 0x0f
    const color = palette[index] ?? [0, 0, 0, 255]
    const offset = pixel * 4
    rgba[offset] = color[0]
    rgba[offset + 1] = color[1]
    rgba[offset + 2] = color[2]
    rgba[offset + 3] = options.transparentIndexZero && index === 0 ? 0 : color[3]
  }
  return rgba
}
