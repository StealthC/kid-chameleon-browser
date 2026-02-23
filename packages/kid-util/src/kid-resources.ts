import { crc32 } from './hash'
import { calculatePlayerSpriteDataSize } from './kid-utils'
import type { Rom } from './kid-rom'
import { unpackKidFormat } from './unpack-kid'
import { unpackEnigmaFormat } from './unpack-enigma'
import { KidImageData, TILE_INDEXED4_BYTE_COUNT, TILE_WIDTH } from './kid-graphics'

export type PackedFormat = 'kid' | 'enigma'

export const ResourceTypes = [
  'unknown',
  'sheet',
  'unlinked-sprite-frame',
  'linked-sprite-frame',
  'sprite-collision',
  'animation-frame',
  'animation',
  'animation-step',
  'plane',
  'level-header',
  'level-tiles',
  'level-blocks',
  'level-objects-header',
  'level-background-layout',
  'level-enemy-layout',
  'level-title-card',
  'palette',
  'palette-map',
] as const

export type ResourceType = (typeof ResourceTypes)[number]
export type RomResourceIndex = Map<number, AllRomResources>
export type RomResourcesByType = Map<(typeof ResourceTypes)[number], Set<number>>

export const ResourceTypeLoaderMap: ResourceLoaderMap = {
  'level-header': loadLevelHeaderRomResource,
  'level-blocks': loadLevelBlocksRomResource,
  'level-objects-header': loadLevelObjectsHeaderRomResource,
  'level-background-layout': loadLevelBackgroundLayoutRomResource,
  'level-enemy-layout': loadLevelEnemyLayoutRomResource,
  'level-title-card': loadLevelTitleCardRomResource,
  sheet: loadSheetRomResource,
  'unlinked-sprite-frame': loadUnlinkedSpriteFrameResource,
  'linked-sprite-frame': loadLinkedSpriteFrameResource,
  'sprite-collision': loadSpriteCollisionRomResource,
  'animation-frame': loadAnimationFrameRomResource,
  animation: loadAnimationRomResource,
  'animation-step': loadAnimationStepRomResource,
  plane: loadPlaneRomResource,
  palette: loadPaletteRomResource,
  'palette-map': loadPaletteMapRomResource,
  'level-tiles': loadLevelTilesRomResource,
}

export type AllRomResources = AllRomResourcesLoaded | AllRomResourcesUnloaded

export type AllRomResourcesUnloaded =
  | LevelHeaderRomResourceUnloaded
  | LevelBlocksRomResourceUnloaded
  | LevelObjectsHeaderRomResourceUnloaded
  | LevelEnemyLayoutRomResourceUnloaded
  | SheetRomResourceUnloaded
  | UnlinkedSpriteFrameRomResourceUnloaded
  | LinkedSpriteFrameRomResourceUnloaded
  | SpriteCollisionRomResourceUnloaded
  | AnimationFrameRomResourceUnloaded
  | AnimationRomResourceUnloaded
  | AnimationStepRomResourceUnloaded
  | PlaneRomResourceUnloaded
  | PaletteRomResourceUnloaded
  | PaletteMapRomResourceUnloaded
  | UnknownRomResourceUnloaded
  | LevelTilesRomResourceUnloaded
  | LevelBackgroundLayoutRomResourceUnloaded
  | LevelTitleCardRomResourceUnloaded

export type AllRomResourcesLoaded =
  | LevelHeaderRomResourceLoaded
  | LevelBlocksRomResourceLoaded
  | LevelObjectsHeaderRomResourceLoaded
  | LevelEnemyLayoutRomResourceLoaded
  | SheetRomResourceLoaded
  | UnlinkedSpriteFrameRomResourceLoaded
  | LinkedSpriteFrameRomResourceLoaded
  | SpriteCollisionRomResourceLoaded
  | AnimationFrameRomResourceLoaded
  | AnimationRomResourceLoaded
  | AnimationStepRomResourceLoaded
  | PlaneRomResourceLoaded
  | PaletteRomResourceLoaded
  | PaletteMapRomResourceLoaded
  | LevelTilesRomResourceLoaded
  | LevelBackgroundLayoutRomResourceLoaded
  | LevelTitleCardRomResourceLoaded

export type UnknownRomResourceUnloaded = UnloadedRomResource & {
  type: 'unknown'
  possibleSize?: number
}

export type LoadedResourceOfType<K extends (typeof ResourceTypes)[number]> = Extract<
  AllRomResources,
  { type: K; loaded: true }
>

export type UnloadedResourceOfType<K extends (typeof ResourceTypes)[number]> = Extract<
  AllRomResources,
  { type: K; loaded: false }
>

type ResourceLoaderMap = Partial<{
  [K in (typeof ResourceTypes)[number]]: (
    rom: Rom,
    resource: UnloadedResourceOfType<K>,
  ) => LoadedResourceOfType<K> | Promise<LoadedResourceOfType<K>>
}>

export type BaseRomResource = {
  readonly baseAddress: number
  readonly type: (typeof ResourceTypes)[number]
  addressOffset?: number
  confidence?: 'certain' | 'possible'
  tags?: string[]
  name?: string
  description?: string
}

export type UnloadedRomResource = BaseRomResource & {
  loaded: false
}

export type LoadedRomResource = BaseRomResource & {
  loaded: true
  hash: number
  inputSize: number
}

export type LevelTilesRomResourceUnloaded = PackableResource &
  UnloadedRomResource & {
    type: 'level-tiles'
    inputSize?: number
  }

export type LevelTilesRomResourceLoaded = PackableResource &
  LoadedRomResource & {
    type: 'level-tiles'
    data: Uint8Array
  }

export type LevelTilesRomResource = LevelTilesRomResourceUnloaded | LevelTilesRomResourceLoaded

export type LevelBlocksRomResourceUnloaded = UnloadedRomResource & {
  type: 'level-blocks'
  inputSize?: number
}

export type LevelBlocksRomResourceLoaded = LoadedRomResource & {
  type: 'level-blocks'
  data: Uint8Array
}

export type LevelBlocksRomResource = LevelBlocksRomResourceUnloaded | LevelBlocksRomResourceLoaded

export type LevelObjectsHeaderRomResourceUnloaded = UnloadedRomResource & {
  type: 'level-objects-header'
  inputSize?: number
}

export type LevelObjectsHeaderRomResourceLoaded = LoadedRomResource & {
  type: 'level-objects-header'
  h1Pointer: number
  axisSelector: number
  unknownField: number
  enemySlot1: number
  enemySlot2: number
  enemySlot3: number
  cameraThreshold: number
  h1UnknownByte?: number
  h1ObjectCountRaw?: number
}

