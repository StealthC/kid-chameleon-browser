export type UnpackEnigmaResults = {
  startAddress: number
  endAddress: number
  sizePacked: number
  sizeUnpacked: number
  ratio: number
  success: boolean
}

/** Classe auxiliar para ler bits de um DataView, simulando o comportamento do "bitio" no Go. */
class BitReader {
  private dataView: DataView
  private bytePos: number // posição atual em bytes
  private bitPos: number // offset global em bits (para cálculo de quantos bits já foram lidos)
  private currentByte: number
  private bitsRead: number // total de bits lidos, para estatísticas

  constructor(dataView: DataView, startByteOffset: number) {
    this.dataView = dataView
    this.bytePos = startByteOffset
    this.bitPos = 0
    this.currentByte = 0
    this.bitsRead = 0
  }

  /**
   * Lê `n` bits (máximo 32, mas aqui usaremos poucos) e retorna como número (0 a 2^n - 1). Lança
   * erro se não houver dados suficientes.
   */
  public readBits(n: number): number {
    let result = 0
    for (let i = 0; i < n; i++) {
      // Se estivermos em um múltiplo de 8 bits, precisamos ler um novo byte
      if ((this.bitPos & 7) === 0) {
        if (this.bytePos >= this.dataView.byteLength) {
          throw new Error('EOF while reading bits')
        }
        this.currentByte = this.dataView.getUint8(this.bytePos)
        this.bytePos++
      }
      // Calcula o shift para extrair o bit correto do currentByte
      const shift = 7 - (this.bitPos & 7)
      const bit = (this.currentByte >> shift) & 1
      result = (result << 1) | bit

      this.bitPos++
      this.bitsRead++
    }
    return result
  }

  /** Retorna quantos bits foram lidos no total. */
  public getBitsCount(): number {
    return this.bitsRead
  }
}

/** Conta quantos bits estão em 1 no `v`. */
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
 * Pega `bits` (que possui N bits ativos) e os mapeia nas posições em que `mask` tem bits ativos.
 * Ex.: se mask=0b10110 e bits=0b011 => então result terá - o primeiro bit ativo de `bits` indo para
 * o primeiro bit ativo de mask - o segundo bit ativo de `bits` indo para o segundo bit ativo de
 * mask - ...
 */
