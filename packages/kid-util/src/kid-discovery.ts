import {
  type LevelHeaderRomResourceUnloaded,
  type LinkedSpriteFrameRomResourceUnloaded,
  type SheetRomResourceUnloaded,
  type SpriteCollisionRomResourceUnloaded,
  type UnlinkedSpriteFrameRomResourceUnloaded,
} from './kid-resources'
import { Rom } from './kid-rom'
import {
  AssetPtrTableTypes,
  PackedTileSheet,
  SpriteFrameType,
  SpriteFrameWithDataType,
} from './tables/asset-ptr-table'

export const ImportantAddresses = [
  'assetTable',
  'collisionWordTable',
  'levelIndexesTable',
  'levelWordTableBase',
  'levelWordTable',
  'platformWordTableBase',
  'platformWordTable',
  'levelMiscPtrTable',
  'themeBlocksPtrTable',
  'themeBackgroundPtrTable',
  'themeTileMappingsPtrTable',
  'commonBlocksMappingsWordTable',
  'themePaletteWordTable',
  'themeBackgroundPaletteWordTable',
  'themeTileCollisionPtrTable',
  'themeBackgroundPlanePtrTable',
  'backgroundScrollingPtrTable'
] as const


function log(...args: unknown[]) {
  console.log('[KidDiscovery]', ...args)
}

export type KnownAddresses = Partial<Record<(typeof ImportantAddresses)[number], number>>
export type AddressDescription = {
  name: string
  addressInJUE: number
  type: 'table' | 'function' | 'value' | 'data' | 'other'
  description: string
}

export const KnownAddressesDescriptions: Partial<Record<keyof KnownAddresses, AddressDescription>> =
{
  assetTable: {
    name: 'Asset Table',
    addressInJUE: 0xa09fe,
    type: 'table',
    description: 'Table of pointers to sprite assets used ingame',
  },
  collisionWordTable: {
    name: 'Collision Frame Table',
    addressInJUE: 0x30bf4,
    type: 'table',
    description: 'Table of word offsets to collision frames for sprites in Asset Table',
  },
  levelIndexesTable: {
    name: 'Level Indexes Table',
    addressInJUE: 0x4043e,
    type: 'table',
    description: "Table of byte offsets to Level Word Table's levels in order of gameplay",
  },
  levelWordTable: {
    name: 'Level Word Table',
    addressInJUE: 0x40342,
    type: 'table',
    description: 'Table of word offsets to level headers',
  },
  levelWordTableBase: {
    name: 'Level Word Table Base',
    addressInJUE: 0x4033a,
    type: 'value',
    description: 'Base address for Level Word Table offsets',
  },
  platformWordTable: {
    name: 'Platforms Word Table',
    addressInJUE: 0x43a6,
    type: 'table',
    description: 'Table of word offsets to platforms layouts',
  },
  platformWordTableBase: {
    name: 'Platforms Word Table Base',
    addressInJUE: 0x2bb6,
    type: 'value',
    description: 'Base address for Platforms Word Table offsets',
  },
  levelMiscPtrTable: {
    name: 'Level Misc Pointer Table',
    addressInJUE: 0x7b018,
    type: 'table',
    description: 'Table of pointers to level misc data (Mostly GFX related)',
  },
  themeBlocksPtrTable: {
    name: 'Theme Blocks Pointer Table',
    addressInJUE: 0x7b104,
    type: 'table',
    description: 'Table of pointers to theme blocks data',
  },
  themeBackgroundPtrTable: {
    name: 'Theme Background Pointer Table',
    addressInJUE: 0x7b130,
    type: 'table',
    description: 'Table of pointers to theme background data',
  },
  themeTileMappingsPtrTable: {
    name: 'Theme Tile Mappings Pointer Table',
    addressInJUE: 0x7b168,
    type: 'table',
    description: 'Table of pointers to theme tile mappings data',
  },
  commonBlocksMappingsWordTable: {
    name: 'Common Blocks Mappings Word Table',
    addressInJUE: 0x7b8dc,
    type: 'table',
    description: 'Table of word offsets to common blocks mappings data',
  },
  themePaletteWordTable: {
    name: 'Theme Palette Word Table',
    addressInJUE: 0x7b194,
    type: 'table',
    description: 'Table of word offsets to theme palette data',
  },
  themeBackgroundPaletteWordTable: {
    name: 'Theme Background Palette Word Table',
    addressInJUE: 0x7b1aa,
    type: 'table',
    description: 'Table of word offsets to theme background palette data',
  },
  themeTileCollisionPtrTable: {
    name: 'Theme Tile Collision Pointer Table',
    addressInJUE: 0x7b1c0,
    type: 'table',
    description: 'Table of pointers to theme tile collision data',
  },
  themeBackgroundPlanePtrTable: {
    name: 'Theme Background Plane Pointer Table',
    addressInJUE: 0x7b3e4,
    type: 'table',
    description: 'Table of pointers to theme background plane data',
  },
  backgroundScrollingPtrTable: {
    name: 'Background Scrolling Pointer Table',
    addressInJUE: 0x7b1ec,
    type: 'table',
    description: 'Table of pointers to background scrolling data',
  },
}

