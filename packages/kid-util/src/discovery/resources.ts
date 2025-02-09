import PQueue from 'p-queue'
import type { KidDiscovery, KidDiscoveryFunction } from '~/kid-discovery'
import {
  type LevelHeaderRomResourceUnloaded,
  type SheetRomResourceUnloaded,
  type UnlinkedSpriteFrameRomResourceUnloaded,
  type LinkedSpriteFrameRomResourceUnloaded,
  type SpriteCollisionRomResourceUnloaded,
  type PlaneRomResourceUnloaded,
  AddAllRelated,
  type PaletteRomResourceUnloaded,
} from '~/kid-resources'
import { ExecuteInNextTick } from '~/kid-utils'
import {
  AssetPtrTableTypes,
  PackedTileSheet,
  SpriteFrameType,
  SpriteFrameWithDataType,
} from '~/tables/asset-ptr-table'

export async function findAllResouces(kd: KidDiscovery) {
  const fns: KidDiscoveryFunction[] = [
    findFrameCollisionFromTableResources,
    findAssetTableResources,
    findAllLevelHeaders,
    findSomeMoreResources,
    addThemeResources,
  ]
  const queue = new PQueue({ concurrency: 4 })
  for (const fn of fns) {
    await queue.add(ExecuteInNextTick.bind(null, fn.bind(null, kd)))
  }
  await queue.onIdle()
}

function findAllLevelHeaders(kd: KidDiscovery) {
  const levelWordTable = kd.knownAddresses.get('levelWordTable')
  const levelWordTableBase = kd.knownAddresses.get('levelWordTableBase')
  const levelIndexesTable = kd.knownAddresses.get('levelIndexesTable')
  if (!levelWordTable || !levelWordTableBase || !levelIndexesTable) {
    return
  }
  let index = 0
  let minHeader: number = Infinity
  let maxTheme: number = 0
  do {
    const wordOffset = kd.rom.data.getUint8(levelIndexesTable + index)
    if (wordOffset === 0xff) {
      break
    }
    const headerOffset = kd.rom.data.getUint16(levelWordTable + wordOffset * 2, false)
    const headerAdresss = headerOffset + levelWordTableBase
    const resource = kd.rom.createResource(
      headerAdresss,
      'level-header',
    ) as LevelHeaderRomResourceUnloaded
    resource.levelIndex = index
    resource.wordIndex = wordOffset
    // Peek at the level theme value:
    const theme = kd.rom.data.getUint8(headerAdresss + 2) & 0x3f
    maxTheme = Math.max(maxTheme, theme)

    kd.rom.addResource(resource)
    minHeader = Math.min(minHeader, headerAdresss)
    index++
  } while (index < minHeader)
  kd.log('Discovered', index, 'level headers')
  kd.log('There is a max of', maxTheme, 'themes used in the levels')
  kd.knownAddresses.set('numberOfLevels', index)
  kd.knownAddresses.set('numberOfThemes', maxTheme)
}

function findAssetTableResources(kd: KidDiscovery) {
  const assetTable = kd.knownAddresses.get('assetTable')
  if (!assetTable) {
    return
  }
  let index = 0
  const endAddress = assetTable + 0x49d * 4
  for (let ptr = assetTable; ptr < endAddress; ptr += 4) {
    const type = AssetPtrTableTypes[index]
    if (type === null) {
      kd.rom.tables.assetIndexTable.push(null)
      index++
      continue
    }
    const resourcePtr = kd.rom.readPtr(ptr)
    kd.rom.tables.assetIndexTable.push(resourcePtr)
    const collisionPtr = kd.rom.tables.collisionIndexTable[index]
    if (type === PackedTileSheet) {
      const resource = kd.rom.createResource(resourcePtr, 'sheet') as SheetRomResourceUnloaded
      resource.tableIndex = index
      resource.packed = { format: 'kid' }
      kd.rom.addResource(resource)
    } else if (type === SpriteFrameType) {
      const resource = kd.rom.createResource(
        resourcePtr,
        'unlinked-sprite-frame',
      ) as UnlinkedSpriteFrameRomResourceUnloaded
      resource.tableIndex = index
      if (collisionPtr) {
        resource.related.add(collisionPtr)
      }
      kd.rom.addResource(resource)
    } else if (type === SpriteFrameWithDataType) {
      const resource = kd.rom.createResource(
        resourcePtr,
        'linked-sprite-frame',
      ) as LinkedSpriteFrameRomResourceUnloaded
      resource.tableIndex = index
      if (collisionPtr) {
        resource.related.add(collisionPtr)
      }
      kd.rom.addResource(resource)
    } else {
      const resource = kd.rom.createResource(resourcePtr, 'unknown')
      resource.description = `Unknown asset type ${type}, at Asset Table index ${index}`
      kd.rom.addResource(resource)
    }
    index++
  }
}

