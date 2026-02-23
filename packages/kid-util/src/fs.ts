import * as fsp from 'node:fs/promises'
import { isAbsolute, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export async function openFsFile(path: string): Promise<Uint8Array> {
  try {
    return (await fsp.readFile(path)) as Uint8Array
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code

    if (isAbsolute(path) || code !== 'ENOENT') {
      throw error
    }

    const packageRoot = fileURLToPath(new URL('..', import.meta.url))
    const packagePath = resolve(packageRoot, path)
    return (await fsp.readFile(packagePath)) as Uint8Array
  }
}
