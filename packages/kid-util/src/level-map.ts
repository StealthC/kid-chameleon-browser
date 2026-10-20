import type { Rom } from './kid-rom'
import {
  type AllRomResourcesLoaded,
  type LevelBackgroundLayoutRomResourceLoaded,
  type LevelEnemyLayoutRomResourceLoaded,
  type LevelHeaderRomResourceLoaded,
  type LevelObjectsHeaderRomResourceLoaded,
  type LevelTitleCardRomResourceLoaded,
  type LoadedResourceOfType,
} from './kid-resources'

/**
 * Level map helpers: reshape the foreground layout stream into a grid, decode the block bitstream
 * and compose everything the browser needs for one level.
 *
 * ROM evidence:
 *
 * - `research-docs/levels/level-data-format.md` (header fields, grid dimensions, block stream)
 * - `utils/go-kid/data/level.go` `ReadBlockDataFromAddress` (bitstream reference decoder)
 * - `utils/go-kid/export/kid-asset.go` `GridDimensions` / `BuildLevelGrid` (grid reshaping)
 * - `Research docs` shift rule: `ShiftLevelLayoutForYOffset` @ ROM `0x140F6` moves the loaded stream
 *   down by `yOffset * 2` rows, leaving the top rows blank.
 */

export const LEVEL_CELL_SIZE = 16
/** Width in 16x16 cells of one Genesis screen (320px). ROM: level-data-format.md */
export const LEVEL_SCREEN_WIDTH_BLOCKS = 20
/** Height in 16x16 cells of one Genesis screen (224px). ROM: level-data-format.md */
export const LEVEL_SCREEN_HEIGHT_BLOCKS = 14

export const LEVEL_BLOCK_KIND_NAMES: Record<number, string> = {
  0x00: 'Rock',
  0x01: 'Prize',
  0x02: 'Ice',
  0x03: 'Ghost',
  0x04: 'Telepad',
  0x05: 'Steel',
  0x06: 'Rubber',
  0x07: 'Shifting',
  0x08: 'Unknown (not decoded)',
  0x09: 'Mushroom',
  0x0a: 'Vanishing',
  0x0b: 'Lift',
  0x0c: 'Drill',
  0x0d: 'Unknown (not decoded)',
  0x0e: 'Unknown (not decoded)',
  0x0f: 'Unknown (not decoded)',
  0x10: 'Collision modifier',
}

/**
 * Block kinds the reference decoder handles. Types 0x08, 0x0D, 0x0E and 0x0F have no parsing rule
 * in `utils/go-kid/data/level.go` (it returns "invalid block type"), so the stream cannot be
 * decoded past the first one. Types 0x11+ are outside the 5-bit kind field.
 */
export const LEVEL_DECODED_BLOCK_KINDS = [
  0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x09, 0x0a, 0x0b, 0x0c, 0x10,
] as const

export function levelBlockKindName(kind: number): string {
  return LEVEL_BLOCK_KIND_NAMES[kind] ?? `Unknown 0x${kind.toString(16).padStart(2, '0')}`
}

export type LevelGridDimensions = {
  widthBlocks: number
  heightBlocks: number
  /** Rows stored in the compressed stream (`heightInScreens * 14`). */
  streamRowCount: number
  /** Blank rows the loader inserts above the stream (`yOffset * 2`). */
  emptyRowCount: number
}

/**
 * Final 16x16 cell grid size for a level header.
 *
 * ROM: `research-docs/levels/level-data-format.md` §HeightAndYOffset Reference:
 * `utils/go-kid/export/kid-asset.go` `GridDimensions`.
 */
export function levelGridDimensions(
  widthInScreens: number,
  heightInScreens: number,
  yOffset: number,
): LevelGridDimensions {
  const streamRowCount = heightInScreens * LEVEL_SCREEN_HEIGHT_BLOCKS
  const emptyRowCount = yOffset * 2
  return {
    widthBlocks: widthInScreens * LEVEL_SCREEN_WIDTH_BLOCKS,
    heightBlocks: emptyRowCount + streamRowCount,
    streamRowCount,
    emptyRowCount,
  }
}

export type LevelLayoutGrid = {
  widthBlocks: number
  heightBlocks: number
  /** Row-major, one byte per 16x16 cell. Colour/skin index, not a decoded ROM graphic. */
  cells: Uint8Array
  emptyRowCount: number
  /** Bytes copied from the decompressed layout stream into the grid. */
  copiedByteCount: number
  /** Grid cells past the end of the stream; the ROM reads stale RAM there. */
  missingByteCount: number
  /** True when the stream length matches `widthBlocks * streamRowCount`. */
  consistent: boolean
}

