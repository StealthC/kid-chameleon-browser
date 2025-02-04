//@ts-check
import { describe, expect, test } from '@jest/globals'
import { calculatePlayerSpriteDataSize } from './kid-utils'
import { unpackKidFormat } from './unpack-kid'

describe('Data Utils Testing', () => {
  test('check kid unpack', () => {
    const PackedGfxExampleInBase64 =
      'ADXEzP/4xlHHlGaPGPmZRcejKMTRyZRnRkI0IEzRoUaFCjQhEUaNKlQoUMoUKFChRo0yRGlRgDVVAUQBMwERASIiIRE0QyIzVEMxEQQyIgQzRQgQBlMQMhVEVRQgCT9TQAwREkIyEkIREzRFIgRDBDIEECI1RW1RIzMiEAcEYA0EEgQkeAclDAgxCBAJHDETfAc0PGAMBB4EQgQzBEEQDwwoCDQ8XAZQwNzkYAwgCBQcAez0Nf3EUNTc5GAMIAgUHEAMPAAAAA=='
    const PackedBytes = Uint8Array.from(atob(PackedGfxExampleInBase64), (c) => c.charCodeAt(0))
    const unpacked = unpackKidFormat(PackedBytes)
    console.log(unpacked)
    expect(unpacked.totalInputSize).toBe(196)
    expect(unpacked.output.length).toBe(384)
  })
  test('calculatePlayerSpriteDataSize', () => {
    expect(calculatePlayerSpriteDataSize(0xf, 0x12)).toBe(192)
    expect(calculatePlayerSpriteDataSize(0x1f, 0x1e)).toBe(512)
    expect(calculatePlayerSpriteDataSize(0x20, 0x22)).toBe(640)
    expect(calculatePlayerSpriteDataSize(0x2b, 0x3f)).toBe(1536)
    expect(calculatePlayerSpriteDataSize(0x23, 0x26)).toBe(800)
  })
})