/**
 * Execute a function in the next tick using setTimeout
 * @param fn
 * @returns
 */
async function ExecuteInNextTick(fn: () => void): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(() => {
      fn()
      resolve()
    }, 0)
  })
}

async function tryFindingAllKnownAddresses(rom: Rom) {
  log('Trying to find known addresses for tables and other resources...')
  const fns = [
    findAssetTable,
    findFrameCollisionFrameTable,
    findMultipleLevelAddresses,
    findPlatformAddresses,
    findlevelMiscPtrTable,
  ]
  const results = await Promise.allSettled(fns.map((fn) => ExecuteInNextTick(fn.bind(null, rom))))

  for (const result of results) {
    if (result.status === 'rejected') {
      console.error(result.reason)
    }
  }
  log('Found', Object.keys(rom.knownAddresses).length, 'known addresses')
  try {
    populateLevelMiscTable(rom)
  } catch (_e) {
    // Ignore
  }

}

function tryFindingResouces(rom: Rom) {
  const functions = [
    findFrameCollisionFramTableResources,
    findAssetTableResources,
    findAllLevelHeaders,
  ]
  for (const fn of functions) {
    try {
      fn(rom)
    } catch (_e) {
      console.error(`Error running resource discovery function: ${fn.name}`)
    }
  }
}

function populateLevelMiscTable(rom: Rom) {
  const LevelMiscTable: ((typeof ImportantAddresses)[number] | ((address: number) => void))[] = [
    'themeBlocksPtrTable',
    'themeBackgroundPtrTable',
    'themeTileMappingsPtrTable',
    'commonBlocksMappingsWordTable',
    'themePaletteWordTable',
    'themeBackgroundPaletteWordTable',
    'themeTileCollisionPtrTable',
    (address) => {
      // Common Blocks Packed Sheet
      const resource = rom.createResource(address, 'sheet') as SheetRomResourceUnloaded
      resource.packed = { format: 'kid' }
      resource.name = 'Common Blocks Graphics'
      resource.description = 'Graphics for Common Blocks used in levels'
      rom.addResource(resource)
    },
    'themeBackgroundPlanePtrTable',
    (address) => {
      // HUD Numbers Packed Sheet
      const resource = rom.createResource(address, 'sheet') as SheetRomResourceUnloaded
      resource.packed = { format: 'kid' }
      resource.name = 'HUD Numbers Graphics'
      rom.addResource(resource)
    },
    'backgroundScrollingPtrTable',
    // Some Raw Sheets (with another reference)
  ]

  const table = rom.knownAddresses.levelMiscPtrTable
  if (!table) {
    return
  }
  for (let i = 0; i < LevelMiscTable.length; i++) {
    const ptr = rom.readPtr(table + i * 4)
    const item = LevelMiscTable[i]
    if (typeof item === 'function') {
      item(ptr)
    } else {
      rom.knownAddresses[item as (typeof ImportantAddresses)[number]] = ptr
    }
  }
}

function findAllLevelHeaders(rom: Rom) {
  const levelWordTable = rom.knownAddresses.levelWordTable
  const levelWordTableBase = rom.knownAddresses.levelWordTableBase
  const levelIndexesTable = rom.knownAddresses.levelIndexesTable
  if (!levelWordTable || !levelWordTableBase || !levelIndexesTable) {
    return
  }
  let index = 0
  let minHeader: number = Infinity
  do {
    const wordOffset = rom.data.getUint8(levelIndexesTable + index)
    if (wordOffset === 0xff) {
      break
    }
    const headerOffset = rom.data.getUint16(levelWordTable + wordOffset * 2, false)
    const headerAdresss = headerOffset + levelWordTableBase
    const resource = rom.createResource(
      headerAdresss,
      'level-header',
    ) as LevelHeaderRomResourceUnloaded
    resource.levelIndex = index
    resource.wordIndex = wordOffset
    rom.addResource(resource)
    minHeader = Math.min(minHeader, headerAdresss)
    index++
  } while (index < minHeader)
  log('Discovered', index, 'level headers')
}

