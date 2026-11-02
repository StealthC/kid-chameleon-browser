import { afterEach, describe, expect, test, vi } from 'vitest'
import { openFsFile } from './fs'
import { DEFAULT_TEST_ROM_PATH, loadTestRom } from './test-rom-helper'

vi.mock('./fs', () => ({ openFsFile: vi.fn() }))

describe('loadTestRom', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetAllMocks()
  })

  test('uses the default path and skips when the ROM is absent', async () => {
    vi.stubEnv('KID_ROM_PATH', undefined)
    vi.mocked(openFsFile).mockRejectedValue(Object.assign(new Error('missing'), { code: 'ENOENT' }))
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    expect(await loadTestRom()).toBeNull()
    expect(openFsFile).toHaveBeenCalledWith(DEFAULT_TEST_ROM_PATH)
  })

  test('uses the configured shared ROM and fails if it is absent', async () => {
    vi.stubEnv('KID_ROM_PATH', '/shared/kid.bin')
    vi.mocked(openFsFile).mockRejectedValue(Object.assign(new Error('missing'), { code: 'ENOENT' }))

    await expect(loadTestRom()).rejects.toThrow('missing')
    expect(openFsFile).toHaveBeenCalledWith('/shared/kid.bin')
  })

  test('keeps explicit alternate ROM paths independent of the environment', async () => {
    vi.stubEnv('KID_ROM_PATH', '/shared/kid.bin')
    vi.mocked(openFsFile).mockRejectedValue(Object.assign(new Error('missing'), { code: 'ENOENT' }))
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    expect(await loadTestRom({ path: 'rom/hacks/kid_sound.bin' })).toBeNull()
    expect(openFsFile).toHaveBeenCalledWith('rom/hacks/kid_sound.bin')
  })
})
