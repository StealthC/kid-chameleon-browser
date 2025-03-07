import type {
  PaletteRomResourceLoaded,
  PlaneRomResourceLoaded,
  SheetRomResourceLoaded,
} from './kid-resources'

export type RGBA = [number, number, number, number]

/**
 * A palette can be an array of RGBA colors or a function that returns the RGBA color given an
 * index.
 */
export type Palette = RGBA[] | ((n: number) => RGBA) | PaletteRomResourceLoaded

/**
 * Default palette: generates a color from an index (just a simple example).
 *
 * @param color Color index.
 * @returns RGBA color.
 */
function normalizedPalette(color: number): RGBA {
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
function usePalette(palette: Palette): (n: number) => RGBA {
  if (typeof palette === 'function') {
    return palette
  } else if (Array.isArray(palette)) {
    return (n: number) => {
      const color = palette[n]
      if (!color) {
        throw new Error(`Palette color not found for index ${n}`)
      }
      return color
    }
  } else {
    return (n: number) => {
      const color = palette.colors[n]
      if (!color) {
        return [0, 0, 0, 255]
      }
      return MDColorToRGBA(color)
    }
  }
}

function MDColorToRGBA(byte: number): RGBA {
  const r = byte & 0x0f
  const g = (byte >> 4) & 0x0f
  const b = (byte >> 8) & 0x0f
  return [r * 17, g * 17, b * 17, 255]
}

/**
 * From a byte in Indexed4, returns the two corresponding RGBA colors. That is, the most significant
 * nibble and the least significant nibble.
 *
 * @param byte Byte containing two pixels in Indexed4.
 * @param palette Palette to convert indices to RGBA colors.
 * @returns Tuple with the two RGBA colors.
 */
function getRGBAColorsFromIndexed4Byte(
  byte: number,
  palette: Palette = normalizedPalette,
): [RGBA, RGBA] {
  const highNibble = byte >> 4
  const lowNibble = byte & 0x0f
  const getColor = usePalette(palette)
  return [getColor(highNibble), getColor(lowNibble)]
}

// Constants for tile dimensions
export const TILE_WIDTH = 8
export const TILE_HEIGHT = 8
export const TILE_PIXEL_COUNT = TILE_WIDTH * TILE_HEIGHT // 64 pixels per tile
export const TILE_INDEXED4_BYTE_COUNT = TILE_PIXEL_COUNT * 0.5 // 32 bytes (4bpp)
export const TILE_RGBA_BYTE_COUNT = TILE_PIXEL_COUNT * 4 // 256 bytes (RGBA)

/**
 * Converts an entire tile (in Indexed4) to a tile in RGBA format.
 *
 * @param indexed4Image Tile data in Indexed4.
 * @param palette Palette to convert the pixels.
 * @returns Tile data in RGBA.
 */
function convertIndexed4ToRGBA(
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
function getIndexed4TileBytes(tileId: number, indexed4Image: Uint8Array): Uint8Array {
  const start = tileId * TILE_INDEXED4_BYTE_COUNT
  return indexed4Image.subarray(start, start + TILE_INDEXED4_BYTE_COUNT)
}

/**
 * Returns the bytes of a set of tiles in an Indexed4 image sheet.
 *
 * @param indexed4Image Complete image in Indexed4.
 * @param from Starting tile index.
 * @param to Ending tile index.
 * @returns Subarray containing the selected tiles' bytes.
 */
function getIndexed4TilesBytesRange(
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
 * Helper class to handle image data in different formats. Mainly the Indexed4 format used in the
 * Kid Chameleon
 */
export class KidImageData {
  constructor(
    public imageData: Uint8ClampedArray,
    public width: number,
    public height: number,
    public format: KidImageFormat,
  ) {}

  static create(width: number, height: number, format: KidImageFormat = 'Indexed4'): KidImageData {
    const size = Math.ceil(width * height * FormatBytesPerPixel[format])
    const imageData = new Uint8ClampedArray(size)
    return new KidImageData(imageData, width, height, format)
  }

  static from(
    imageData: Uint8ClampedArray | Uint8Array,
    width: number,
    height: number,
    format: KidImageFormat = 'Indexed4',
  ): KidImageData {
    if (imageData instanceof Uint8Array) {
      imageData = new Uint8ClampedArray(imageData)
    }
    return new KidImageData(imageData, width, height, format)
  }

  static fromCell(sheetData: Uint8Array, tileId: number): KidImageData {
    const tileData = getIndexed4TileBytes(tileId, sheetData)
    return KidImageData.from(tileData, TILE_WIDTH, TILE_HEIGHT, 'Indexed4')
  }

  static fromSprite(
    sheetOrDataIndexed4: Uint8Array | SheetRomResourceLoaded,
    width: number,
    height: number,
    spriteId: number,
  ): KidImageData {
    const tilesPerRow = Math.ceil(width / TILE_WIDTH)
    const tilesPerColumn = Math.ceil(height / TILE_HEIGHT)
    const sheetDataIndexed4 =
      sheetOrDataIndexed4 instanceof Uint8Array ? sheetOrDataIndexed4 : sheetOrDataIndexed4.data
    const spriteBytes = getIndexed4TilesBytesRange(
      sheetDataIndexed4,
      spriteId,
      spriteId + tilesPerRow * tilesPerColumn,
    )
    const spriteImage = KidImageData.create(
      tilesPerRow * TILE_WIDTH,
      tilesPerColumn * TILE_HEIGHT,
      'Indexed4',
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
            const tileData = KidImageData.fromCell(spriteBytes, tileIndex++)
            spriteImage.draw(tileData, tileX * TILE_WIDTH, tileY * TILE_HEIGHT)
          }
        }
      }
    }
    return spriteImage
  }

  static fromPlane(
    plane: PlaneRomResourceLoaded,
    sheet: SheetRomResourceLoaded,
    widthInTiles: number,
    startIndex: number = 0,
    sizeLimit?: number,
  ): KidImageData {
    if (sizeLimit === undefined) {
      sizeLimit = plane.tiles.length - startIndex
    }
    const width = widthInTiles * TILE_WIDTH
    const height = Math.ceil(sizeLimit / widthInTiles) * TILE_HEIGHT
    const image = KidImageData.create(width, height, 'Indexed4')
    let dstIndex = 0
    for (let i = startIndex; i < startIndex + sizeLimit; i++) {
      const planeTile = plane.tiles[i]
      if (!planeTile) {
        break
      }
      let tileImage = sheet.tiles[planeTile.tileIndex]
      if (!tileImage) {
        continue
      }
      if (planeTile.xFlip) {
        tileImage = tileImage.flipHorizontal()
      }
      if (planeTile.yFlip) {
        tileImage = tileImage.flipVertical()
      }
      const x = (dstIndex % widthInTiles) * TILE_WIDTH
      const y = Math.floor(dstIndex / widthInTiles) * TILE_HEIGHT
      image.draw(tileImage, x, y)
      dstIndex++
    }
    return image
  }

  /**
   * Creates a KidImageData from a complete Indexed4 sheet.
   *
   * @param sheet - Complete sheet data in Indexed4 format.
   * @param variant - Determines which dimension is fixed: - 'rows': the provided count is the
   *   number of columns (row-major order) - 'columns': the provided count is the number of rows
   *   (column-major order)
   * @param count - The number of tiles in the fixed dimension (columns for 'rows' or rows for
   *   'columns').
   * @returns KidImageData representing the entire sheet.
   */
  static fromSheet(
    sheet: SheetRomResourceLoaded,
    variant: 'rows' | 'columns' = 'rows',
    count: number,
  ): KidImageData {
    // Calculate the total number of tiles in the sheet.
    const totalTiles = sheet.tiles.length
    const order = variant === 'rows' ? 'row-major' : 'column-major'
    let rows: number, columns: number
    if (variant === 'rows') {
      // For 'rows' variant, the provided count is the number of rows.
      rows = count
      columns = Math.ceil(totalTiles / rows)
    } else {
      // For 'columns' variant, the provided count is the number of columns.
      columns = count
      rows = Math.ceil(totalTiles / columns)
    }

    // Calculate the overall dimensions of the sheet in pixels.
    const width = columns * TILE_WIDTH
    const height = rows * TILE_HEIGHT

    // Create a new KidImageData in Indexed4 format with the calculated dimensions.
    const sheetImageData = KidImageData.create(width, height, 'Indexed4')

    // Draw each tile in the correct position based on the chosen variant.
    for (let i = 0; i < totalTiles; i++) {
      let x: number, y: number
      if (order === 'row-major') {
        // Row-major order: fill rows left-to-right.
        // Here, the fixed number of columns is used to determine the x coordinate.
        x = i % columns
        y = Math.floor(i / columns)
      } else {
        // Column-major order: fill columns top-to-bottom.
        // Here, the fixed number of rows is used to determine the y coordinate.
        x = Math.floor(i / rows)
        y = i % rows
      }
      //const tileData = getIndexed4TileBytes(i, sheetData);
      //const tileImageData = KidImageData.from(tileData, TILE_WIDTH, TILE_HEIGHT, 'Indexed4');
      const tileImageData = sheet.tiles[i]!
      sheetImageData.draw(tileImageData, x * TILE_WIDTH, y * TILE_HEIGHT)
    }

    return sheetImageData
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
    }
    if (this.format === 'Indexed4') {
      if (x % 2 !== 0) {
        throw new Error('Invalid position for Indexed4 format')
      }
    }
    for (let sy = 0; sy < src.height; sy++) {
      const srcStart = sy * src.width * FormatBytesPerPixel[src.format]
      const dstStart = ((y + sy) * this.width + x) * FormatBytesPerPixel[this.format]
      const sourceLine = src.imageData.subarray(
        srcStart,
        srcStart + src.width * FormatBytesPerPixel[src.format],
      )
      this.imageData.set(sourceLine, dstStart)
    }
  }
  /** Flips the image horizontally. (creates a new image) */
  flipHorizontal(): KidImageData {
    const newImage = KidImageData.create(this.width, this.height, this.format)

    if (this.format === 'Indexed4') {
      // Each pixel occupies half a byte (a nibble)
      for (let y = 0; y < this.height; y++) {
        for (let x = 0; x < this.width; x++) {
          // Calculate the pixel index in the row
          const srcPixelIndex = y * this.width + x
          // Each byte stores 2 pixels:
          const srcByteIndex = Math.floor(srcPixelIndex / 2)
          const isSrcHighNibble = srcPixelIndex % 2 === 0
          const srcByte = this.imageData[srcByteIndex]!
          // Extract the corresponding nibble
          const pixelValue = isSrcHighNibble ? srcByte >> 4 : srcByte & 0x0f

          // Inverted horizontal position
          const newX = this.width - 1 - x
          const dstPixelIndex = y * this.width + newX
          const dstByteIndex = Math.floor(dstPixelIndex / 2)
          const isDstHighNibble = dstPixelIndex % 2 === 0

          // Insert the pixel into the destination byte, keeping the other nibble intact
          if (isDstHighNibble) {
            // Write to the high nibble
            newImage.imageData[dstByteIndex] =
              (pixelValue << 4) | (newImage.imageData[dstByteIndex]! & 0x0f)
          } else {
            // Write to the low nibble
            newImage.imageData[dstByteIndex] =
              (newImage.imageData[dstByteIndex]! & 0xf0) | (pixelValue & 0x0f)
          }
        }
      }
    } else {
      // For formats that have an integer number of bytes per pixel (RGBA, Indexed8)
      const bytesPerPixel = FormatBytesPerPixel[this.format]
      for (let y = 0; y < this.height; y++) {
        for (let x = 0; x < this.width; x++) {
          const srcIndex = (y * this.width + x) * bytesPerPixel
          const dstIndex = (y * this.width + (this.width - 1 - x)) * bytesPerPixel
          const sourcePixel = this.imageData.subarray(srcIndex, srcIndex + bytesPerPixel)
          newImage.imageData.set(sourcePixel, dstIndex)
        }
      }
    }

    return newImage
  }

  /** Flips the image vertically. (creates a new image) */
  flipVertical(): KidImageData {
    const newImageData = KidImageData.create(this.width, this.height, this.format)
    for (let y = 0; y < this.height; y++) {
      const srcStart = y * this.width * FormatBytesPerPixel[this.format]
      const dstStart = (this.height - 1 - y) * this.width * FormatBytesPerPixel[this.format]
      const sourceLine = this.imageData.subarray(
        srcStart,
        srcStart + this.width * FormatBytesPerPixel[this.format],
      )
      newImageData.imageData.set(sourceLine, dstStart)
    }
    return newImageData
  }
}
