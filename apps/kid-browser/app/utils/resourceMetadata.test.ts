import { describe, expect, it } from 'vitest'
import type { AllRomResources } from '@repo/kid-util'
import { buildResourceMetadata } from './resourceMetadata'

function section(sections: ReturnType<typeof buildResourceMetadata>, id: string) {
  return sections.find((entry) => entry.id === id)
}

function item(sections: ReturnType<typeof buildResourceMetadata>, sectionId: string, label: string) {
  return section(sections, sectionId)?.items.find((entry) => entry.label === label)
}

describe('buildResourceMetadata', () => {
  it('describes an undeclared unknown resource with normalized data fields', () => {
    const resource = {
      baseAddress: 0x1000,
      type: 'unknown',
      loaded: false,
      possibleSize: 32,
      confidence: 'possible',
    } as unknown as AllRomResources

    const sections = buildResourceMetadata(resource, { referenceCount: 2, referencedByCount: 1 })

    expect(section(sections, 'identity')?.items.map((entry) => entry.label)).toContain('Confidence')
    expect(item(sections, 'identity', 'Confidence')?.value).toBe('Possible')
    expect(item(sections, 'data', 'Decode state')?.value).toBe('Metadata only')
    expect(item(sections, 'data', 'Input size')?.value).toBe('32 bytes')
    expect(item(sections, 'data', 'Address range')?.value).toBe('$1000–$101F')
    expect(item(sections, 'data', 'Address range')?.copyValue).toBe('$1000-$101F')
    expect(item(sections, 'type-details', 'Possible size')?.hint).toBe('0x20 bytes')
    expect(item(sections, 'related', 'Outgoing references')?.value).toBe('2')
    expect(item(sections, 'related', 'Incoming references')?.value).toBe('1')
  })

  it('reports loaded CRC32 and type-specific palette details', () => {
    const resource = {
      baseAddress: 0x2000,
      type: 'palette',
      loaded: true,
      size: 4,
      colors: [0x0000, 0x0eee, 0x00e0, 0x0e00],
      hash: 0xdeadbeef,
      inputSize: 8,
    } as unknown as AllRomResources

    const sections = buildResourceMetadata(resource)

    expect(item(sections, 'data', 'Decode state')?.value).toBe('Decoded')
    expect(item(sections, 'data', 'CRC32')?.value).toBe('DEADBEEF')
    expect(item(sections, 'data', 'CRC32')?.copyValue).toBe('DEADBEEF')
    expect(item(sections, 'type-details', 'Entries')?.value).toBe('4')
    expect(item(sections, 'type-details', 'Colors')?.value).toBe('4')
  })

  it('marks pointer fields as navigable address links', () => {
    const resource = {
      baseAddress: 0x3000,
      type: 'level-title-card',
      loaded: true,
      levelIndex: 3,
      effectiveLevelIndex: 4,
      textAddress: 0x4000,
      layoutAddress: 0x4100,
      act: 2,
      lines: ['TEST'],
      titleText: 'TEST II',
      hash: 0,
      inputSize: 10,
    } as unknown as AllRomResources

    const sections = buildResourceMetadata(resource)

    expect(item(sections, 'type-details', 'Title text')).toMatchObject({
      value: '$4000',
      linkAddress: 0x4000,
      copyValue: '$4000',
    })
    expect(item(sections, 'type-details', 'Title layout')?.linkAddress).toBe(0x4100)
    expect(item(sections, 'type-details', 'Resolved title')?.value).toBe('TEST II')
  })
})
