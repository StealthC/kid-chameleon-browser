export type CompiledPattern = (number | null)[]
/** Search for am hex pattern matching "00 11 22 ?? 44 55 66" where "??" is a wildcard */
export class PatternFinder {
  compiledPattern: CompiledPattern = []
  position: number

  constructor(
    public pattern: string,
    private data: Uint8Array,
    startOffset = 0,
  ) {
    this.position = startOffset
    this.loadPattern(pattern)
  }

  findNext(): number {
    for (let i = this.position; i < this.data.length - this.compiledPattern.length; i++) {
      let found = true
      for (let j = 0; j < this.compiledPattern.length; j++) {
        if (this.compiledPattern[j] !== null && this.compiledPattern[j] !== this.data[i + j]) {
          found = false
          break
        }
      }
      if (found) {
        this.position = i + this.compiledPattern.length
        return i
      }
    }
    return -1
  }

  findAll(): number[] {
    const results: number[] = []
    let pos = this.findNext()
    while (pos !== -1) {
      results.push(pos)
      pos = this.findNext()
    }
    return results
  }

  loadPattern(pattern: string) {
    this.compiledPattern = pattern.split(' ').map((c) => {
      if (c === '??') {
        return null
      }
      return parseInt(c, 16)
    })
  }
}