export type LevelObjectsHeaderRomResource =
  | LevelObjectsHeaderRomResourceUnloaded
  | LevelObjectsHeaderRomResourceLoaded

export type LevelEnemyLayoutObject = {
  index: number
  enemyTypeOrKind: number
  behaviorFlags: number
  hitPointsPlusOne: number
  xPosition: number
  yPosition: number
}

export type LevelEnemyLayoutRomResourceUnloaded = UnloadedRomResource & {
  type: 'level-enemy-layout'
  objectCount?: number
  inputSize?: number
}

export type LevelEnemyLayoutRomResourceLoaded = LoadedRomResource & {
  type: 'level-enemy-layout'
  h1UnknownByte: number
  h1ObjectCountRaw: number
  objectCount: number
  objects: LevelEnemyLayoutObject[]
}

export type LevelEnemyLayoutRomResource =
  | LevelEnemyLayoutRomResourceUnloaded
  | LevelEnemyLayoutRomResourceLoaded

export type LevelBackgroundPlacement = {
  chunkIndexRaw: number
  xRaw: number
  yRaw: number
}

export type LevelBackgroundIndirectRef = {
  xShiftRaw: number
  yShiftRaw: number
  referenceAddress: number
}

export type LevelBackgroundLayoutRomResourceUnloaded = UnloadedRomResource & {
  type: 'level-background-layout'
  backgroundType?: number
  isPacked?: boolean
  inputSize?: number
}

export type LevelBackgroundLayoutRomResourceLoaded = LoadedRomResource & {
  type: 'level-background-layout'
  backgroundType: number
  isPacked: boolean
  format: 'chunked' | 'layered'
  indirect?: LevelBackgroundIndirectRef
  placements: LevelBackgroundPlacement[]
}

export type LevelBackgroundLayoutRomResource =
  | LevelBackgroundLayoutRomResourceUnloaded
  | LevelBackgroundLayoutRomResourceLoaded

export type LevelTitleCardRomResourceUnloaded = UnloadedRomResource & {
  type: 'level-title-card'
  levelIndex: number
  effectiveLevelIndex: number
}

export type LevelTitleCardRomResourceLoaded = LoadedRomResource & {
  type: 'level-title-card'
  levelIndex: number
  effectiveLevelIndex: number
  textAddress: number
  layoutAddress: number
  act: number
  lines: string[]
  titleText: string
}

export type LevelTitleCardRomResource =
  | LevelTitleCardRomResourceUnloaded
  | LevelTitleCardRomResourceLoaded

export type PaletteRomResourceUnloaded = UnloadedRomResource & {
  type: 'palette'
  size: number
}

export type PaletteRomResourceLoaded = LoadedRomResource & {
  type: 'palette'
  size: number
  colors: number[]
}

export type PaletteRomResource = PaletteRomResourceUnloaded | PaletteRomResourceLoaded

export type PaletteMapRomResourceUnloaded = UnloadedRomResource & {
  type: 'palette-map'
  size: number
}

export type PaletteMapRomResourceLoaded = LoadedRomResource & {
  type: 'palette-map'
  size: number
  map: number[]
}

export type PaletteMapRomResource = PaletteMapRomResourceUnloaded | PaletteMapRomResourceLoaded

export function isRomResourceOfType<T extends (typeof ResourceTypes)[number]>(
  resource: BaseRomResource,
  type: T,
): resource is Extract<BaseRomResource, { type: T }> {
  return resource.type === type
}

export function isLoadedResource(resource: BaseRomResource): resource is LoadedRomResource {
  return (resource as LoadedRomResource).loaded
}

export function isSheetResource(resource: BaseRomResource): resource is SheetRomResource {
  return resource.type === 'sheet'
}

export function isPaletteResource(resource: BaseRomResource): resource is PaletteRomResource {
  return resource.type === 'palette'
}

export function isPaletteMapResource(resource: BaseRomResource): resource is PaletteMapRomResource {
  return resource.type === 'palette-map'
}

export function isSpriteFrameResource(
  resource: BaseRomResource,
): resource is SpriteFrameRomResource {
  return resource.type === 'unlinked-sprite-frame' || resource.type === 'linked-sprite-frame'
}

export function isAnimationResource(resource: BaseRomResource): resource is AnimationRomResource {
  return resource.type === 'animation'
}

export function isAnimationStepResource(
  resource: BaseRomResource,
): resource is AnimationStepRomResource {
  return resource.type === 'animation-step'
}

export function isAnimationFrameResource(
  resource: BaseRomResource,
): resource is AnimationFrameRomResource {
  return resource.type === 'animation-frame'
}

export function isLevelEnemyLayoutResource(
  resource: BaseRomResource,
): resource is LevelEnemyLayoutRomResource {
  return resource.type === 'level-enemy-layout'
}

export function isLevelBackgroundLayoutResource(
  resource: BaseRomResource,
): resource is LevelBackgroundLayoutRomResource {
  return resource.type === 'level-background-layout'
}

export function isLevelTitleCardResource(
  resource: BaseRomResource,
): resource is LevelTitleCardRomResource {
  return resource.type === 'level-title-card'
}

export function isUnlinkedSpriteFrameResource(
  resource: BaseRomResource,
): resource is UnlinkedSpriteFrameRomResource {
  return resource.type === 'unlinked-sprite-frame'
}

export const isLinkedSpriteFrameResource = (
  spriteFrame: BaseRomResource,
): spriteFrame is LinkedSpriteFrameRomResource => {
  return spriteFrame.type === 'linked-sprite-frame'
}

export const isPlaneResource = (resource: BaseRomResource): resource is PlaneRomResource => {
  return resource.type === 'plane'
}

// Recursos específicos – exemplo com level-header:
export type LevelHeaderRomResourceUnloaded = UnloadedRomResource & {
  type: 'level-header'
  levelIndex: number
  wordIndex: number
}

export type LevelHeaderRomResourceLoaded = LoadedRomResource & {
  type: 'level-header'
  levelIndex: number
  wordIndex: number
  width: number
  height: number
  yOffset: number
  widthInBlocks: number
  heightInBlocks: number
  yOffsetInBlocks: number
  murderWall?: boolean
  murderWallVariant?: boolean
  themeIndex: number
  backgroundType: number
  backgroundMisc: number
  backgroundIsPacked?: boolean
  backgroundWidth: number
  playerX: number
  playerY: number
  flagX: number
  flagY: number
  tilesDataPtr: number
  blocksDataPtr: number
  backgroundDataPtr: number
  levelObjectsHeaderPtr: number
}

export type LevelHeaderRomResource = LevelHeaderRomResourceUnloaded | LevelHeaderRomResourceLoaded