function findAssetTableResources(rom: Rom) {
  const assetTable = rom.knownAddresses.assetTable
  if (!assetTable) {
    return
  }
  let index = 0
  const endAddress = assetTable + 0x49d * 4
  for (let ptr = assetTable; ptr < endAddress; ptr += 4) {
    const type = AssetPtrTableTypes[index]
    if (type === null) {
      rom.tables.assetIndexTable.push(null)
      index++
      continue
    }
    const resourcePtr = rom.readPtr(ptr)
    rom.tables.assetIndexTable.push(resourcePtr)
    const collisionPtr = rom.tables.collisionIndexTable[index]
    if (type === PackedTileSheet) {
      const resource = rom.createResource(resourcePtr, 'sheet') as SheetRomResourceUnloaded
      resource.tableIndex = index
      resource.packed = { format: 'kid' }
      rom.addResource(resource)
    } else if (type === SpriteFrameType) {
      const resource = rom.createResource(
        resourcePtr,
        'unlinked-sprite-frame',
      ) as UnlinkedSpriteFrameRomResourceUnloaded
      resource.tableIndex = index
      if (collisionPtr) {
        resource.related.add(collisionPtr)
      }
      rom.addResource(resource)
    } else if (type === SpriteFrameWithDataType) {
      const resource = rom.createResource(
        resourcePtr,
        'linked-sprite-frame',
      ) as LinkedSpriteFrameRomResourceUnloaded
      resource.tableIndex = index
      if (collisionPtr) {
        resource.related.add(collisionPtr)
      }
      rom.addResource(resource)
    } else {
      const resource = rom.createResource(resourcePtr, 'unknown')
      resource.description = `Unknown asset type ${type}, at Asset Table index ${index}`
      rom.addResource(resource)
    }
    index++
  }
}

function findFrameCollisionFramTableResources(rom: Rom) {
  const frameCollisionTable = rom.knownAddresses.collisionWordTable
  if (!frameCollisionTable) {
    return
  }
  // Need to limit because there are some garbage pointers at the table
  const addressLimit = frameCollisionTable + 0x1390
  let index = 0
  let firstData = Infinity
  let pos = frameCollisionTable
  while (pos < firstData) {
    const dataPtr = rom.data.getInt16(pos, false)
    const address = frameCollisionTable + dataPtr
    rom.tables.collisionIndexTable.push(address)
    const resource = rom.createResource(
      address,
      'sprite-collision',
    ) as SpriteCollisionRomResourceUnloaded
    resource.wordIndex = index
    if (address >= addressLimit) {
      // Garbage pointer
      resource.isInvalid = true
      rom.addResource(resource)
      pos += 2
      index++
      continue
    }
    rom.addResource(resource)
    firstData = Math.min(firstData, address)
    index++
    pos += 2
  }
}

