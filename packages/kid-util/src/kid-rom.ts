import {
  addResource,
  checkRelated,
  createResource,
  loadResource,
  ResourceTypes,
  type AllRomResources,
  type BaseRomResource,
  type LoadedRomResource,
  type RomResourceIndex,
  type RomResourcesByType,
  type SheetRomResourceUnloaded,
} from './kid-resources'
import { readPtr } from './kid-utils'
import { KnownRoms, type KnowRomDetails } from './tables/known-roms'
import { PatternFinder } from './pattern-finder'
import { sha256, mdCrc } from './hash'
import { unpackKidFormat, type KidUnpackResults } from './unpack-kid'
import {
  tryFindingAllKnownAddresses,
  tryFindingResouces,
  type KnownAddresses,
} from './rom-discovery'

export type FrameCollision = {
  left: number
  width: number
  top: number
  height: number
  isZero?: boolean
  isInvalid?: boolean
  address: number
}

export type RomConfig = {
  NumberOfLevels: number
  AssetPtrTableBase: number
}

export const DefaultRomConfig: RomConfig = {
  NumberOfLevels: 126,
  AssetPtrTableBase: 0xa09fe,
}

export type MdCartHeader = {
  consoleName: string
  releaseDate: string
  domesticName: string
  internationalName: string
  version: string
  checksum: number
  calculatedChecksum?: number
  ioSupport: string
  romStart: number
  romEnd: number
  ramStart: number
  ramEnd: number
  memo: string
  region: string
}

export type RomFileDetails = {
  size: number
  sha256: string
  header: MdCartHeader
  known?: KnowRomDetails
}

export type RomTables = {
  assetIndexTable: (number | null)[]
  collisionIndexTable: (number | null)[]
  levelIndexTable: (number | null)[]
}

export class Rom {
  data: DataView
  resources: RomResourceIndex = new Map()
  resourcesByType: RomResourcesByType;
  knownAddresses: KnownAddresses = {}
  // References to addresses gotten from many tables
  public tables: RomTables = {
    assetIndexTable: [],
    collisionIndexTable: [],
    levelIndexTable: [],
  }
  private _details: RomFileDetails | null = null

  private _resourcesLoaded = false
  constructor(public bytes: Uint8Array) {
    this.data = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
    this.resourcesByType = Object.fromEntries(
      ResourceTypes.map((type) => {
        return [type, new Set()]
      })
    ) as RomResourcesByType
  }
  async getRomFileDetails(): Promise<RomFileDetails> {
    if (this._details) return this._details
    const size = this.bytes.length
    const hash = await sha256(this.bytes)
    const header = this.readMdCartHeader()
    const known = KnownRoms[hash]
    return {
      size,
      sha256: hash,
      header,
      known,
    }
  }

  private readStringChars(ptr: number, length: number): string {
    return String.fromCharCode(...this.bytes.subarray(ptr, ptr + length))
  }

  readMdCartHeader(calculateChecksum = true): MdCartHeader {
    const headerStart = 0x100
    const consoleName = this.readStringChars(headerStart + 0x00, 0x10)
    const releaseDate = this.readStringChars(headerStart + 0x10, 0x10)
    const domesticName = this.readStringChars(headerStart + 0x20, 0x30)
    const internationalName = this.readStringChars(headerStart + 0x50, 0x30)
    const version = this.readStringChars(headerStart + 0x80, 0xe)
    const checksum = this.data.getUint16(headerStart + 0x8e, false)
    const ioSupport = this.readStringChars(headerStart + 0x90, 0x10)
    const romStart = this.data.getUint32(headerStart + 0xa0, false)
    const romEnd = this.data.getUint32(headerStart + 0xa4, false)
    const ramStart = this.data.getUint32(headerStart + 0xa8, false)
    const ramEnd = this.data.getUint32(headerStart + 0xac, false)
    const memo = this.readStringChars(headerStart + 0xc0, 0x30)
    const region = this.readStringChars(headerStart + 0xf0, 0x10)
    let calculatedChecksum: number | undefined
    if (calculateChecksum) {
      calculatedChecksum = mdCrc(this.bytes)
    }
    return {
      consoleName,
      releaseDate,
      domesticName,
      internationalName,
      version,
      checksum,
      calculatedChecksum,
      ioSupport,
      romStart,
      romEnd,
      ramStart,
      ramEnd,
      memo,
      region,
    }
  }

  readPtr(ptr: number): number {
    return readPtr(this.data, ptr)
  }

  findPattern(pattern: string): number {
    const patternFinder = new PatternFinder(pattern, this.bytes)
    const pos = patternFinder.findNext()
    if (pos === -1) {
      throw new Error(`Pattern ${pattern} not found`)
    }
    return pos
  }

