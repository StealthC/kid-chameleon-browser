import type {
  LevelHeaderRomResourceUnloaded,
  LinkedSpriteFrameRomResourceUnloaded,
  SheetRomResourceUnloaded,
  UnlinkedSpriteFrameRomResourceUnloaded,
} from './kid-resources'
import { Rom } from './rom'
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
  'backgroundScrollingPtrTable',
  'unpackGFXFunction',
] as const

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
    unpackGFXFunction: {
      name: 'Unpack GFX',
      addressInJUE: 0x142fa,
      type: 'function',
      description: 'Function that unpack graphics',
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

export function tryFindingAllKnownAddresses(rom: Rom) {
  const functions = [
    findAssetTable,
    findFrameCollisionFrameTable,
    findMultipleLevelAddresses,
    findUnpackGFXFunction,
    findPlatformAddresses,
    findlevelMiscPtrTable,
    populateLevelMiscTable,
  ]

  for (const fn of functions) {
    try {
      fn(rom)
    } catch (_e) {
      console.error(`Error finding known address with function: ${fn.name}`)
    }
  }
}

export function tryFindingResouces(rom: Rom) {
  const functions = [findAllAssetsFromAssetTable, findAllLevelHeaders]
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

  const table = findlevelMiscPtrTable(rom)
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
  const { levelWordTable, levelWordTableBase, levelIndexesTable } = findMultipleLevelAddresses(rom)
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
  console.log('Found all level headers, total:', index)
}

function findAllAssetsFromAssetTable(rom: Rom) {
  const assetTable = findAssetTable(rom)
  if (!assetTable) {
    return
  }
  let index = 0
  const endAddress = assetTable + 0x49d * 4
  for (let ptr = assetTable; ptr < endAddress; ptr += 4) {
    const type = AssetPtrTableTypes[index]
    const resourcePtr = rom.readPtr(ptr)
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
      rom.addResource(resource)
    } else if (type === SpriteFrameWithDataType) {
      const resource = rom.createResource(
        resourcePtr,
        'linked-sprite-frame',
      ) as LinkedSpriteFrameRomResourceUnloaded
      resource.tableIndex = index
      rom.addResource(resource)
    }
    index++
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
  if (rom.knownAddresses.levelMiscPtrTable) {
    return rom.knownAddresses.levelMiscPtrTable
  }
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
  return rom.knownAddresses.levelMiscPtrTable
}

function findFrameCollisionFrameTable(rom: Rom): number {
  if (rom.knownAddresses.collisionWordTable) {
    return rom.knownAddresses.collisionWordTable
  }
  const pattern = 'e2 40 49 f9 ?? ?? ?? ?? d8 f4 00 00'
  const ptr = rom.readPtr(rom.findPattern(pattern) + 4)
  rom.knownAddresses.collisionWordTable = ptr
  return ptr
}

/** Find Asset Table (original JUE is $a09fe) */
function findAssetTable(rom: Rom): number {
  if (rom.knownAddresses.assetTable) {
    return rom.knownAddresses.assetTable
  }
  const pattern = '67 00 00 dc 49 f9 ?? ?? ?? ?? 3e 2b 00 22'
  const ptr = rom.readPtr(rom.findPattern(pattern) + 6)
  rom.knownAddresses.assetTable = ptr
  return ptr
}

function findUnpackGFXFunction(rom: Rom): number {
  if (rom.knownAddresses.unpackGFXFunction) {
    return rom.knownAddresses.unpackGFXFunction
  }
  const pattern = '61 d0 70 ff 26 40 28 4a'
  const ptr = rom.findPattern(pattern)
  rom.knownAddresses.unpackGFXFunction = ptr
  return ptr
}

function findMultipleLevelAddresses(rom: Rom) {
  if (
    rom.knownAddresses.levelIndexesTable &&
    rom.knownAddresses.levelWordTable &&
    rom.knownAddresses.levelWordTableBase
  ) {
    return {
      levelIndexesTable: rom.knownAddresses.levelIndexesTable,
      levelWordTable: rom.knownAddresses.levelWordTable,
      levelWordTableBase: rom.knownAddresses.levelWordTableBase,
    }
  }
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
  return { levelIndexesTable, levelWordTable, levelWordTableBase }
}