function findPlatformAddresses(rom: Rom): number[] {
  if (rom.knownAddresses.platformWordTable && rom.knownAddresses.platformWordTableBase) {
    return [rom.knownAddresses.platformWordTable, rom.knownAddresses.platformWordTableBase]
  }

  /*
                               *************************************************************
                             *                           FUNCTION
                             *************************************************************
                             undefined  LoadLevelPlatformLayout (void )
             undefined         D0b:1          <RETURN>
                             LoadLevelPlatformLayout                         XREF[1]:     LoadPlatformGFX:00002344 (c)
        00002366 3e  38  fc       move.w              (CurrentPlayerVars.LevelIdx ).w,D7w
                 44
        0000236a 28  79  00       movea.l             (-> LevelIndexesTable ).l,A4                      = 0004043e
                 04  03  3e
        00002370 1e  34  70       move.b              (0x0 ,A4 ,D7w *0x1 )=> -> LevelWord00 ,D7b            = 4Ah
                 00
        00002374 48  87           ext.w               D7w
        00002376 49  fa  20       lea                 (0x202e ,PC )=> LevelPlatformWordTable ,A4         = 18ECh
                 2e
        0000237a de  47           add.w               D7w ,D7w
        0000237c 3e  34  70       move.w              (0x0 ,A4 ,D7w *0x1 )=> LevelPlatformWordTable ,D7w   = 18ECh
                 00
        00002380 48  c7           ext.l               D7
        00002382 06  87  00       addi.l              #LevelPlatformDataBase ,D7
                 00  2b  b6
        00002388 21  c7  fa       move.l              D7 ,(LevelPlatformBase ).w                        = 000044a2
                 88
        0000238c 4e  75           rts

  */
  const pattern = '49 fa ?? ?? de 47 3e 34 70 00 48 c7 06 87 ?? ?? ?? ?? 21 c7 fa 88 4e 75'
  const ptr = rom.findPattern(pattern)
  const offset = rom.data.getUint16(ptr + 2, false)
  const platformWordTable = ptr + 2 + offset
  const platformWordTableBase = rom.readPtr(ptr + 14)
  rom.knownAddresses.platformWordTable = platformWordTable
  rom.knownAddresses.platformWordTableBase = platformWordTableBase
  return [platformWordTable, platformWordTableBase]
}

function findlevelMiscPtrTable(rom: Rom) {
  /*
        00011d56 20  07           move.l              ThemeX4 ,D0
        00011d58 e2  88           lsr.l               #0x1 ,D0
        00011d5a 30  31  00       move.w              (0x0 ,A1 ,D0w *0x1 )=> ThemePaletteTable ,D0w        = 3Ch
                 00
        00011d5e 06  80  00       addi.l              #LevelGFXStuffTable ,D0                          = 0007b104
                 07  b0  18
        00011d64 22  40           movea.l             D0 ,A1
        00011d66 22  51           movea.l             (A1 ),A1 => -> ThemeBlocksGFXTable                  = 0007b104
        00011d68 34  38  fc       move.w              (CurrentPlayerVars.LevelIdx ).w,D2w
                 44
   */

  const pattern = '20 07 e2 88 30 31 00 00 06 80 ?? ?? ?? ?? 22 40 22 51 34 38 fc 44'
  const ptr = rom.findPattern(pattern)
  rom.knownAddresses.levelMiscPtrTable = rom.readPtr(ptr + 10)
}

function findFrameCollisionFrameTable(rom: Rom) {
  const pattern = 'e2 40 49 f9 ?? ?? ?? ?? d8 f4 00 00'
  const ptr = rom.readPtr(rom.findPattern(pattern) + 4)
  rom.knownAddresses.collisionWordTable = ptr
}

/** Find Asset Table (original JUE is $a09fe) */
function findAssetTable(rom: Rom) {
  const pattern = '67 00 00 dc 49 f9 ?? ?? ?? ?? 3e 2b 00 22'
  const ptr = rom.readPtr(rom.findPattern(pattern) + 6)
  rom.knownAddresses.assetTable = ptr
}



function findMultipleLevelAddresses(rom: Rom) {
  /*
   *  00011a36  20  79  00       movea.l             (-> LevelIndexesTable ).l,A0                      = 0004043e
   *            04  03  3e
   *   00011a3c 10  30  00       move.b              (0x0 ,A0 ,D0w *0x1 )=> -> LevelWord00 ,D0b            = 4Ah
   *            00
   *   00011a40 48  80           ext.w               D0w
   *   00011a42 20  7c  00       movea.l             #LevelWordTable ,A0                              = 38Ch
   *            04  03  42
   *   00011a48 d0  40           add.w               D0w ,D0w
   *   00011a4a 30  30  00       move.w              (0x0 ,A0 ,D0w *0x1 )=> LevelWordTable ,D0w           = 38Ch
   *            00
   *   00011a4e 20  7c  00       movea.l             #StartingLevelIndex ,A0
   *            04  03  3a
   *   00011a54 d0  c0           adda.w              D0w ,A0
   *
   */
  const pattern =
    '20 79 ?? ?? ?? ?? 10 30 00 00 48 80 20 7c ?? ?? ?? ?? d0 40 30 30 00 00 20 7c ?? ?? ?? ?? d0 c0'
  const ptr = rom.findPattern(pattern)
  const levelIndexesTable = rom.readPtr(rom.readPtr(ptr + 2))
  const levelWordTable = rom.readPtr(ptr + 14)
  const levelWordTableBase = rom.readPtr(ptr + 26)
  rom.knownAddresses.levelIndexesTable = levelIndexesTable
  rom.knownAddresses.levelWordTable = levelWordTable
  rom.knownAddresses.levelWordTableBase = levelWordTableBase
}