  unpackKidFormat(ptr: number): KidUnpackResults {
    return unpackKidFormat(
      new DataView(this.bytes.buffer, this.bytes.byteOffset + ptr, this.bytes.length - ptr),
    )
  }

  loadResources() {
    if (this._resourcesLoaded) return this.resourcesByType
    tryFindingAllKnownAddresses(this)
    tryFindingResouces(this)

    try {
      this._findUntabledPackedTileSheetsDirect1().map((result) => {
        const resource = this.createResource(result.ptr, 'sheet') as SheetRomResourceUnloaded
        resource.packed = { format: 'kid' }
        this.addResource(resource)
      })
      this._findUntabledPackedTileSheetsDirect2().map((result) => {
        const resource = this.createResource(result.ptr, 'sheet') as SheetRomResourceUnloaded
        resource.packed = { format: 'kid' }
        this.addResource(resource)
      })
      this._findUntabledPackedTileSheetsRelative1().map((result) => {
        const resource = this.createResource(result.ptr, 'sheet') as SheetRomResourceUnloaded
        resource.packed = { format: 'kid' }
        this.addResource(resource)
      })
      this._findUntabledPackedTileSheetsRelative2().map((result) => {
        const resource = this.createResource(result.ptr, 'sheet') as SheetRomResourceUnloaded
        resource.packed = { format: 'kid' }
        this.addResource(resource)
      })
      this._findUntabledPackedTileSheetsWithPaletteSwap1().map((result) => {
        const resource = this.createResource(result.ptr, 'sheet') as SheetRomResourceUnloaded
        resource.packed = { format: 'kid' }
        this.addResource(resource)
      })
      this._findUntabledPackedTileSheetsWithPaletteSwap2().map((result) => {
        const resource = this.createResource(result.ptr, 'sheet') as SheetRomResourceUnloaded
        resource.packed = { format: 'kid' }
        this.addResource(resource)
      })
    } catch (e) {
      console.error(e)
    }

    this._resourcesLoaded = true
    console.log('Resources loaded', Object.keys(this.resources).length)
    return this.resourcesByType
  }

  createResource(
    baseAddress: number,
    type?: (typeof ResourceTypes)[number],
    related: number[] = [],
  ): BaseRomResource {
    return createResource(baseAddress, type, related)
  }

  addResource(resource: BaseRomResource) {
    addResource(this, resource)
  }

  checkRelated(resource: BaseRomResource) {
    checkRelated(this, resource)
  }

  loadResource(resource: AllRomResources): LoadedRomResource {
    return loadResource(this, resource)
  }

  getResource(address: number): BaseRomResource | undefined {
    return this.resources.get(address)
  }

  getLoadedResource(address: number): LoadedRomResource | null {
    const resource = this.resources.get(address)
    if (resource) {
      return this.loadResource(resource as AllRomResources)
    }
    return null
  }

  private _findUntabledPackedTileSheetsDirect1() {
    /*
     *
     * 0001d188 30  3c  7b       move.w              #0x7ba0 ,D0w
     *          a0
     * 0001d18c 41  f9  00       lea                 (BYTE_ARRAY_0002d51b ).l,A0
     *          02  d5  1b
     * 0001d192 4e  b9  00       jsr                 UnpackGfx .l
     *          01  19  38
     *
     */
    const pattern = '30 3c ?? ?? 41 f9 ?? ?? ?? ?? 4e b9 ?? ?? ?? ??' // Calls to UnpackGfx
    const patternFinder = new PatternFinder(pattern, this.bytes)
    const matchs = patternFinder.findAll()
    const results = matchs.map((pos) => {
      const tile = this.data.getUint16(pos + 2, false)
      const ptr = this.readPtr(pos + 6)
      return { pos, tile, ptr }
    })
    return results
  }

  private _findUntabledPackedTileSheetsDirect2() {
    /*
     *
     * 0001b58a 30  3c  9a       move.w              #-0x65a0 ,D0w
     *          60
     * 0001b58e 20  7c  00       movea.l             #KidTitleTextPackedGFX ,A0
     *          02  49  85
     * 0001b594 4e  b9  00       jsr                 UnpackGfx .l
     *          01  19  38
     *
     */
    const pattern = '30 3c ?? ?? 20 7C ?? ?? ?? ?? 4e b9 ?? ?? ?? ??' // Calls to UnpackGfx
    const patternFinder = new PatternFinder(pattern, this.bytes)
    const matchs = patternFinder.findAll()
    const results = matchs.map((pos) => {
      const tile = this.data.getUint16(pos + 2, false)
      const ptr = this.readPtr(pos + 6)
      return { pos, tile, ptr }
    })
    return results
  }

