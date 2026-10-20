import { describe, expect, it } from 'vitest'
import type { AllRomResources } from '@repo/kid-util'
import {
  createResourceIndexEntry,
  filterResources,
  formatCompactSize,
  getResourceSize,
  matchesResourceQuery,
  normalizeHexAddressQuery,
  type ResourceIndexEntry,
} from './resourceSearch'

const unknownResource = {
  baseAddress: 0x1000,
  type: 'unknown',
  loaded: false,
  possibleSize: 0x40,
} as unknown as AllRomResources

const paletteResource = {
  baseAddress: 0x2000,
  type: 'palette',
  loaded: false,
  size: 16,
} as unknown as AllRomResources

const loadedSheet = {
  baseAddress: 0xa09fe,
  type: 'sheet',
  loaded: true,
  inputSize: 0x80,
  hash: 0x12345678,
  data: new Uint8Array(0x80),
  tiles: [],
} as unknown as AllRomResources

function entry(overrides: Partial<ResourceIndexEntry> = {}): ResourceIndexEntry {
  return {
    address: 0xa09fe,
    type: 'sheet',
    typeLabel: 'Tile Sheet',
    name: 'Player Sheet',
    confidence: 'certain',
    loaded: false,
    size: 0x80,
    tags: [],
    ...overrides,
  }
}

describe('normalizeHexAddressQuery', () => {
  it('normalizes prefixed and bare hexadecimal addresses', () => {
    expect(normalizeHexAddressQuery('$A09FE')).toBe('a09fe')
    expect(normalizeHexAddressQuery('0xA09FE')).toBe('a09fe')
    expect(normalizeHexAddressQuery('a09fe')).toBe('a09fe')
    expect(normalizeHexAddressQuery('$000A09FE')).toBe('a09fe')
    expect(normalizeHexAddressQuery('  $A0 9F E ')).toBe('a09fe')
  })

  it('ignores short bare tokens and invalid values', () => {
    expect(normalizeHexAddressQuery('A0')).toBeNull()
    expect(normalizeHexAddressQuery('sheet')).toBeNull()
    expect(normalizeHexAddressQuery('')).toBeNull()
  })
})

describe('matchesResourceQuery', () => {
  it('matches names, types and normalized addresses', () => {
    expect(matchesResourceQuery(entry(), 'player')).toBe(true)
    expect(matchesResourceQuery(entry(), 'tile sheet')).toBe(true)
    expect(matchesResourceQuery(entry(), '$A09FE')).toBe(true)
    expect(matchesResourceQuery(entry(), '0xa09')).toBe(true)
    expect(matchesResourceQuery(entry(), 'a09fe')).toBe(true)
    expect(matchesResourceQuery(entry(), 'sheet $A09')).toBe(true)
    expect(matchesResourceQuery(entry(), 'missing')).toBe(false)
  })

  it('is case-insensitive and empty queries match everything', () => {
    expect(matchesResourceQuery(entry(), 'PLAYER')).toBe(true)
    expect(matchesResourceQuery(entry(), '   ')).toBe(true)
  })
})

describe('resource sizes', () => {
  it('derives sizes for known resource shapes', () => {
    expect(getResourceSize(unknownResource)).toBe(0x40)
    expect(getResourceSize(paletteResource)).toBe(32)
    expect(getResourceSize(loadedSheet)).toBe(0x80)
  })

  it('returns null when no size is declared', () => {
    expect(
      getResourceSize({
        baseAddress: 0x3000,
        type: 'level-header',
        loaded: false,
        levelIndex: 0,
        wordIndex: 0,
      } as unknown as AllRomResources),
    ).toBeNull()
  })

  it('formats compact sizes', () => {
    expect(formatCompactSize(null)).toBe('unknown size')
    expect(formatCompactSize(512)).toBe('512 B')
    expect(formatCompactSize(1536)).toBe('1.5 KB')
    expect(formatCompactSize(1024 * 1024)).toBe('1.0 MB')
  })
})

describe('createResourceIndexEntry', () => {
  it('copies triage fields from the resource', () => {
    expect(createResourceIndexEntry(unknownResource, '$1000')).toMatchObject({
      address: 0x1000,
      type: 'unknown',
      typeLabel: 'Unknown',
      confidence: null,
      loaded: false,
      size: 0x40,
    })
  })
})

describe('filterResources', () => {
  const entries: ResourceIndexEntry[] = [
    entry({ address: 0x1000, name: 'Beta', type: 'plane', typeLabel: 'Plane', size: 64 }),
    entry({ address: 0x2000, name: 'Alpha', type: 'sheet', typeLabel: 'Tile Sheet', size: null }),
    entry({
      address: 0x3000,
      name: 'Gamma',
      type: 'palette',
      typeLabel: 'Palette',
      confidence: 'possible',
      loaded: true,
      size: 32,
    }),
  ]

  const baseFilters = {
    search: '',
    type: 'all' as const,
    confidence: 'all' as const,
    loaded: 'all' as const,
    sort: 'address' as const,
  }

  it('filters by confidence, decode state and type', () => {
    expect(filterResources(entries, { ...baseFilters, confidence: 'possible' })).toHaveLength(1)
    expect(filterResources(entries, { ...baseFilters, loaded: 'loaded' })).toHaveLength(1)
    expect(filterResources(entries, { ...baseFilters, loaded: 'unloaded' })).toHaveLength(2)
    expect(filterResources(entries, { ...baseFilters, type: 'plane' })).toHaveLength(1)
    expect(filterResources(entries, { ...baseFilters, confidence: 'unspecified' })).toHaveLength(0)
  })

  it('sorts by name, type and size with unknown sizes last', () => {
    expect(filterResources(entries, { ...baseFilters, sort: 'name' }).map((e) => e.name)).toEqual([
      'Alpha',
      'Beta',
      'Gamma',
    ])
    expect(filterResources(entries, { ...baseFilters, sort: 'type' }).map((e) => e.typeLabel)).toEqual([
      'Palette',
      'Plane',
      'Tile Sheet',
    ])
    expect(filterResources(entries, { ...baseFilters, sort: 'size' }).map((e) => e.name)).toEqual([
      'Gamma',
      'Beta',
      'Alpha',
    ])
  })
})