//
//
// FUNCTION DISCOVERY
//
//

export const ImportantFunctions = [
  'unpackGFX',
  'unpackEnigma',
  'unpackKid',
  'unpackGFXWithPalette',
  'UnpackGFXWithPlane'
] as const

type functionData = { address: number, trunks: Set<number> }
export type knownFunctions = Map<typeof ImportantFunctions[number], functionData>

const KnownFunctionsDiscoveryFn: Record<typeof ImportantFunctions[number], (rom: Rom) => void> = {
  unpackGFX: findUnpackGFXFunction,
  unpackGFXWithPalette: findUnpackGFXWithPaletteMapFunction,
  UnpackGFXWithPlane: findUnpackGFXWithPlaneFunction,
  unpackEnigma: findEnigmaUnpackFunction,
  unpackKid: findUnpackKidFunction
}

async function tryFindingAllKnownFunctionsAndTrunks(rom: Rom) {
  log('Trying to find functions...')
  const results = await Promise.allSettled(Object.values(KnownFunctionsDiscoveryFn).map((fn) => ExecuteInNextTick(fn.bind(null, rom))))
  for (const result of results) {
    if (result.status === 'rejected') {
      console.error(result.reason)
    }
  }
  log('Found', rom.knownFunctions.size, 'functions')
  findFunctionsTrunks(rom)

}

function findFunctionsTrunks(rom: Rom) {
  log('Finding trunks for all discovered functions...')
  const pattern = '4e fa ?? ??' // jmp (offset after pattern)
  const finder = rom.createPatternFinder(pattern)
  const allJumps = finder.findAll()
  log('Found', allJumps.length, 'jumps')
  let trunks = 0
  for (const jmp of allJumps) {
    const PC = jmp + 2
    const offset = rom.data.getInt16(jmp + 2, false)
    const target = PC + offset

    for (const value of rom.knownFunctions.values()) {
      if (target === value.address) {
        trunks++
        value.trunks.add(jmp)
      }
    }
  }
  log('Found', trunks, 'trunks')
}

function findUnpackGFXFunction(rom: Rom) {
  const pattern = '61 ?? 70 ff 26 40 28 4a'
  const address = rom.findPattern(pattern)
  rom.knownFunctions.set('unpackGFX', { address, trunks: new Set() })
}

function findUnpackGFXWithPlaneFunction(rom: Rom) {
  const pattern = '2f 09 61 ?? 49 f9 ff ff 02 80 76 00 78 00 1a 33 30 00'
  const address = rom.findPattern(pattern)
  rom.knownFunctions.set('UnpackGFXWithPlane', { address, trunks: new Set() })
}

function findUnpackGFXWithPaletteMapFunction(rom: Rom) {
  const pattern = '61 ?? ?? ?? 49 f9 ff ff 02 80 76 00 78 00 1a 33 30 00'
  const address = rom.findPattern(pattern)
  rom.knownFunctions.set('unpackGFXWithPalette', { address, trunks: new Set() })
}


function findEnigmaUnpackFunction(rom: Rom) {
  const pattern = '48 e7 ff 7c 36 40 10 18 48 80 3a 40 18 18 e7 0c 34 58'
  const address = rom.findPattern(pattern)
  rom.knownFunctions.set('unpackEnigma', { address, trunks: new Set() })
}

function findUnpackKidFunction(rom: Rom) {
  const pattern = '70 00 38 3c 07 ff 7a 00 7c 00 3e 0b 53 42 67 00 03 90'
  const address = rom.findPattern(pattern)
  rom.knownFunctions.set('unpackKid', { address, trunks: new Set() })
}

