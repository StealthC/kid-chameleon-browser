import type { AllRomResources, ResourceType } from '@repo/kid-util'
import { getNameForType } from './index'

export type ResourceConfidence = 'certain' | 'possible' | null
export type ResourceConfidenceFilter = 'all' | 'certain' | 'possible' | 'unspecified'
export type ResourceLoadedFilter = 'all' | 'loaded' | 'unloaded'
export type ResourceSortOrder = 'address' | 'name' | 'type' | 'size'

export type ResourceIndexEntry = {
  address: number
  type: ResourceType
  typeLabel: string
  name: string
  confidence: ResourceConfidence
  loaded: boolean
  size: number | null
  tags: string[]
}

export type ResourceFilters = {
  search: string
  type: ResourceType | 'all'
  confidence: ResourceConfidenceFilter
  loaded: ResourceLoadedFilter
  sort: ResourceSortOrder
}

const ADDRESS_TOKEN_PREFIX = /^(\$|0x)/i
const HEX_ONLY = /^[0-9a-f]+$/i
const ADDRESS_ONLY_MIN_LENGTH = 4

function toFiniteSize(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null
}

export function getResourceSize(resource: AllRomResources): number | null {
  if (resource.type === 'palette') {
    return resource.size * 2
  }

  if (resource.type === 'palette-map') {
    return resource.size
  }

  if (resource.type === 'unknown') {
    return toFiniteSize(resource.possibleSize)
  }

  if (resource.loaded) {
    return toFiniteSize(resource.inputSize)
  }

  const declaredSize = toFiniteSize(
    (resource as unknown as Record<string, unknown>).inputSize,
  )
  if (declaredSize !== null) {
    return declaredSize
  }

  if (resource.type === 'level-enemy-layout' && typeof resource.objectCount === 'number') {
    return 2 + resource.objectCount * 8
  }

  return null
}

export function normalizeHexAddressQuery(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) {
    return null
  }

  const hadPrefix = ADDRESS_TOKEN_PREFIX.test(trimmed)
  const cleaned = trimmed.replace(ADDRESS_TOKEN_PREFIX, '').replace(/[_\s]/g, '')

  if (!cleaned || !HEX_ONLY.test(cleaned)) {
    return null
  }

  if (!hadPrefix && cleaned.length < ADDRESS_ONLY_MIN_LENGTH) {
    return null
  }

  return cleaned.replace(/^0+(?=.)/, '').toLowerCase()
}

function normalizedAddressHex(address: number): string {
  return address.toString(16).toLowerCase().replace(/^0+(?=.)/, '')
}

function matchesAddressToken(entry: ResourceIndexEntry, token: string): boolean {
  if (!ADDRESS_TOKEN_PREFIX.test(token) && !HEX_ONLY.test(token)) {
    return false
  }

  const normalized = normalizeHexAddressQuery(token)
  if (normalized === null) {
    return false
  }

  return normalizedAddressHex(entry.address).includes(normalized)
}

function matchesTextToken(entry: ResourceIndexEntry, token: string): boolean {
  const haystacks = [
    entry.name,
    entry.type,
    entry.typeLabel,
    entry.confidence ?? '',
    ...entry.tags,
  ]

  return haystacks.some((value) => value.toLowerCase().includes(token))
}

export function matchesResourceQuery(entry: ResourceIndexEntry, query: string): boolean {
  const trimmed = query.trim().toLowerCase()
  if (!trimmed) {
    return true
  }

  return trimmed.split(/\s+/).every((token) => {
    if (matchesTextToken(entry, token)) {
      return true
    }
    return matchesAddressToken(entry, token)
  })
}

export function hasActiveResourceFilters(filters: ResourceFilters): boolean {
  return (
    filters.search.trim().length > 0 ||
    filters.type !== 'all' ||
    filters.confidence !== 'all' ||
    filters.loaded !== 'all'
  )
}

export function filterResources(
  entries: ResourceIndexEntry[],
  filters: ResourceFilters,
): ResourceIndexEntry[] {
  const filtered = entries.filter((entry) => {
    if (filters.type !== 'all' && entry.type !== filters.type) {
      return false
    }

    if (filters.confidence !== 'all') {
      const confidence = entry.confidence ?? 'unspecified'
      if (confidence !== filters.confidence) {
        return false
      }
    }

    if (filters.loaded === 'loaded' && !entry.loaded) {
      return false
    }

    if (filters.loaded === 'unloaded' && entry.loaded) {
      return false
    }

    return matchesResourceQuery(entry, filters.search)
  })

  return filtered.sort((a, b) => {
    if (filters.sort === 'name') {
      return a.name.localeCompare(b.name) || a.address - b.address
    }

    if (filters.sort === 'type') {
      return a.typeLabel.localeCompare(b.typeLabel) || a.address - b.address
    }

    if (filters.sort === 'size') {
      if (a.size === null && b.size === null) return a.address - b.address
      if (a.size === null) return 1
      if (b.size === null) return -1
      return a.size - b.size || a.address - b.address
    }

    return a.address - b.address
  })
}

export function formatCompactSize(size: number | null): string {
  if (size === null) {
    return 'unknown size'
  }

  if (size < 1024) {
    return `${size} B`
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

export function createResourceIndexEntry(
  resource: AllRomResources,
  name: string,
): ResourceIndexEntry {
  return {
    address: resource.baseAddress,
    type: resource.type,
    typeLabel: getNameForType(resource.type),
    name,
    confidence: resource.confidence ?? null,
    loaded: resource.loaded,
    size: getResourceSize(resource),
    tags: resource.tags ?? [],
  }
}
