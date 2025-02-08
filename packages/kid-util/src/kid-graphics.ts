/**
 * Unpacks data from a 4bpp indexed image to an 8bpp indexed image. Each byte of the 4bpp image
 * contains two pixels (each with 4 bits), and this function returns a new array where each byte
 * represents a pixel (even if the values are 0–15).
 *
 * @param data Image data in Indexed4.
 * @param inputSize Data size (default: data.length).
 * @returns Unpacked data in Indexed8.
 */
export function unpackIndexed4ToIndexed8(data: Uint8Array, inputSize?: number): Uint8Array {
  const size = inputSize ?? data.length
  const pixels = new Uint8Array(size * 2)
  for (let i = 0; i < size; i++) {
    const byte = data[i]
    if (byte === undefined) {
      throw new Error(`Invalid byte at position ${i}`)
    }
    pixels[i * 2] = byte >> 4
    pixels[i * 2 + 1] = byte & 0x0f
  }
  return pixels
}

export type RGBA = [number, number, number, number]

/**
 * A palette can be an array of RGBA colors or a function that returns the RGBA color given an
 * index.
 */
export type Palette = RGBA[] | ((n: number) => RGBA)

/**
 * Default palette: generates a color from an index (just a simple example).
 *
 * @param color Color index.
 * @returns RGBA color.
 */
export function normalizedPalette(color: number): RGBA {
  const x = color % 4
  const y = Math.floor(color / 4)
  const r = x * (255 / 3)
  const g = y * (255 / 3)
  return [r, g, 0, 255]
}

/**
 * Returns a function to access the palette, whether it is an array or a function.
 *
 * @param palette Palette or palette function.
 * @returns Function that, given an index, returns the corresponding RGBA color.
 */
export function usePalette(palette: Palette): (n: number) => RGBA {
  if (typeof palette === 'function') {
    return palette
  } else {
    return (n: number) => {
      const color = palette[n]
      if (!color) {
        throw new Error(`Palette color not found for index ${n}`)
      }
      return color
    }
  }
}

/**
 * From a byte in Indexed4, returns the two corresponding RGBA colors. That is, the most significant
 * nibble and the least significant nibble.
 *
 * @param byte Byte containing two pixels in Indexed4.
 * @param palette Palette to convert indices to RGBA colors.
 * @returns Tuple with the two RGBA colors.
 */
export function getRGBAColorsFromIndexed4Byte(
  byte: number,
  palette: Palette = normalizedPalette,
): [RGBA, RGBA] {
  const highNibble = byte >> 4
  const lowNibble = byte & 0x0f
  const getColor = usePalette(palette)
  return [getColor(highNibble), getColor(lowNibble)]
}

/**
 * Returns the RGBA color from a byte of an Indexed8 image.
 *
 * @param byte Byte representing an indexed pixel.
 * @param palette Palette to convert the index to RGBA color.
 * @returns RGBA color.
 */
export function getRGBAFromIndexed8Byte(byte: number, palette: Palette = normalizedPalette): RGBA {
  const getColor = usePalette(palette)
  return getColor(byte)
}

// Constants for cell (tile) dimensions
export const CELL_WIDTH = 8
export const CELL_HEIGHT = 8
export const CELL_PIXEL_COUNT = CELL_WIDTH * CELL_HEIGHT // 64 pixels per cell
export const CELL_INDEXED4_BYTE_COUNT = CELL_PIXEL_COUNT / 2 // 32 bytes (4bpp)
export const CELL_RGBA_BYTE_COUNT = CELL_PIXEL_COUNT * 4 // 256 bytes (RGBA)

/**
 * Converts an entire cell (in Indexed4) to a cell in RGBA format.
 *
 * @param indexed4Image Cell data in Indexed4.
 * @param palette Palette to convert the pixels.
 * @returns Cell data in RGBA.
 */