export type EnigmaPacked = {
  format: 'enigma'
  tileIndex?: number
}
export type KidPacked = {
  format: 'kid'
}

export type PackedData = EnigmaPacked | KidPacked

export type PackableResource = {
  packed?: PackedData
}

export type PlaneRomResourceUnloaded = PackableResource &
  UnloadedRomResource & {
    type: 'plane'
    startTile?: number
    inputSize?: number
    width?: number
  }

export type PlaneRomResourceTile = {
  priority: boolean
  palette: number
  yFlip: boolean
  xFlip: boolean
  tileIndex: number
}

export type PlaneRomResourceLoaded = PackableResource &
  LoadedRomResource & {
    type: 'plane'
    startTile?: number
    data: Uint8Array
    tiles: PlaneRomResourceTile[]
    width?: number
  }

export type PlaneRomResource = PlaneRomResourceUnloaded | PlaneRomResourceLoaded

export type SheetRomResourceUnloaded = PackableResource &
  UnloadedRomResource & {
    type: 'sheet'
    startTile?: number
    tableIndex?: number
    inputSize?: number
  }

export type SheetRomResourceLoaded = PackableResource &
  LoadedRomResource & {
    type: 'sheet'
    startTile?: number
    tableIndex?: number
    data: Uint8Array
    tiles: KidImageData[]
  }

export type SheetRomResource = SheetRomResourceUnloaded | SheetRomResourceLoaded

export type UnlinkedSpriteFrameRomResourceUnloaded = UnloadedRomResource & {
  type: 'unlinked-sprite-frame'
  tableIndex?: number
}

export type UnlinkedSpriteFrameRomResourceLoaded = LoadedRomResource & {
  type: 'unlinked-sprite-frame'
  tableIndex?: number
  tileId: number
  width: number
  height: number
  xOffset: number
  yOffset: number
}

export type UnlinkedSpriteFrameRomResource =
  | UnlinkedSpriteFrameRomResourceUnloaded
  | UnlinkedSpriteFrameRomResourceLoaded

export type LinkedSpriteFrameRomResourceUnloaded = UnloadedRomResource & {
  type: 'linked-sprite-frame'
  tableIndex?: number
}

export type LinkedSpriteFrameRomResourceLoaded = LoadedRomResource & {
  type: 'linked-sprite-frame'
  tableIndex?: number
  width: number
  height: number
  xOffset: number
  yOffset: number
  data: Uint8Array
}

export type LinkedSpriteFrameRomResource =
  | LinkedSpriteFrameRomResourceUnloaded
  | LinkedSpriteFrameRomResourceLoaded

export type SpriteFrameRomResource = UnlinkedSpriteFrameRomResource | LinkedSpriteFrameRomResource

export type SpriteFrameRomResourceUnloaded =
  | UnlinkedSpriteFrameRomResourceUnloaded
  | LinkedSpriteFrameRomResourceUnloaded

export type SpriteFrameRomResourceLoaded =
  | LinkedSpriteFrameRomResourceLoaded
  | UnlinkedSpriteFrameRomResourceLoaded

export type SpriteCollisionRomResourceUnloaded = UnloadedRomResource & {
  type: 'sprite-collision'
  wordIndex?: number
  isInvalid?: boolean
}

export type SpriteCollisionRomResourceLoaded = LoadedRomResource & {
  type: 'sprite-collision'
  wordIndex?: number
  isZero: boolean
  left: number
  width: number
  top: number
  height: number
  isInvalid: boolean
}

export type SpriteCollisionRomResource =
  | SpriteCollisionRomResourceUnloaded
  | SpriteCollisionRomResourceLoaded

export type AnimationFrameRomResourceUnloaded = UnloadedRomResource & {
  type: 'animation-frame'
  frameGroup?: string
  frameIndex?: number
  tableAddress?: number
  inputSize?: number
}

export type AnimationFrameRomResourceLoaded = LoadedRomResource & {
  type: 'animation-frame'
  frameGroup?: string
  frameIndex?: number
  tableAddress?: number
  data: Uint8Array
  tiles: KidImageData[]
}

export type AnimationFrameRomResource =
  | AnimationFrameRomResourceUnloaded
  | AnimationFrameRomResourceLoaded

export type AnimationRomResourceUnloaded = UnloadedRomResource & {
  type: 'animation'
  frameCount?: number
  totalFrames?: number
  terminatorAddress?: number
  stepAddresses?: number[]
}

export type AnimationRomResourceLoaded = LoadedRomResource & {
  type: 'animation'
  frameCount: number
  totalFrames: number
  terminatorAddress?: number
  stepAddresses: number[]
}

export type AnimationRomResource = AnimationRomResourceUnloaded | AnimationRomResourceLoaded

export type AnimationStepRomResourceUnloaded = UnloadedRomResource & {
  type: 'animation-step'
  animationAddress?: number
  kind?: number
  delay?: number
  spriteOffset?: number
  spriteAddress?: number
  nextFrameAddress?: number
}

export type AnimationStepRomResourceLoaded = LoadedRomResource & {
  type: 'animation-step'
  animationAddress?: number
  kind: number
  delay: number
  spriteOffset?: number
  spriteAddress?: number
  nextFrameAddress?: number
}

export type AnimationStepRomResource =
  | AnimationStepRomResourceUnloaded
  | AnimationStepRomResourceLoaded

export function loadLevelHeaderRomResource(
  rom: Rom,
  resource: LevelHeaderRomResourceUnloaded,
): LevelHeaderRomResourceLoaded {
  const { baseAddress } = resource
  const width = rom.data.getUint8(baseAddress)
  const widthInBlocks = width * 0x14
  const heightComposite = rom.data.getUint8(baseAddress + 1)
  const yOffset = heightComposite >> 6
  const height = heightComposite & 0x3f
  const themeComposite = rom.data.getUint8(baseAddress + 2)
  const themeIndex = themeComposite & 0x3f
  const murderWall = (themeComposite & 0x80) !== 0
  const murderWallVariant = (themeComposite & 0x40) !== 0
  const backgroundComposite = rom.data.getUint8(baseAddress + 3)
  const backgroundType = backgroundComposite & 0x0f
  const backgroundIsPacked = ((1 << backgroundType) & 0b1010101000) !== 0
  const backgroundMisc = backgroundComposite >> 4
  const backgroundWidth = backgroundIsPacked ? 0x40 : widthInBlocks / 4 + 0x1e
  const playerX = rom.data.getUint16(baseAddress + 4, false)
  const playerY = rom.data.getUint16(baseAddress + 6, false)
  const flagX = rom.data.getUint16(baseAddress + 8, false)
  const flagY = rom.data.getUint16(baseAddress + 0xa, false)
  const tilesDataPtr = rom.data.getUint32(baseAddress + 0xc, false)
  const blocksDataPtr = rom.data.getUint32(baseAddress + 0x10, false)
  const backgroundDataPtr = rom.data.getUint32(baseAddress + 0x14, false)
  const levelObjectsHeaderPtr = rom.data.getUint32(baseAddress + 0x18, false)

  const inputSize = 0x1c
  const bytes = rom.bytes.subarray(baseAddress, baseAddress + inputSize)
  const hash = crc32(bytes)

  return {
    ...resource,
    loaded: true,
    hash,
    inputSize,
    width,
    widthInBlocks,
    height,
    heightInBlocks: height * 0xe,
    yOffset,
    yOffsetInBlocks: yOffset * 2,
    murderWall,
    murderWallVariant,
    themeIndex,
    backgroundMisc,
    backgroundType,
    backgroundIsPacked,
    backgroundWidth,
    playerX,
    playerY,
    flagX,
    flagY,
    tilesDataPtr,
    blocksDataPtr,
    backgroundDataPtr,
    levelObjectsHeaderPtr,
  }
}

