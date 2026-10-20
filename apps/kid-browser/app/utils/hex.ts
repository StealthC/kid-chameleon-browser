export type HexSelection = {
  start: number
  end: number
}

export type HexPageState = {
  page: number
  pageCount: number
  offsetStart: number
  offsetEnd: number
  hasPrevious: boolean
  hasNext: boolean
}

export type HexSequenceResult =
  | { bytes: Uint8Array; error: null }
  | { bytes: null; error: string }

const HEX_DIGITS = /^[0-9a-f]+$/i

export function parseHexNumber(input: string): number | null {
  const trimmed = input.trim()
  if (!trimmed) {
    return null
  }

  const cleaned = trimmed
    .replace(/^\$/, '')
    .replace(/^0x/i, '')
    .replace(/[_\s]/g, '')

  if (!HEX_DIGITS.test(cleaned)) {
    return null
  }

  const value = Number.parseInt(cleaned, 16)
  if (!Number.isSafeInteger(value)) {
    return null
  }

  return value
}

export function parseHexByteSequence(input: string): HexSequenceResult {
  const tokens = input
    .trim()
    .split(/[\s,;]+/)
    .filter((token) => token.length > 0)

  if (tokens.length === 0) {
    return { bytes: null, error: 'Enter a hexadecimal byte sequence.' }
  }

  const digits = tokens
    .map((token) => token.replace(/^\$/, '').replace(/^0x/i, ''))
    .join('')

  if (!digits) {
    return { bytes: null, error: 'Enter a hexadecimal byte sequence.' }
  }

  if (!HEX_DIGITS.test(digits)) {
    return { bytes: null, error: 'Use hexadecimal digits only (0-9, A-F).' }
  }

  if (digits.length % 2 !== 0) {
    return { bytes: null, error: 'Each byte needs two hexadecimal digits (for example DE AD).' }
  }

  const bytes = new Uint8Array(digits.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Number.parseInt(digits.slice(i * 2, i * 2 + 2), 16)
  }

  return { bytes, error: null }
}

export function findByteSequence(data: Uint8Array, sequence: Uint8Array): number[] {
  if (sequence.length === 0 || sequence.length > data.length) {
    return []
  }

  const matches: number[] = []
  const lastStart = data.length - sequence.length
  for (let start = 0; start <= lastStart; start++) {
    let matched = true
    for (let offset = 0; offset < sequence.length; offset++) {
      if (data[start + offset] !== sequence[offset]) {
        matched = false
        break
      }
    }
    if (matched) {
      matches.push(start)
    }
  }

  return matches
}

export function formatHexAddress(address: number, minDigits = 0): string {
  return `$${address.toString(16).toUpperCase().padStart(minDigits, '0')}`
}

export function formatHexByte(value: number): string {
  return value.toString(16).toUpperCase().padStart(2, '0')
}

export function bytesToHex(data: Uint8Array, start = 0, end = data.length - 1): string {
  const from = Math.max(0, Math.min(start, data.length))
  const to = Math.max(from - 1, Math.min(end, data.length - 1))
  if (to < from) {
    return ''
  }

  const bytes: string[] = []
  for (let index = from; index <= to; index++) {
    bytes.push(formatHexByte(data[index] ?? 0))
  }
  return bytes.join(' ')
}

export function normalizeSelection(
  first: number,
  second: number,
  length: number,
): HexSelection | null {
  if (length <= 0) {
    return null
  }

  const a = Math.max(0, Math.min(first, length - 1))
  const b = Math.max(0, Math.min(second, length - 1))
  return a <= b ? { start: a, end: b } : { start: b, end: a }
}

export function selectionLength(selection: HexSelection | null): number {
  return selection === null ? 0 : selection.end - selection.start + 1
}

export function formatHexRange(address: number, length: number): string {
  if (length <= 0) {
    return `${formatHexAddress(address)} (empty)`
  }
  const endInclusive = address + length - 1
  return `${formatHexAddress(address)}–${formatHexAddress(endInclusive)}`
}

export function getHexPageState(
  length: number,
  page: number,
  pageSize: number,
): HexPageState {
  const safePageSize = Math.max(1, Math.floor(pageSize))
  const pageCount = Math.max(1, Math.ceil(length / safePageSize))
  const safePage = Math.max(0, Math.min(Math.floor(page), pageCount - 1))
  const offsetStart = length === 0 ? 0 : safePage * safePageSize
  const offsetEnd = length === 0 ? 0 : Math.min(length, offsetStart + safePageSize)

  return {
    page: safePage,
    pageCount,
    offsetStart,
    offsetEnd,
    hasPrevious: safePage > 0,
    hasNext: safePage < pageCount - 1,
  }
}

export function pageForIndex(index: number, pageSize: number, length: number): number {
  const state = getHexPageState(length, 0, pageSize)
  if (index < 0 || index >= length) {
    return state.page
  }
  return Math.floor(index / Math.max(1, Math.floor(pageSize)))
}

export function toAscii(byte: number): string {
  return byte >= 0x20 && byte <= 0x7e ? String.fromCharCode(byte) : '.'
}