export function convertIndexed4ToRGBA(
  indexed4Image: Uint8Array,
  palette: Palette = normalizedPalette,
): Uint8ClampedArray {
  // Each Indexed4 byte becomes 2 pixels, each pixel with 4 bytes (RGBA)
  const rgbaImage = new Uint8ClampedArray(indexed4Image.length * 2 * 4)
  for (let i = 0; i < indexed4Image.length; i++) {
    const [color1, color2] = getRGBAColorsFromIndexed4Byte(indexed4Image[i]!, palette)
    rgbaImage.set(color1, i * 8)
    rgbaImage.set(color2, i * 8 + 4)
  }
  return rgbaImage
}

/**
 * Returns the bytes of a cell (in Indexed4) from the cell index.
 *
 * @param cellId Cell index.
 * @param indexed4Image Complete image in Indexed4.
 * @returns Subarray containing the cell bytes.
 */
export function getIndexed4CellBytes(cellId: number, indexed4Image: Uint8Array): Uint8Array {
  const start = cellId * CELL_INDEXED4_BYTE_COUNT
  return indexed4Image.subarray(start, start + CELL_INDEXED4_BYTE_COUNT)
}

/**
 * Returns the bytes of all cells in an Indexed4 image sheet in a array. (useful for a cache)
 *
 * @param indexed4Sheet
 * @returns
 */
export function getIndexed4CellBytesList(indexed4Sheet: Uint8Array): Uint8Array[] {
  const cellCount = indexed4Sheet.length / CELL_INDEXED4_BYTE_COUNT
  const cells: Uint8Array[] = []
  for (let i = 0; i < cellCount; i++) {
    cells.push(getIndexed4CellBytes(i, indexed4Sheet))
  }
  return cells
}

/**
 * Returns the RGBA data of a cell, converting the bytes in Indexed4.
 *
 * @param cellId Cell index.
 * @param indexed4Image Complete image in Indexed4.
 * @param palette Palette to convert the pixels.
 * @returns RGBA data of the cell.
 */
export function getCellRGBABytes(
  cellId: number,
  indexed4Image: Uint8Array,
  palette: Palette = normalizedPalette,
): Uint8ClampedArray {
  const cellBytes = getIndexed4CellBytes(cellId, indexed4Image)
  return convertIndexed4ToRGBA(cellBytes, palette)
}

/**
 * Returns the bytes of a set of cells in an Indexed4 image sheet.
 *
 * @param indexed4Image Complete image in Indexed4.
 * @param from Starting cell index.
 * @param to Ending cell index.
 * @returns Subarray containing the selected cells' bytes.
 */
export function getIndexed4CellsBytesRange(
  indexed4Image: Uint8Array,
  from: number = 0,
  to: number = indexed4Image.length / CELL_INDEXED4_BYTE_COUNT,
): Uint8Array {
  return indexed4Image.subarray(
    from * CELL_INDEXED4_BYTE_COUNT,
    Math.min(to * CELL_INDEXED4_BYTE_COUNT, indexed4Image.length),
  )
}

/**
 * Returns the bytes of a sprite (in Indexed4) from a tile sheet.
 *
 * @param tileSheetIndexed4 Tile sheet in Indexed4.
 * @param width Sprite width in pixels.
 * @param height Sprite height in pixels.
 * @param spriteId Starting sprite index.
 * @returns Sprite data in Indexed4.
 */
export function getSpriteBytes(
  tileSheetIndexed4: Uint8Array,
  width: number,
  height: number,
  spriteId: number = 0,
): Uint8Array {
  const cellsPerRow = Math.ceil(width / CELL_WIDTH)
  const cellsPerColumn = Math.ceil(height / CELL_HEIGHT)
  return getIndexed4CellsBytesRange(
    tileSheetIndexed4,
    spriteId,
    spriteId + cellsPerRow * cellsPerColumn,
  )
}

/**
 * Draws an Indexed4 cell to the RGBA destination buffer.
 *
 * @param dst Destination buffer (RGBA).
 * @param cellIndexed4 Cell bytes in Indexed4.
 * @param dstWidth Destination image width (in pixels).
 * @param dstColumn Column (in cells) where the cell will be drawn.
 * @param dstRow Row (in cells) where the cell will be drawn.
 * @param palette Palette to convert the pixels.
 */