export function loadLevelTilesRomResource(
  rom: Rom,
  resource: LevelTilesRomResourceUnloaded,
): LevelTilesRomResourceLoaded {
  const { baseAddress, inputSize, packed } = resource
  let data: Uint8Array
  let rInputSize: number = inputSize ?? 0
  if (packed) {
    if (packed.format === 'kid') {
      const packedData = rom.bytes.subarray(baseAddress)
      const unpacked = unpackKidFormat(packedData)
      data = unpacked.output
      rInputSize = unpacked.results.sizePacked
    } else {
      throw new Error(`Unsupported packed format for plane: ${packed.format}`)
    }
  } else {
    if (!rInputSize || rInputSize === 0) {
      throw new Error('Resource input size needs to be defined when the resource is not packed')
    }
    data = rom.bytes.subarray(baseAddress, baseAddress + rInputSize)
  }

  const bytes = rom.bytes.subarray(baseAddress, baseAddress + rInputSize)
  const hash = crc32(bytes)

  return {
    ...resource,
    loaded: true,
    hash,
    inputSize: rInputSize,
    data,
  }
}

export function loadLevelBlocksRomResource(
  rom: Rom,
  resource: LevelBlocksRomResourceUnloaded,
): LevelBlocksRomResourceLoaded {
  const { baseAddress, inputSize = 0 } = resource
  if (!inputSize || inputSize <= 0) {
    throw new Error('Level blocks input size could not be inferred')
  }
  const data = rom.bytes.subarray(baseAddress, baseAddress + inputSize)
  const hash = crc32(data)
  return {
    ...resource,
    loaded: true,
    data,
    hash,
    inputSize,
  }
}

export function loadLevelObjectsHeaderRomResource(
  rom: Rom,
  resource: LevelObjectsHeaderRomResourceUnloaded,
): LevelObjectsHeaderRomResourceLoaded {
  const { baseAddress, inputSize = 0x10 } = resource
  const h1Pointer = rom.data.getUint32(baseAddress, false)
  const axisSelector = rom.data.getUint16(baseAddress + 4, false)
  const unknownField = rom.data.getUint16(baseAddress + 6, false)
  const enemySlot1 = rom.data.getUint16(baseAddress + 8, false)
  const enemySlot2 = rom.data.getUint16(baseAddress + 0xa, false)
  const enemySlot3 = rom.data.getUint16(baseAddress + 0xc, false)
  const cameraThreshold = rom.data.getUint16(baseAddress + 0xe, false)

  let h1UnknownByte: number | undefined
  let h1ObjectCountRaw: number | undefined
  if (h1Pointer > 0 && h1Pointer + 1 < rom.bytes.length) {
    h1UnknownByte = rom.data.getUint8(h1Pointer)
    h1ObjectCountRaw = rom.data.getUint8(h1Pointer + 1)
  }

  const bytes = rom.bytes.subarray(baseAddress, baseAddress + inputSize)
  const hash = crc32(bytes)

  return {
    ...resource,
    loaded: true,
    hash,
    inputSize,
    h1Pointer,
    axisSelector,
    unknownField,
    enemySlot1,
    enemySlot2,
    enemySlot3,
    cameraThreshold,
    h1UnknownByte,
    h1ObjectCountRaw,
  }
}

export function loadLevelEnemyLayoutRomResource(
  rom: Rom,
  resource: LevelEnemyLayoutRomResourceUnloaded,
): LevelEnemyLayoutRomResourceLoaded {
  const { baseAddress } = resource
  const h1UnknownByte = rom.data.getUint8(baseAddress)
  const h1ObjectCountRaw = rom.data.getUint8(baseAddress + 1)
  const objectCount = resource.objectCount ?? h1ObjectCountRaw
  const objects: LevelEnemyLayoutObject[] = []
  const objectStart = baseAddress + 2

  for (let i = 0; i < objectCount; i++) {
    const offset = objectStart + i * 8
    if (offset + 8 > rom.bytes.length) {
      break
    }
    objects.push({
      index: i,
      enemyTypeOrKind: rom.data.getUint8(offset),
      behaviorFlags: rom.data.getUint8(offset + 1),
      hitPointsPlusOne: rom.data.getUint16(offset + 2, false),
      xPosition: rom.data.getUint16(offset + 4, false),
      yPosition: rom.data.getUint16(offset + 6, false),
    })
  }

  const inputSize = resource.inputSize ?? 2 + objects.length * 8
  const bytes = rom.bytes.subarray(baseAddress, baseAddress + inputSize)
  const hash = crc32(bytes)

  return {
    ...resource,
    loaded: true,
    hash,
    inputSize,
    h1UnknownByte,
    h1ObjectCountRaw,
    objectCount: objects.length,
    objects,
  }
}

