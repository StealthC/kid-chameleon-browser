import { Rom } from './kid-rom'
import { openFsFile } from './fs'

export const DEFAULT_TEST_ROM_PATH = 'rom/kid.bin'

type LoadTestRomOptions = {
  path?: string
  context?: string
}

export async function loadTestRom(options: LoadTestRomOptions = {}): Promise<Rom | null> {
  const configuredPath = options.path === undefined ? process.env.KID_ROM_PATH : undefined
  const path = options.path ?? configuredPath ?? DEFAULT_TEST_ROM_PATH
  const { context = 'ROM-dependent tests' } = options

  try {
    const bytes = await openFsFile(path)
    return new Rom(bytes)
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code

    if (code === 'ENOENT' && configuredPath === undefined) {
      console.warn(`⚠️ Warning: Could not open ROM file at "${path}". Skipping ${context}.`)
      return null
    }

    throw error
  }
}