/**
 * Reshapes the decompressed foreground layout stream into the final row-major grid, applying the
 * `yOffset` blank rows. A short stream leaves the remaining cells at 0 and is reported as
 * `consistent: false`; extra bytes are ignored (the ROM reads exactly the grid size).
 *
 * ROM: `ShiftLevelLayoutForYOffset` @ `0x140F6`; reference `BuildLevelGrid` in go-kid.
 */
export function buildLevelLayoutGrid(
  layout: Uint8Array,
  dimensions: LevelGridDimensions,
): LevelLayoutGrid {
  const { widthBlocks, heightBlocks, streamRowCount, emptyRowCount } = dimensions
  const expectedStreamBytes = widthBlocks * streamRowCount
  if (widthBlocks <= 0 || heightBlocks <= 0) {
    return {
      widthBlocks: 0,
      heightBlocks: 0,
      cells: new Uint8Array(0),
      emptyRowCount: 0,
      copiedByteCount: 0,
      missingByteCount: 0,
      consistent: false,
    }
  }

  const cells = new Uint8Array(widthBlocks * heightBlocks)
  const destinationStart = emptyRowCount * widthBlocks
  const available = cells.length - destinationStart
  const copiedByteCount = Math.min(layout.length, available)
  cells.set(layout.subarray(0, copiedByteCount), destinationStart)

  return {
    widthBlocks,
    heightBlocks,
    cells,
    emptyRowCount,
    copiedByteCount,
    missingByteCount: Math.max(0, available - copiedByteCount),
    consistent: layout.length === expectedStreamBytes,
  }
}

export type LevelBlockPlacement = {
  kind: number
  x: number
  y: number
  isHidden: boolean
  isDisguised: boolean
  prize: number
  warpMap: number
  warpX: number
  warpY: number
  dirUp: boolean
  dirRight: boolean
  dirDown: boolean
  dirLeft: boolean
  collisionMod: number
  startDelay: number
  initialFrame?: number
  visibleDuration: number
  hiddenDuration: number
}

export type DecodeLevelBlocksOptions = {
  /** When set, placements outside this grid are counted in `outOfGridCount`. */
  widthBlocks?: number
  heightBlocks?: number
  /** Safety budget so a corrupt stream cannot hang the browser. */
  maxBlocks?: number
}

export type LevelBlockStreamResult = {
  blocks: LevelBlockPlacement[]
  xBits: number
  yBits: number
  bitsRead: number
  bytesRead: number
  outOfGridCount: number
  /** True when the 0x1F end-of-stream marker was reached. */
  complete: boolean
  /** Present when decoding stopped early; `blocks` then holds the placements read so far. */
  error?: string
}

class MsbBitReader {
  private bitPosition = 0

  constructor(private readonly bytes: Uint8Array) {}

  get position(): number {
    return this.bitPosition
  }

  get bitLength(): number {
    return this.bytes.length * 8
  }

  readBits(count: number): number {
    if (count === 0) {
      return 0
    }
    if (this.bitPosition + count > this.bitLength) {
      throw new Error(
        `block stream truncated: need ${count} bits at bit ${this.bitPosition} of ${this.bitLength}`,
      )
    }
    let value = 0
    for (let i = 0; i < count; i++) {
      const absolute = this.bitPosition + i
      const bit = (this.bytes[absolute >> 3] >> (7 - (absolute & 7))) & 1
      value = (value << 1) | bit
    }
    this.bitPosition += count
    return value
  }

  readBool(): boolean {
    return this.readBits(1) === 1
  }
}

function emptyBlockPlacement(): LevelBlockPlacement {
  return {
    kind: 0,
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
  }
}

/**
 * Decodes the `BlocksAddress` bitstream (level block placements).
 *
 * Reference: `utils/go-kid/data/level.go` `ReadBlockDataFromAddress`. The format is not part of the
 * browser's own discovery; it is a port of the exporter the remake already consumes, and is
 * documented in `research-docs/levels/level-data-format.md` §Block Layout Format.
 *
 * Layout: magic byte 0x40, then one byte with `xBits` in the high nibble and `yBits` in the low
 * nibble (as read by the MSB-first reference reader), then repeated groups of `isHidden` (1 bit) +
 * `kind` (5 bits). `kind == 0x1F` ends the stream. Blocks sharing a cell replace the earlier
 * placement, matching the reference decoder.
 */
