import PQueue from 'p-queue'
import type { KidDiscovery, KidDiscoveryFunction } from '~/kid-discovery'
import { ExecuteInNextTick } from '../kid-utils'
import { isSpriteFrameResource } from '../kid-resources'
import {
  AssetPtrTableTypes,
  PackedTileSheet,
  SpriteFrameType,
  SpriteFrameWithDataType,
} from '../tables/asset-ptr-table'

export async function findAllResouces(kd: KidDiscovery) {
  const fns: KidDiscoveryFunction[] = [
    findFrameCollisionFromTableResources,
    findAssetTableResources,
    findAllLevelHeaders,
    findThemePaletteResources,
    findHudAnimationFrameResources,
    findAnimationScriptResources,
    findSomeMoreResources,
    addThemeResources,
    annotateUnknownResourcePossibleSizes,
  ]
  const queue = new PQueue({ concurrency: 4 })
  for (const fn of fns) {
    await queue.add(async () => {
      await ExecuteInNextTick(() => fn(kd))
    })
  }
  await queue.onIdle()
}

function annotateUnknownResourcePossibleSizes(kd: KidDiscovery) {
  const allResources = Array.from(kd.rom.resources.resources.values()).sort(
    (a, b) => a.baseAddress - b.baseAddress,
  )

  for (let i = 0; i < allResources.length - 1; i++) {
    const current = allResources[i]
    if (current.type !== 'unknown') {
      continue
    }
    const next = allResources[i + 1]
    const delta = next.baseAddress - current.baseAddress
    if (delta <= 0) {
      continue
    }
    kd.rom.resources.createResource(current.baseAddress, 'unknown', {
      ...current,
      possibleSize: delta,
    })
  }
}

type AnimationTableGroup = {
  name: string
  sequenceOffset: number
  pointerOffset: number
}

function findHudAnimationFrameResources(kd: KidDiscovery) {
  // UpdateStaticAnimations (ROM JUE starts at $44dc)
  const pattern =
    '1e 38 fa ?? 48 87 53 47 66 00 ?? ?? 1e 38 fa ?? 48 87 54 47 11 c7 fa ?? 49 fb 70 ?? 1e 1c 6a 00 ?? ?? 7e 00 11 c7 fa ?? 60 ??'
  let baseAddress: number
  try {
    baseAddress = kd.rom.findPattern(pattern)
  } catch (_e) {
    kd.log('Could not find UpdateStaticAnimations pattern for HUD animations')
    return
  }

  const groups: AnimationTableGroup[] = [
    { name: 'Coin', sequenceOffset: 0x2a, pointerOffset: 0x40 },
    { name: 'Life', sequenceOffset: 0x94, pointerOffset: 0x9e },
    { name: 'Clock', sequenceOffset: 0xe8, pointerOffset: 0xf2 },
    { name: 'Diamond', sequenceOffset: 0x140, pointerOffset: 0x14c },
    { name: 'Flag Top', sequenceOffset: 0x17e, pointerOffset: 0x18c },
  ]

  for (const group of groups) {
    const sequenceAddress = baseAddress + group.sequenceOffset
    const pointerTableAddress = baseAddress + group.pointerOffset
    const frameOffsets = readAnimationSequenceFrameOffsets(kd, sequenceAddress)
    if (frameOffsets.length === 0) {
      continue
    }
    const maxFrameOffset = Math.max(...frameOffsets)
    for (let frameOffset = 0; frameOffset <= maxFrameOffset; frameOffset += 4) {
      const frameAddress = kd.rom.readPtr(pointerTableAddress + frameOffset)
      const frameIndex = frameOffset / 4
      kd.rom.resources.createResource(frameAddress, 'animation-frame', {
        frameGroup: group.name,
        frameIndex,
        addressOffset: frameOffset,
        tableAddress: pointerTableAddress,
        inputSize: 0x80,
        name: `${group.name} Animation Frame ${frameIndex}`,
      })
      kd.rom.resources.addReference(sequenceAddress, frameAddress)
    }
  }
}