export async function DiscoverAllResources(rom: Rom) {
  log('Starting resource discovery...')
  const startTime = Date.now()
  await tryFindingAllKnownFunctionsAndTrunks(rom)
  await tryFindingAllKnownAddresses(rom)
  tryFindingResouces(rom)

  try {
    findUntabledPackedTileSheetsDirect1(rom).map((result) => {
      const resource = rom.createResource(result.ptr, 'sheet') as SheetRomResourceUnloaded
      resource.packed = { format: 'kid' }
      rom.addResource(resource)
    })
    findUntabledPackedTileSheetsDirect2(rom).map((result) => {
      const resource = rom.createResource(result.ptr, 'sheet') as SheetRomResourceUnloaded
      resource.packed = { format: 'kid' }
      rom.addResource(resource)
    })
    findUntabledPackedTileSheetsRelative1(rom).map((result) => {
      const resource = rom.createResource(result.ptr, 'sheet') as SheetRomResourceUnloaded
      resource.packed = { format: 'kid' }
      rom.addResource(resource)
    })
    findUntabledPackedTileSheetsRelative2(rom).map((result) => {
      const resource = rom.createResource(result.ptr, 'sheet') as SheetRomResourceUnloaded
      resource.packed = { format: 'kid' }
      rom.addResource(resource)
    })
    findUntabledPackedTileSheetsWithPaletteSwap1(rom).map((result) => {
      const resource = rom.createResource(result.ptr, 'sheet') as SheetRomResourceUnloaded
      resource.packed = { format: 'kid' }
      rom.addResource(resource)
    })
    findUntabledPackedTileSheetsWithPaletteSwap2(rom).map((result) => {
      const resource = rom.createResource(result.ptr, 'sheet') as SheetRomResourceUnloaded
      resource.packed = { format: 'kid' }
      rom.addResource(resource)
    })
  } catch (e) {
    console.error(e)
  }
  log('Resource Discovery ended, took', Date.now() - startTime, 'ms and found', rom.resources.size, 'resources')
}


function findUntabledPackedTileSheetsDirect1(rom: Rom) {
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
  const patternFinder = rom.createPatternFinder(pattern)
  const matchs = patternFinder.findAll()
  const results = matchs.map((pos) => {
    const tile = rom.data.getUint16(pos + 2, false)
    const ptr = rom.readPtr(pos + 6)
    return { pos, tile, ptr }
  })
  return results
}

function findUntabledPackedTileSheetsDirect2(rom: Rom) {
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
  const patternFinder = rom.createPatternFinder(pattern)
  const matchs = patternFinder.findAll()
  const results = matchs.map((pos) => {
    const tile = rom.data.getUint16(pos + 2, false)
    const ptr = rom.readPtr(pos + 6)
    return { pos, tile, ptr }
  })
  return results
}

function findUntabledPackedTileSheetsRelative1(rom: Rom) {
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
  const patternFinder = rom.createPatternFinder(pattern)
  const matchs = patternFinder.findAll()
  const results = matchs.map((pos) => {
    const tile = rom.data.getUint16(pos + 2, false)
    const rel = rom.data.getInt16(pos + 6, false)
    const ptr = pos + 6 + rel
    return { pos, rel, tile, ptr }
  })
  return results
}

function findUntabledPackedTileSheetsRelative2(rom: Rom) {
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
  const patternFinder = rom.createPatternFinder(pattern)
  const matchs = patternFinder.findAll()
  const results = matchs.map((pos) => {
    const tile = rom.data.getUint16(pos + 2, false)
    const rel = rom.data.getInt16(pos + 6, false)
    const ptr = pos + 6 + rel
    return { pos, rel, tile, ptr }
  })
  return results
}

function findUntabledPackedTileSheetsWithPaletteSwap1(rom: Rom) {
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
  const patternFinder = rom.createPatternFinder(pattern)
  const matchs = patternFinder.findAll()
  const results = matchs.map((pos) => {
    const tile = rom.data.getUint16(pos + 2, false)
    const ptr = rom.readPtr(rom.data.getInt16(pos + 6, false))
    const palRel = rom.data.getInt16(pos + 10, false)
    const palPtr = pos + 10 + palRel
    return { pos, palRel, palPtr, tile, ptr }
  })
  return results
}

function findUntabledPackedTileSheetsWithPaletteSwap2(rom: Rom) {
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
  const patternFinder = rom.createPatternFinder(pattern)
  const matchs = patternFinder.findAll()
  const results = matchs.map((pos) => {
    const tile = rom.data.getUint16(pos + 2, false)
    const rel = rom.data.getInt16(pos + 6, false)
    const ptr = pos + 6 + rel
    const palRel = rom.data.getInt16(pos + 10, false)
    const palPtr = pos + 10 + palRel
    return { pos, palRel, palPtr, tile, ptr }
  })
  return results
}
