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

    const firstStepAddress = loadedAnimation?.stepAddresses.find((address) => address !== 0x8bb4)
    expect(firstStepAddress).toBeDefined()
    if (firstStepAddress !== undefined) {
      const loadedStep = await rom.resources.getResourceLoaded<'animation-step'>(firstStepAddress)
      expect(loadedStep?.type).toBe('animation-step')
      expect(loadedStep?.animationAddress).toBe(0x8bb4)
    }

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
  })
})