function readAnimationSequenceFrameOffsets(kd: KidDiscovery, sequenceAddress: number): number[] {
  const frameOffsets: number[] = []
  let ptr = sequenceAddress
  for (let i = 0; i < 0x40; i++) {
    const step = kd.rom.data.getUint16(ptr, false)
    if (step === 0xffff) {
      break
    }
    frameOffsets.push(kd.rom.data.getUint8(ptr + 1))
    ptr += 2
  }
  return frameOffsets
}

type ParsedAnimationStep = {
  address: number
  kind: number
  delay: number
  spriteOffset?: number
  spriteAddress?: number
  nextFrameAddress?: number
}

type ParsedAnimation = {
  startAddress: number
  terminatorAddress: number
  totalFrames: number
  steps: ParsedAnimationStep[]
  frameStepAddresses: number[]
}

function findAnimationScriptResources(kd: KidDiscovery) {
  const assetTable = kd.knownAddresses.get('assetTable')
  if (!assetTable) {
    return
  }

  const visitedStarts = new Set<number>()
  const maxAddress = Math.min(kd.rom.bytes.length - 8, 0x50000)
  const candidates: ParsedAnimation[] = []
  for (let start = 0; start <= maxAddress; start += 2) {
    if (visitedStarts.has(start)) {
      continue
    }
    const parsed = parseAnimationScript(kd, start, assetTable)
    if (!parsed) {
      continue
    }
    visitedStarts.add(parsed.startAddress)
    if (parsed.frameStepAddresses.length === 0 || parsed.totalFrames <= 0) {
      continue
    }
    candidates.push(parsed)
  }

  const selected = selectBestNonOverlappingAnimations(candidates)
  for (const parsed of selected) {
    createAnimationResourcesFromParsed(kd, parsed)
  }
}

function selectBestNonOverlappingAnimations(candidates: ParsedAnimation[]): ParsedAnimation[] {
  const sorted = [...candidates].sort((a, b) => {
    if (b.frameStepAddresses.length !== a.frameStepAddresses.length) {
      return b.frameStepAddresses.length - a.frameStepAddresses.length
    }
    if (b.totalFrames !== a.totalFrames) {
      return b.totalFrames - a.totalFrames
    }
    return a.startAddress - b.startAddress
  })

  const claimedFrames = new Set<number>()
  const selected: ParsedAnimation[] = []
  for (const candidate of sorted) {
    if (candidate.frameStepAddresses.some((address) => claimedFrames.has(address))) {
      continue
    }
    selected.push(candidate)
    for (const frameAddress of candidate.frameStepAddresses) {
      claimedFrames.add(frameAddress)
    }
  }

  return selected
}

function parseAnimationScript(kd: KidDiscovery, startAddress: number, assetTable: number): ParsedAnimation | null {
  if (kd.rom.data.getUint8(startAddress) !== 1) {
    return null
  }

  const steps: ParsedAnimationStep[] = []
  const frameStepAddresses: number[] = []
  const visited = new Set<number>()
  let current = startAddress
  let totalFrames = 0
  let hasValidSpriteFrameStep = false
  const maxSteps = 128

  for (let i = 0; i < maxSteps; i++) {
    if (current < 0 || current >= kd.rom.bytes.length) {
      return null
    }
    if (visited.has(current)) {
      if (steps.length >= 2 && hasValidSpriteFrameStep) {
        return {
          startAddress,
          terminatorAddress: current,
          totalFrames,
          steps,
          frameStepAddresses,
        }
      }
      return null
    }
    visited.add(current)

    const kind = kd.rom.data.getUint8(current)
    if (kind === 0) {
      steps.push({ address: current, kind, delay: 0 })
      if (steps.length >= 2 && hasValidSpriteFrameStep) {
        return {
          startAddress,
          terminatorAddress: current,
          totalFrames,
          steps,
          frameStepAddresses,
        }
      }
      return null
    }

    if (kind === 1) {
      if (current + 4 > kd.rom.bytes.length) {
        return null
      }
      const delay = kd.rom.data.getUint8(current + 1)
      if (delay === 0) {
        return null
      }
      const spriteOffset = kd.rom.data.getUint16(current + 2, false)
      if (spriteOffset >= 0x49d * 4) {
        return null
      }
      const spriteAddress = kd.rom.readPtr(assetTable + spriteOffset)
      if (spriteAddress <= 0 || spriteAddress >= kd.rom.bytes.length) {
        return null
      }
      const spriteResource = kd.rom.resources.getResource(spriteAddress)
      if (!spriteResource || !isSpriteFrameResource(spriteResource)) {
        return null
      }
      const nextFrameAddress = current + 4
      steps.push({
        address: current,
        kind,
        delay,
        spriteOffset,
        spriteAddress,
        nextFrameAddress,
      })
      frameStepAddresses.push(current)
      hasValidSpriteFrameStep = true
      totalFrames += delay
      current = nextFrameAddress
      continue
    }

    if (kind === 2) {
      if (current + 2 > kd.rom.bytes.length) {
        return null
      }
      const returnTo = kd.rom.data.getUint8(current + 1)
      const nextFrameAddress = current + 1 - returnTo
      if (nextFrameAddress < startAddress || nextFrameAddress >= kd.rom.bytes.length) {
        return null
      }
      steps.push({ address: current, kind, delay: 0, nextFrameAddress })
      current = nextFrameAddress
      continue
    }

    return null
  }

  return null
}

