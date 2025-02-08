export function readPtr(data: DataView, ptr: number): number {
  return data.getUint32(ptr, false)
}

/** Calculate the total bytes attached in a Player Sprite Frame */
export function calculatePlayerSpriteDataSize(width: number, height: number): number {
  return Math.ceil(width / 8.0) * Math.ceil(height / 8.0) * 32
}

export type UnpackReturn = {
  output: Uint8Array,
  results: UnpackResults
}

export type UnpackResults = {
  startAddress: number
  endAddress: number
  sizePacked: number
  sizeUnpacked: number
  ratio: number
  success: boolean
}
