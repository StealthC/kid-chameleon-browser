import PQueue from 'p-queue'
import type { KidDiscovery, KidDiscoveryFunction } from '~/kid-discovery'
import { ExecuteInNextTick } from '../kid-utils'

export const ImportantValues = [
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
  'themeTitleScreenGFXPtrTable',
  'themeTitleScreenPlanePtrTable',
  'themeTitleScreenPalettePtrTable',
  'themeTitleScreenSizeTable',
  'levelTitleHeaderTable',
  'levelTitleElsewhereIndex',
  'levelTitleElsewhereHeader',
  'levelTitleElsewhereText',
  'levelTitleElsewhereLayout',
  'numberOfThemes',
  'numberOfLevels',
] as const

export type KnownAddresses = Map<(typeof ImportantValues)[number], number>

export async function findAllKnownAddresses(kd: KidDiscovery) {
  kd.log('Finding addresses and values for tables and other resources...')
  const fns: KidDiscoveryFunction[] = [
    findAssetTable,
    findFrameCollisionFrameTable,
    findMultipleLevelAddresses,
    findPlatformAddresses,
    findlevelMiscPtrTable,
    findThemeTitleScreenGFXPtrTable,
    findThemeTitleScreenPlanePtrTable,
    findThemeTitleScreenPalettePtrTable,
    findThemeTitleScreenSizeTable,
    findLevelTitleCardTableAndElsewhere,
  ]
  const queue = new PQueue({ concurrency: 4 })
  for (const fn of fns) {
    await queue.add(async () => {
      await ExecuteInNextTick(() => {
        try {
          return fn(kd)
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          kd.log('Address discovery skipped for', fn.name, '-', message)
        }
      })
    })
  }
  await queue.onIdle()

  kd.log('Found', kd.knownAddresses.size, 'known addresses')
  try {
    populateLevelMiscTable(kd)
  } catch (_e) {
    // Ignore
  }
}

function populateLevelMiscTable(kd: KidDiscovery) {
  const LevelMiscTable: ((typeof ImportantValues)[number] | ((address: number) => void))[] = [
    'themeBlocksPtrTable',
    'themeBackgroundPtrTable',
    'themeTileMappingsPtrTable',
    'commonBlocksMappingsWordTable',
    'themePaletteWordTable',
    'themeBackgroundPaletteWordTable',
    'themeTileCollisionPtrTable',
    (address) => {
      // Common Blocks Packed Sheet
      kd.rom.resources.createResource(address, 'sheet', {
        packed: { format: 'kid' },
        name: 'Common Blocks Graphics',
        description: 'Graphics for Common Blocks used in levels',
      })
    },
    'themeBackgroundPlanePtrTable',
    (address) => {
      // HUD Numbers Packed Sheet
      kd.rom.resources.createResource(address, 'sheet', {
        packed: { format: 'kid' },
        name: 'HUD Numbers Graphics',
        description: 'Graphics for HUD Numbers',
      })
    },
    'backgroundScrollingPtrTable',
    // Some Raw Sheets (with another reference)
  ]

  const table = kd.knownAddresses.get('levelMiscPtrTable')
  if (!table) {
    return
  }
  for (let i = 0; i < LevelMiscTable.length; i++) {
    const ptr = kd.rom.readPtr(table + i * 4)
    const item = LevelMiscTable[i]
    if (typeof item === 'function') {
      item(ptr)
    } else {
      if (item) {
        kd.knownAddresses.set(item, ptr)
      }
    }
  }
}

function findPlatformAddresses(kd: KidDiscovery) {
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
  const ptr = kd.rom.findPattern(pattern)
  const offset = kd.rom.data.getInt16(ptr + 2, false)
  const platformWordTable = ptr + 2 + offset
  const platformWordTableBase = kd.rom.readPtr(ptr + 14)
  kd.knownAddresses.set('platformWordTable', platformWordTable)
  kd.knownAddresses.set('platformWordTableBase', platformWordTableBase)
}

