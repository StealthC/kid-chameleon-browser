import PQueue from 'p-queue'
import type { KidDiscovery, KidDiscoveryFunction } from '~/kid-discovery'
import type { SheetRomResourceUnloaded } from '~/kid-resources'
import { ExecuteInNextTick } from '~/kid-utils'

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
  ]
  const queue = new PQueue({ concurrency: 4 })
  for (const fn of fns) {
    await queue.add(ExecuteInNextTick.bind(null, fn.bind(null, kd)))
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
      const resource = kd.rom.createResource(address, 'sheet') as SheetRomResourceUnloaded
      resource.packed = { format: 'kid' }
      resource.name = 'Common Blocks Graphics'
      resource.description = 'Graphics for Common Blocks used in levels'
      kd.rom.addResource(resource)
    },
    'themeBackgroundPlanePtrTable',
    (address) => {
      // HUD Numbers Packed Sheet
      const resource = kd.rom.createResource(address, 'sheet') as SheetRomResourceUnloaded
      resource.packed = { format: 'kid' }
      resource.name = 'HUD Numbers Graphics'
      kd.rom.addResource(resource)
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

  const pattern =
    '3c 00 d0 40 d0 40 3e 00 41 fa ?? ?? 20 70 00 00 30 3c 5f 60 48 e7 ff 00 4e b9 00 01 19 38'
  const ptr = kd.rom.findPattern(pattern)
  const offset = kd.rom.data.getInt16(ptr + 10, false)
  const PC = ptr + 10
  const address = PC + offset
  kd.knownAddresses.set('themeTitleScreenGFXPtrTable', address)
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
