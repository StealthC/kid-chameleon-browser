export function readPtr(data: DataView, ptr: number): number {
  return data.getUint32(ptr, false)
}

export function bytesToPixels(data: Uint8Array, inputSize?: number): Uint8Array {
  if (!inputSize) {
    inputSize = data.length
  }
  const pixels = new Uint8Array(inputSize * 2)
  for (let i = 0; i < inputSize; i++) {
    const b = data[i]
    if (b === undefined) {
      throw new Error(`Invalid byte at position ${i.toString(10)}`)
    }
    pixels[i * 2] = b >> 4
    pixels[i * 2 + 1] = b & 0x0f
  }
  return pixels
}

type Palette =
  | [number, number, number, number][]
  | ((n: number) => [number, number, number, number])

export function normalizedPallette(color: number): [number, number, number, number] {
  const x = color % 4
  const y = Math.floor(color / 4)
  const r = x * (255 / 3)
  const g = y * (255 / 3)
  return [r, g, 0, 255]
}

export function getCellImageBytes(
  id: number,
  bytes: Uint8Array,
  pallete: Palette = normalizedPallette,
): Uint8ClampedArray {
  const getRBB = (n: number): [number, number, number, number] => {
    if (typeof pallete === 'function') {
      return pallete(n)
    } else {
      const color = pallete[n]
      if (!color) {
        throw new Error(`Palette color not found for index ${n.toString(10)}`)
      }
      return color
    }
  }
  const cellSize = 8 * 8
  const cell = new Uint8ClampedArray(cellSize * 4)
  for (let i = 0; i < cellSize; i++) {
    const byte = bytes[id * cellSize + i] ?? 0
    const [r, g, b, a] = getRBB(byte)
    cell[i * 4] = r
    cell[i * 4 + 1] = g
    cell[i * 4 + 2] = b
    cell[i * 4 + 3] = a
  }
  return cell
}
/** Calculate the total bytes attached in a Player Sprite Frame */
export function calculatePlayerSpriteDataSize(width: number, height: number): number {
  return Math.ceil(width / 8.0) * Math.ceil(height / 8.0) * 32
}
