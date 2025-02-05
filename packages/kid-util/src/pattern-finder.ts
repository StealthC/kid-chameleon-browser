export type PatternItem = {
  value: number;
  mask: number;
};

export type PatternItemAlternative = {
  alternatives: PatternItem[];
};

export type PatternSequence = (PatternItem | PatternItemAlternative | PatternAlternative | PatternSequence)[];
export type PatternAlternative = {
  alternatives: PatternSequence[];
};

export type Pattern = PatternSequence | PatternItemAlternative | PatternAlternative | PatternItem;

//
// 2. Parser – converts a pattern string (with advanced rules) into a Pattern structure.
//    Supports:
//      - "??"            → wildcard (mask = 0)
//      - "A?" / "?B"     → fixed nibble (mask = 0xF0 or 0x0F)
//      - "AA"            → exact byte (mask = 0xFF)
//      - "AA:BB"         → byte with defined mask
//      - "AA|BB||CC"     → alternatives for the same byte
//      - [ ... ]         → group (subquery) – can also be used with alternatives, e.g.: [AA BB CC]||[DD EE]
//
class PatternParser {
  input: string;
  pos: number;

  constructor(input: string) {
    this.input = input;
    this.pos = 0;
  }

  // Skips whitespace
  skipWhitespace(): void {
    while (this.pos < this.input.length && /\s/.test(this.input[this.pos]!)) {
      this.pos++;
    }
  }

  peek(): string | null {
    return this.pos < this.input.length ? this.input[this.pos]! : null;
  }

  consumeChar(): string {
    return this.input[this.pos++]!;
  }

  // Checks if the current position starts with the given string
  match(str: string): boolean {
    return this.input.slice(this.pos, str.length) === str;
  }

  // ----- Main parsing function -----
  // parsePattern(): Pattern
  //    Reads a pattern that may contain alternatives separated by "||"
  parsePattern(): Pattern {
    const alternatives: PatternSequence[] = [];
    const seq = this.parseSequence();
    alternatives.push(seq);
    this.skipWhitespace();
    while (this.match("||")) {
      this.pos += 2; // consumes "||"
      this.skipWhitespace();
      const altSeq = this.parseSequence();
      alternatives.push(altSeq);
      this.skipWhitespace();
    }
    if (alternatives.length === 1) {
      return alternatives[0]!;
    } else {
      return { alternatives };
    }
  }

  // parseSequence(): PatternSequence
  //    Reads a sequence of tokens until it finds ']' or "||" or the end of the input.
  parseSequence(): PatternSequence {
    const sequence: PatternSequence = [];
    while (this.pos < this.input.length) {
      this.skipWhitespace();
      const ch = this.peek();
      if (ch === null) break;
      if (ch === ']') break; // end of group
      if (this.match("||")) break; // end of current sequence (group alternative)
      const token = this.parseToken();
      if (token) {
        sequence.push(token);
      }
    }
    return sequence;
  }

  // parseToken(): (PatternItem | PatternItemAlternative | PatternAlternative | PatternSequence) | null
  //    A token can be a group (delimited by brackets) or a literal.
  parseToken(): PatternItem | PatternItemAlternative | PatternAlternative | PatternSequence | null {
    this.skipWhitespace();
    const ch = this.peek();
    if (ch === null) return null;
    if (ch === '[') {
      // Group: consumes the '[' and reads the pattern recursively until it finds ']'
      this.consumeChar(); // consumes '['
      const groupPattern = this.parsePattern();
      this.skipWhitespace();
      if (this.peek() !== ']') {
        throw new Error("Parsing error: expected ']' in " + this.input);
      }
      this.consumeChar(); // consumes ']'
      // The group can be considered “inline” (i.e., a sequence)
      return groupPattern;
    } else {
      // Literal: reads all characters until space, ']' or "||"
      let tokenStr = "";
      while (this.pos < this.input.length) {
        if (/\s/.test(this.input[this.pos]!)) break;
        if (this.input[this.pos] === ']') break;
        if (this.match("||")) break;
        tokenStr += this.consumeChar();
      }
      if (tokenStr.length === 0) return null;
      // If the token contains any "|" (one or more), treat as alternatives for the same byte.
      const parts = tokenStr.split(/[|]+/);
      if (parts.length === 1) {
        return this.parseBytePattern(parts[0]!);
      } else {
        const alternatives: PatternItem[] = [];
        for (const part of parts) {
          alternatives.push(this.parseBytePattern(part));
        }
        return { alternatives };
      }
    }
  }