function createAnimationResourcesFromParsed(kd: KidDiscovery, parsed: ParsedAnimation) {
  if (parsed.frameStepAddresses.length === 0 || parsed.totalFrames <= 0) {
    return
  }

  const existingAnimation = kd.rom.resources.getResource(parsed.startAddress)
  if (existingAnimation && existingAnimation.type !== 'animation') {
    return
  }

  const animation = kd.rom.resources.createResource(parsed.startAddress, 'animation', {
    frameCount: parsed.frameStepAddresses.length,
    totalFrames: parsed.totalFrames,
    terminatorAddress: parsed.terminatorAddress,
    stepAddresses: parsed.steps.map((step) => step.address),
    name: `Animation @ ${parsed.startAddress.toString(16)}`,
  })

  for (const step of parsed.steps) {
    if (step.address === parsed.startAddress) {
      if (step.spriteAddress) {
        kd.rom.resources.addReference(animation, step.spriteAddress)
      }
      continue
    }

    const existingStep = kd.rom.resources.getResource(step.address)
    if (existingStep && existingStep.type !== 'animation-step') {
      continue
    }

    kd.rom.resources.createResource(step.address, 'animation-step', {
      animationAddress: parsed.startAddress,
      kind: step.kind,
      delay: step.delay,
      spriteOffset: step.spriteOffset,
      spriteAddress: step.spriteAddress,
      nextFrameAddress: step.nextFrameAddress,
      addressOffset: step.address - parsed.startAddress,
      name: `Animation Step ${step.kind} @ ${step.address.toString(16)}`,
    })
    kd.rom.resources.addReference(animation, step.address)
    if (step.spriteAddress) {
      kd.rom.resources.addReference(step.address, step.spriteAddress)
    }
    if (step.nextFrameAddress !== undefined && step.nextFrameAddress >= parsed.startAddress) {
      kd.rom.resources.addReference(step.address, step.nextFrameAddress)
    }
  }
}

