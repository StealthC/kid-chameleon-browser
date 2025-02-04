//@ts-check
import { beforeAll, describe, expect, test } from '@jest/globals'
import { Rom } from './rom'
import { openFsFile } from './fs'

let rom: Rom

beforeAll(async () => {
  const bytes = await openFsFile('rom/kid.bin')
  rom = new Rom(bytes)
})

describe('Rom checks', () => {
  test('check pointer reading', () => {
    expect(rom.readPtr(0xa09fe)).toBe(0x0)
    expect(rom.readPtr(0xa09fe + 4)).toBe(0xa1c72)
  })
})