  // parseBytePattern(token: string): PatternItem
  //    Reads a token that represents a byte (supports formats "??", "A?", "?B", "AA" or "AA:BB")
  parseBytePattern(token: string): PatternItem {
    token = token.toUpperCase();
    // Wildcard
    if (token === "??") {
      return { value: 0, mask: 0 };
    }
    // Format "AA:BB"
    if (token.includes(":")) {
      const [valStr, maskStr] = token.split(":");
      const value = parseInt(valStr ?? '00', 16);
      const mask = parseInt(maskStr ?? 'FF', 16);
      return { value, mask };
    }
    // If it has 2 characters and one of them is "?"
    if (token.length === 2) {
      const [c0, c1] = [token[0]!, token[1]!];
      if (c0 === '?' && /[0-9A-F]/.test(c1)) {
        const value = parseInt(c1, 16);
        return { value, mask: 0x0F }; // fixes lower nibble
      } else if (c1 === '?' && /[0-9A-F]/.test(c0)) {
        const value = parseInt(c0, 16) << 4;
        return { value, mask: 0xF0 }; // fixes upper nibble
      } else if (/^[0-9A-F]{2}$/.test(token)) {
        // exact byte
        const value = parseInt(token, 16);
        return { value, mask: 0xFF };
      }
    }
    // Default case: tries to read as exact byte
    const value = parseInt(token, 16);
    return { value, mask: 0xFF };
  }
}

// Helper function that compiles the string into a Pattern
export function compileComplexPattern(patternStr: string): Pattern {
  const parser = new PatternParser(patternStr);
  return parser.parsePattern();
}

//
// 3. Matching function and search class
//

// Returns 1 if the PatternItem (exact byte) matches data[offset], -1 otherwise.
function matchPatternItem(data: Uint8Array, offset: number, item: PatternItem): number {
  if (offset >= data.length) return -1;
  return (data[offset]! & item.mask) === (item.value & item.mask) ? 1 : -1;
}

// For PatternItemAlternative (alternatives for the same byte)
function matchPatternItemAlternative(
  data: Uint8Array,
  offset: number,
  alt: PatternItemAlternative
): number {
  for (const item of alt.alternatives) {
    if (matchPatternItem(data, offset, item) === 1) return 1;
  }
  return -1;
}

/**
 * matchPattern – Tries to match the pattern starting from data[offset].
 * Returns the number of bytes consumed if there is a match or -1 otherwise.
 *
 * The function works recursively, handling:
 * - PatternSequence (array): iterates over tokens and accumulates the number of bytes consumed.
 * - PatternItem: compares a byte.
 * - PatternItemAlternative: matches if *any* alternative matches.
 * - PatternAlternative: tests each sequence alternative.
 */
export function matchPattern(data: Uint8Array, offset: number, pattern: Pattern): number {
  // If it's an array → PatternSequence
  if (Array.isArray(pattern)) {
    const start = offset;
    for (const token of pattern) {
      const len = matchPattern(data, offset, token);
      if (len < 0) return -1;
      offset += len;
    }
    return offset - start;
  }
  // If it's a PatternItem (has "value" property)
  if ("value" in pattern) {
    return matchPatternItem(data, offset, pattern);
  }
  // If it has "alternatives", it can be:
  // - PatternItemAlternative (alternatives for a single byte)
  // - PatternAlternative (sequence alternatives)
  if ("alternatives" in pattern) {
    const alts = pattern.alternatives;
    if (alts.length === 0) return -1;
    // If the first element has the "value" property, it's a PatternItemAlternative.
    if (typeof alts[0] === "object" && !Array.isArray(alts[0]) && "value" in alts[0]) {
      return matchPatternItemAlternative(data, offset, pattern as PatternItemAlternative);
    } else {
      // Otherwise, it's a PatternAlternative: tests each alternative (each is a sequence).
      for (const seq of alts as PatternSequence[]) {
        const len = matchPattern(data, offset, seq);
        if (len >= 0) return len;
      }
      return -1;
    }
  }
  return -1;
}

/**
 * Class PatternFinderComplex – uses the compiled pattern (supports the new grammar)
 * to search for occurrences in the Uint8Array.
 */
export class PatternFinder {
  private pattern: Pattern;
  private data: Uint8Array;
  private position: number;
  constructor(patternStr: string, data: Uint8Array, startOffset: number = 0, public allowOverlap = false) {
    this.pattern = compileComplexPattern(patternStr);
    this.data = data;
    this.position = startOffset;
  }

  /**
   * Searches for the next occurrence of the pattern from the current position.
   * Returns the offset where the pattern was found or -1 if not found.
   */
  public findNext(): number {
    for (let i = this.position; i <= this.data.length; i++) {
      const len = matchPattern(this.data, i, this.pattern);
      if (len >= 0) {
        if (this.allowOverlap) {
          // Allow overlapping matches
          this.position = i + 1;
        } else {
          // Advances the position to avoid overlap (can be adjusted if desired)
          this.position = i + len;
        }
        return i;
      }
    }
    return -1;
  }

  /**
   * Returns all offsets where the pattern occurs.
   */
  public findAll(): number[] {
    const results: number[] = [];
    let pos = this.findNext();
    while (pos !== -1) {
      results.push(pos);
      pos = this.findNext();
    }
    return results;
  }
}