  private _findUntabledPackedTileSheetsRelative1() {
    /*
     *
     *
     * 0001d15e 30  3c  27       move.w              #0x27c0 ,D0w
     *          c0
     * 0001d162 41  fa  2a       lea                 (0x2abc ,PC )=> EndingBossScreenPackedGFX ,A0
     *          bc
     * 0001d166 4e  b9  00       jsr                 UnpackGfx .l
     *          01  19  38
     *
     */
    const pattern = '30 3c ?? ?? 41 fa ?? ?? 4e b9 ?? ?? ?? ??' // Calls to UnpackGfx
    const patternFinder = new PatternFinder(pattern, this.bytes)
    const matchs = patternFinder.findAll()
    const results = matchs.map((pos) => {
      const tile = this.data.getUint16(pos + 2, false)
      const rel = this.data.getInt16(pos + 6, false)
      const ptr = pos + 6 + rel
      return { pos, rel, tile, ptr }
    })
    return results
  }

  private _findUntabledPackedTileSheetsRelative2() {
    /*
     *
     * 00012de0 30  3c  17       move.w              #0x1780 ,D0w
     *          80
     * 00012de4 41  fa  01       lea                 (0x14a ,PC )=> PackedGFXSegaLogo ,A0
     *          4a
     * 00012de8 61  00  15       bsr.w               UnpackGfx
     *          10
     *
     */
    const pattern = '30 3c ?? ?? 41 fa ?? ?? 61 00 ?? ?? ?? ??' // Calls to UnpackGfx
    const patternFinder = new PatternFinder(pattern, this.bytes)
    const matchs = patternFinder.findAll()
    const results = matchs.map((pos) => {
      const tile = this.data.getUint16(pos + 2, false)
      const rel = this.data.getInt16(pos + 6, false)
      const ptr = pos + 6 + rel
      return { pos, rel, tile, ptr }
    })
    return results
  }

  private _findUntabledPackedTileSheetsWithPaletteSwap1() {
    /*
     *
     * 0001d0ec 30  3c  17       move.w              #0x1780 ,D0w
     *          80
     * 0001d0f0 20  78  71       movea.l             (-> HologramBackgroundPackedGFX ).w,A0 => Hologra  = 0000c65a
     *          86
     * 0001d0f4 47  fa  00       lea                 (0x22 ,PC )=> EndingHologramBackgroundPaletteMap
     *          22
     * 0001d0f8 4e  b9  00       jsr                 UnpackGFXWithPaletteMap .l
     *          01  19  40
     *
     */
    const pattern = '30 3c ?? ?? 20 78 ?? ?? 47 fa ?? ?? 4e b9 ?? ?? ?? ??' // Calls to UnpackGFXWithPaletteMap
    const patternFinder = new PatternFinder(pattern, this.bytes)
    const matchs = patternFinder.findAll()
    const results = matchs.map((pos) => {
      const tile = this.data.getUint16(pos + 2, false)
      const ptr = this.readPtr(this.data.getInt16(pos + 6, false))
      const palRel = this.data.getInt16(pos + 10, false)
      const palPtr = pos + 10 + palRel
      return { pos, palRel, palPtr, tile, ptr }
    })
    return results
  }

  private _findUntabledPackedTileSheetsWithPaletteSwap2() {
    /*
     *
     * 0001b128 30  3c  fa       move.w              #-0x5a0 ,D0w
     *          60
     * 0001b12c 41  fa  29       lea                 (0x2958 ,PC )=> TitleTextPackedGFX ,A0
     *          58
     * 0001b130 47  fa  12       lea                 (0x12be ,PC )=> TitleTextAlternatePaletteMapping
     *          be
     * 0001b134 4e  b9  00       jsr                 UnpackGFXWithPaletteMap .l
     *          01  19  40
     *
     *
     */
    const pattern = '30 3c ?? ?? 41 fa ?? ?? 47 fa ?? ?? 4e b9 ?? ?? ?? ??' // Calls to UnpackGFXWithPaletteMap
    const patternFinder = new PatternFinder(pattern, this.bytes)
    const matchs = patternFinder.findAll()
    const results = matchs.map((pos) => {
      const tile = this.data.getUint16(pos + 2, false)
      const rel = this.data.getInt16(pos + 6, false)
      const ptr = pos + 6 + rel
      const palRel = this.data.getInt16(pos + 10, false)
      const palPtr = pos + 10 + palRel
      return { pos, palRel, palPtr, tile, ptr }
    })
    return results
  }
}