export function decodeLevelBlocks(
  data: Uint8Array,
  options: DecodeLevelBlocksOptions = {},
): LevelBlockStreamResult {
  const { widthBlocks, heightBlocks, maxBlocks = 20_000 } = options
  const reader = new MsbBitReader(data)
  const blocks: LevelBlockPlacement[] = []
  let xBits = 0
  let yBits = 0
  let outOfGridCount = 0
  let complete = false

  const result = (error?: string): LevelBlockStreamResult => ({
    blocks,
    xBits,
    yBits,
    bitsRead: reader.position,
    bytesRead: Math.ceil(reader.position / 8),
    outOfGridCount,
    complete,
    error,
  })

  const addBlock = (block: LevelBlockPlacement) => {
    if (
      (widthBlocks !== undefined && (block.x < 0 || block.x >= widthBlocks)) ||
      (heightBlocks !== undefined && (block.y < 0 || block.y >= heightBlocks))
    ) {
      outOfGridCount++
    }
    const existingIndex = blocks.findIndex((entry) => entry.x === block.x && entry.y === block.y)
    if (existingIndex >= 0) {
      blocks[existingIndex] = block
    } else {
      blocks.push(block)
    }
  }

  try {
    const magic = reader.readBits(8)
    if (magic !== 0x40) {
      return result(
        `invalid block data magic 0x${magic.toString(16).padStart(2, '0')}, expected 0x40`,
      )
    }
    xBits = reader.readBits(4)
    yBits = reader.readBits(4)
    if (xBits === 0 || yBits === 0) {
      return result(`invalid coordinate bit counts (xBits=${xBits}, yBits=${yBits})`)
    }

    /** Reads a run of `count` cells starting at (startX, startY). */
    const readRun = (
      startX: number,
      startY: number,
      count: number,
      isColumn: boolean,
      apply: (block: LevelBlockPlacement) => void,
    ) => {
      for (let i = 0; i < count; i++) {
        const block = emptyBlockPlacement()
        block.x = isColumn ? startX : startX + i
        block.y = isColumn ? startY + i : startY
        apply(block)
        addBlock(block)
      }
    }

    const readCommon = (kind: number, isHidden: boolean) => {
      for (;;) {
        const startX = reader.readBits(xBits)
        if (startX === (1 << xBits) - 1) {
          return
        }
        const startY = reader.readBits(yBits)
        const count = reader.readBits(4) + 1
        const isColumn = reader.readBool()
        readRun(startX, startY, count, isColumn, (block) => {
          block.kind = kind
          block.isHidden = isHidden
        })
      }
    }

    const readPrize = (kind: number, isHidden: boolean) => {
      for (;;) {
        const startX = reader.readBits(xBits)
        if (startX === (1 << xBits) - 1) {
          return
        }
        const startY = reader.readBits(yBits)
        const count = reader.readBits(4) + 1
        const isColumn = reader.readBool()
        for (let i = 0; i < count; i++) {
          const block = emptyBlockPlacement()
          block.kind = kind
          block.isHidden = isHidden
          block.isDisguised = reader.readBool()
          block.prize = reader.readBits(4)
          block.x = isColumn ? startX : startX + i
          block.y = isColumn ? startY + i : startY
          addBlock(block)
        }
      }
    }

    const readTimer = (kind: number, isHidden: boolean) => {
      for (;;) {
        const startX = reader.readBits(xBits)
        if (startX === (1 << xBits) - 1) {
          return
        }
        const startY = reader.readBits(yBits)
        const count = reader.readBits(3) + 1
        const isColumn = reader.readBool()
        const startDelay = reader.readBits(8)
        // Read by the reference decoder but not yet explained; exposed as `initialFrame`.
        const initialFrame = reader.readBits(3)
        const visibleDuration = reader.readBits(8)
        const hiddenDuration = reader.readBits(8)
        readRun(startX, startY, count, isColumn, (block) => {
          block.kind = kind
          block.isHidden = isHidden
          block.startDelay = startDelay
          block.initialFrame = initialFrame
          block.visibleDuration = visibleDuration
          block.hiddenDuration = hiddenDuration
        })
      }
    }

    const readTelepad = (kind: number, isHidden: boolean) => {
      for (;;) {
        const startX = reader.readBits(xBits)
        if (startX === (1 << xBits) - 1) {
          return
        }
        const startY = reader.readBits(yBits)
        // The reference decoder increments the raw map index before exporting it.
        const warpMap = reader.readBits(8) + 1
        const warpY = reader.readBits(8)
        const warpX = reader.readBits(9)
        const block = emptyBlockPlacement()
        block.kind = kind
        block.isHidden = isHidden
        block.x = startX
        block.y = startY
        block.warpMap = warpMap
        block.warpX = warpX
        block.warpY = warpY
        addBlock(block)
      }
    }

    const readDirection = (kind: number, isHidden: boolean) => {
      for (;;) {
        const startX = reader.readBits(xBits)
        if (startX === (1 << xBits) - 1) {
          return
        }
        const startY = reader.readBits(yBits)
        const count = reader.readBits(4) + 1
        const isColumn = reader.readBool()
        for (let i = 0; i < count; i++) {
          const block = emptyBlockPlacement()
          block.kind = kind
          block.isHidden = isHidden
          block.dirLeft = reader.readBool()
          block.dirDown = reader.readBool()
          block.dirRight = reader.readBool()
          block.dirUp = reader.readBool()
          block.x = isColumn ? startX : startX + i
          block.y = isColumn ? startY + i : startY
          addBlock(block)
        }
      }
    }

    const readLift = (kind: number, isHidden: boolean) => {
      for (;;) {
        const startX = reader.readBits(xBits)
        if (startX === (1 << xBits) - 1) {
          return
        }
        const startY = reader.readBits(yBits)
        const block = emptyBlockPlacement()
        block.kind = kind
        block.isHidden = isHidden
        block.x = startX
        block.y = startY
        addBlock(block)
      }
    }

    const readMod = (kind: number, isHidden: boolean) => {
      for (;;) {
        const startX = reader.readBits(xBits)
        if (startX === (1 << xBits) - 1) {
          return
        }
        const startY = reader.readBits(yBits)
        const count = reader.readBits(4) + 1
        const isColumn = reader.readBool()
        for (let i = 0; i < count; i++) {
          const block = emptyBlockPlacement()
          block.kind = kind
          block.isHidden = isHidden
          block.collisionMod = reader.readBits(3)
          block.x = isColumn ? startX : startX + i
          block.y = isColumn ? startY + i : startY
          addBlock(block)
        }
      }
    }

    for (;;) {
      const isHidden = reader.readBool()
      const kind = reader.readBits(5)
      if (kind === 0x1f) {
        complete = true
        return result()
      }
      switch (kind) {
        case 0x00: // Rock
        case 0x02: // Ice
        case 0x05: // Steel
        case 0x06: // Rubber
        case 0x07: // Shifting
        case 0x09: // Mushroom
          readCommon(kind, isHidden)
          break
        case 0x01:
          readPrize(kind, isHidden)
          break
        case 0x03:
          readTimer(kind, isHidden)
          break
        case 0x04:
          readTelepad(kind, isHidden)
          break
        case 0x0a:
        case 0x0c:
          readDirection(kind, isHidden)
          break
        case 0x0b:
          readLift(kind, isHidden)
          break
        case 0x10:
          readMod(kind, isHidden)
          break
        default:
          return result(
            `block kind 0x${kind.toString(16).padStart(2, '0')} has no reference decoder (utils/go-kid/data/level.go)`,
          )
      }
      if (blocks.length > maxBlocks) {
        return result(`block count exceeded the safety budget of ${maxBlocks}`)
      }
    }
  } catch (error) {
    return result(error instanceof Error ? error.message : String(error))
  }
}

