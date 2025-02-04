import * as fsp from 'node:fs/promises'

export async function openFsFile(path: string): Promise<Uint8Array> {
  return (await fsp.readFile(path)) as Uint8Array
}
