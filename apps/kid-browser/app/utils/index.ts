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

export function getAddressNumber(address: string | number): number {
  if (typeof address === 'string') {
    const cleanAddress = address.trim().replace(/^[\$]|^0x/g, '')
    address = parseInt(cleanAddress, 16)
  }
  return address
}

export function parseAddressOrNull(address: string | number | null | undefined): number | null {
  if (address == null) {
    return null
  }

  const parsedAddress = getAddressNumber(address)
  if (!Number.isFinite(parsedAddress) || parsedAddress < 0) {
    return null
  }

  return parsedAddress
}

export function getResourceRoute(address: number) {
  return {
    name: 'resources-address',
    params: { address: addressFormat(address) },
  }
}

export function getNormalizedName(resource: AllRomResources | number, short = false): string {
  if (typeof resource === 'number') {
    return addressFormat(resource)
  }
   if (resource.name) {
    return resource.name
  }
  let name = `${addressFormat(resource.baseAddress)}`
  if (!short) {
    name += ` - ${getNameForType(resource.type)}`
  }
  return name
}

const nameForType: Partial<Record<(typeof ResourceTypes)[number], string>> = {
  sheet: 'Tile Sheet',
  'linked-sprite-frame': 'Sprite Frame (with graphics)',
  'unlinked-sprite-frame': 'Sprite Frame',
  plane: 'Plane',
  'animation-frame': 'Animation Frame',
  animation: 'Animation Script',
  'animation-step': 'Animation Step',
  unknown: 'Unknown',
  palette: 'Palette',
  'palette-map': 'Palette Map',
  'level-header': 'Level Header',
  'level-tiles': 'Level Tiles',
  'level-blocks': 'Level Blocks',
  'level-objects-header': 'Level Objects Header',
  'level-background-layout': 'Level Background Layout',
  'level-enemy-layout': 'Level Enemy Layout',
  'level-title-card': 'Level Title Card',
  'sprite-collision': 'Sprite Collision',
}

export function getNameForType(type: (typeof ResourceTypes)[number]): string {
  return nameForType[type] || type
}

export async function bitmapFromKidImageData(image: KidImageData, palette?: Palette) {
  return createImageBitmap(new ImageData(image.getRGBAData(palette), image.width, image.height))
}