async function findAllLevelHeaders(kd: KidDiscovery) {
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
    kd.rom.resources.createResource(headerAdresss, 'level-header', {
      levelIndex: index,
      wordIndex: wordOffset,
    })
    const loadedLevelHeader =
      await kd.rom.resources.getResourceLoaded<'level-header'>(headerAdresss)
    if (loadedLevelHeader) {
      kd.rom.resources.addReference(headerAdresss, loadedLevelHeader.tilesDataPtr)
      kd.rom.resources.addReference(headerAdresss, loadedLevelHeader.backgroundDataPtr)
      kd.rom.resources.addReference(headerAdresss, loadedLevelHeader.blocksDataPtr)
      kd.rom.resources.addReference(headerAdresss, loadedLevelHeader.levelObjectsHeaderPtr)
      // Create resource for the level tiles
      const levelTilesPtr = loadedLevelHeader.tilesDataPtr
      kd.rom.resources.createResource(levelTilesPtr, 'level-tiles', {
        packed: { format: 'kid' },
      })
    }

    // Peek at the level theme value:
    const theme = kd.rom.data.getUint8(headerAdresss + 2) & 0x3f
    maxTheme = Math.max(maxTheme, theme)
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
  const totalAssets = 0x49d
  const assetSizeHints = buildAssetSizeHints(kd, assetTable, totalAssets)
  const endAddress = assetTable + 0x49d * 4
  for (let ptr = assetTable; ptr < endAddress; ptr += 4) {
    const tableOffset = ptr - assetTable
    const type = AssetPtrTableTypes[index]
    if (type === null) {
      kd.rom.tables.assetIndexTable.push(null)
      index++
      continue
    }
    const resourcePtr = kd.rom.readPtr(ptr)
    const currentAddressOffset = kd.rom.resources.getResource(resourcePtr)?.addressOffset
    const addressOffset = currentAddressOffset ?? tableOffset
    kd.rom.tables.assetIndexTable.push(resourcePtr)
    const collisionPtr = kd.rom.tables.collisionIndexTable[index]
    if (type === PackedTileSheet) {
      kd.rom.resources.createResource(resourcePtr, 'sheet', {
        tableIndex: index,
        addressOffset,
        packed: { format: 'kid' },
      })
    } else if (type === SpriteFrameType) {
      const resource = kd.rom.resources.createResource(resourcePtr, 'unlinked-sprite-frame', {
        tableIndex: index,
        addressOffset,
      })
      if (collisionPtr) {
        kd.rom.resources.addReference(resource, collisionPtr)
      }
    } else if (type === SpriteFrameWithDataType) {
      const resource = kd.rom.resources.createResource(resourcePtr, 'linked-sprite-frame', {
        tableIndex: index,
        addressOffset,
      })
      if (collisionPtr) {
        kd.rom.resources.addReference(resource, collisionPtr)
      }
    } else if (isColorAssetType(type)) {
      const colorCount = getColorAssetTypeCount(type)
      kd.rom.resources.createResource(resourcePtr, 'palette', {
        size: colorCount,
        addressOffset,
        confidence: 'certain',
        name: `Palette (${colorCount} colors)`,
        description: `Asset table color entry ${type}`,
      })
    } else {
      const possibleSize = assetSizeHints.get(resourcePtr)
      const inferredPaletteSize = inferPaletteSizeFromUnknownAsset(
        kd,
        resourcePtr,
        assetSizeHints,
      )
      if (inferredPaletteSize) {
        kd.rom.resources.createResource(resourcePtr, 'palette', {
          size: inferredPaletteSize,
          addressOffset,
          confidence: 'possible',
          description: `Inferred palette from unknown asset type ${type}`,
          name: `Possible Palette (${inferredPaletteSize} colors)`,
        })
      } else {
        kd.rom.resources.createResource(resourcePtr, 'unknown', {
          possibleSize: possibleSize && possibleSize > 0 ? possibleSize : undefined,
          description: `Unknown asset type ${type}`,
        })
      }
    }
    index++
  }
}

function isColorAssetType(type: unknown): type is string {
  return typeof type === 'string' && /^Color\(\d+\)$/.test(type)
}

function getColorAssetTypeCount(type: string): number {
  const match = /^Color\((\d+)\)$/.exec(type)
  if (!match) {
    return 0
  }
  return Number(match[1])
}

function inferPaletteSizeFromUnknownAsset(
  kd: KidDiscovery,
  currentAddress: number,
  assetSizeHints: Map<number, number>,
): number | null {
  const maxSizeBytes = assetSizeHints.get(currentAddress)
  if (!maxSizeBytes || maxSizeBytes <= 0 || maxSizeBytes > 32 || maxSizeBytes % 2 !== 0) {
    return null
  }

  const words = maxSizeBytes / 2
  for (let i = 0; i < words; i++) {
    const color = kd.rom.data.getUint16(currentAddress + i * 2, false)
    if (!isValidMdPaletteWord(color)) {
      return null
    }
  }

  return words
}