function findlevelMiscPtrTable(kd: KidDiscovery) {
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
  const ptr = kd.rom.findPattern(pattern)
  kd.knownAddresses.set('levelMiscPtrTable', kd.rom.readPtr(ptr + 10))
}

function findThemeTitleScreenGFXPtrTable(kd: KidDiscovery) {
  /*
        00019b06 3c  00           move.w              D0w ,D6w
        00019b08 d0  40           add.w               D0w ,D0w
        00019b0a d0  40           add.w               D0w ,D0w
        00019b0c 3e  00           move.w              D0w ,D7w
        00019b0e 41  fa  ff       lea                 (-0x94 ,PC )=> LevelTitleThemeBackgroundGFXTable
                 6c
        00019b12 20  70  00       movea.l             (0x0 ,A0 ,D0w *offset  LevelTitleThemeBackgroundGF
                 00
        00019b16 30  3c  5f       move.w              #0x5f60 ,D0w                                     VDP Dest
                 60
        00019b1a 48  e7  ff       movem.l             {  D7  D6  D5  D4  D3  D2  D1  D0 },-( SP )
                 00
        00019b1e 4e  b9  00       jsr                 UnpackGfx .l                                     undefined UnpackGfx(undefined4 p
                 01  19  38
*/

  const pattern = '3c 00 d0 40 d0 40 3e 00 41 fa ?? ?? 20 70 00 00 30 3c 5f 60 48 e7 ff 00 4e b9'
  const ptr = kd.rom.findPattern(pattern)
  const offset = kd.rom.data.getInt16(ptr + 10, false)
  const PC = ptr + 10
  const address = PC + offset
  kd.knownAddresses.set('themeTitleScreenGFXPtrTable', address)
}

function findThemeTitleScreenPlanePtrTable(kd: KidDiscovery) {
  /*
                00019b24 4c  df  00       movem.l             (SP => local_20 )+, { D0  D1  D2  D3  D4  D5  D6  D7 }
                 ff
        00019b28 30  3c  02       move.w              #0x2fb ,D0w
                 fb
        00019b2c 41  fa  ba       lea                 (-0x4586 ,PC )=> LevelTitleBackgroundPackedPlanes
                 7a
        00019b30 20  70  70       movea.l             (0x0 ,A0 ,D7w *offset  LevelTitleBackgroundPackedP
                 00
        00019b34 43  f9  ff       lea                 (TempDataGFX ).l,A1
                 ff  77  b2
        00019b3a 48  e7  ff       movem.l             {  D7  D6  D5  D4  D3  D2  D1  D0 },-( SP )
                 00

*/

  const pattern = '4c df 00 ff 30 3c 02 fb 41 fa ?? ?? 20 70 70 00 43 f9 ff ff 77 b2 48 e7 ff 00'
  const ptr = kd.rom.findPattern(pattern)
  const offset = kd.rom.data.getInt16(ptr + 10, false)
  const PC = ptr + 10
  const address = PC + offset
  kd.knownAddresses.set('themeTitleScreenPlanePtrTable', address)
}

function findThemeTitleScreenPalettePtrTable(kd: KidDiscovery) {
  /*
                                     LAB_00019b6a                                    XREF[1]:     00019b6c (j)
        00019b6a 3c  81           move.w              D1w ,(A6 )=> VDP_DATA                              = ??
        00019b6c 51  c8  ff       dbf                 D0w ,LAB_00019b6a
                 fc
        00019b70 41  fa  b4       lea                 (-0x4bc4 ,PC )=> LevelTitleBackgroundPalettes ,A0
                 3c
        00019b74 20  70  70       movea.l             (0x0 ,A0 ,D7w *offset  LevelTitleBackgroundPalette
                 00
        00019b78 43  f9  ff       lea                 (CRAMPalettes ).l,A1
                 ff  4e  58


*/

  const pattern = '3c 81 51 c8 ff fc 41 fa ?? ?? 20 70 70 00 43 f9 ff ff 4e 58'
  const ptr = kd.rom.findPattern(pattern)
  const offset = kd.rom.data.getInt16(ptr + 8, false)
  const PC = ptr + 8
  const address = PC + offset
  kd.knownAddresses.set('themeTitleScreenPalettePtrTable', address)
}