export type LevelMapLoadResult<T> = {
  resource?: T
  error?: string
}

function formatAddress(address: number | undefined): string {
  return address === undefined ? 'none' : `0x${address.toString(16)}`
}

async function loadResourceOfType<K extends AllRomResourcesLoaded['type']>(
  rom: Rom,
  address: number | undefined,
  type: K,
): Promise<LevelMapLoadResult<LoadedResourceOfType<K>>> {
  if (!address) {
    return { error: `level header has no ${type} pointer` }
  }
  const resource = rom.resources.getResource(address)
  if (!resource) {
    return { error: `no resource registered at ${formatAddress(address)} for ${type}` }
  }
  if (resource.type !== type) {
    return {
      error: `${formatAddress(address)} is ${resource.type}, expected ${type}`,
    }
  }
  try {
    const loaded = await rom.resources.getResourceLoaded<K>(address)
    if (!loaded) {
      return { error: `${type} at ${formatAddress(address)} did not load` }
    }
    return { resource: loaded as LoadedResourceOfType<K> }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

export type LevelMap = {
  headerAddress: number
  header: LevelHeaderRomResourceLoaded
  titleCard?: LevelTitleCardRomResourceLoaded
  layout?: LevelLayoutGrid
  layoutError?: string
  blockStream?: LevelBlockStreamResult
  /** Set when the level-tiles resource could not be loaded at all. */
  blockStreamError?: string
  /** Fallback explanation, e.g. unknown block input size decoded to the stream terminator. */
  blockStreamNote?: string
  objectsHeader?: LevelObjectsHeaderRomResourceLoaded
  objectsHeaderError?: string
  enemies?: LevelEnemyLayoutRomResourceLoaded
  enemiesError?: string
  background?: LevelBackgroundLayoutRomResourceLoaded
  backgroundError?: string
}

/** Upper bound when a block stream has no inferred size; the stream ends with a 0x1F marker. */
const LEVEL_BLOCK_STREAM_SCAN_LIMIT = 0x4000

/**
 * Composes everything currently decoded for one level: header, title card, foreground grid, block
 * placements, enemy layout and background layout. Missing or invalid pieces are reported per field
 * instead of failing the whole map, so the viewer can mark the gap.
 */
export async function loadLevelMap(rom: Rom, headerAddress: number): Promise<LevelMap> {
  const header = (await rom.resources.getResourceLoaded<'level-header'>(
    headerAddress,
  )) as LevelHeaderRomResourceLoaded
  if (!header) {
    throw new Error(`no level header at ${formatAddress(headerAddress)}`)
  }

  const titleCardResource = rom.resources
    .getReferencesResources(headerAddress)
    .find((resource) => resource.type === 'level-title-card')
  const titleCard =
    titleCardResource?.type === 'level-title-card'
      ? ((await rom.resources.getResourceLoaded<'level-title-card'>(
          titleCardResource.baseAddress,
        )) as LevelTitleCardRomResourceLoaded)
      : undefined

  const [tiles, blockBytes, objectsHeader, background] = await Promise.all([
    loadResourceOfType(rom, header.tilesDataPtr, 'level-tiles'),
    loadResourceOfType(rom, header.blocksDataPtr, 'level-blocks'),
    loadResourceOfType(rom, header.levelObjectsHeaderPtr, 'level-objects-header'),
    loadResourceOfType(rom, header.backgroundDataPtr, 'level-background-layout'),
  ])

  let layout: LevelLayoutGrid | undefined
  let layoutError = tiles.error
  if (tiles.resource) {
    try {
      layout = buildLevelLayoutGrid(
        tiles.resource.data,
        levelGridDimensions(header.width, header.height, header.yOffset),
      )
    } catch (error) {
      layoutError = error instanceof Error ? error.message : String(error)
    }
  }

  let blockStream: LevelBlockStreamResult | undefined
  let blockStreamNote: string | undefined
  const blockDimensions = {
    widthBlocks: layout?.widthBlocks ?? header.widthInBlocks,
    heightBlocks: layout?.heightBlocks ?? header.heightInBlocks + header.yOffsetInBlocks,
  }
  if (blockBytes.resource) {
    blockStream = decodeLevelBlocks(blockBytes.resource.data, blockDimensions)
  } else if (header.blocksDataPtr > 0 && header.blocksDataPtr < rom.bytes.length) {
    // Discovery infers block sizes from the gap to the next pointer, which leaves the last block
    // pointer (level 0x65 in the original ROM) without a size. The stream carries its own 0x1F
    // end marker, so decode a bounded window instead of reporting the whole level as missing.
    const start = header.blocksDataPtr
    const data = rom.bytes.subarray(
      start,
      Math.min(rom.bytes.length, start + LEVEL_BLOCK_STREAM_SCAN_LIMIT),
    )
    if (data[0] === 0x40) {
      blockStream = decodeLevelBlocks(data, blockDimensions)
      blockStreamNote = `Block data size was not inferred from the pointer table (${blockBytes.error}); decoded to the end-of-stream marker within ${LEVEL_BLOCK_STREAM_SCAN_LIMIT} bytes.`
    }
  }

  let enemies: LevelEnemyLayoutRomResourceLoaded | undefined
  let enemiesError: string | undefined
  if (objectsHeader.resource) {
    const enemyLayout = await loadResourceOfType(
      rom,
      objectsHeader.resource.h1Pointer,
      'level-enemy-layout',
    )
    enemies = enemyLayout.resource
    enemiesError = enemyLayout.error
  }

  return {
    headerAddress,
    header,
    titleCard,
    layout,
    layoutError,
    blockStream,
    blockStreamError: blockStream ? undefined : blockBytes.error,
    blockStreamNote,
    objectsHeader: objectsHeader.resource,
    objectsHeaderError: objectsHeader.error,
    enemies,
    enemiesError,
    background: background.resource,
    backgroundError: background.error,
  }
}
