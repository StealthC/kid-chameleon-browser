export type UnpackEnigmaResults = {
  startAddress: number
  endAddress: number
  sizePacked: number
  sizeUnpacked: number
  ratio: number
  success: boolean
}

/** Helper class to read bits from a DataView, simulating the behavior of "bitio" in Go. */
class BitReader {
  private dataView: DataView
  private bytePos: number // current byte position
  private bitPos: number // global bit offset (to calculate how many bits have been read)
  private currentByte: number
  private bitsRead: number // total bits read, for statistics

  constructor(dataView: DataView, startByteOffset: number) {
    this.dataView = dataView
    this.bytePos = startByteOffset
    this.bitPos = 0
    this.currentByte = 0
    this.bitsRead = 0
  }

  /**
   * Reads `n` bits (maximum 32, but here we'll use few) and returns as a number (0 to 2^n - 1).
   * Throws error if there isn't enough data.
   */
  public readBits(n: number): number {
    let result = 0
    for (let i = 0; i < n; i++) {
      // If we are at a multiple of 8 bits, we need to read a new byte
      if ((this.bitPos & 7) === 0) {
        if (this.bytePos >= this.dataView.byteLength) {
          throw new Error('EOF while reading bits')
        }
        this.currentByte = this.dataView.getUint8(this.bytePos)
        this.bytePos++
      }
      // Calculate shift to extract the correct bit from currentByte
      const shift = 7 - (this.bitPos & 7)
      const bit = (this.currentByte >> shift) & 1
      result = (result << 1) | bit

      this.bitPos++
      this.bitsRead++
    }
    return result
  }

  /** Returns how many bits have been read in total. */
  public getBitsCount(): number {
    return this.bitsRead
  }
}

/** Counts how many bits are 1 in `v`. */
function countOnes(v: number): number {
  let count = 0
  for (let i = 0; i < 8; i++) {
    if (v & (1 << i)) {
      count++
    }
  }
  return count
}

/**
 * Takes `bits` (which has N active bits) and maps them to positions where `mask` has active bits.
 * Ex.: if mask=0b10110 and bits=0b011 => then result will have:
 *
 * - First active bit of `bits` going to first active bit of mask
 * - Second active bit of `bits` going to second active bit of mask
 * - ...
 */
function setBits(mask: number, bits: number): number {
  if (mask === 0) {
    return 0
  }
  let result = 0
  let pos = 0 // position within `bits`
  for (let bit = 0; bit < 8; bit++) {
    if ((mask & (1 << bit)) !== 0) {
      if ((bits & (1 << pos)) !== 0) {
        result |= 1 << bit
      }
      pos++
    }
  }
  return result
}

/** Reads 1 byte from dataView in big-endian */
function readUint8(view: DataView, pos: number): number {
  if (pos >= view.byteLength) {
    throw new Error('EOF while reading uint8')
  }
  return view.getUint8(pos)
}

/** Reads 2 bytes from dataView as uint16 big-endian */
function readUint16BE(view: DataView, pos: number): number {
  if (pos + 1 >= view.byteLength) {
    throw new Error('EOF while reading uint16')
  }
  return view.getUint16(pos, false /* big-endian */)
}

/**
 * Decompresses data in "Enigma" format (Kid Chameleon).
 *
 * @param input Input data buffer (Uint8Array or DataView)
 * @param compressedDataStart Starting address (in bytes) in the buffer where compressed data begins
 * @param tile Integer value that will be added to decompressed values
 * @returns Object containing { data: Uint8Array, results: UnpackEnigmaResults }
 */