function findThemeTitleScreenSizeTable(kd: KidDiscovery) {
  /*
                              LAB_00019b80                                    XREF[1]:     00019b82 (j)
        00019b80 32  d8           move.w              (A0 )+,(A1 )+=> CRAMPalettes
        00019b82 51  c8  ff       dbf                 D0w ,LAB_00019b80
                 fc
        00019b86 2d  7c  40       move.l              #0x40000000 ,(offset  VDP_CTRL ,A6 )               = ??
                 00  00  00
                 00  04
        00019b8e 41  f9  ff       lea                 (TempDataGFX ).l,A0
                 ff  77  b2
        00019b94 49  f9  00       lea                 (ThemeTitleBackgroundSizePos ).l,A4
                 01  9c  32
        00019b9a dc  46           add.w               D6w ,D6w
        00019b9c 10  34  60       move.b              (0x0 ,A4 ,D6w *offset  ThemeTitleBackgroundSizePos
                 00
        00019ba0 48  80           ext.w               D0w
        00019ba2 12  34  60       move.b              (offset  ThemeTitleBackgroundSizePos.height  ,A4
                 01

*/

  const pattern =
    '32 d8 51 c8 ff fc 2d 7c 40 00 00 00 00 04 41 f9 ff ff 77 b2 49 f9 ?? ?? ?? ?? dc 46 10 34 60 00 48 80 12 34 60 01'
  const ptr = kd.rom.findPattern(pattern)
  const address = kd.rom.readPtr(ptr + 22)
  kd.knownAddresses.set('themeTitleScreenSizeTable', address)
}

function findLevelTitleCardTableAndElsewhere(kd: KidDiscovery) {
  const signatures = [
    '0c 47 ?? ?? 6d 02 7e ?? ce fc 00 0a 49 fa ?? ?? 24 74 70 00 26 74 70 04 30 34 70 08',
    '0c 4? ?? ?? 6? ?? 7? ?? ce fc 00 0a 49 fa ?? ?? 24 74 70 00 26 74 70 04 30 34 70 08',
    '0c 4? ?? ?? 6? ?? 7? ?? ce fc 00 0a 49 fa ?? ??',
  ]

  const candidateSet = new Set<number>()
  for (const signature of signatures) {
    const finder = kd.rom.createPatternFinder(signature)
    for (const match of finder.findAll()) {
      candidateSet.add(match)
    }
  }

  const candidates = Array.from(candidateSet)
  if (candidates.length === 0) {
    throw new Error('Could not find LevelTitleText title header access block')
  }

  const unpackGfxAddress = kd.knownFunctions.get('unpackGFX')?.address
  let callSites: number[] = []
  if (unpackGfxAddress !== undefined) {
    const b0 = (unpackGfxAddress >>> 24) & 0xff
    const b1 = (unpackGfxAddress >>> 16) & 0xff
    const b2 = (unpackGfxAddress >>> 8) & 0xff
    const b3 = unpackGfxAddress & 0xff
    const callPattern = `4e b9 ${b0.toString(16).padStart(2, '0')} ${b1
      .toString(16)
      .padStart(2, '0')} ${b2.toString(16).padStart(2, '0')} ${b3.toString(16).padStart(2, '0')}`
    callSites = kd.rom.createPatternFinder(callPattern).findAll()
  }

  const orderedCandidates = [...candidates].sort((a, b) => a - b)
  const anchoredCandidates =
    callSites.length > 0
      ? orderedCandidates.filter((candidate) =>
          callSites.some((callsite) => callsite < candidate && candidate - callsite <= 0x80),
        )
      : orderedCandidates

  const selectedCandidate =
    anchoredCandidates.find((candidate) => isValidLevelTitleAccessCandidate(kd, candidate)) ??
    orderedCandidates.find((candidate) => isValidLevelTitleAccessCandidate(kd, candidate))

  if (selectedCandidate === undefined) {
    throw new Error('Could not validate LevelTitleText title header access candidate')
  }

  const elsewhereIndex = kd.rom.data.getUint16(selectedCandidate + 2, false)
  const tableOffset = kd.rom.data.getInt16(selectedCandidate + 14, false)
  const tableBase = selectedCandidate + 14 + tableOffset
  const elsewhereHeader = tableBase + elsewhereIndex * 10
  const elsewhereText = kd.rom.data.getUint32(elsewhereHeader, false)
  const elsewhereLayout = kd.rom.data.getUint32(elsewhereHeader + 4, false)

  kd.knownAddresses.set('levelTitleHeaderTable', tableBase)
  kd.knownAddresses.set('levelTitleElsewhereIndex', elsewhereIndex)
  kd.knownAddresses.set('levelTitleElsewhereHeader', elsewhereHeader)
  kd.knownAddresses.set('levelTitleElsewhereText', elsewhereText)
  kd.knownAddresses.set('levelTitleElsewhereLayout', elsewhereLayout)
}