function setBits(mask: number, bits: number): number {
  if (mask === 0) {
    return 0
  }
  let result = 0
  let pos = 0 // posição dentro de `bits`
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

/** Lê 1 byte de dataView em big-endian */
function readUint8(view: DataView, pos: number): number {
  if (pos >= view.byteLength) {
    throw new Error('EOF while reading uint8')
  }
  return view.getUint8(pos)
}

/** Lê 2 bytes de dataView como uint16 big-endian */
function readUint16BE(view: DataView, pos: number): number {
  if (pos + 1 >= view.byteLength) {
    throw new Error('EOF while reading uint16')
  }
  return view.getUint16(pos, false /* big-endian */)
}

/**
 * Descomprime dados no formato "Enigma" (Kid Chameleon).
 *
 * @param input O buffer de dados de entrada (Uint8Array ou DataView)
 * @param compressedDataStart Endereço inicial (em bytes) no buffer onde começam os dados
 *   comprimidos
 * @param tile Valor inteiro que será somado aos valores descomprimidos
 * @returns Objeto contendo { data: Uint8Array, results: UnpackEnigmaResults }
 */
export function unpackEnigmaFormat(
  input: Uint8Array | DataView,
  compressedDataStart: number,
  tile: number,
): { data: Uint8Array; results: UnpackEnigmaResults } {
  // Converte o input para DataView, se for Uint8Array
  let dataView: DataView
  if (input instanceof Uint8Array) {
    dataView = new DataView(input.buffer, input.byteOffset, input.byteLength)
  } else {
    dataView = input
  }

  // Resultado
  const results: UnpackEnigmaResults = {
    startAddress: compressedDataStart,
    endAddress: 0,
    sizePacked: 0,
    sizeUnpacked: 0,
    ratio: 0,
    success: false,
  }

  // Vamos ler os 6 bytes iniciais na ordem:
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

  // Quantos bits estão ativos em bitfield
  const nbits = countOnes(bitfield)

  // Agora criamos o leitor de bits a partir da posição atual (pos)
  // Ele vai permitir ler 1,2,4... bits por vez
  const bReader = new BitReader(dataView, pos)

  // Buffer de saída: cada valor final é 16 bits (big-endian).
  const output: number[] = []

  // Função auxiliar para escrever "value" (16 bits) em big-endian no output
  const writeUint16BE = (val: number) => {
    output.push((val >>> 8) & 0xff)
    output.push(val & 0xff)
  }

  try {
    // Loop principal
    for (;;) {
      // Lê 1 bit
      const bit = bReader.readBits(1)
      if (bit === 0) {
        // Lê mais 1 bit (mode) e 4 bits (count)
        const mode = bReader.readBits(1)
        const count = bReader.readBits(4) // 0..15
        if (mode === 0) {
          // Escreve (count+1) valores: inc_copy + tile, incrementando inc_copy a cada vez
          for (let r = 0; r < count + 1; r++) {
            const value = inc_copy + tile
            writeUint16BE(value)
            inc_copy++
          }
        } else {
          // Escreve (count+1) valores: lit_copy + tile (não incrementa lit_copy)
          for (let r = 0; r < count + 1; r++) {
            const value = lit_copy + tile
            writeUint16BE(value)
          }
        }
      } else {
        // Lê 2 bits (mode) e 4 bits (count)
        const mode = bReader.readBits(2) // 0..3
        const count = bReader.readBits(4) // 0..15
        if (mode === 3) {
          // Se count == 0xF (15 decimal) => fim
          if (count === 0xf) {
            results.success = true
            break
          } else {
            // Lê (count+1) "valores" especiais:
            //   1) flagBits (nbits bits)
            //   2) inline   (inline_bits bits)
            // => compõe valor e escreve
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
        // Caso mode != 3
        // Lê "flagBits", "inline", compõe valor
        const flagBits = bReader.readBits(nbits)
        const flags = (setBits(bitfield, flagBits) << 3) << 8
        const inlineVal = bReader.readBits(inline_bits)
        let value = (flags | inlineVal) + tile

        if (mode === 0) {
          // Repete o mesmo valor (count+1) vezes
          for (let r = 0; r < count + 1; r++) {
            writeUint16BE(value)
          }
        } else if (mode === 1) {
          // Repete com incremento a cada escrita
          for (let r = 0; r < count + 1; r++) {
            writeUint16BE(value)
            value++
          }
        } else if (mode === 2) {
          // Repete com decremento a cada escrita
          for (let r = 0; r < count + 1; r++) {
            writeUint16BE(value)
            value--
          }
        }
      }
    }
  } catch (_e) {
    // Se faltaram bits ou algo assim, a execução chega aqui.
    // results.success continua false, a menos que já estivesse true.
    // Podemos ignorar ou tratar de forma especial.
    // console.warn("Erro ao ler bits:", e);
  }

  // Cálculo do tamanho real em bits que foi lido
  const bitsCount = bReader.getBitsCount()
  // Tamanho em bytes consumidos (arredondando para cima) + 6 bytes iniciais
  const sizePacked = Math.ceil(bitsCount / 8) + 6
  results.sizePacked = sizePacked
  results.endAddress = results.startAddress + sizePacked

  // Tamanho descomprimido
  const sizeUnpacked = output.length // total de bytes (cada valor 16 bits gera 2 bytes)
  results.sizeUnpacked = sizeUnpacked

  if (sizeUnpacked === 0) {
    // Evita divisão por zero
    results.ratio = 0
    results.success = false
  } else {
    results.ratio = (sizePacked / sizeUnpacked) * 100.0
  }

  // Se (no final) o descomprimido for menor que o comprimido, Go define success = false
  if (sizeUnpacked < sizePacked) {
    results.success = false
  }

  // Converte o array de saída em Uint8Array
  const data = new Uint8Array(output)

  return { data, results }
}
