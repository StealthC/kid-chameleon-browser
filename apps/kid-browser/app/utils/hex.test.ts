import { describe, expect, it } from 'vitest'
import {
  bytesToHex,
  findByteSequence,
  formatHexAddress,
  formatHexRange,
  getHexPageState,
  normalizeSelection,
  pageForIndex,
  parseHexByteSequence,
  parseHexNumber,
  selectionLength,
  toAscii,
} from './hex'

describe('parseHexNumber', () => {
  it('accepts $, 0x and bare hexadecimal forms', () => {
    expect(parseHexNumber('$1A2B')).toBe(0x1a2b)
    expect(parseHexNumber('0x1a2b')).toBe(0x1a2b)
    expect(parseHexNumber('1A2B')).toBe(0x1a2b)
    expect(parseHexNumber(' 1A 2B ')).toBe(0x1a2b)
  })

  it('rejects invalid input', () => {
    expect(parseHexNumber('')).toBeNull()
    expect(parseHexNumber('0x')).toBeNull()
    expect(parseHexNumber('not-hex')).toBeNull()
    expect(parseHexNumber('-1')).toBeNull()
  })
})

describe('parseHexByteSequence', () => {
  it('accepts spaced, compact and prefixed bytes', () => {
    expect(Array.from(parseHexByteSequence('DE AD BE EF').bytes ?? [])).toEqual([
      0xde, 0xad, 0xbe, 0xef,
    ])
    expect(Array.from(parseHexByteSequence('deadbeef').bytes ?? [])).toEqual([
      0xde, 0xad, 0xbe, 0xef,
    ])
    expect(Array.from(parseHexByteSequence('0xDE, 0xAD').bytes ?? [])).toEqual([0xde, 0xad])
    expect(Array.from(parseHexByteSequence('$DE $AD').bytes ?? [])).toEqual([0xde, 0xad])
  })

  it('reports actionable errors', () => {
    expect(parseHexByteSequence('').error).toBeTruthy()
    expect(parseHexByteSequence('XYZ').error).toMatch(/hexadecimal digits/i)
    expect(parseHexByteSequence('DEA').error).toMatch(/two hexadecimal digits/i)
  })
})

describe('findByteSequence', () => {
  const data = new Uint8Array([0xaa, 0xbb, 0xaa, 0xbb, 0xaa])

  it('finds overlapping matches and reports offsets', () => {
    expect(findByteSequence(data, new Uint8Array([0xaa, 0xbb]))).toEqual([0, 2])
    expect(findByteSequence(data, new Uint8Array([0xaa]))).toEqual([0, 2, 4])
  })

  it('returns no matches when the sequence is absent or too long', () => {
    expect(findByteSequence(data, new Uint8Array([0xbb, 0xbb]))).toEqual([])
    expect(findByteSequence(data, new Uint8Array([1, 2, 3, 4, 5, 6, 7]))).toEqual([])
    expect(findByteSequence(data, new Uint8Array())).toEqual([])
  })
})

describe('hex ranges and pages', () => {
  it('formats inclusive ranges', () => {
    expect(formatHexAddress(0xa09fe)).toBe('$A09FE')
    expect(formatHexRange(0x1000, 16)).toBe('$1000–$100F')
    expect(formatHexRange(0x1000, 0)).toBe('$1000 (empty)')
  })

  it('clamps pages and reports boundaries', () => {
    expect(getHexPageState(0, 0, 256)).toMatchObject({
      page: 0,
      pageCount: 1,
      offsetStart: 0,
      offsetEnd: 0,
      hasPrevious: false,
      hasNext: false,
    })
    expect(getHexPageState(600, 9, 256)).toMatchObject({
      page: 2,
      pageCount: 3,
      offsetStart: 512,
      offsetEnd: 600,
      hasPrevious: true,
      hasNext: false,
    })
    expect(pageForIndex(300, 256, 600)).toBe(1)
    expect(pageForIndex(9999, 256, 600)).toBe(0)
  })

  it('normalizes selections to inclusive, in-bounds ranges', () => {
    expect(normalizeSelection(8, 3, 10)).toEqual({ start: 3, end: 8 })
    expect(normalizeSelection(-5, 99, 10)).toEqual({ start: 0, end: 9 })
    expect(normalizeSelection(0, 0, 0)).toBeNull()
    expect(selectionLength({ start: 2, end: 5 })).toBe(4)
    expect(selectionLength(null)).toBe(0)
  })

  it('copies inclusive byte ranges and renders ASCII', () => {
    const data = new Uint8Array([0x41, 0x42, 0x00, 0x7f])
    expect(bytesToHex(data, 0, 1)).toBe('41 42')
    expect(bytesToHex(data)).toBe('41 42 00 7F')
    expect(bytesToHex(data, 3, 0)).toBe('')
    expect(toAscii(0x41)).toBe('A')
    expect(toAscii(0x00)).toBe('.')
    expect(toAscii(0x7f)).toBe('.')
  })
})
