import { indexedTileImageToRgba, type LevelMap, type RGBA } from '@repo/kid-util'

/**
 * Pre-rendered canvases for one `LevelMap`. Composting the ROM tile art is O(world pixels), so it
 * must happen once per decoded map, not once per pan/zoom frame.
 */
export type LevelMapTextures = {
  foreground?: HTMLCanvasElement
  blocks?: HTMLCanvasElement
  background?: HTMLCanvasElement
  backdrop?: string
}

const cache = new WeakMap<LevelMap, LevelMapTextures>()

function rgbaToCss(color: RGBA): string {
  return `rgb(${color[0]}, ${color[1]}, ${color[2]})`
}

function canvasFromIndexed(
  width: number,
  height: number,
  rgba: Uint8ClampedArray,
): HTMLCanvasElement | undefined {
  if (typeof document === 'undefined' || width <= 0 || height <= 0) {
    return undefined
  }
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) {
    return undefined
  }
  context.putImageData(new ImageData(rgba, width, height), 0, 0)
  return canvas
}

/**
 * Returns (and memoizes) the canvases for a level map. Returns an empty object when the ROM art
 * could not be decoded, which keeps the renderer on its generated-colour fallback.
 */
export function getLevelMapTextures(map: LevelMap): LevelMapTextures {
  const cached = cache.get(map)
  if (cached) {
    return cached
  }

  const textures: LevelMapTextures = {}
  const graphics = map.graphics
  if (graphics) {
    const foreground = graphics.foreground
    textures.foreground = canvasFromIndexed(
      foreground.width,
      foreground.height,
      indexedTileImageToRgba(foreground, graphics.theme.palette.rgba, {
        transparentIndexZero: true,
      }),
    )
    textures.blocks = canvasFromIndexed(
      graphics.blocks.width,
      graphics.blocks.height,
      indexedTileImageToRgba(graphics.blocks, graphics.theme.palette.rgba, {
        transparentIndexZero: true,
      }),
    )
  }
  const background = graphics?.background
  if (background) {
    textures.background = canvasFromIndexed(
      background.image.width,
      background.image.height,
      indexedTileImageToRgba(background.image, background.palette),
    )
    textures.backdrop = rgbaToCss(background.backdrop)
  }

  cache.set(map, textures)
  return textures
}