export function loadLevelBackgroundLayoutRomResource(
  rom: Rom,
  resource: LevelBackgroundLayoutRomResourceUnloaded,
): LevelBackgroundLayoutRomResourceLoaded {
  const { baseAddress } = resource
  const backgroundType = resource.backgroundType ?? 0
  const isPacked = resource.isPacked ?? ((((1 << backgroundType) & 0x02a8) !== 0))

  if (isPacked) {
    const inputSize = resource.inputSize ?? 0
    const bytes = rom.bytes.subarray(baseAddress, baseAddress + inputSize)
    const hash = crc32(bytes)
    return {
      ...resource,
      loaded: true,
      hash,
      inputSize,
      backgroundType,
      isPacked,
      format: 'chunked',
      placements: [],
    }
  }

  let cursor = baseAddress
  let indirect: LevelBackgroundIndirectRef | undefined
  const firstWord = rom.data.getUint16(cursor, false)
  if (firstWord === 0x8000) {
    const xShiftRaw = rom.data.getUint16(cursor + 2, false)
    const yShiftRaw = rom.data.getUint16(cursor + 4, false)
    const referenceAddress = rom.data.getUint32(cursor + 6, false)
    indirect = { xShiftRaw, yShiftRaw, referenceAddress }
    cursor = referenceAddress
  }

  const placements: LevelBackgroundPlacement[] = []
  const maxPlacements = 4096
  for (let i = 0; i < maxPlacements; i++) {
    if (cursor + 6 > rom.bytes.length) {
      break
    }
    const chunkIndexRaw = rom.data.getUint16(cursor, false)
    if ((chunkIndexRaw & 0x8000) !== 0) {
      break
    }
    const xRaw = rom.data.getUint16(cursor + 2, false)
    const yRaw = rom.data.getUint16(cursor + 4, false)
    placements.push({ chunkIndexRaw, xRaw, yRaw })
    cursor += 6
  }

  const endAddress = cursor + 2
  const inputSize = resource.inputSize ?? Math.max(0, endAddress - baseAddress)
  const bytes = rom.bytes.subarray(baseAddress, baseAddress + inputSize)
  const hash = crc32(bytes)

  return {
    ...resource,
    loaded: true,
    hash,
    inputSize,
    backgroundType,
    isPacked,
    format: 'layered',
    indirect,
    placements,
  }
}

const levelTitleGlyphDisplayMap = new Map<number, string>([
  [0x61, 'A'],
  [0x62, 'B'],
  [0x63, 'C'],
  [0x64, 'D'],
  [0x65, 'E'],
  [0x66, 'F'],
  [0x67, 'G'],
  [0x68, 'H'],
  [0x69, 'I'],
  [0x6a, 'J'],
  [0x6b, 'K'],
  [0x6c, 'L'],
  [0x6d, 'M'],
  [0x6e, 'N'],
  [0x6f, 'O'],
  [0x70, 'P'],
  [0x71, 'Q'],
  [0x72, 'R'],
  [0x73, 'S'],
  [0x74, 'T'],
  [0x75, 'U'],
  [0x76, 'V'],
  [0x77, 'W'],
  [0x78, 'X'],
  [0x79, 'Y'],
  [0x7a, 'Z'],
  [0x7b, 'I'],
  [0x7c, 'THE'],
  [0x7d, 'the'],
  [0x7e, 'OF'],
  [0x7f, 'to'],
  [0x80, 'PLAYER'],
  [0x81, '1'],
  [0x82, '2'],
  [0x83, "'"],
])

function toRomanNumeral(value: number): string {
  const numerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X']
  if (value <= 0 || value > numerals.length) {
    return String(value)
  }
  return numerals[value - 1]
}

export function loadLevelTitleCardRomResource(
  rom: Rom,
  resource: LevelTitleCardRomResourceUnloaded,
): LevelTitleCardRomResourceLoaded {
  const { baseAddress } = resource
  const textAddress = rom.data.getUint32(baseAddress, false)
  const layoutAddress = rom.data.getUint32(baseAddress + 4, false)
  const act = rom.data.getUint16(baseAddress + 8, false)

  const lines: string[] = []
  let current = ''
  const maxTitleBytes = 512
  let cursor = textAddress

  for (let i = 0; i < maxTitleBytes; i++) {
    if (cursor >= rom.bytes.length) {
      break
    }
    const code = rom.data.getUint8(cursor)
    cursor++

    if (code === 0xff) {
      if (current.length > 0) {
        lines.push(current)
      }
      break
    }

    if (code === 0x00) {
      lines.push(current)
      current = ''
      continue
    }

    if (code === 0x84) {
      current += ' '
      continue
    }

    current += levelTitleGlyphDisplayMap.get(code) ?? ''
  }

  const normalizedLines = lines.map((line) => line.trim()).filter((line) => line.length > 0)
  const titleBase = normalizedLines.join(' ').replace(/\s+/g, ' ').trim().toUpperCase()
  const titleText = act > 0 ? `${titleBase} ${toRomanNumeral(act)}` : titleBase

  const inputSize = 10
  const bytes = rom.bytes.subarray(baseAddress, baseAddress + inputSize)
  const hash = crc32(bytes)

  return {
    ...resource,
    loaded: true,
    hash,
    inputSize,
    textAddress,
    layoutAddress,
    act,
    lines: normalizedLines,
    titleText,
  }
}

export function loadPlaneRomResource(
  rom: Rom,
  resource: PlaneRomResourceUnloaded,
): PlaneRomResourceLoaded {
  const { baseAddress, inputSize, packed, startTile } = resource
  let data: Uint8Array
  let rInputSize: number = inputSize ?? 0
  if (packed) {
    if (packed.format === 'enigma') {
      const packedData = rom.bytes.subarray(baseAddress)
      const unpacked = unpackEnigmaFormat(packedData, 0, startTile ?? 0)
      data = unpacked.output
      rInputSize = unpacked.results.sizePacked
    } else {
      throw new Error(`Unsupported packed format for plane: ${packed.format}`)
    }
  } else {
    if (!rInputSize || rInputSize === 0) {
      throw new Error('Resource input size needs to be defined when the resource is not packed')
    }
    data = rom.bytes.subarray(baseAddress, baseAddress + rInputSize)
  }

  const view = new DataView(data.buffer, data.byteOffset, data.byteLength)
  const tiles: PlaneRomResourceTile[] = []
  for (let i = 0; i < data.length; i += 2) {
    const word = view.getUint16(i, false)
    const priority = (word & 0x8000) !== 0
    const palette = (word & 0x6000) >> 13
    const yFlip = (word & 0x1000) !== 0
    const xFlip = (word & 0x0800) !== 0
    const tileIndex = word & 0x7ff
    tiles.push({ priority, palette, yFlip, xFlip, tileIndex })
  }

  const bytes = rom.bytes.subarray(baseAddress, baseAddress + rInputSize)
  const hash = crc32(bytes)
  return {
    ...resource,
    loaded: true,
    hash,
    inputSize: rInputSize,
    data,
    tiles,
  }
}

