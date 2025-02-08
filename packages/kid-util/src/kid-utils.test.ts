//@ts-check
import { describe, expect, test } from '@jest/globals'
import { calculatePlayerSpriteDataSize } from './kid-utils'

describe('Data Utils Testing', () => {
  test('calculatePlayerSpriteDataSize', () => {
    expect(calculatePlayerSpriteDataSize(0xf, 0x12)).toBe(192)
    expect(calculatePlayerSpriteDataSize(0x1f, 0x1e)).toBe(512)
    expect(calculatePlayerSpriteDataSize(0x20, 0x22)).toBe(640)
    expect(calculatePlayerSpriteDataSize(0x2b, 0x3f)).toBe(1536)
    expect(calculatePlayerSpriteDataSize(0x23, 0x26)).toBe(800)
  })
})
