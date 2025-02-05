//@ts-check
import { beforeAll, describe, expect, test, it } from '@jest/globals'
import { compilePattern, PatternFinder } from './pattern-finder'

describe('Pattern Matching', () => {
  describe('Basic Pattern Matching', () => {
    it('should find a simple pattern', () => {
      const data = new Uint8Array([0x00, 0x11, 0x22, 0x33, 0x44, 0x55, 0x66])
      const finder = new PatternFinder('00 11 22', data)
      expect(finder.findNext()).toBe(0)
      expect(finder.findNext()).toBe(-1)
    })
  })

  describe('Wildcard Pattern Matching', () => {
    it('should match wildcard patterns', () => {
      const data = new Uint8Array([0x00, 0x11, 0x22, 0x33, 0x44, 0x55, 0x66])
      const finder = new PatternFinder('00 ?? 22', data)
      expect(finder.findNext()).toBe(0)
      expect(finder.findNext()).toBe(-1)
    })
  })

  describe('Nibble Pattern Matching', () => {
    it('should match patterns with fixed nibbles', () => {
      const data = new Uint8Array([0x00, 0x1a, 0x2b, 0x3c, 0x4d, 0x5e, 0x6f])
      const finder = new PatternFinder('00 1? 2B ?C', data)
      expect(finder.findNext()).toBe(0)
      expect(finder.findNext()).toBe(-1)
    })
  })

  describe('Masked Pattern Matching', () => {
    it('should match patterns with masks', () => {
      const data = new Uint8Array([0x00, 0x11, 0x22, 0x33, 0x44, 0x55, 0x66])
      const finder = new PatternFinder('00:FF 41:0F 22:FF', data)
      expect(finder.findNext()).toBe(0)
      expect(finder.findNext()).toBe(-1)
    })
  })

  describe('Alternative Pattern Matching', () => {
    it('should match patterns with alternatives', () => {
      const data = new Uint8Array([0x00, 0x11, 0x22, 0x33, 0x44, 0x00, 0x22, 0x22, 0x55, 0x66])
      const finder = new PatternFinder('00 11|22 22', data)
      expect(finder.findNext()).toBe(0)
      expect(finder.findNext()).toBe(5)
      expect(finder.findNext()).toBe(-1)
    })

    it('should match patterns with multiple alternatives', () => {
      const data = new Uint8Array([0x00, 0x11, 0x44, 0x00, 0x22, 0x44, 0x00, 0x33, 0x44, 0x55])
      const finder = new PatternFinder('00 11|22|33 44', data)
      expect(finder.findNext()).toBe(0)
      expect(finder.findNext()).toBe(3)
      expect(finder.findNext()).toBe(6)
      expect(finder.findNext()).toBe(-1)
    })
  })

  describe('Group Pattern Matching', () => {
    it('should match patterns with groups', () => {
      const data = new Uint8Array([0x00, 0x11, 0x22, 0x33, 0x44, 0x55, 0x66])
      const finder = new PatternFinder('[00 11]||[22 33]', data)
      expect(finder.findNext()).toBe(0)
      expect(finder.findNext()).toBe(2)
      expect(finder.findNext()).toBe(-1)
    })
  })

  describe('Complex Pattern Matching', () => {
    it('should match complex patterns', () => {
      const data = new Uint8Array([0x00, 0x11, 0x22, 0x55, 0x00, 0x33, 0x44, 0x55, 0x66])
      const finder = new PatternFinder('00 [11 22]||[33 44] 55', data)
      expect(finder.findNext()).toBe(0)
      expect(finder.findNext()).toBe(4)
      expect(finder.findNext()).toBe(-1)
    })

    it('should match complex patterns with subgroups', () => {
      const data = new Uint8Array([0x00, 0x11, 0x22, 0x44, 0x55, 0x00, 0x11,0x33, 0x44, 0x55])
      const finder = new PatternFinder('00 [11 [22||33] 44] 55', data)
      expect(finder.findNext()).toBe(0)
      expect(finder.findNext()).toBe(5)
    })
  })

  describe('Overlapping Pattern Matching', () => {
    it('should find overlapping patterns when allowed', () => {
      const data = new Uint8Array([0x00, 0x11, 0x00, 0x11, 0x00, 0x11])
      const finder = new PatternFinder('00|11 11|00', data, 0, true)
      expect(finder.findNext()).toBe(0)
      expect(finder.findNext()).toBe(1)
      expect(finder.findNext()).toBe(2)
      expect(finder.findNext()).toBe(3)
      expect(finder.findNext()).toBe(4)
      expect(finder.findNext()).toBe(-1)
    })

    it('should not find overlapping patterns when not allowed', () => {
      const data = new Uint8Array([0x00, 0x11, 0x00, 0x11, 0x00, 0x11])
      const finder = new PatternFinder('00|11 11|00', data, 0, false)
      expect(finder.findNext()).toBe(0)
      expect(finder.findNext()).toBe(2)
      expect(finder.findNext()).toBe(4)
      expect(finder.findNext()).toBe(-1)
    })
  })
})
