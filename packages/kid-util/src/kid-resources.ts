import { crc32 } from './hash'
import { calculatePlayerSpriteDataSize } from './kid-utils'
import type { Rom } from './kid-rom'
import { unpackKidFormat } from './unpack-kid'

export type PackedFormat = 'kid' | 'enigma'

export const ResourceTypes = [
  'unknown',
  'sheet',
  'unlinked-sprite-frame',
  'linked-sprite-frame',
  'sprite-collision',
  'animation-frame',
  'plane',
  'level-header',
] as const

export type RomResourceIndex = Map<number, BaseRomResource>
export type RomResourcesByType = Record<typeof ResourceTypes[number], Set<number>>

export const ResourceTypeLoaderMap: ResourceLoaderMap = {
  'level-header': loadLevelHeaderRomResource,
  sheet: loadSheetRomResource,
  'unlinked-sprite-frame': loadUnlinkedSpriteFrameResource,
  'linked-sprite-frame': loadLinkedSpriteFrameResource,
  'sprite-collision': loadSpriteCollisionRomResource,
}

export type AllRomResources =
  | LevelHeaderRomResource
  | SheetRomResource
  | UnlinkedSpriteFrameRomResource
  | LinkedSpriteFrameRomResource
  | SpriteCollisionRomResource

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
  ) => LoadedResourceOfType<K>
}>

export type BaseRomResource = {
  baseAddress: number
  type: (typeof ResourceTypes)[number]
  tags?: string[]
  name?: string
  description?: string
  related: Set<number>
}

export type UnloadedRomResource = BaseRomResource & {
  loaded: false
}

export type LoadedRomResource = BaseRomResource & {
  loaded: true
  hash: number
  inputSize: number
}

export function isLoadedResource(resource: BaseRomResource): resource is LoadedRomResource {
  return (resource as LoadedRomResource).loaded
}

export function isSheetResource(resource: BaseRomResource): resource is SheetRomResource {
  return resource.type === 'sheet'
}

export function isSpriteFrameResource(
  resource: BaseRomResource,
): resource is SpriteFrameRomResource {
  return resource.type === 'unlinked-sprite-frame' || resource.type === 'linked-sprite-frame'
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
  themeIndex: number
  backgroundIndex: number
  backgroundMisc: number
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
  dataStart: number
  tile: number
}
export type KidPacked = {
  format: 'kid'
}

export type PackedData = EnigmaPacked | KidPacked

export type PackableResource = {
  packed?: PackedData
}

export type SheetRomResourceUnloaded = PackableResource &
  UnloadedRomResource & {
    type: 'sheet'
    tableIndex?: number
    inputSize?: number
  }

export type SheetRomResourceLoaded = PackableResource &
  LoadedRomResource & {
    type: 'sheet'
    tableIndex?: number
    data: Uint8Array
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

export function loadLevelHeaderRomResource(
  rom: Rom,
  resource: LevelHeaderRomResourceUnloaded,
): LevelHeaderRomResourceLoaded {
  const { baseAddress } = resource
  const width = rom.data.getUint8(baseAddress)
  const heightComposite = rom.data.getUint8(baseAddress + 1)
  const yOffset = heightComposite >> 6
  const height = heightComposite & 0x3f
  // TODO: Implement theme and background
  // const themeComposite = rom.data.getUint8(readPos + 2)
  // const backgroundComposite = rom.data.getUint8(readPos + 3)
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
    height,
    yOffset,
    themeIndex: 0,
    backgroundIndex: 0,
    backgroundMisc: 0,
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
      rInputSize = unpacked.totalInputSize
    } else {
      throw new Error(`Unsupported packed format ${packed.format}`)
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

export function loadResource(rom: Rom, resource: AllRomResources): LoadedRomResource {
  if (isLoadedResource(resource)) {
    return resource
  }
  if ((resource as BaseRomResource).type == 'unknown') {
    throw new Error('Cannot load unknown resource')
  }
  const loader = ResourceTypeLoaderMap[resource.type]
  if (!loader) {
    throw new Error(`No loader found for resource type ${(resource as BaseRomResource).type}`)
  }
  const loaded = loader(rom, resource as never)
  rom.addResource(loaded)
  return loaded
}

export function addResource(rom: Rom, resource: BaseRomResource) {
  const existingResource = rom.resources.get(resource.baseAddress)
  if (existingResource) {
    if (resource.type !== existingResource.type) {
      if (resource.type !== 'unknown' && existingResource.type !== 'unknown') {
        throw new Error(`Resource type mismatch at address ${resource.baseAddress}`)
      }
    }
    // Merge the related resources
    const related = new Set([...existingResource.related, ...resource.related])

    // Merge the new resource into the existing one, prefers the typo of not 'unknown'
    const types = [existingResource.type, resource.type]
    const type: (typeof ResourceTypes)[number] = types.find((t) => t !== 'unknown') ?? 'unknown'
    const mergedResource = { ...existingResource, ...resource, type, related }
    rom.resources.set(resource.baseAddress, mergedResource)
  } else {
    rom.resources.set(resource.baseAddress, resource)
  }
  if (resource.type !== 'unknown') {
    rom.resourcesByType[resource.type]?.add(resource.baseAddress)
  }
  checkRelated(rom, resource)
}

export function createResource(
  baseAddress: number,
  type: (typeof ResourceTypes)[number] = 'unknown',
  related: number[] = [],
): BaseRomResource {
  return { baseAddress, type, related: new Set(related) }
}

export function checkRelated(rom: Rom, resource: BaseRomResource) {
  for (const related of resource.related) {
    const relatedResource = rom.resources.get(related)
    if (!relatedResource) {
      // Create the related resource
      rom.resources.set(related, {
        type: 'unknown',
        baseAddress: related,
        related: new Set([resource.baseAddress]),
      })
    } else {
      // Add the resource to the related set
      relatedResource.related.add(resource.baseAddress)
    }
  }
}