function isValidLevelTitleAccessCandidate(kd: KidDiscovery, candidate: number): boolean {
  const romSize = kd.rom.bytes.length
  const elsewhereIndex = kd.rom.data.getUint16(candidate + 2, false)
  if (elsewhereIndex > 0x200) {
    return false
  }

  const tableOffset = kd.rom.data.getInt16(candidate + 14, false)
  const tableBase = candidate + 14 + tableOffset
  if (tableBase <= 0 || tableBase + elsewhereIndex * 10 + 10 >= romSize) {
    return false
  }

  const sampleIndexes = [0, 1, 2, Math.floor(elsewhereIndex / 2), elsewhereIndex]
  for (const sampleIndex of sampleIndexes) {
    const entry = tableBase + sampleIndex * 10
    if (entry < 0 || entry + 10 > romSize) {
      return false
    }
    const textAddress = kd.rom.data.getUint32(entry, false)
    const layoutAddress = kd.rom.data.getUint32(entry + 4, false)
    const act = kd.rom.data.getUint16(entry + 8, false)
    if (textAddress <= 0 || textAddress >= romSize) {
      return false
    }
    if (layoutAddress <= 0 || layoutAddress >= romSize) {
      return false
    }
    if (act > 10) {
      return false
    }
  }

  return true
}

function findFrameCollisionFrameTable(kd: KidDiscovery) {
  const pattern = 'e2 40 49 f9 ?? ?? ?? ?? d8 f4 00 00'
  const ptr = kd.rom.readPtr(kd.rom.findPattern(pattern) + 4)
  kd.knownAddresses.set('collisionWordTable', ptr)
}

/** Find Asset Table (original JUE is $a09fe) */
function findAssetTable(kd: KidDiscovery) {
  const pattern = '67 00 00 dc 49 f9 ?? ?? ?? ?? 3e 2b 00 22'
  const ptr = kd.rom.readPtr(kd.rom.findPattern(pattern) + 6)
  kd.knownAddresses.set('assetTable', ptr)
}

function findMultipleLevelAddresses(kd: KidDiscovery) {
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
  const ptr = kd.rom.findPattern(pattern)
  const levelIndexesTable = kd.rom.readPtr(kd.rom.readPtr(ptr + 2))
  const levelWordTable = kd.rom.readPtr(ptr + 14)
  const levelWordTableBase = kd.rom.readPtr(ptr + 26)
  kd.knownAddresses.set('levelIndexesTable', levelIndexesTable)
  kd.knownAddresses.set('levelWordTable', levelWordTable)
  kd.knownAddresses.set('levelWordTableBase', levelWordTableBase)
}
