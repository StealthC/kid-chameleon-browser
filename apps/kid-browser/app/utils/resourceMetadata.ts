import type { AllRomResources } from '@repo/kid-util'
import { addressFormat, getNameForType, getNormalizedName } from './index'
import { getResourceSize } from './resourceSearch'

export type ResourceMetadataItem = {
  label: string
  value: string
  hint?: string
  copyValue?: string
  linkAddress?: number
  mono?: boolean
}

export type ResourceMetadataSection = {
  id: string
  title: string
  items: ResourceMetadataItem[]
}

export type ResourceMetadataOptions = {
  referenceCount?: number
  referencedByCount?: number
}

const CONFIDENCE_DETAILS: Record<
  'certain' | 'possible',
  { value: string; hint: string }
> = {
  certain: {
    value: 'Certain',
    hint: 'Matched a discovery pattern with structural validation.',
  },
  possible: {
    value: 'Possible',
    hint: 'Heuristic match. Verify references before relying on this resource.',
  },
}

type ResourceRecord = Record<string, unknown>

function formatCrc32(value: number): string {
  return value.toString(16).toUpperCase().padStart(8, '0')
}

function formatSizeHint(size: number): string {
  return `0x${size.toString(16).toUpperCase()} bytes`
}

function formatPacked(packed: unknown): string {
  if (packed && typeof packed === 'object' && 'format' in packed) {
    const format = (packed as { format?: unknown }).format
    if (typeof format === 'string') {
      return format.toUpperCase()
    }
  }
  return 'Not packed'
}