function findFrameCollisionFromTableResources(kd: KidDiscovery) {
  const frameCollisionTable = kd.knownAddresses.get('collisionWordTable')
  if (!frameCollisionTable) {
    return
  }
  // Need to limit because there are some garbage pointers at the table
  const addressLimit = frameCollisionTable + 0x1390
  let index = 0
  let firstData = Infinity
  let pos = frameCollisionTable
  while (pos < firstData) {
    const dataPtr = kd.rom.data.getInt16(pos, false)
    const address = frameCollisionTable + dataPtr
    kd.rom.tables.collisionIndexTable.push(address)
    const resource = kd.rom.createResource(
      address,
      'sprite-collision',
    ) as SpriteCollisionRomResourceUnloaded
    resource.wordIndex = index
    if (address >= addressLimit) {
      // Garbage pointer
      resource.isInvalid = true
      kd.rom.addResource(resource)
      pos += 2
      index++
      continue
    }
    kd.rom.addResource(resource)
    firstData = Math.min(firstData, address)
    index++
    pos += 2
  }
}

function findSomeMoreResources(kd: KidDiscovery) {
  // TODO: Reimplement this
  try {
    findUntabledPackedTileSheetsDirect1(kd).map((result) => {
      const resource = kd.rom.createResource(result.ptr, 'sheet') as SheetRomResourceUnloaded
      resource.packed = { format: 'kid' }
      kd.rom.addResource(resource)
    })
    findUntabledPackedTileSheetsDirect2(kd).map((result) => {
      const resource = kd.rom.createResource(result.ptr, 'sheet') as SheetRomResourceUnloaded
      resource.packed = { format: 'kid' }
      kd.rom.addResource(resource)
    })
    findUntabledPackedTileSheetsRelative1(kd).map((result) => {
      const resource = kd.rom.createResource(result.ptr, 'sheet') as SheetRomResourceUnloaded
      resource.packed = { format: 'kid' }
      kd.rom.addResource(resource)
    })
    findUntabledPackedTileSheetsRelative2(kd).map((result) => {
      const resource = kd.rom.createResource(result.ptr, 'sheet') as SheetRomResourceUnloaded
      resource.packed = { format: 'kid' }
      kd.rom.addResource(resource)
    })
    findUntabledPackedTileSheetsWithPaletteSwap1(kd).map((result) => {
      const resource = kd.rom.createResource(result.ptr, 'sheet') as SheetRomResourceUnloaded
      resource.packed = { format: 'kid' }
      kd.rom.addResource(resource)
    })
    findUntabledPackedTileSheetsWithPaletteSwap2(kd).map((result) => {
      const resource = kd.rom.createResource(result.ptr, 'sheet') as SheetRomResourceUnloaded
      resource.packed = { format: 'kid' }
      kd.rom.addResource(resource)
    })
  } catch (e) {
    console.error(e)
  }
}

function findUntabledPackedTileSheetsDirect1(kd: KidDiscovery) {
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
  const patternFinder = kd.rom.createPatternFinder(pattern)
  const matchs = patternFinder.findAll()
  const results = matchs.map((pos) => {
    const tile = kd.rom.data.getInt16(pos + 2, false)
    const ptr = kd.rom.readPtr(pos + 6)
    return { pos, tile, ptr }
  })
  return results
}

function findUntabledPackedTileSheetsDirect2(kd: KidDiscovery) {
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
  const patternFinder = kd.rom.createPatternFinder(pattern)
  const matchs = patternFinder.findAll()
  const results = matchs.map((pos) => {
    const tile = kd.rom.data.getInt16(pos + 2, false)
    const ptr = kd.rom.readPtr(pos + 6)
    return { pos, tile, ptr }
  })
  return results
}

function findUntabledPackedTileSheetsRelative1(kd: KidDiscovery) {
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
  const patternFinder = kd.rom.createPatternFinder(pattern)
  const matchs = patternFinder.findAll()
  const results = matchs.map((pos) => {
    const tile = kd.rom.data.getInt16(pos + 2, false)
    const rel = kd.rom.data.getInt16(pos + 6, false)
    const ptr = pos + 6 + rel
    return { pos, rel, tile, ptr }
  })
  return results
}

