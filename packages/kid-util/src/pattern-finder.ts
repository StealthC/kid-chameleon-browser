// ========================================================
// Types used in the new compiler
// ========================================================

export type PatternSingleValue = {
  value: number
  mask: number
}

export type PatternAlternative = {
  or: Pattern[]
}

export type PatternSequence = Pattern[]
export type Pattern = PatternSequence | PatternAlternative | PatternSingleValue

// ========================================================
// 1. Parser – converts a pattern string into a Pattern structure
//    Supports:
//      - "??"            → wildcard (mask = 0)
//      - "A?" / "?B"     → fixed nibble (mask = 0xF0 or 0x0F)
//      - "AA"            → exact byte (mask = 0xFF)
//      - "AA:BB"         → byte with defined mask
//      - "AA|BB||CC"     → alternatives for the same byte
//      - [ ... ]         → group (subquery); can be combined with alternatives, e.g., [AA BB CC]||[DD EE]
// ========================================================

class PatternParser {
  input: string
  pos: number

  constructor(input: string) {
    this.input = input
    this.pos = 0
  }

  // Skips whitespace
  skipWhitespace(): void {
    while (this.pos < this.input.length && /\s/.test(this.input[this.pos]!)) {
      this.pos++
    }
  }

  // Returns the current character without consuming it
  peek(): string | null {
    return this.pos < this.input.length ? this.input[this.pos]! : null
  }

  // Consumes a character; if an expected character is passed, consumes while it is equal
  consumeChar(expectedChar?: string): string {
    if (expectedChar) {
      while (this.pos < this.input.length && this.input[this.pos] === expectedChar) {
        this.pos++
      }
      return expectedChar
    }
    return this.input[this.pos++]!
  }

  // Checks if the current position starts with the given string
  match(str: string): boolean {
    return this.input.slice(this.pos, this.pos + str.length) === str
  }

  // ----- Main parsing function -----
  // Reads a pattern that may contain alternatives separated by the '|' character(s)
  parsePattern(): Pattern {
    const currentPattern: PatternSequence = []
    const patternStack: Pattern[] = []
    this.skipWhitespace()
    let item = this.parseNextItem()
    while (item) {
      // If an alternative separator is found
      if (this.peek() === '|') {
        patternStack.push(item)
        this.consumeChar('|') // consumes all consecutive '|'
      } else {
        if (patternStack.length > 0) {
          // If there are stacked items, it means we have alternatives for the same element
          currentPattern.push({ or: [...patternStack, item] } as PatternAlternative)
          patternStack.length = 0
        } else {
          currentPattern.push(item)
        }
      }
      this.skipWhitespace()
      item = this.parseNextItem()
    }
    return currentPattern
  }

  // Reads the next item in the pattern (can be a group or a simple token)
  parseNextItem(): Pattern | null {
    this.skipWhitespace()
    const ch = this.peek()
    if (ch === null) return null
    if (ch === '[') {
      return this.parseGroup()
    } else {
      const start = this.pos
      while (this.pos < this.input.length) {
        const curr = this.peek()
        if (curr === ' ' || curr === '|' || curr === '[' || curr === null) {
          break
        }
        this.consumeChar()
      }
      const token = this.input.slice(start, this.pos)
      if (token === '') return null
      // Converts the token into PatternSingleValue (possibly with alternatives if there is '|')
      return this.parsePatternSingleValue(token)
    }
  }

  // Reads a group delimited by brackets '[' and ']' (supports nested groups)
  parseGroup(): Pattern {
    // Consumes the '['
    this.consumeChar('[')
    const start = this.pos
    let bracketCount = 1
    while (this.pos < this.input.length && bracketCount > 0) {
      const ch = this.input[this.pos]!
      if (ch === '[') {
        bracketCount++
      } else if (ch === ']') {
        bracketCount--
      }
      this.pos++
    }
    if (bracketCount !== 0) {
      throw new Error(`Parsing error: unclosed group in '${this.input}'`)
    }
    // The content of the group is between start and (this.pos - 1)
    const groupContent = this.input.slice(start, this.pos - 1)
    const parser = new PatternParser(groupContent.trim())
    return parser.parsePattern()
  }