function numberAt(record: ResourceRecord, key: string): number | undefined {
  const value = record[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function stringAt(record: ResourceRecord, key: string): string | undefined {
  const value = record[key]
  return typeof value === 'string' ? value : undefined
}

function arrayLengthAt(record: ResourceRecord, key: string): number | undefined {
  const value = record[key]
  return Array.isArray(value) ? value.length : undefined
}

function addressItem(label: string, address: number, hint?: string): ResourceMetadataItem {
  return {
    label,
    value: addressFormat(address),
    copyValue: addressFormat(address),
    linkAddress: address,
    mono: true,
    hint,
  }
}

function numberItem(label: string, value: number, hint?: string): ResourceMetadataItem {
  return { label, value: String(value), mono: true, hint }
}

function booleanItem(label: string, value: boolean): ResourceMetadataItem {
  return { label, value: value ? 'Yes' : 'No' }
}

function stringItem(label: string, value: string, hint?: string): ResourceMetadataItem {
  return { label, value, hint }
}

function pushNumber(
  items: ResourceMetadataItem[],
  record: ResourceRecord,
  key: string,
  label: string,
  hint?: string,
) {
  const value = numberAt(record, key)
  if (value !== undefined) {
    items.push(numberItem(label, value, hint))
  }
}

function pushAddress(
  items: ResourceMetadataItem[],
  record: ResourceRecord,
  key: string,
  label: string,
) {
  const value = numberAt(record, key)
  if (value !== undefined) {
    items.push(addressItem(label, value))
  }
}

function typeDetails(resource: AllRomResources): ResourceMetadataItem[] {
  const record = resource as unknown as ResourceRecord
  const items: ResourceMetadataItem[] = []
  const type = String(record.type)
  const loaded = record.loaded === true

  switch (type) {
    case 'sheet': {
      if (loaded) {
        const tiles = arrayLengthAt(record, 'tiles') ?? 0
        const dataLength = arrayLengthAt(record, 'data') ?? numberAt(record, 'inputSize') ?? 0
        items.push(numberItem('Tiles', tiles))
        items.push(numberItem('Decoded bytes', dataLength, formatSizeHint(dataLength)))
      }
      pushNumber(items, record, 'startTile', 'Start tile')
      pushNumber(items, record, 'tableIndex', 'Table index')
      items.push(stringItem('Packing', formatPacked(record.packed)))
      break
    }

    case 'unlinked-sprite-frame':
    case 'linked-sprite-frame': {
      pushNumber(items, record, 'tableIndex', 'Table index')
      if (loaded) {
        pushNumber(items, record, 'tileId', 'Tile id')
        pushNumber(items, record, 'width', 'Width', 'pixels')
        pushNumber(items, record, 'height', 'Height', 'pixels')
        pushNumber(items, record, 'xOffset', 'X offset', 'signed pixels')
        pushNumber(items, record, 'yOffset', 'Y offset', 'signed pixels')
      }
      break
    }

    case 'plane': {
      pushNumber(items, record, 'width', 'Width', 'tiles per row')
      pushNumber(items, record, 'startTile', 'Start tile')
      if (loaded) {
        items.push(numberItem('Tiles', arrayLengthAt(record, 'tiles') ?? 0))
      }
      items.push(stringItem('Packing', formatPacked(record.packed)))
      break
    }

    case 'animation-frame': {
      const frameGroup = stringAt(record, 'frameGroup')
      if (frameGroup !== undefined) {
        items.push(stringItem('Frame group', frameGroup))
      }
      pushNumber(items, record, 'frameIndex', 'Frame index')
      pushAddress(items, record, 'tableAddress', 'Table address')
      if (loaded) {
        items.push(numberItem('Tiles', arrayLengthAt(record, 'tiles') ?? 0))
      }
      break
    }

    case 'animation': {
      pushNumber(items, record, 'frameCount', 'Frames')
      pushNumber(items, record, 'totalFrames', 'Total frames')
      pushAddress(items, record, 'terminatorAddress', 'Terminator')
      const steps = record.stepAddresses
      if (Array.isArray(steps)) {
        items.push(numberItem('Steps', steps.length))
        for (const [index, address] of steps.slice(0, 4).entries()) {
          if (typeof address === 'number') {
            items.push(addressItem(`Step ${index + 1}`, address))
          }
        }
      }
      break
    }

    case 'animation-step': {
      pushAddress(items, record, 'animationAddress', 'Animation')
      if (loaded) {
        pushNumber(items, record, 'kind', 'Kind')
        pushNumber(items, record, 'delay', 'Delay')
      }
      pushNumber(items, record, 'spriteOffset', 'Sprite offset')
      pushAddress(items, record, 'spriteAddress', 'Sprite')
      pushAddress(items, record, 'nextFrameAddress', 'Next frame')
      break
    }

    case 'palette':
    case 'palette-map': {
      pushNumber(items, record, 'size', 'Entries')
      if (loaded) {
        if (type === 'palette') {
          items.push(numberItem('Colors', arrayLengthAt(record, 'colors') ?? 0))
        } else {
          items.push(numberItem('Mapped entries', arrayLengthAt(record, 'map') ?? 0))
        }
      }
      break
    }

    case 'level-header': {
      pushNumber(items, record, 'levelIndex', 'Level index')
      pushNumber(items, record, 'wordIndex', 'Word index')
      if (loaded) {
        pushNumber(items, record, 'width', 'Width')
        pushNumber(items, record, 'widthInBlocks', 'Width in blocks')
        pushNumber(items, record, 'height', 'Height')
        pushNumber(items, record, 'heightInBlocks', 'Height in blocks')
        pushNumber(items, record, 'themeIndex', 'Theme index')
        pushNumber(items, record, 'backgroundType', 'Background type')
        pushNumber(items, record, 'playerX', 'Player X')
        pushNumber(items, record, 'playerY', 'Player Y')
        pushNumber(items, record, 'flagX', 'Flag X')
        pushNumber(items, record, 'flagY', 'Flag Y')
        pushAddress(items, record, 'tilesDataPtr', 'Tiles data')
        pushAddress(items, record, 'blocksDataPtr', 'Blocks data')
        pushAddress(items, record, 'backgroundDataPtr', 'Background data')
        pushAddress(items, record, 'levelObjectsHeaderPtr', 'Objects header')
      }
      break
    }

    case 'level-title-card': {
      pushNumber(items, record, 'levelIndex', 'Level index')
      pushNumber(items, record, 'effectiveLevelIndex', 'Effective level')
      if (loaded) {
        pushNumber(items, record, 'act', 'Act')
        const title = stringAt(record, 'titleText')
        if (title !== undefined) {
          items.push(stringItem('Resolved title', title))
        }
        pushAddress(items, record, 'textAddress', 'Title text')
        pushAddress(items, record, 'layoutAddress', 'Title layout')
      }
      break
    }

    case 'level-enemy-layout': {
      pushNumber(items, record, 'objectCount', 'Objects')
      if (loaded) {
        pushNumber(items, record, 'h1UnknownByte', 'Header byte')
        pushNumber(items, record, 'h1ObjectCountRaw', 'Raw object count')
      }
      break
    }

    case 'level-background-layout': {
      pushNumber(items, record, 'backgroundType', 'Background type')
      if (typeof record.isPacked === 'boolean') {
        items.push(booleanItem('Packed', record.isPacked))
      }
      if (loaded) {
        const format = stringAt(record, 'format')
        if (format !== undefined) {
          items.push(stringItem('Format', format))
        }
        items.push(numberItem('Placements', arrayLengthAt(record, 'placements') ?? 0))
        const indirect = record.indirect
        if (indirect && typeof indirect === 'object' && 'referenceAddress' in indirect) {
          const referenceAddress = (indirect as { referenceAddress?: unknown }).referenceAddress
          if (typeof referenceAddress === 'number') {
            items.push(addressItem('Indirect reference', referenceAddress))
          }
        }
      }
      break
    }

    case 'level-objects-header': {
      if (loaded) {
        pushAddress(items, record, 'h1Pointer', 'H1 pointer')
        pushNumber(items, record, 'enemySlot1', 'Enemy slot 1')
        pushNumber(items, record, 'enemySlot2', 'Enemy slot 2')
        pushNumber(items, record, 'enemySlot3', 'Enemy slot 3')
        pushNumber(items, record, 'cameraThreshold', 'Camera threshold')
        pushNumber(items, record, 'h1ObjectCountRaw', 'H1 object count')
      }
      break
    }

    case 'sprite-collision': {
      pushNumber(items, record, 'wordIndex', 'Word index')
      if (loaded) {
        if (typeof record.isInvalid === 'boolean') {
          items.push(booleanItem('Invalid', record.isInvalid))
        }
        if (typeof record.isZero === 'boolean') {
          items.push(booleanItem('Zero collision', record.isZero))
        }
        pushNumber(items, record, 'left', 'Left')
        pushNumber(items, record, 'width', 'Width')
        pushNumber(items, record, 'top', 'Top')
        pushNumber(items, record, 'height', 'Height')
      }
      break
    }

    case 'unknown': {
      const possibleSize = numberAt(record, 'possibleSize')
      if (possibleSize !== undefined) {
        items.push(numberItem('Possible size', possibleSize, formatSizeHint(possibleSize)))
      }
      break
    }

    default:
      break
  }

  return items
}

export function buildResourceMetadata(
  resource: AllRomResources,
  options: ResourceMetadataOptions = {},
): ResourceMetadataSection[] {
  const sections: ResourceMetadataSection[] = []

  const identity: ResourceMetadataItem[] = [
    stringItem('Name', getNormalizedName(resource, true)),
    stringItem('Type', getNameForType(resource.type), resource.type),
    addressItem('Base address', resource.baseAddress),
  ]

  if (resource.addressOffset !== undefined) {
    identity.push(addressItem('Address offset', resource.addressOffset))
  }

  const confidence = resource.confidence ? CONFIDENCE_DETAILS[resource.confidence] : null
  identity.push({
    label: 'Confidence',
    value: confidence?.value ?? 'Not recorded',
    hint: confidence?.hint ?? 'Discovery did not record a confidence level.',
  })

  if (resource.tags && resource.tags.length > 0) {
    identity.push(stringItem('Tags', resource.tags.join(', ')))
  }

  if (resource.description) {
    identity.push(stringItem('Description', resource.description))
  }

  sections.push({ id: 'identity', title: 'Identity', items: identity })

  const data: ResourceMetadataItem[] = [
    stringItem(
      'Decode state',
      resource.loaded ? 'Decoded' : 'Metadata only',
      resource.loaded ? 'Payload decoded in this session.' : 'Open the viewer to decode the payload.',
    ),
  ]

  const size = getResourceSize(resource)
  if (size !== null) {
    data.push({
      label: 'Input size',
      value: `${size} bytes`,
      hint: formatSizeHint(size),
      copyValue: String(size),
      mono: true,
    })

    if (size > 0) {
      const endInclusive = resource.baseAddress + size - 1
      data.push({
        label: 'Address range',
        value: `${addressFormat(resource.baseAddress)}–${addressFormat(endInclusive)}`,
        hint: 'Inclusive range of the resource input bytes.',
        copyValue: `${addressFormat(resource.baseAddress)}-${addressFormat(endInclusive)}`,
        mono: true,
      })
    }
  } else {
    data.push(stringItem('Input size', 'Not declared', 'Size is not known until discovery or decoding provides it.'))
  }

  if (resource.loaded) {
    data.push({
      label: 'CRC32',
      value: formatCrc32(resource.hash),
      hint: 'CRC32 of the declared input bytes.',
      copyValue: formatCrc32(resource.hash),
      mono: true,
    })
  }

  sections.push({ id: 'data', title: 'Data', items: data })

  const details = typeDetails(resource)
  if (details.length > 0) {
    sections.push({ id: 'type-details', title: 'Type details', items: details })
  }

  if (options.referenceCount !== undefined || options.referencedByCount !== undefined) {
    const related: ResourceMetadataItem[] = []
    if (options.referenceCount !== undefined) {
      related.push(numberItem('Outgoing references', options.referenceCount))
    }
    if (options.referencedByCount !== undefined) {
      related.push(numberItem('Incoming references', options.referencedByCount))
    }
    sections.push({ id: 'related', title: 'Relations', items: related })
  }

  return sections
}
