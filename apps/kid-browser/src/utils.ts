import type { AllRomResources, KidImageData, Palette, ResourceTypes } from '@repo/kid-util'
import byteSize from 'byte-size'

export function addressFormat(address: number): string {
  return `$${address.toString(16).toUpperCase()}`
}
export function valueFormat(value: number): string {
  return `$${value.toString(16).toUpperCase()}`
}

export function getByteSize(value: number): string {
  const byteSizeResult = byteSize(value)
  return `${byteSizeResult.value}${byteSizeResult.unit} (${value} bytes)`
}

export async function executeNextTick<T>(fn: () => T) {
  return new Promise<T>((resolve) => {
    setTimeout(() => {
      resolve(fn())
    }, 0)
  })
}

export function getAddressNumber(address: string | number): number {
  if (typeof address === 'string') {
    // remove "$"" or "0x" prefix
    const cleanAddress = address.trim().replace(/^[\$]|^0x/g, '')
    address = parseInt(cleanAddress, 16)
  }
  return address
}

export function getNormalizedName(resource: AllRomResources|number): string {
  if (typeof resource === 'number') {
    return addressFormat(resource)
  }
  let name = `${addressFormat(resource.baseAddress)} - ${getNameForType(resource.type)}`
  if (resource.name) {
    name += `: ${resource.name}`
  }
  return name
}

const nameForType: Partial<Record<(typeof ResourceTypes)[number], string>> = {
  sheet: 'Tile Sheet',
  'linked-sprite-frame': 'Sprite Frame (with graphics)',
  'unlinked-sprite-frame': 'Sprite Frame',
}

export function getNameForType(type: (typeof ResourceTypes)[number]): string {
  return nameForType[type] || type
}

export async function bitmapFromKidImageData(image: KidImageData, palette?: Palette) {
  return createImageBitmap(new ImageData(image.getRGBAData(palette), image.width, image.height))
}