function findUntabledPackedTileSheetsRelative2(kd: KidDiscovery) {
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
  const patternFinder = kd.rom.createPatternFinder(pattern)
  const matchs = patternFinder.findAll()
  const results = matchs.map((pos) => {
    const tile = kd.rom.data.getInt16(pos + 2, false)
    const rel = kd.rom.data.getInt16(pos + 6, false)
    const ptr = pos + 6 + rel
    return { pos, rel, tile, ptr }
  })
  return results
}

function findUntabledPackedTileSheetsWithPaletteSwap1(kd: KidDiscovery) {
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
  const patternFinder = kd.rom.createPatternFinder(pattern)
  const matchs = patternFinder.findAll()
  const results = matchs.map((pos) => {
    const tile = kd.rom.data.getInt16(pos + 2, false)
    const ptr = kd.rom.readPtr(kd.rom.data.getInt16(pos + 6, false))
    const palRel = kd.rom.data.getInt16(pos + 10, false)
    const palPtr = pos + 10 + palRel
    return { pos, palRel, palPtr, tile, ptr }
  })
  return results
}

function findUntabledPackedTileSheetsWithPaletteSwap2(kd: KidDiscovery) {
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
  const patternFinder = kd.rom.createPatternFinder(pattern)
  const matchs = patternFinder.findAll()
  const results = matchs.map((pos) => {
    const tile = kd.rom.data.getInt16(pos + 2, false)
    const rel = kd.rom.data.getInt16(pos + 6, false)
    const ptr = pos + 6 + rel
    const palRel = kd.rom.data.getInt16(pos + 10, false)
    const palPtr = pos + 10 + palRel
    return { pos, palRel, palPtr, tile, ptr }
  })
  return results
}

function addThemeResources(kd: KidDiscovery) {
  const numberOfThemes = kd.knownAddresses.get('numberOfThemes')
  if (!numberOfThemes) {
    return
  }
  // Theme starts at 1
  for (let theme = 1; theme <= numberOfThemes; theme++) {
    // Load theme title screen GFX
    const themeTitleScreenGFXPtrTable = kd.knownAddresses.get('themeTitleScreenGFXPtrTable')
    const titleThemeRelated = new Set<number>()
    if (themeTitleScreenGFXPtrTable) {
      const themeTitlePackedGFXPtr = kd.rom.readPtr(themeTitleScreenGFXPtrTable + theme * 4)
      const resource = kd.rom.createResource(
        themeTitlePackedGFXPtr,
        'sheet',
      ) as SheetRomResourceUnloaded
      resource.name = `Theme ${theme} Title Screen GFX`
      resource.packed = { format: 'kid' }
      kd.rom.addResource(resource)
      titleThemeRelated.add(themeTitlePackedGFXPtr)
    }
    // Load theme title screen plane
    const themeTitleScreenPlanePtrTable = kd.knownAddresses.get('themeTitleScreenPlanePtrTable')
    const themeTitleScreenSizeTable = kd.knownAddresses.get('themeTitleScreenSizeTable')
    if (themeTitleScreenPlanePtrTable) {
      const themeTitlePlanePtr = kd.rom.readPtr(themeTitleScreenPlanePtrTable + theme * 4)
      const resource = kd.rom.createResource(
        themeTitlePlanePtr,
        'plane',
      ) as PlaneRomResourceUnloaded
      resource.name = `Theme ${theme} Title Screen Plane`
      resource.packed = { format: 'enigma' }
      if (themeTitleScreenSizeTable) {
        const width = kd.rom.data.getUint8(themeTitleScreenSizeTable + theme * 2)
        resource.width = width
      }
      kd.rom.addResource(resource)
      titleThemeRelated.add(themeTitlePlanePtr)
    }
    // Load theme title screen palette
    const themeTitleScreenPalettePtrTable = kd.knownAddresses.get('themeTitleScreenPalettePtrTable')
    if (themeTitleScreenPalettePtrTable) {
      const themeTitlePalettePtr = kd.rom.readPtr(themeTitleScreenPalettePtrTable + theme * 4)
      const resource = kd.rom.createResource(
        themeTitlePalettePtr,
        'palette',
      ) as PaletteRomResourceUnloaded
      resource.name = `Theme ${theme} Title Screen Palette`
      resource.size = 16
      kd.rom.addResource(resource)
      titleThemeRelated.add(themeTitlePalettePtr)
    }
    AddAllRelated(kd.rom, titleThemeRelated)
  }
}
