import { describe, expect, it } from 'vitest'
import {
  addressFormat,
  getAddressNumber,
  getResourceRoute,
  parseAddressOrNull,
} from './index'

describe('address parsing', () => {
  it('parses hex strings with $ prefix', () => {
    expect(getAddressNumber('$1A2B')).toBe(0x1a2b)
    expect(parseAddressOrNull('$1A2B')).toBe(0x1a2b)
  })

  it('parses hex strings with 0x prefix', () => {
    expect(getAddressNumber('0xFF')).toBe(0xff)
    expect(parseAddressOrNull('0xFF')).toBe(0xff)
  })

  it('accepts numeric addresses', () => {
    expect(parseAddressOrNull(0x1234)).toBe(0x1234)
  })

  it('returns null for invalid values', () => {
    expect(parseAddressOrNull('')).toBeNull()
    expect(parseAddressOrNull('not-hex')).toBeNull()
    expect(parseAddressOrNull(-1)).toBeNull()
    expect(parseAddressOrNull(null)).toBeNull()
    expect(parseAddressOrNull(undefined)).toBeNull()
  })
})

describe('resource route helpers', () => {
  it('formats addresses and route payload consistently', () => {
    expect(addressFormat(0x2a)).toBe('$2A')
    expect(getResourceRoute(0x2a)).toEqual({
      name: 'resources-address',
      params: { address: '$2A' },
    })
  })
})
