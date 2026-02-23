import { expect, test, beforeAll, describe } from 'vitest'
import { Rom } from './kid-rom'
import { loadTestRom } from './test-rom-helper'

let rom: Rom | null = null

beforeAll(async () => {
  rom = await loadTestRom({ context: 'Rom checks' })
})

describe('Rom checks', () => {
  test('check pointer reading', () => {
    if (!rom) {
      console.warn('Skipping test: ROM file not found.')
      return
    }
    expect(rom.readPtr(0xa09fe)).toBe(0x00)
    expect(rom.readPtr(0xa09fe + 4)).toBe(0xa1c72)
  })

  test('discover HUD animation frames and reverse references', async () => {
    if (!rom) {
      console.warn('Skipping test: ROM file not found.')
      return
    }

    await rom.loadResources()

    expect(rom.discovery.knownAddresses.get('levelTitleHeaderTable')).toBe(0x1a842)
    expect(rom.discovery.knownAddresses.get('levelTitleElsewhereIndex')).toBe(0x49)
    expect(rom.discovery.knownAddresses.get('levelTitleElsewhereHeader')).toBe(0x1ab1c)
    expect(rom.discovery.knownAddresses.get('levelTitleElsewhereText')).toBe(0x1a7f8)
    expect(rom.discovery.knownAddresses.get('levelTitleElsewhereLayout')).toBe(0x1a83e)

    const animationFrames = rom.resources.getResourcesByType('animation-frame')
    expect(animationFrames.length).toBeGreaterThan(0)

    const clockFrame = animationFrames.find((resource) => resource.name?.startsWith('Clock'))
    const lifeFrame = animationFrames.find((resource) => resource.name?.startsWith('Life'))

    expect(clockFrame).toBeTruthy()
    expect(lifeFrame).toBeTruthy()

    const frame = clockFrame ?? animationFrames[0]
    if (!frame) {
      throw new Error('Animation frame discovery did not return any frame')
    }
    const loadedFrame = await rom.resources.getResourceLoaded<'animation-frame'>(frame.baseAddress)
    expect(loadedFrame?.data.length).toBe(0x80)
    expect(loadedFrame?.inputSize).toBe(0x80)

    const referencedBy = rom.resources.getReferencedBy(frame.baseAddress)
    expect(referencedBy.length).toBeGreaterThan(0)

    const mainTableResources = rom.resources.getResourcesByType([
      'sheet',
      'unlinked-sprite-frame',
      'linked-sprite-frame',
    ])
    const withAddressOffset = mainTableResources.find((resource) => resource.addressOffset !== undefined)
    expect(withAddressOffset?.addressOffset).toBeDefined()

    expect(frame.addressOffset).toBeDefined()

    const kidAnimation = rom.resources.getResource<'animation'>(0x8bb4)
    expect(kidAnimation?.type).toBe('animation')

    const loadedAnimation = await rom.resources.getResourceLoaded<'animation'>(0x8bb4)
    expect(loadedAnimation?.frameCount).toBeGreaterThan(0)
    expect(loadedAnimation?.stepAddresses.length).toBeGreaterThan(0)

    const themePalette = rom.resources.getResource<'palette'>(0x7b6a2)
    expect(themePalette?.type).toBe('palette')
    const loadedThemePalette = await rom.resources.getResourceLoaded<'palette'>(0x7b6a2)
    expect(loadedThemePalette?.colors.length).toBe(15)
    expect(loadedThemePalette?.inputSize).toBe(30)

    const paletteMaps = rom.resources.getResourcesByType('palette-map')
    expect(paletteMaps.length).toBeGreaterThan(0)

    const inferredMainTablePalette = rom.resources.getResource<'palette'>(0xa1c72)
    expect(inferredMainTablePalette?.type).toBe('palette')
    expect(inferredMainTablePalette?.size).toBe(12)

    const themeTitleSheet = rom.resources
      .getResourcesByType('sheet')
      .find((resource) => resource.name?.includes('Theme 1 Title Screen GFX'))
    expect(themeTitleSheet).toBeTruthy()
    if (themeTitleSheet) {
      const paletteRefs = rom.resources
        .getReferencesResources(themeTitleSheet.baseAddress)
        .filter((resource) => resource.type === 'palette')
      expect(paletteRefs.length).toBeGreaterThan(0)
    }

    const firstLevelHeader = rom.resources.getResourcesByType('level-header')[0]
    expect(firstLevelHeader).toBeTruthy()
    if (firstLevelHeader) {
      expect(firstLevelHeader.name).toBeTruthy()
      expect(firstLevelHeader.name).toBe(firstLevelHeader.name?.toUpperCase())

      const loadedHeader = await rom.resources.getResourceLoaded<'level-header'>(firstLevelHeader.baseAddress)
      expect(loadedHeader).toBeTruthy()
      if (loadedHeader) {
        expect(rom.resources.getResource(loadedHeader.blocksDataPtr)?.type).toBe('level-blocks')
        expect(rom.resources.getResource(loadedHeader.levelObjectsHeaderPtr)?.type).toBe(
          'level-objects-header',
        )
        expect(rom.resources.getResource(loadedHeader.backgroundDataPtr)?.type).toBe(
          'level-background-layout',
        )

        const backgroundLayout = await rom.resources.getResourceLoaded<'level-background-layout'>(
          loadedHeader.backgroundDataPtr,
        )
        expect(backgroundLayout?.type).toBe('level-background-layout')
        expect(backgroundLayout?.format).toBeTruthy()

        const titleCard = rom.resources
          .getReferencesResources(loadedHeader.baseAddress)
          .find((resource) => resource.type === 'level-title-card')
        expect(titleCard?.type).toBe('level-title-card')
        if (titleCard?.type === 'level-title-card') {
          const loadedTitleCard = await rom.resources.getResourceLoaded<'level-title-card'>(
            titleCard.baseAddress,
          )
          expect(loadedTitleCard?.titleText.length).toBeGreaterThan(0)
          expect(loadedTitleCard?.titleText).toBe(loadedTitleCard?.titleText.toUpperCase())
        }

        const objectsHeader = await rom.resources.getResourceLoaded<'level-objects-header'>(
          loadedHeader.levelObjectsHeaderPtr,
        )
        expect(objectsHeader?.h1Pointer).toBeGreaterThan(0)

        if (objectsHeader?.h1Pointer) {
          const enemyLayout = await rom.resources.getResourceLoaded<'level-enemy-layout'>(
            objectsHeader.h1Pointer,
          )
          expect(enemyLayout?.type).toBe('level-enemy-layout')
          expect(enemyLayout?.objectCount).toBeGreaterThanOrEqual(0)
        }
      }
    }

    const firstStepAddress = loadedAnimation?.stepAddresses.find((address) => address !== 0x8bb4)
    expect(firstStepAddress).toBeDefined()
    if (firstStepAddress !== undefined) {
      const loadedStep = await rom.resources.getResourceLoaded<'animation-step'>(firstStepAddress)
      expect(loadedStep?.type).toBe('animation-step')
      expect(loadedStep?.animationAddress).toBe(0x8bb4)
    }

    const loopStep = rom.resources.getResource<'animation-step'>(0x8b72)
    expect(loopStep?.type).toBe('animation-step')
    expect(loopStep?.kind).toBe(2)
    expect(loopStep?.animationAddress).toBe(0x8b6a)
    expect(loopStep?.nextFrameAddress).toBe(0x8b6a)

    const animations = rom.resources.getResourcesByType('animation')
    const frameStepOwners = new Map<number, number>()
    for (const animation of animations) {
      for (const stepAddress of animation.stepAddresses ?? []) {
        const step = rom.resources.getResource<'animation-step'>(stepAddress)
        if (!step || step.type !== 'animation-step' || step.kind !== 1) {
          continue
        }
        frameStepOwners.set(stepAddress, (frameStepOwners.get(stepAddress) ?? 0) + 1)
      }
    }

    const hasSharedFrameStep = Array.from(frameStepOwners.values()).some((owners) => owners > 1)
    expect(hasSharedFrameStep).toBe(false)

    const unknownCount = rom.resources.getResourcesByType('unknown').length
    expect(unknownCount).toBeLessThan(220)
  })

  test('resolve level titles on kid_sound hack ROM', async () => {
    const hackRom = await loadTestRom({
      path: 'rom/hacks/kid_sound.bin',
      context: 'kid_sound hack ROM test',
    })
    if (!hackRom) {
      console.warn('Skipping test: kid_sound hack ROM file not found.')
      return
    }

    await hackRom.loadResources()

    expect(hackRom.discovery.knownAddresses.get('levelTitleHeaderTable')).toBeGreaterThan(0)
    expect(hackRom.discovery.knownAddresses.get('levelTitleElsewhereIndex')).toBeGreaterThan(0)
    expect(hackRom.discovery.knownAddresses.get('levelTitleElsewhereHeader')).toBeGreaterThan(0)
    expect(hackRom.discovery.knownAddresses.get('levelTitleElsewhereText')).toBeGreaterThan(0)
    expect(hackRom.discovery.knownAddresses.get('levelTitleElsewhereLayout')).toBeGreaterThan(0)

    const levelHeaders = hackRom.resources.getResourcesByType('level-header')
    const namedLevels = levelHeaders.filter((resource) => !!resource.name)
    expect(namedLevels.length).toBe(levelHeaders.length)
    expect(namedLevels.length).toBeGreaterThan(0)

    const firstLevelName = namedLevels[0]?.name ?? ''
    expect(firstLevelName).toContain('BLUE LAKE WOODS')
    expect(firstLevelName).toBe(firstLevelName.toUpperCase())

    const unknownCount = hackRom.resources.getResourcesByType('unknown').length
    expect(unknownCount).toBe(0)
  })
})