function buildAssetSizeHints(
  kd: KidDiscovery,
  assetTable: number,
  totalAssets: number,
): Map<number, number> {
  const addresses = new Set<number>()
  for (let index = 0; index < totalAssets; index++) {
    if (AssetPtrTableTypes[index] === null) {
      continue
    }
    const address = kd.rom.readPtr(assetTable + index * 4)
    if (address > 0 && address < kd.rom.bytes.length) {
      addresses.add(address)
    }
  }

  const sorted = Array.from(addresses).sort((a, b) => a - b)
  const sizeHints = new Map<number, number>()
  for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i]
    const next = sorted[i + 1]
    const delta = next - current
    if (delta > 0) {
      sizeHints.set(current, delta)
    }
  }
  return sizeHints
}

function isValidMdPaletteWord(value: number): boolean {
  if ((value & 0xf000) !== 0) {
    return false
  }
  if ((value & 0x111) !== 0) {
    return false
  }
  return true
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
    kd.rom.resources.createResource(address, 'sprite-collision', {
      wordIndex: index,
      addressOffset: index * 2,
      isInvalid: address >= addressLimit,
    })
    firstData = Math.min(firstData, address)
    index++
    pos += 2
  }
}

function findSomeMoreResources(kd: KidDiscovery) {
  // TODO: Reimplement this
  try {
    findUntabledPackedTileSheetsDirect1(kd).map((result) => {
      kd.rom.resources.createResource(result.ptr, 'sheet', {
        packed: { format: 'kid' },
      })
    })
    findUntabledPackedTileSheetsDirect2(kd).map((result) => {
      kd.rom.resources.createResource(result.ptr, 'sheet', {
        packed: { format: 'kid' },
      })
    })
    findUntabledPackedTileSheetsRelative1(kd).map((result) => {
      kd.rom.resources.createResource(result.ptr, 'sheet', {
        packed: { format: 'kid' },
      })
    })
    findUntabledPackedTileSheetsRelative2(kd).map((result) => {
      kd.rom.resources.createResource(result.ptr, 'sheet', {
        packed: { format: 'kid' },
      })
    })
    findUntabledPackedTileSheetsWithPaletteSwap1(kd).map((result) => {
      kd.rom.resources.createResource(result.ptr, 'sheet', {
        packed: { format: 'kid' },
      })
      if (isLikelyPaletteMap(kd, result.palPtr, 16)) {
        kd.rom.resources.createResource(result.palPtr, 'palette-map', {
          size: 16,
          name: `Palette Map @ ${result.palPtr.toString(16)}`,
        })
        kd.rom.resources.addReference(result.ptr, result.palPtr)
      }
    })
    findUntabledPackedTileSheetsWithPaletteSwap2(kd).map((result) => {
      kd.rom.resources.createResource(result.ptr, 'sheet', {
        packed: { format: 'kid' },
      })
      if (isLikelyPaletteMap(kd, result.palPtr, 16)) {
        kd.rom.resources.createResource(result.palPtr, 'palette-map', {
          size: 16,
          name: `Palette Map @ ${result.palPtr.toString(16)}`,
        })
        kd.rom.resources.addReference(result.ptr, result.palPtr)
      }
    })
  } catch (e) {
    console.error(e)
  }
}

function isLikelyPaletteMap(kd: KidDiscovery, baseAddress: number, size: number): boolean {
  if (baseAddress < 0 || baseAddress + size > kd.rom.bytes.length) {
    return false
  }

  let hasNonIdentityValue = false
  for (let i = 0; i < size; i++) {
    const value = kd.rom.data.getUint8(baseAddress + i)
    if (value > 0x0f) {
      return false
    }
    if (value !== i) {
      hasNonIdentityValue = true
    }
  }

  return hasNonIdentityValue
}

