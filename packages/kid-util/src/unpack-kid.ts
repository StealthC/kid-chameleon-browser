export type KidUnpackResults = {
  keyDataSize: number
  inputDataSize: number
  totalInputSize: number
  output: Uint8Array
}

/**
 * Decodes compressed data in the format used by the game Kid Chameleon. This function tries to
 * maintain the structure of the original Go code but uses idiomatic JavaScript/TypeScript
 * techniques.
 *
 * @param input Uint8Array or DataView containing the compressed data
 * @param maxSize Maximum size for the output (optional, default 65535)
 * @returns Uint8Array containing the decompressed data
 */
export function unpackKidFormat(input: Uint8Array | DataView, maxSize = 0xffff): KidUnpackResults {
  // Convert input to DataView if it's Uint8Array
  let dataView: DataView
  if (input instanceof Uint8Array) {
    dataView = new DataView(input.buffer, input.byteOffset, input.byteLength)
  } else {
    dataView = input
  }

  // Helper function to read a byte from DataView without overflow
  function readByte(pos: number): number {
    if (pos < 0 || pos >= dataView.byteLength) {
      return 0 // "or zero" behavior if out of range
    }
    return dataView.getUint8(pos)
  }

  // Helper function to read a int16 (big-endian)
  function readInt16BE(pos: number): number {
    if (pos + 1 >= dataView.byteLength) {
      return 0
    }
    return dataView.getInt16(pos, false) // big-endian
  }

  // Read the initial offset (big-endian int16)
  // It is located in the first 2 bytes of the buffer.
  const offsetToInputData = readInt16BE(0)

  // Determine where "key data" ends and "input data" begins
  const keyDataStart = 2
  const keyDataEnd = keyDataStart + offsetToInputData // "addressStop"
  let keyPos = keyDataStart // current bit reading position ("key data")
  let inputPos = keyDataEnd // current compressed byte reading position

  // Control variables
  let bitpos = 0 // bit position within the "key"
  let key = 0 // will store the 16-bit value read from the "key data"
  let terminate = false
  let unit = 0 // counts how many bytes have been decompressed

  // Output (we'll use an array for easy push and index reading)
  const output: number[] = []

  // Main loop
  // Repeat while we haven't reached 'terminate',
  // haven't exceeded 'maxSize', and still have key bytes to read.
  while (!terminate && unit < maxSize && keyPos < keyDataEnd) {
    // Read 16 bits from the "key data"
    // In Go, each iteration does 'binary.Read(..., &key)' and then 'pos -= 2'.
    // Here, we simulate this by reading the value and not permanently advancing 2 bytes.
    // It only effectively advances 1 byte when bitpos > 7.
    key = (readByte(keyPos) << 8) | readByte(keyPos + 1)

    // Adjustment: "keyPos -= 2" in Go is equivalent to reading but "not advancing".
    // So we don't increment keyPos here - only later, when we pass 8 bits.
    // Bit reading is done by shifting `key << bitpos`, etc.

    // Read 1 bit from "key"
    let keybit = ((key << bitpos) & 0x8000) >>> 15
    bitpos++

    if (keybit === 1) {
      // ----------------------------------
      // 1) Direct Copy: copy 1 byte directly
      // ----------------------------------
      const b = readByte(inputPos)
      inputPos++
      output.push(b)
      unit++
    } else {
      // ------------------------
      // 2) Reference Copy / LZ
      // ------------------------
      // Read 1 more bit
      keybit = ((key << bitpos) & 0x8000) >>> 15
      bitpos++
      if (keybit === 0) {
        // 2.1) Short Range Reference
        // Read 1 extra bit and 1 byte
        const extraKeyBit = ((key << bitpos) & 0x8000) >>> 15 // keybit
        bitpos++
        const in1 = readByte(inputPos)
        inputPos++

        if (in1 !== 0) {
          // Copy (extraKeyBit + 2) bytes from (outPos - in1)
          const count = extraKeyBit + 2
          for (let c = 0; c < count; c++) {
            const srcIndex = output.length - in1 // outPos - in1
            const val = srcIndex >= 0 ? output[srcIndex] : 0
            output.push(val ?? 0)
            unit++
          }
        } else {
          // If in1 = 0, copy zeros
          // for (count = 0; count < keybit+1; ...)
          // but note that "extraKeyBit" is the bit value (0 or 1)
          // => count = extraKeyBit + 1
          // and "unit++" is decremented by 1 (unit--) before.
          // Bringing this to simple form:
          unit-- // to replicate "unit--" from Go
          const count = extraKeyBit + 1 // keybit + 1
          for (let c = 0; c < count; c++) {
            output.push(0)
            unit++
          }
        }
      } else {
        // 2.2) Long Range Reference
        // Read 3 bits and then 2 bits from the "key"
        const rangeBits = ((key << bitpos) & 0xe000) >>> 13 // 3 bits
        bitpos += 3
        let count = ((key << bitpos) & 0xc000) >>> 14 // 2 bits
        bitpos += 2

        if (count === 3) {
          // Large copy
          const in1 = readByte(inputPos)
          const in2 = readByte(inputPos + 1)
          inputPos += 2

          count = in2 // reuse count to store "number of bytes to copy"

          if (count < 6) {
            // If count == 0 => terminate
            if (count === 0) {
              terminate = true
            }
          } else {
            // Copy 'count' bytes from (outPos - (in1 + (rangeBits << 8)))
            const distance = in1 + (rangeBits << 8)
            if (distance !== 0) {
              for (let c = 0; c < count; c++) {
                const srcIndex = output.length - distance
                const val = srcIndex >= 0 ? output[srcIndex] : 0
                output.push(val ?? 0)
                unit++
              }
            } else {
              // distance = 0 => write zeros
              unit-- // replicating unit-- from Go
              for (let c = 0; c < count - 1; c++) {
                output.push(0)
                unit++
              }
            }
          }
        } else {
          // other case
          // count += 3
          const in1 = readByte(inputPos)
          inputPos++
          count += 3
          const distance = in1 + (rangeBits << 8)

          if (distance !== 0) {
            for (let c = 0; c < count; c++) {
              const srcIndex = output.length - distance
              const val = srcIndex >= 0 ? output[srcIndex] : 0
              output.push(val ?? 0)
              unit++
            }
          } else {
            // distance = 0 => write zeros
            unit-- // replicating unit-- from Go
            for (let c = 0; c < count - 1; c++) {
              output.push(0)
              unit++
            }
          }
        }
      }
    }

    // After reading 1 or more bits, check if we passed 7 (since each byte has 8 bits)
    if (bitpos > 7) {
      bitpos &= 7 // bitpos = bitpos - 8
      keyPos++ // advance 1 byte in the "key data"
    }
  }

  const keyDataSize = keyDataEnd - keyDataStart
  const inputDataSize = inputPos - keyDataEnd
  const totalInputSize = keyDataSize + inputDataSize

  return {
    keyDataSize,
    inputDataSize,
    totalInputSize,
    // Convert the output array to Uint8Array
    output: new Uint8Array(output),
  }
}
