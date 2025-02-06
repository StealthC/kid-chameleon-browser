/**
 * Convert 4bpp data to 8bpp data
 * @param data data to convert
 * @param inputSize size of the input data (defalut is the length of the data)
 * @returns converted data
 */
export function convert4bbTo8bpp(data: Uint8Array, inputSize?: number): Uint8Array {
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

export type rgbaPixel = [number, number, number, number]

type Palette =
  | rgbaPixel[]
  | ((n: number) => rgbaPixel)

export function normalizedPallette(color: number): rgbaPixel {
  const x = color % 4
  const y = Math.floor(color / 4)
  const r = x * (255 / 3)
  const g = y * (255 / 3)
  return [r, g, 0, 255]
}
/**
 * Helper function to get a color from a palette
 */
export function usePalette(pallete: Palette): (n: number) => rgbaPixel {
  if (typeof pallete === 'function') {
    return pallete
  } else {
    return (n: number) => {
      const color = pallete[n]
      if (!color) {
        throw new Error(`Palette color not found for index ${n.toString(10)}`)
      }
      return color
    }
  }
}

/**
 * Get the RGBA colors from a 4bpp byte
 * @param b
 * @param pallete
 * @returns
 */
export function getRGBAFrom4bpp(b: number, pallete: Palette = normalizedPallette): [rgbaPixel, rgbaPixel] {
  const x = b >> 4
  const y = b & 0x0f
  const p = usePalette(pallete)
  return [p(x), p(y)]
}

/**
 * Get the RGBA color from a 8bpp byte
 * @param b
 * @param pallete
 * @returns
 */
export function getRGBAFrom8bpp(b: number, pallete: Palette = normalizedPallette): rgbaPixel {
  const p = usePalette(pallete)
  return p(b)
}

export const CELL_SIZE_8BPP = 8 * 8
export const CELL_SIZE_4BPP = CELL_SIZE_8BPP / 2


/**
 * Get an rbga image from a 4bpp image (using a pallete)
 * @param image4bpp
 * @param pallete
 * @returns
 */
export function getImageFrom4bpp(image4bpp: Uint8Array, pallete: Palette = normalizedPallette): Uint8ClampedArray {
  const image = new Uint8ClampedArray(image4bpp.length * 2 * 4)
  for (let i = 0; i < image4bpp.length; i++) {
    const [c1, c2] = getRGBAFrom4bpp(image4bpp[i]!, pallete)
    image[i * 8] = c1[0]
    image[i * 8 + 1] = c1[1]
    image[i * 8 + 2] = c1[2]
    image[i * 8 + 3] = c1[3]
    image[i * 8 + 4] = c2[0]
    image[i * 8 + 5] = c2[1]
    image[i * 8 + 6] = c2[2]
    image[i * 8 + 7] = c2[3]
  }
  return image
}
/**
 * Get the bytes of a cell from a 4bpp image
 * @param id
 * @param image4bpp
 * @returns
 */
export function getCellBytes(
  id: number,
  image4bpp: Uint8Array,
): Uint8Array {
  return image4bpp.subarray(id * CELL_SIZE_4BPP, id * CELL_SIZE_4BPP + CELL_SIZE_4BPP)
}

/**
 * Get the rgba image of a cell from a 4bpp image using a pallete
 * @param id
 * @param image4bpp
 * @param pallete
 * @returns
 */
export function getCellImageBytes(
  id: number,
  image4bpp: Uint8Array,
  pallete: Palette = normalizedPallette,
): Uint8ClampedArray {
  const cell = getCellBytes(id, image4bpp)
  return getImageFrom4bpp(cell, pallete)
}

export async function createCanvas(
  width: number,
  height: number,
): Promise<OffscreenCanvas | import('canvas').Canvas> {
  if (typeof window !== 'undefined') {
    // Navegador
    const canvas = new OffscreenCanvas(width, height)
    return canvas
  } else {
    // Node.js
    const { createCanvas } = await import('canvas')
    return createCanvas(width, height)
  }
}
