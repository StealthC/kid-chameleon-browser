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
  'plane',
  'level-header',
  'palette',
  'palette-map',
] as const

export type RomResourceIndex = Map<number, BaseRomResource>
export type RomResourcesByType = Map<(typeof ResourceTypes)[number], Set<number>>

export const ResourceTypeLoaderMap: ResourceLoaderMap = {
  'level-header': loadLevelHeaderRomResource,
  sheet: loadSheetRomResource,
  'unlinked-sprite-frame': loadUnlinkedSpriteFrameResource,
  'linked-sprite-frame': loadLinkedSpriteFrameResource,
  'sprite-collision': loadSpriteCollisionRomResource,
  plane: loadPlaneRomResource,
  palette: loadPaletteRomResource,
  'palette-map': loadPaletteMapRomResource,
}

export type AllRomResources = AllRomResourcesLoaded | AllRomResourcesUnloaded

export type AllRomResourcesUnloaded =
  | LevelHeaderRomResourceUnloaded
  | SheetRomResourceUnloaded
  | UnlinkedSpriteFrameRomResourceUnloaded
  | LinkedSpriteFrameRomResourceUnloaded
  | SpriteCollisionRomResourceUnloaded
  | PlaneRomResourceUnloaded
  | PaletteRomResourceUnloaded
  | PaletteMapRomResourceUnloaded
  | UnknownRomResourceUnloaded

export type AllRomResourcesLoaded =
  | LevelHeaderRomResourceLoaded
  | SheetRomResourceLoaded
  | UnlinkedSpriteFrameRomResourceLoaded
  | LinkedSpriteFrameRomResourceLoaded
  | SpriteCollisionRomResourceLoaded
  | PlaneRomResourceLoaded
  | PaletteRomResourceLoaded
  | PaletteMapRomResourceLoaded

export type UnknownRomResourceUnloaded = UnloadedRomResource & {
  type: 'unknown'
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
  const colors = []
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
  const map = []
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
  ): Extract<AllRomResourcesUnloaded, { type: T }> {
    const extra = args[0] ?? ({} as CreateResourceExtraProps<T>)
    const resource = {
      baseAddress,
      type,
      loaded: false,
      ...extra,
    } as Extract<AllRomResourcesUnloaded, { type: T }>
    return this.#addResource(resource) as Extract<AllRomResourcesUnloaded, { type: T }>
  }

  #addResource(resource: AllRomResources): AllRomResources {
    // First, if the resource not already exists, add it to the resources map
    const existingResource = this.resources.get(resource.baseAddress)
    if (!existingResource) {
      this.resources.set(resource.baseAddress, resource)
      this.resourcesByType.get(resource.type)!.add(resource.baseAddress)
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
        this.resourcesByType.get(resource.type)!.delete(resource.baseAddress)
        this.resourcesByType.get(newResource.type)!.add(resource.baseAddress)
        return newResource
      }
      // Do the same if its the opposite... but the new resources take precedence
      if (existingResource.type === 'unknown') {
        const typeObject = { type: resource.type }
        const newResource = { ...resource, ...existingResource, ...typeObject } as AllRomResources
        this.resourcesByType.get(existingResource.type)!.delete(resource.baseAddress)
        this.resourcesByType.get(newResource.type)!.add(resource.baseAddress)
        this.resources.set(resource.baseAddress, newResource)
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
      currentReferences.add(address)
      let currentReferencedBy = this.referencedByMap.get(address)
      if (!currentReferencedBy) {
        currentReferencedBy = new Set()
        this.referencedByMap.set(address, currentReferencedBy)
      }
      currentReferencedBy.add(resourceAddress)
    }
  }

  removeReference(resource: AllRomResources | number, ...addresses: number[]) {
    const resourceAddress = typeof resource === 'number' ? resource : resource.baseAddress
    const currentReferences = this.referencesMap.get(resourceAddress)
    if (!currentReferences) {
      return
    }
    for (const address of addresses) {
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

  getAllRelated(resource: BaseRomResource): number[] {
    const referenced = this.referencesMap.get(resource.baseAddress) ?? []
    const referencedBy = this.referencedByMap.get(resource.baseAddress) ?? []
    return Array.from(new Set([...referenced, ...referencedBy]))
  }

  getResourcesByType<T extends (typeof ResourceTypes)[number]>(type: T): Set<number> {
    return this.resourcesByType.get(type)!
  }

  async loadResource<T extends (typeof ResourceTypes)[number]>(
    rom: Rom,
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
      rom,
      resource as UnloadedResourceOfType<T>,
    )) as AllRomResourcesLoaded & { type: T }
    this.#addResource(loaded)
    return loaded
  }
}