function drawIndexed4CellToRGBA(
  dst: Uint8ClampedArray,
  cellIndexed4: Uint8Array,
  dstWidth: number,
  dstColumn: number,
  dstRow: number,
  palette: Palette,
): void {
  const cellRGBA = convertIndexed4ToRGBA(cellIndexed4, palette)
  // Calculate the starting position (in bytes) in the destination buffer:
  const startX = dstColumn * CELL_WIDTH * 4 // each pixel = 4 bytes
  const startY = dstRow * CELL_HEIGHT
  const dstRowBytes = dstWidth * 4 // number of bytes per row in the destination buffer
  const dstStartIndex = startY * dstRowBytes + startX
  const cellRowBytes = CELL_WIDTH * 4
  for (let y = 0; y < CELL_HEIGHT; y++) {
    dst.set(
      cellRGBA.subarray(y * cellRowBytes, y * cellRowBytes + cellRowBytes),
      dstStartIndex + y * dstRowBytes,
    )
  }
}

/**
 * Returns the RGBA data of a sprite from the tile sheet in Indexed4. The function assembles the
 * sprite by composing cells in the correct positions.
 *
 * @param spriteId Starting sprite index.
 * @param width Sprite width in pixels.
 * @param height Sprite height in pixels.
 * @param tileSheetIndexed4 Tile sheet in Indexed4.
 * @param palette Palette to convert the pixels.
 * @returns RGBA buffer of the sprite.
 */
export function getSpriteRGBABytes(
  spriteId: number,
  width: number,
  height: number,
  tileSheetIndexed4: Uint8Array,
  palette: Palette = normalizedPalette,
): Uint8ClampedArray {
  const spriteIndexed4Bytes = getSpriteBytes(tileSheetIndexed4, width, height, spriteId)
  const cellsPerRow = Math.ceil(width / CELL_WIDTH)
  const cellsPerColumn = Math.ceil(height / CELL_HEIGHT)
  const spriteRGBA = new Uint8ClampedArray(
    cellsPerRow * CELL_WIDTH * cellsPerColumn * CELL_HEIGHT * 4,
  )

  let cellIndex = 0
  // Dividing the sprite into blocks (quadrants) of 4×4 cells.
  const quadCells = 4
  const quadCols = Math.ceil(cellsPerRow / quadCells)
  const quadRows = Math.ceil(cellsPerColumn / quadCells)

  for (let qRow = 0; qRow < quadRows; qRow++) {
    for (let qCol = 0; qCol < quadCols; qCol++) {
      for (
        let cellX = qCol * quadCells;
        cellX < Math.min(qCol * quadCells + quadCells, cellsPerRow);
        cellX++
      ) {
        for (
          let cellY = qRow * quadCells;
          cellY < Math.min(qRow * quadCells + quadCells, cellsPerColumn);
          cellY++
        ) {
          const cellData = getIndexed4CellBytes(cellIndex++, spriteIndexed4Bytes)
          drawIndexed4CellToRGBA(
            spriteRGBA,
            cellData,
            cellsPerRow * CELL_WIDTH,
            cellX,
            cellY,
            palette,
          )
        }
      }
    }
  }
  return spriteRGBA
}

/**
 * Creates a canvas that works both in a browser environment and in Node.js.
 *
 * @param width Canvas width.
 * @param height Canvas height.
 * @returns A canvas (OffscreenCanvas in the browser or Canvas from the "canvas" package in
 *   Node.js).
 */
export async function createCanvas(
  width: number,
  height: number,
): Promise<OffscreenCanvas | import('canvas').Canvas> {
  if (typeof window !== 'undefined') {
    // Browser environment
    return new OffscreenCanvas(width, height)
  } else {
    // Node.js environment
    const { createCanvas } = await import('canvas')
    return createCanvas(width, height)
  }
}