function findThemePaletteResources(kd: KidDiscovery) {
  const numberOfThemes = kd.knownAddresses.get('numberOfThemes')
  const levelMiscPtrTable = kd.knownAddresses.get('levelMiscPtrTable')
  const themePaletteWordTable = kd.knownAddresses.get('themePaletteWordTable')
  const themeBackgroundPaletteWordTable = kd.knownAddresses.get('themeBackgroundPaletteWordTable')
  if (!numberOfThemes || !levelMiscPtrTable || !themePaletteWordTable || !themeBackgroundPaletteWordTable) {
    return
  }

  for (let theme = 1; theme <= numberOfThemes; theme++) {
    const foregroundPalette = resolveThemePalettePointer(
      kd,
      levelMiscPtrTable,
      themePaletteWordTable,
      theme,
    )
    if (foregroundPalette) {
      kd.rom.resources.createResource(foregroundPalette.paletteAddress, 'palette', {
        size: 15,
        name: `Theme ${theme} Foreground Palette`,
        addressOffset: foregroundPalette.wordOffset,
      })
      kd.rom.resources.addReference(themePaletteWordTable, foregroundPalette.paletteAddress)
    }

    const backgroundPalette = resolveThemePalettePointer(
      kd,
      levelMiscPtrTable,
      themeBackgroundPaletteWordTable,
      theme,
    )
    if (backgroundPalette) {
      kd.rom.resources.createResource(backgroundPalette.paletteAddress, 'palette', {
        size: 8,
        name: `Theme ${theme} Background Palette`,
        addressOffset: backgroundPalette.wordOffset,
      })
      kd.rom.resources.addReference(themeBackgroundPaletteWordTable, backgroundPalette.paletteAddress)
    }
  }
}

function resolveThemePalettePointer(
  kd: KidDiscovery,
  levelMiscPtrTable: number,
  wordTableAddress: number,
  themeIndex: number,
): { wordOffset: number; paletteAddress: number } | null {
  const wordOffset = kd.rom.data.getUint16(wordTableAddress + themeIndex * 2, false)
  const pointerSlotAddress = levelMiscPtrTable + wordOffset
  if (pointerSlotAddress < 0 || pointerSlotAddress + 4 > kd.rom.bytes.length) {
    return null
  }
  const paletteAddress = kd.rom.readPtr(pointerSlotAddress)
  if (paletteAddress <= 0 || paletteAddress >= kd.rom.bytes.length) {
    return null
  }
  return { wordOffset, paletteAddress }
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
    let themeTitlePlanePtr: number | null = null
    if (themeTitleScreenGFXPtrTable) {
      const themeTitlePackedGFXPtr = kd.rom.readPtr(themeTitleScreenGFXPtrTable + theme * 4)
      kd.rom.resources.createResource(themeTitlePackedGFXPtr, 'sheet', {
        name: `Theme ${theme} Title Screen GFX`,
        packed: { format: 'kid' },
      })
      titleThemeRelated.add(themeTitlePackedGFXPtr)
    }
    // Load theme title screen plane
    const themeTitleScreenPlanePtrTable = kd.knownAddresses.get('themeTitleScreenPlanePtrTable')
    const themeTitleScreenSizeTable = kd.knownAddresses.get('themeTitleScreenSizeTable')
    if (themeTitleScreenPlanePtrTable) {
      themeTitlePlanePtr = kd.rom.readPtr(themeTitleScreenPlanePtrTable + theme * 4)
      const resource = kd.rom.resources.createResource(themeTitlePlanePtr, 'plane', {
        name: `Theme ${theme} Title Screen Plane`,
        packed: { format: 'enigma' },
      })
      if (themeTitleScreenSizeTable) {
        const width = kd.rom.data.getUint8(themeTitleScreenSizeTable + theme * 2)
        resource.width = width
      }
    }
    // Load theme title screen palette
    const themeTitleScreenPalettePtrTable = kd.knownAddresses.get('themeTitleScreenPalettePtrTable')
    if (themeTitleScreenPalettePtrTable) {
      const themeTitlePalettePtr = kd.rom.readPtr(themeTitleScreenPalettePtrTable + theme * 4)
      kd.rom.resources.createResource(themeTitlePalettePtr, 'palette', {
        name: `Theme ${theme} Title Screen Palette`,
        size: 16,
      })
      titleThemeRelated.add(themeTitlePalettePtr)
    }
    if (themeTitlePlanePtr) {
      kd.rom.resources.addReference(themeTitlePlanePtr, ...Array.from(titleThemeRelated))
    }
  }
}