export function loadSheetRomResource(
  rom: Rom,
  resource: SheetRomResourceUnloaded,
): SheetRomResourceLoaded {
  const { baseAddress, inputSize, packed } = resource
  let data: Uint8Array
  let rInputSize: number = inputSize ?? 0
  if (packed) {
    if (packed.format === 'kid') {
      const packedData = rom.bytes.subarray(baseAddress)
      const unpacked = unpackKidFormat(packedData)
      data = unpacked.output
      rInputSize = unpacked.results.sizeUnpacked
    } else {
      throw new Error(`Unsupported packed format for sheet: ${packed.format}`)
    }
  } else {
    if (!rInputSize || rInputSize === 0) {
      throw new Error('Resource input size needs to be defined when the resource is not packed')
    }
    data = rom.bytes.subarray(baseAddress, baseAddress + rInputSize)
  }

  const tiles: KidImageData[] = []
  for (let i = 0; i < data.length; i += TILE_INDEXED4_BYTE_COUNT) {
    const tile = data.subarray(i, i + TILE_INDEXED4_BYTE_COUNT)
    tiles.push(KidImageData.from(tile, TILE_WIDTH, TILE_WIDTH, 'Indexed4'))
  }

  const bytes = rom.bytes.subarray(baseAddress, baseAddress + rInputSize)
  const hash = crc32(bytes)
  return {
    ...resource,
    loaded: true,
    hash,
    inputSize: rInputSize,
    data,
    tiles,
  }
}

export function loadUnlinkedSpriteFrameResource(
  rom: Rom,
  resource: UnlinkedSpriteFrameRomResourceUnloaded,
): UnlinkedSpriteFrameRomResourceLoaded {
  const { baseAddress } = resource
  const tileId = rom.data.getUint16(baseAddress, false)
  const xOffset = rom.data.getInt8(baseAddress + 2)
  const yOffset = rom.data.getInt8(baseAddress + 3)
  const width = rom.data.getUint16(baseAddress + 4, false)
  const height = rom.data.getUint16(baseAddress + 6, false)
  const inputSize = 8
  const bytes = rom.bytes.subarray(baseAddress, baseAddress + inputSize)
  const hash = crc32(bytes)
  return {
    ...resource,
    loaded: true,
    hash,
    inputSize,
    tileId,
    width,
    height,
    xOffset,
    yOffset,
  }
}

export function loadPaletteRomResource(
  rom: Rom,
  resource: PaletteRomResourceUnloaded,
): PaletteRomResourceLoaded {
  const { baseAddress, size } = resource
  const colors: number[] = []
  for (let i = 0; i < size; i++) {
    colors.push(rom.data.getUint16(baseAddress + i * 2, false))
  }
  const inputSize = size * 2
  const bytes = rom.bytes.subarray(baseAddress, baseAddress + inputSize)
  const hash = crc32(bytes)
  return {
    ...resource,
    loaded: true,
    colors,
    hash,
    inputSize,
  }
}

export function loadPaletteMapRomResource(
  rom: Rom,
  resource: PaletteMapRomResourceUnloaded,
): PaletteMapRomResourceLoaded {
  const { baseAddress, size } = resource
  const map: number[] = []
  for (let i = 0; i < size; i++) {
    map.push(rom.data.getUint8(baseAddress + i))
  }
  const inputSize = size
  const bytes = rom.bytes.subarray(baseAddress, baseAddress + inputSize)
  const hash = crc32(bytes)
  return {
    ...resource,
    loaded: true,
    map,
    hash,
    inputSize,
  }
}

export function loadAnimationFrameRomResource(
  rom: Rom,
  resource: AnimationFrameRomResourceUnloaded,
): AnimationFrameRomResourceLoaded {
  const { baseAddress, inputSize = 0x80 } = resource
  const data = rom.bytes.subarray(baseAddress, baseAddress + inputSize)
  const tiles: KidImageData[] = []
  for (let i = 0; i < data.length; i += TILE_INDEXED4_BYTE_COUNT) {
    const tile = data.subarray(i, i + TILE_INDEXED4_BYTE_COUNT)
    tiles.push(KidImageData.from(tile, TILE_WIDTH, TILE_WIDTH, 'Indexed4'))
  }
  const hash = crc32(data)
  return {
    ...resource,
    loaded: true,
    data,
    tiles,
    hash,
    inputSize,
  }
}

export function loadAnimationRomResource(
  rom: Rom,
  resource: AnimationRomResourceUnloaded,
): AnimationRomResourceLoaded {
  const { baseAddress, frameCount = 0, totalFrames = 0, terminatorAddress, stepAddresses = [] } = resource
  const endAddress = terminatorAddress ? terminatorAddress + 2 : baseAddress
  const inputSize = Math.max(0, endAddress - baseAddress)
  const bytes = rom.bytes.subarray(baseAddress, baseAddress + inputSize)
  const hash = crc32(bytes)
  return {
    ...resource,
    loaded: true,
    frameCount,
    totalFrames,
    stepAddresses,
    hash,
    inputSize,
  }
}

export function loadAnimationStepRomResource(
  rom: Rom,
  resource: AnimationStepRomResourceUnloaded,
): AnimationStepRomResourceLoaded {
  const { baseAddress } = resource
  const kind = resource.kind ?? rom.data.getUint8(baseAddress)
  const delay = resource.delay ?? (kind === 1 ? rom.data.getUint8(baseAddress + 1) : 0)
  const spriteOffset = resource.spriteOffset ?? (kind === 1 ? rom.data.getUint16(baseAddress + 2, false) : undefined)
  const spriteAddress =
    resource.spriteAddress ??
    (kind === 1 && spriteOffset !== undefined
      ? (() => {
          const fallbackAssetTable = 0xa09fe
          return rom.readPtr(fallbackAssetTable + spriteOffset)
        })()
      : undefined)
  const nextFrameAddress =
    resource.nextFrameAddress ??
    (kind === 1
      ? baseAddress + 4
      : kind === 2
        ? baseAddress + 1 - rom.data.getUint8(baseAddress + 1)
        : undefined)
  const inputSize = kind === 1 ? 4 : kind === 2 ? 2 : 1
  const bytes = rom.bytes.subarray(baseAddress, baseAddress + inputSize)
  const hash = crc32(bytes)
  return {
    ...resource,
    loaded: true,
    kind,
    delay,
    spriteOffset,
    spriteAddress,
    nextFrameAddress,
    hash,
    inputSize,
  }
}

export function loadLinkedSpriteFrameResource(
  rom: Rom,
  resource: LinkedSpriteFrameRomResourceUnloaded,
): LinkedSpriteFrameRomResourceLoaded {
  const { baseAddress } = resource
  const xOffset = rom.data.getInt8(baseAddress)
  const yOffset = rom.data.getInt8(baseAddress + 1)
  const width = rom.data.getUint16(baseAddress + 2, false)
  const height = rom.data.getUint16(baseAddress + 4, false)
  const start = baseAddress + 6
  const dataSize = calculatePlayerSpriteDataSize(width, height)
  const data = rom.bytes.subarray(start, start + dataSize)
  const inputSize = 6 + dataSize
  const bytes = rom.bytes.subarray(baseAddress, baseAddress + inputSize)
  const hash = crc32(bytes)
  return {
    ...resource,
    loaded: true,
    hash,
    inputSize,
    width,
    height,
    xOffset,
    yOffset,
    data,
  }
}