  // Converts a token representing a byte into PatternSingleValue
  // Supports: "??", "AA:BB", "A?" / "?B", "AA"
  parsePatternSingleValue(token: string): PatternSingleValue {
    token = token.toUpperCase()
    // Wildcard
    if (token === '??') {
      return { value: 0, mask: 0 }
    }
    // Format "AA:BB"
    if (token.includes(':')) {
      const [valStr, maskStr] = token.split(':')
      const value = parseInt(valStr ?? '00', 16)
      const mask = parseInt(maskStr ?? 'FF', 16)
      return { value, mask }
    }
    // If it has 2 characters and one of them is "?"
    if (token.length === 2) {
      const [c0, c1] = [token[0]!, token[1]!]
      if (c0 === '?' && /[0-9A-F]/.test(c1)) {
        const value = parseInt(c1, 16)
        return { value, mask: 0x0f } // fixes lower nibble
      } else if (c1 === '?' && /[0-9A-F]/.test(c0)) {
        const value = parseInt(c0, 16) << 4
        return { value, mask: 0xf0 } // fixes upper nibble
      } else if (/^[0-9A-F]{2}$/.test(token)) {
        const value = parseInt(token, 16)
        return { value, mask: 0xff }
      }
    }
    // Default case: tries to read as exact byte
    const value = parseInt(token, 16)
    return { value, mask: 0xff }
  }
}

// Helper function that compiles the string into a Pattern
export function compilePattern(patternStr: string): Pattern {
  const parser = new PatternParser(patternStr)
  return parser.parsePattern()
}

// ========================================================
// 2. Matching function – checks if the pattern matches the data from an offset.
//    The function is recursive and works with the three types of Pattern.
// ========================================================

export function matchPattern(data: Uint8Array, offset: number, pattern: Pattern): number {
  // If it is a PatternSequence (array of Pattern)
  if (Array.isArray(pattern)) {
    const start = offset
    for (const p of pattern) {
      const len = matchPattern(data, offset, p)
      if (len < 0) return -1
      offset += len
    }
    return offset - start
  }
  // If it is a PatternAlternative (property "or")
  if ('or' in pattern) {
    for (const alternative of pattern.or) {
      const len = matchPattern(data, offset, alternative)
      if (len >= 0) return len
    }
    return -1
  }
  // If it is a PatternSingleValue
  if (offset >= data.length) return -1
  return (data[offset]! & pattern.mask) === (pattern.value & pattern.mask) ? 1 : -1
}

// ========================================================
// 3. PatternFinderComplex class – uses the compiled pattern to search for occurrences
//    in the Uint8Array. The search is done in a “naive” way, testing the pattern at each
//    position of the array.
// ========================================================

export class PatternFinder {
  private pattern: Pattern
  private data: Uint8Array
  private position: number

  constructor(
    patternStr: string,
    data: Uint8Array,
    startOffset: number = 0,
    public allowOverlap: boolean = false,
  ) {
    this.pattern = compilePattern(patternStr)
    this.data = data
    this.position = startOffset
  }

  /**
   * Searches for the next occurrence of the pattern from the current position. Returns the offset
   * where the pattern was found or -1 if not found.
   */
  public findNext(): number {
    for (let i = this.position; i < this.data.length; i++) {
      const len = matchPattern(this.data, i, this.pattern)
      if (len >= 0) {
        // Advances the position; if the pattern consumes 0 bytes (theoretically impossible), advances 1
        if (!this.allowOverlap) {
          this.position = i + (len > 0 ? len : 1)
        } else {
          this.position = i + 1
        }
        return i
      }
    }
    return -1
  }

  /** Returns all offsets where the pattern occurs. */
  public findAll(): number[] {
    const results: number[] = []
    let pos = this.findNext()
    while (pos !== -1) {
      results.push(pos)
      pos = this.findNext()
    }
    return results
  }
}
