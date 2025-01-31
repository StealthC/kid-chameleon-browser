//@ts-check
import {beforeAll, describe, expect, test} from '@jest/globals';
import {unpackKidFormat} from './kid-utils'

describe('Data Utils Testing', () => {
  test('check kid unpack', () => {
    const PackedGfxExampleInBase64 = "ADXEzP/4xlHHlGaPGPmZRcejKMTRyZRnRkI0IEzRoUaFCjQhEUaNKlQoUMoUKFChRo0yRGlRgDVVAUQBMwERASIiIRE0QyIzVEMxEQQyIgQzRQgQBlMQMhVEVRQgCT9TQAwREkIyEkIREzRFIgRDBDIEECI1RW1RIzMiEAcEYA0EEgQkeAclDAgxCBAJHDETfAc0PGAMBB4EQgQzBEEQDwwoCDQ8XAZQwNzkYAwgCBQcAez0Nf3EUNTc5GAMIAgUHEAMPAAAAA==";
    const PackedBytes = Uint8Array.from(atob(PackedGfxExampleInBase64), c => c.charCodeAt(0));
    const unpacked = unpackKidFormat(PackedBytes);
    console.log(unpacked)
    expect(unpacked.totalInputSize).toBe(196)
    expect(unpacked.output.length).toBe(384)
  })
});