export function loadSpriteCollisionRomResource(
  rom: Rom,
  resource: SpriteCollisionRomResourceUnloaded,
): SpriteCollisionRomResourceLoaded {
  const { baseAddress, wordIndex, isInvalid } = resource
  const rIsInvalid = isInvalid ?? false
  const left = rIsInvalid ? 0 : rom.data.getInt16(baseAddress, false)
  const isZero = rIsInvalid || left === 0
  const width = isZero ? 0 : rom.data.getInt16(baseAddress + 2, false)
  const top = isZero ? 0 : rom.data.getInt16(baseAddress + 4, false)
  const height = isZero ? 0 : rom.data.getInt16(baseAddress + 6, false)
  const inputSize = isInvalid ? 0 : isZero ? 2 : 8
  const bytes = rom.bytes.subarray(baseAddress, baseAddress + inputSize)
  const hash = crc32(bytes)
  return {
    ...resource,
    wordIndex,
    loaded: true,
    inputSize,
    hash,
    isZero,
    left,
    width,
    top,
    height,
    isInvalid: rIsInvalid,
  }
}

type CreateResourceExtraProps<T extends (typeof ResourceTypes)[number]> = Omit<
  Extract<AllRomResourcesUnloaded, { type: T }>,
  'baseAddress' | 'type' | 'loaded'
>

// Helpers for resources

export class ResourceManager {
  resources: RomResourceIndex = new Map()
  resourcesByType: RomResourcesByType = new Map()
  referencesMap: Map<number, Set<number>> = new Map()
  referencedByMap: Map<number, Set<number>> = new Map()
  softReferenceKeys: Set<string> = new Set()

  constructor(public rom: Rom) {
    for (const type of ResourceTypes) {
      this.resourcesByType.set(type, new Set())
    }
  }

  /**
   * Create a new resource and add it to the resources map (do not load)
   *
   * @param baseAddress
   * @param type
   * @param args Optional, but required if the resource has extra properties
   * @returns
   */
  createResource<T extends (typeof ResourceTypes)[number] = 'unknown'>(
    baseAddress: number,
    type: T = 'unknown' as T,
    ...args: object extends CreateResourceExtraProps<T>
      ? [extra?: CreateResourceExtraProps<T>]
      : [extra: CreateResourceExtraProps<T>]
  ): AllRomResources & { type: T } {
    const extra = args[0] ?? ({} as CreateResourceExtraProps<T>)
    const resource = {
      baseAddress,
      type,
      loaded: false,
      ...extra,
    } as Extract<AllRomResourcesUnloaded, { type: T }>
    return this.addResource(resource) as AllRomResources & { type: T }
  }

  private addResource(resource: AllRomResources): AllRomResources {
    // First, if the resource not already exists, add it to the resources map
    const existingResource = this.resources.get(resource.baseAddress)
    if (!existingResource) {
      this.resources.set(resource.baseAddress, resource)
      this.resourcesByType.get(resource.type).add(resource.baseAddress)
      return resource
    } else {
      if (existingResource.type === resource.type) {
        const newResource = { ...existingResource, ...resource } as AllRomResources
        this.resources.set(resource.baseAddress, newResource)
        return newResource
      }
      // If this resource is 'unknown', We will use the type of the existing resource but give it the properties of the new resource
      if (resource.type === 'unknown') {
        const typeObject = { type: existingResource.type }
        const newResource = { ...existingResource, ...resource, ...typeObject } as AllRomResources
        this.resources.set(resource.baseAddress, newResource)
        this.resourcesByType.get(resource.type).delete(resource.baseAddress)
        this.resourcesByType.get(newResource.type).add(resource.baseAddress)
        return newResource
      }
      // Do the same if its the opposite... but the new resources take precedence
      if (existingResource.type === 'unknown') {
        const typeObject = { type: resource.type }
        const newResource = { ...resource, ...existingResource, ...typeObject } as AllRomResources
        this.resourcesByType.get(existingResource.type).delete(resource.baseAddress)
        this.resourcesByType.get(newResource.type).add(resource.baseAddress)
        this.resources.set(resource.baseAddress, newResource)
        return newResource
      }
      throw new Error(
        `Resource at address ${resource.baseAddress} already exists and is of type ${existingResource.type}`,
      )
    }
  }

  addReference(resource: AllRomResources | number, ...addresses: number[]) {
    const resourceAddress = typeof resource === 'number' ? resource : resource.baseAddress
    let currentReferences = this.referencesMap.get(resourceAddress)
    if (!currentReferences) {
      currentReferences = new Set()
      this.referencesMap.set(resourceAddress, currentReferences)
    }
    for (const address of addresses) {
      const resource = this.resources.get(address)
      if (!resource) {
        this.createResource(address, 'unknown')
      }
      currentReferences.add(address)
      this.softReferenceKeys.delete(`${resourceAddress}:${address}`)
      let currentReferencedBy = this.referencedByMap.get(address)
      if (!currentReferencedBy) {
        currentReferencedBy = new Set()
        this.referencedByMap.set(address, currentReferencedBy)
      }
      currentReferencedBy.add(resourceAddress)
    }
  }

  addSoftReference(resource: AllRomResources | number, ...addresses: number[]) {
    const resourceAddress = typeof resource === 'number' ? resource : resource.baseAddress
    let currentReferences = this.referencesMap.get(resourceAddress)
    if (!currentReferences) {
      currentReferences = new Set()
      this.referencesMap.set(resourceAddress, currentReferences)
    }
    for (const address of addresses) {
      const existing = this.resources.get(address)
      if (!existing) {
        this.createResource(address, 'unknown')
      }

      const key = `${resourceAddress}:${address}`
      if (!currentReferences.has(address)) {
        currentReferences.add(address)
        this.softReferenceKeys.add(key)
      }

      let currentReferencedBy = this.referencedByMap.get(address)
      if (!currentReferencedBy) {
        currentReferencedBy = new Set()
        this.referencedByMap.set(address, currentReferencedBy)
      }
      currentReferencedBy.add(resourceAddress)
    }
  }

