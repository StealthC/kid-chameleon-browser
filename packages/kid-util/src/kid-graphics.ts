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

// Constants for tile dimensions
export const TILE_WIDTH = 8
export const TILE_HEIGHT = 8
export const TILE_PIXEL_COUNT = TILE_WIDTH * TILE_HEIGHT // 64 pixels per tile
export const TILE_INDEXED4_BYTE_COUNT = TILE_PIXEL_COUNT / 2 // 32 bytes (4bpp)
export const TILE_RGBA_BYTE_COUNT = TILE_PIXEL_COUNT * 4 // 256 bytes (RGBA)

/**
 * Converts an entire tile (in Indexed4) to a tile in RGBA format.
 *
 * @param indexed4Image Tile data in Indexed4.
 * @param palette Palette to convert the pixels.
 * @returns Tile data in RGBA.
 */
export function convertIndexed4ToRGBA(
  indexed4Image: Uint8Array | Uint8ClampedArray,
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
 * Returns the bytes of a tile (in Indexed4) from the tile index.
 *
 * @param tileId Tile index.
 * @param indexed4Image Complete image in Indexed4.
 * @returns Subarray containing the tile bytes.
 */
export function getIndexed4TileBytes(tileId: number, indexed4Image: Uint8Array): Uint8Array {
  const start = tileId * TILE_INDEXED4_BYTE_COUNT
  return indexed4Image.subarray(start, start + TILE_INDEXED4_BYTE_COUNT)
}

/**
 * Returns the bytes of all tiles in an Indexed4 image sheet in an array. (useful for a cache)
 *
 * @param indexed4Sheet
 * @returns
 */
export function getIndexed4TileBytesList(indexed4Sheet: Uint8Array): Uint8Array[] {
  const tileCount = indexed4Sheet.length / TILE_INDEXED4_BYTE_COUNT
  const tiles: Uint8Array[] = []
  for (let i = 0; i < tileCount; i++) {
    tiles.push(getIndexed4TileBytes(i, indexed4Sheet))
  }
  return tiles
}

/**
 * Returns the RGBA data of a tile, converting the bytes in Indexed4.
 *
 * @param tileId Tile index.
 * @param indexed4Image Complete image in Indexed4.
 * @param palette Palette to convert the pixels.
 * @returns RGBA data of the tile.
 */
export function getTileRGBABytes(
  tileId: number,
  indexed4Image: Uint8Array,
  palette: Palette = normalizedPalette,
): Uint8ClampedArray {
  const tileBytes = getIndexed4TileBytes(tileId, indexed4Image)
  return convertIndexed4ToRGBA(tileBytes, palette)
}

/**
 * Returns the bytes of a set of tiles in an Indexed4 image sheet.
 *
 * @param indexed4Image Complete image in Indexed4.
 * @param from Starting tile index.
 * @param to Ending tile index.
 * @returns Subarray containing the selected tiles' bytes.
 */
export function getIndexed4TilesBytesRange(
  indexed4Image: Uint8Array,
  from: number = 0,
  to: number = indexed4Image.length / TILE_INDEXED4_BYTE_COUNT,
): Uint8Array {
  return indexed4Image.subarray(
    from * TILE_INDEXED4_BYTE_COUNT,
    Math.min(to * TILE_INDEXED4_BYTE_COUNT, indexed4Image.length),
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
  const tilesPerRow = Math.ceil(width / TILE_WIDTH)
  const tilesPerColumn = Math.ceil(height / TILE_HEIGHT)
  return getIndexed4TilesBytesRange(
    tileSheetIndexed4,
    spriteId,
    spriteId + tilesPerRow * tilesPerColumn,
  )
}

/**
 * Draws an Indexed4 tile to the RGBA destination buffer.
 *
 * @param dst Destination buffer (RGBA).
 * @param tileIndexed4 Tile bytes in Indexed4.
 * @param dstWidth Destination image width (in pixels).
 * @param dstColumn Column (in tiles) where the tile will be drawn.
 * @param dstRow Row (in tiles) where the tile will be drawn.
 * @param palette Palette to convert the pixels.
 */
function drawIndexed4TileToRGBA(
  dst: Uint8ClampedArray,
  tileIndexed4: Uint8Array,
  dstWidth: number,
  dstColumn: number,
  dstRow: number,
  palette: Palette,
): void {
  const tileRGBA = convertIndexed4ToRGBA(tileIndexed4, palette)
  // Calculate the starting position (in bytes) in the destination buffer:
  const startX = dstColumn * TILE_WIDTH * 4 // each pixel = 4 bytes
  const startY = dstRow * TILE_HEIGHT
  const dstRowBytes = dstWidth * 4 // number of bytes per row in the destination buffer
  const dstStartIndex = startY * dstRowBytes + startX
  const tileRowBytes = TILE_WIDTH * 4
  for (let y = 0; y < TILE_HEIGHT; y++) {
    dst.set(
      tileRGBA.subarray(y * tileRowBytes, y * tileRowBytes + tileRowBytes),
      dstStartIndex + y * dstRowBytes,
    )
  }
}

/**
 * Returns the RGBA data of a sprite from the tile sheet in Indexed4. The function assembles the
 * sprite by composing tiles in the correct positions.
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
  const tilesPerRow = Math.ceil(width / TILE_WIDTH)
  const tilesPerColumn = Math.ceil(height / TILE_HEIGHT)
  const spriteRGBA = new Uint8ClampedArray(
    tilesPerRow * TILE_WIDTH * tilesPerColumn * TILE_HEIGHT * 4,
  )

  let tileIndex = 0
  // Dividing the sprite into blocks (quadrants) of 4×4 tiles.
  const quadTiles = 4
  const quadCols = Math.ceil(tilesPerRow / quadTiles)
  const quadRows = Math.ceil(tilesPerColumn / quadTiles)

  for (let qRow = 0; qRow < quadRows; qRow++) {
    for (let qCol = 0; qCol < quadCols; qCol++) {
      for (
        let tileX = qCol * quadTiles;
        tileX < Math.min(qCol * quadTiles + quadTiles, tilesPerRow);
        tileX++
      ) {
        for (
          let tileY = qRow * quadTiles;
          tileY < Math.min(qRow * quadTiles + quadTiles, tilesPerColumn);
          tileY++
        ) {
          const tileData = getIndexed4TileBytes(tileIndex++, spriteIndexed4Bytes)
          drawIndexed4TileToRGBA(
            spriteRGBA,
            tileData,
            tilesPerRow * TILE_WIDTH,
            tileX,
            tileY,
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

type KidImageFormat = 'RGBA' | 'Indexed4' | 'Indexed8'

const FormatBytesPerPixel: Record<KidImageFormat, number> = {
  RGBA: 4,
  Indexed4: 0.5,
  Indexed8: 1,
} as const


/**
 * Helper class to handle image data in different formats. Mainly the Indexed4 format used in the Kid Chameleon
 */
export class KidImageData {
  constructor(public imageData: Uint8ClampedArray, public width: number, public height: number, public format: KidImageFormat) {
  }

  static create(width: number, height: number, format: KidImageFormat = 'Indexed4'): KidImageData {
    const size = Math.ceil(width * height * FormatBytesPerPixel[format])
    const imageData = new Uint8ClampedArray(size)
    return new KidImageData(imageData, width, height, format)
  }

  static from(imageData: Uint8ClampedArray | Uint8Array, width: number, height: number, format: KidImageFormat = 'Indexed4'): KidImageData {
    if (imageData instanceof Uint8Array) {
      imageData = new Uint8ClampedArray(imageData)
    }
    return new KidImageData(imageData, width, height, format)
  }

  static fromCell(sheetData: Uint8Array, tileId: number): KidImageData {
    const tileData = getIndexed4TileBytes(tileId, sheetData)
    return KidImageData.from(tileData, TILE_WIDTH, TILE_HEIGHT, 'Indexed4')
  }

  static fromSprite(sheetData: Uint8Array, width: number, height: number, spriteId: number): KidImageData {
    const spriteData = getSpriteBytes(sheetData, width, height, spriteId)
    return KidImageData.from(spriteData, width, height, 'Indexed4')
  }

/**
 * Creates a KidImageData from a complete Indexed4 sheet.
 *
 * @param sheetData - Complete sheet data in Indexed4 format.
 * @param variant - Determines which dimension is fixed:
 *                  - 'rows': the provided count is the number of columns (row-major order)
 *                  - 'columns': the provided count is the number of rows (column-major order)
 * @param count - The number of tiles in the fixed dimension (columns for 'rows' or rows for 'columns').
 * @returns KidImageData representing the entire sheet.
 */
static fromSheet(
  sheetData: Uint8Array,
  variant: 'rows' | 'columns' = 'rows',
  count: number
): KidImageData {
  // Calculate the total number of tiles in the sheet.
  const totalTiles = sheetData.length / TILE_INDEXED4_BYTE_COUNT;
  const order = variant === 'rows' ? 'row-major' : 'column-major';
  let rows: number, columns: number;
  if (variant === 'rows') {
    // For 'rows' variant, the provided count is the number of rows.
    rows = count;
    columns = Math.ceil(totalTiles / rows);
  } else {
    // For 'columns' variant, the provided count is the number of columns.
    columns = count;
    rows = Math.ceil(totalTiles / columns);

  }


  // Calculate the overall dimensions of the sheet in pixels.
  const width = columns * TILE_WIDTH;
  const height = rows * TILE_HEIGHT;

  // Create a new KidImageData in Indexed4 format with the calculated dimensions.
  const sheetImageData = KidImageData.create(width, height, 'Indexed4');

  // Draw each tile in the correct position based on the chosen variant.
  for (let i = 0; i < totalTiles; i++) {
    let x: number, y: number;
    if (order === 'row-major') {
      // Row-major order: fill rows left-to-right.
      // Here, the fixed number of columns is used to determine the x coordinate.
      x = i % columns;
      y = Math.floor(i / columns);
    } else {
      // Column-major order: fill columns top-to-bottom.
      // Here, the fixed number of rows is used to determine the y coordinate.
      x = Math.floor(i / rows);
      y = i % rows;
    }
    const tileData = getIndexed4TileBytes(i, sheetData);
    const tileImageData = KidImageData.from(tileData, TILE_WIDTH, TILE_HEIGHT, 'Indexed4');
    sheetImageData.draw(tileImageData, x * TILE_WIDTH, y * TILE_HEIGHT);
  }

  return sheetImageData;
}

  getRGBAData(palette?: Palette): Uint8ClampedArray {
    if (this.format === 'RGBA') {
      return this.imageData
    } else {
      palette = palette || normalizedPalette
      if (this.format === 'Indexed4') {
        return convertIndexed4ToRGBA(this.imageData, palette)
      } else {
        throw new Error('Unsupported format')
      }
    }
  }

  getRGBAKidImageData(palette?: Palette): KidImageData {
    const data = this.getRGBAData(palette)
    return KidImageData.from(data, this.width, this.height, 'RGBA')
  }

  draw(src: KidImageData, x: number, y: number): void {
    if (this.format !== src.format) {
      throw new Error('Different formats')
    } if (this.format === 'Indexed4') {
      if (x % 2 !== 0) {
        throw new Error('Invalid position for Indexed4 format')
      }
    }
    for (let sy = 0; sy < src.height; sy++) {
      const srcStart = sy * src.width * FormatBytesPerPixel[src.format]
      const dstStart = (((y + sy) * this.width) + x) * FormatBytesPerPixel[this.format]
      const sourceLine = src.imageData.subarray(srcStart, srcStart + src.width * FormatBytesPerPixel[src.format])
      this.imageData.set(sourceLine, dstStart)
    }
  }
}
