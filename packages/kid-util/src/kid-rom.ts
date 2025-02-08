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
} from './kid-resources'
import { readPtr } from './kid-utils'
import { KnownRoms, type KnowRomDetails } from './tables/known-roms'
import { PatternFinder } from './pattern-finder'
import { sha256, mdCrc } from './hash'
import {
  DiscoverAllResources,
  type KnownAddresses,
  type knownFunctions
} from './kid-discovery'

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
  knownFunctions: knownFunctions = new Map()
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
    const patternFinder = this.createPatternFinder(pattern)
    const pos = patternFinder.findNext()
    if (pos === -1) {
      throw new Error(`Pattern ${pattern} not found`)
    }
    return pos
  }

  createPatternFinder(pattern: string): PatternFinder {
    return new PatternFinder(pattern, this.bytes)
  }

  async loadResources() {
    if (this._resourcesLoaded) return this.resourcesByType
    await DiscoverAllResources(this)
    this._resourcesLoaded = true
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

}