export function unpackEnigmaFormat(
  input: Uint8Array | DataView,
  compressedDataStart: number,
  tile: number,
): { data: Uint8Array; results: UnpackEnigmaResults } {
  // Convert input to DataView, if Uint8Array
  let dataView: DataView
  if (input instanceof Uint8Array) {
    dataView = new DataView(input.buffer, input.byteOffset, input.byteLength)
  } else {
    dataView = input
  }

  // Result
  const results: UnpackEnigmaResults = {
    startAddress: compressedDataStart,
    endAddress: 0,
    sizePacked: 0,
    sizeUnpacked: 0,
    ratio: 0,
    success: false,
  }

  // We'll read the first 6 bytes in order:
  // 1) inline_bits (uint8)
  // 2) bitfield   (uint8)
  // 3) inc_copy   (uint16 big-endian)
  // 4) lit_copy   (uint16 big-endian)

  let pos = compressedDataStart
  const inline_bits = readUint8(dataView, pos)
  pos += 1
  const bitfield = readUint8(dataView, pos)
  pos += 1
  let inc_copy = readUint16BE(dataView, pos)
  pos += 2
  const lit_copy = readUint16BE(dataView, pos)
  pos += 2

  // How many bits are active in bitfield
  const nbits = countOnes(bitfield)

  // Now create the bit reader from current position (pos)
  // It will allow reading 1,2,4... bits at a time
  const bReader = new BitReader(dataView, pos)

  // Output buffer: each final value is 16 bits (big-endian)
  const output: number[] = []

  // Helper function to write "value" (16 bits) in big-endian to output
  const writeUint16BE = (val: number) => {
    output.push((val >>> 8) & 0xff)
    output.push(val & 0xff)
  }

  try {
    // Main loop
    for (;;) {
      // Read 1 bit
      const bit = bReader.readBits(1)
      if (bit === 0) {
        // Read 1 more bit (mode) and 4 bits (count)
        const mode = bReader.readBits(1)
        const count = bReader.readBits(4) // 0..15
        if (mode === 0) {
          // Write (count+1) values: inc_copy + tile, incrementing inc_copy each time
          for (let r = 0; r < count + 1; r++) {
            const value = inc_copy + tile
            writeUint16BE(value)
            inc_copy++
          }
        } else {
          // Write (count+1) values: lit_copy + tile (doesn't increment lit_copy)
          for (let r = 0; r < count + 1; r++) {
            const value = lit_copy + tile
            writeUint16BE(value)
          }
        }
      } else {
        // Read 2 bits (mode) and 4 bits (count)
        const mode = bReader.readBits(2) // 0..3
        const count = bReader.readBits(4) // 0..15
        if (mode === 3) {
          // If count == 0xF (15 decimal) => end
          if (count === 0xf) {
            results.success = true
            break
          } else {
            // Read (count+1) "special" values:
            //   1) flagBits (nbits bits)
            //   2) inline   (inline_bits bits)
            // => compose value and write
            for (let r = 0; r < count + 1; r++) {
              const flagBits = bReader.readBits(nbits)
              const flags = (setBits(bitfield, flagBits) << 3) << 8
              const inlineVal = bReader.readBits(inline_bits)
              const value = (flags | inlineVal) + tile
              writeUint16BE(value)
            }
            continue
          }
        }
        // If mode != 3
        // Read "flagBits", "inline", compose value
        const flagBits = bReader.readBits(nbits)
        const flags = (setBits(bitfield, flagBits) << 3) << 8
        const inlineVal = bReader.readBits(inline_bits)
        let value = (flags | inlineVal) + tile

        if (mode === 0) {
          // Repeat the same value (count+1) times
          for (let r = 0; r < count + 1; r++) {
            writeUint16BE(value)
          }
        } else if (mode === 1) {
          // Repeat with increment each write
          for (let r = 0; r < count + 1; r++) {
            writeUint16BE(value)
            value++
          }
        } else if (mode === 2) {
          // Repeat with decrement each write
          for (let r = 0; r < count + 1; r++) {
            writeUint16BE(value)
            value--
          }
        }
      }
    }
  } catch (_e) {
    // If bits are missing or something like that, execution reaches here.
    // results.success remains false, unless it was already true.
    // We can ignore or handle specially.
    // console.warn("Error reading bits:", e);
  }

  // Calculate the actual size in bits that was read
  const bitsCount = bReader.getBitsCount()
  // Size in bytes consumed (rounding up) + 6 initial bytes
  const sizePacked = Math.ceil(bitsCount / 8) + 6
  results.sizePacked = sizePacked
  results.endAddress = results.startAddress + sizePacked

  // Uncompressed size
  const sizeUnpacked = output.length // total bytes (each 16-bit value generates 2 bytes)
  results.sizeUnpacked = sizeUnpacked

  if (sizeUnpacked === 0) {
    // Avoid division by zero
    results.ratio = 0
    results.success = false
  } else {
    results.ratio = (sizePacked / sizeUnpacked) * 100.0
  }

  // If (in the end) the uncompressed size is smaller than the compressed size, Go defines success = false
  if (sizeUnpacked < sizePacked) {
    results.success = false
  }

  // Convert the output array to Uint8Array
  const data = new Uint8Array(output)

  return { data, results }
}
