//@ts-check
import { beforeAll, describe, expect, test } from '@jest/globals'
import { Rom } from './kid-rom'
import { openFsFile } from './fs'

let rom: Rom
let haveRom = false

beforeAll(async () => {
  try {
    const bytes = await openFsFile('rom/kid.bin')
    rom = new Rom(bytes)
    haveRom = true
  } catch (_e) {
    console.warn('⚠️ Warning: Could not open ROM file. Skipping ROM-dependent tests.')
  }
})

describe('Rom checks', () => {
  test('check pointer reading', () => {
    if (!haveRom) {
      console.warn('Skipping test: ROM file not found.')
      return
    }
    expect(rom.readPtr(0xa09fe)).toBe(0x0)
    expect(rom.readPtr(0xa09fe + 4)).toBe(0xa1c72)
  })
})