  inferReferencesByCommonParents() {
    for (const [sourceAddress, refs] of this.referencesMap.entries()) {
      const sourceResource = this.resources.get(sourceAddress)
      if (!sourceResource) {
        continue
      }

      const referencedResources = Array.from(refs)
        .map((address) => this.resources.get(address))
        .filter((resource): resource is AllRomResources => !!resource)

      const palettes = referencedResources.filter((resource) => resource.type === 'palette')
      const sheets = referencedResources.filter((resource) => resource.type === 'sheet')
      if (palettes.length === 0 || sheets.length === 0) {
        continue
      }

      for (const sheet of sheets) {
        this.addSoftReference(
          sheet,
          ...palettes.map((palette) => palette.baseAddress),
        )
      }
    }
  }

  removeReference(resource: AllRomResources | number, ...addresses: number[]) {
    const resourceAddress = typeof resource === 'number' ? resource : resource.baseAddress
    const currentReferences = this.referencesMap.get(resourceAddress)
    if (!currentReferences) {
      return
    }
    for (const address of addresses) {
      this.softReferenceKeys.delete(`${resourceAddress}:${address}`)
      currentReferences.delete(address)
      const currentReferencedBy = this.referencedByMap.get(address)
      if (currentReferencedBy) {
        currentReferencedBy.delete(resourceAddress)
        if (currentReferencedBy.size === 0) {
          this.referencedByMap.delete(address)
        }
      }
    }
    if (currentReferences.size === 0) {
      this.referencesMap.delete(resourceAddress)
    }
  }

  getAllRelated(resource: AllRomResources | number): number[] {
    const address = typeof resource === 'number' ? resource : resource.baseAddress
    const referenced = this.referencesMap.get(address)
    const referencedBy = this.referencedByMap.get(address)
    return Array.from(new Set([...(referenced ?? []), ...(referencedBy ?? [])]))
  }

  getReferences(resource: AllRomResources | number): number[] {
    const address = typeof resource === 'number' ? resource : resource.baseAddress
    return Array.from(this.referencesMap.get(address) ?? [])
  }

  getReferencedBy(resource: AllRomResources | number): number[] {
    const address = typeof resource === 'number' ? resource : resource.baseAddress
    return Array.from(this.referencedByMap.get(address) ?? [])
  }

  isSoftReference(source: AllRomResources | number, target: AllRomResources | number): boolean {
    const sourceAddress = typeof source === 'number' ? source : source.baseAddress
    const targetAddress = typeof target === 'number' ? target : target.baseAddress
    return this.softReferenceKeys.has(`${sourceAddress}:${targetAddress}`)
  }

  getReferenceKind(
    source: AllRomResources | number,
    target: AllRomResources | number,
  ): 'hard' | 'soft' | null {
    const sourceAddress = typeof source === 'number' ? source : source.baseAddress
    const targetAddress = typeof target === 'number' ? target : target.baseAddress
    const refs = this.referencesMap.get(sourceAddress)
    if (!refs || !refs.has(targetAddress)) {
      return null
    }
    return this.isSoftReference(sourceAddress, targetAddress) ? 'soft' : 'hard'
  }

  getMultipleResources(resources: Iterable<number>): AllRomResources[] {
    return Array.from(resources).flatMap((address) => {
      const resource = this.resources.get(address)
      return resource ? [resource] : []
    })
  }

  async getMultipleResourcesLoaded(resources: Iterable<number>): Promise<AllRomResourcesLoaded[]> {
    return Promise.all(
      Array.from(resources).map((address) =>
        this.loadResource(this.resources.get(address) as AllRomResourcesUnloaded),
      ),
    ) as Promise<AllRomResourcesLoaded[]>
  }

  getReferencesResources(resource: AllRomResources | number): AllRomResources[] {
    return this.getMultipleResources(this.getReferences(resource))
  }

  getReferencesResourcesLoaded(
    resource: AllRomResources | number,
  ): Promise<AllRomResourcesLoaded[]> {
    return this.getMultipleResourcesLoaded(this.getReferences(resource))
  }

  getReferencesResourcesOfType<T extends (typeof ResourceTypes)[number]>(
    resource: AllRomResources | number,
    type: T,
  ): Extract<AllRomResources, { type: T }>[] {
    return this.getReferencesResources(resource).filter(
      (resource) => resource.type === type,
    ) as Extract<AllRomResources, { type: T }>[]
  }

  async getReferencesResourcesOfTypeLoaded<T extends (typeof ResourceTypes)[number]>(
    resource: AllRomResources | number,
    type: T,
  ): Promise<(AllRomResourcesLoaded & { type: T })[]> {
    return this.getReferencesResourcesLoaded(resource).then(
      (resources) =>
        resources.filter((resource) => resource.type === type) as (AllRomResourcesLoaded & {
          type: T
        })[],
    )
  }

  getResource<T extends (typeof ResourceTypes)[number]>(
    address: number,
  ): (AllRomResources & { type: T }) | undefined {
    return this.resources.get(address) as (AllRomResources & { type: T }) | undefined
  }

  async getResourceLoaded<T extends (typeof ResourceTypes)[number]>(
    address: number,
  ): Promise<(AllRomResourcesLoaded & { type: T }) | undefined> {
    const returnResource = this.resources.get(address)
    if (!returnResource) {
      return undefined
    }
    return (await this.loadResource(
      returnResource as AllRomResourcesUnloaded,
    )) as AllRomResourcesLoaded & { type: T }
  }

  getResourceAddressesByType<T extends (typeof ResourceTypes)[number]>(type: T | T[]): number[] {
    // Get the merged types of one or more types
    if (typeof type === 'string') {
      return Array.from(this.resourcesByType.get(type))
    } else {
      return type.flatMap((t) => Array.from(this.resourcesByType.get(t)))
    }
  }
  getResourcesByType<T extends (typeof ResourceTypes)[number]>(
    type: T | T[],
  ): (AllRomResources & { type: T })[] {
    const returns = Array.from(
      this.getResourceAddressesByType(type)
        .values()
        .map((address) => this.resources.get(address) as AllRomResources & { type: T }),
    )
    return returns
  }

  async loadResource<T extends (typeof ResourceTypes)[number]>(
    resource: AllRomResources & { type: T },
  ): Promise<AllRomResourcesLoaded & { type: T }> {
    if (isLoadedResource(resource)) {
      return resource as AllRomResourcesLoaded & { type: T }
    }
    if ((resource as BaseRomResource).type == 'unknown') {
      throw new Error('Cannot load unknown resource')
    }
    const loader = ResourceTypeLoaderMap[resource.type] as ResourceLoaderMap[T] | undefined
    if (!loader) {
      throw new Error(`No loader found for resource type ${(resource as BaseRomResource).type}`)
    }
    const loaded = (await loader(
      this.rom,
      resource as UnloadedResourceOfType<T>,
    )) as AllRomResourcesLoaded & { type: T }
    this.addResource(loaded)
    return loaded
  }
}
