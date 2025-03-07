//@ts-check
import { describe, expect, test } from 'vitest'
import { unpackKidFormat } from './unpack-kid'

describe('Data Utils Testing', () => {
  test('check kid unpack', () => {
    const PackedGfxExampleInBase64 =
      'ADXEzP/4xlHHlGaPGPmZRcejKMTRyZRnRkI0IEzRoUaFCjQhEUaNKlQoUMoUKFChRo0yRGlRgDVVAUQBMwERASIiIRE0QyIzVEMxEQQyIgQzRQgQBlMQMhVEVRQgCT9TQAwREkIyEkIREzRFIgRDBDIEECI1RW1RIzMiEAcEYA0EEgQkeAclDAgxCBAJHDETfAc0PGAMBB4EQgQzBEEQDwwoCDQ8XAZQwNzkYAwgCBQcAez0Nf3EUNTc5GAMIAgUHEAMPAAAAA=='
    const PackedBytes = Uint8Array.from(atob(PackedGfxExampleInBase64), (c) => c.charCodeAt(0))
    const unpacked = unpackKidFormat(PackedBytes)
    expect(unpacked.results.sizePacked).toBe(196)
    expect(unpacked.output.length).toBe(384)
  })
})
