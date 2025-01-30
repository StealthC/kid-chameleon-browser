export const KidDataType = {
    PackedGfx: 0x00,
} as const

export type KidData = {
    type: typeof KidDataType[keyof typeof KidDataType];
    ptr: number;
    size?: number;
    bytes?: Uint8Array;
    data: DataView;
}

export function ReadPtr(data: DataView, ptr: number): number {
    return data.getUint32(ptr, false);
}

export function ReadPackedGfx(data: DataView, ptr: number): KidData {
    const type = KidDataType.PackedGfx;

    //const bytes = new Uint8Array(data.buffer, ptr + 2, size);
    //return { type, ptr, size, bytes, data };
    throw new Error("Not implemented");
}


export type KidUnpackResults = {
    keyDataSize: number;
    inputDataSize: number;
    totalInputSize: number;
    output: Uint8Array;
}

/**
 * Decodifica dados comprimidos no formato usado pelo jogo Kid Chameleon.
 * Esta função tenta manter a estrutura do código Go original,
 * mas usa técnicas idiomáticas de JavaScript/TypeScript.
 *
 * @param input  Uint8Array ou DataView contendo os dados comprimidos
 * @param maxSize Tamanho máximo para a saída (opcional, default 65535)
 * @returns      Uint8Array contendo os dados descomprimidos
 */
export function unpackKidFormat(
    input: Uint8Array | DataView,
    maxSize = 0xffff
): KidUnpackResults {
    // Converte o input para DataView, se for Uint8Array
    let dataView: DataView;
    if (input instanceof Uint8Array) {
        dataView = new DataView(input.buffer, input.byteOffset, input.byteLength);
    } else {
        dataView = input;
    }

    // Função auxiliar para ler um byte no DataView sem estourar
    function readByte(pos: number): number {
        if (pos < 0 || pos >= dataView.byteLength) {
            return 0; // comportamento "ou zero" caso fora do range
        }
        return dataView.getUint8(pos);
    }

    // Função auxiliar para ler um int16 (big-endian)
    function readInt16BE(pos: number): number {
        if (pos + 1 >= dataView.byteLength) {
            return 0;
        }
        return dataView.getInt16(pos, false); // big-endian
    }

    // Lê o offset inicial (int16 big-endian)
    // Ele fica nos 2 primeiros bytes do buffer.
    const offsetToInputData = readInt16BE(0);

    // Determina onde termina a "key data" e começa a "input data"
    const keyDataStart = 2;
    const keyDataEnd = keyDataStart + offsetToInputData; // "addressStop"
    let keyPos = keyDataStart; // posição atual de leitura dos bits ("key data")
    let inputPos = keyDataEnd; // posição atual de leitura dos bytes comprimidos

    // Variáveis de controle
    let bitpos = 0;      // posição do bit dentro do "key"
    let key = 0;         // armazenará o valor de 16 bits lido da "key data"
    let terminate = false;
    let unit = 0;        // conta quantos bytes já foram descomprimidos

    // Saída (usaremos array para facilitar push e leitura de índice)
    const output: number[] = [];

    // Laço principal
    // Repete enquanto não tivermos atingido 'terminate',
    // não passarmos de 'maxSize' e ainda tivermos key bytes para ler.
    while (!terminate && unit < maxSize && keyPos < keyDataEnd) {
        // Lê 16 bits da "key data"
        // No Go, a cada iteração faz-se 'binary.Read(..., &key)' e depois 'pos -= 2'.
        // Aqui, simulamos isso lendo o valor e não avançando permanentemente 2 bytes.
        // Ele só avança efetivamente 1 byte quando bitpos > 7.
        key = (readByte(keyPos) << 8) | readByte(keyPos + 1);

        // Ajuste: "keyPos -= 2" do Go é equivalente a ler mas "não avançar".
        // Então não incrementamos keyPos aqui - apenas depois, quando passamos de 8 bits.
        // A leitura de bits é feita deslocando `key << bitpos`, etc.

        // Lê 1 bit de "key"
        let keybit = ((key << bitpos) & 0x8000) >>> 15;
        bitpos++;

        if (keybit === 1) {
            // ----------------------------------
            // 1) Direct Copy: copia 1 byte direto
            // ----------------------------------
            const b = readByte(inputPos);
            inputPos++;
            output.push(b);
            unit++;
        } else {
            // ------------------------
            // 2) Reference Copy / LZ
            // ------------------------
            // Lê mais 1 bit
            keybit = ((key << bitpos) & 0x8000) >>> 15;
            bitpos++;
            if (keybit === 0) {
                // 2.1) Short Range Reference
                // Lê 1 bit extra e 1 byte
                const extraKeyBit = ((key << bitpos) & 0x8000) >>> 15; // keybit
                bitpos++;
                const in1 = readByte(inputPos);
                inputPos++;

                if (in1 !== 0) {
                    // Copiamos (extraKeyBit + 2) bytes a partir de (outPos - in1)
                    const count = extraKeyBit + 2;
                    for (let c = 0; c < count; c++) {
                        const srcIndex = output.length - in1; // outPos - in1
                        const val = srcIndex >= 0 ? output[srcIndex] : 0;
                        output.push(val ?? 0);
                        unit++;
                    }
                } else {
                    // Se in1 = 0, copiamos zeros
                    // for (count = 0; count < keybit+1; ...)
                    // mas note que "extraKeyBit" é o valor do bit (0 ou 1)
                    // => count = extraKeyBit + 1
                    // e "unit++" é decrementado de 1 (unit--) antes.
                    // Trazendo isso para a forma simples:
                    unit--; // para replicar "unit--" do Go
                    const count = extraKeyBit + 1; // keybit + 1
                    for (let c = 0; c < count; c++) {
                        output.push(0);
                        unit++;
                    }
                }
            } else {
                // 2.2) Long Range Reference
                // Lê 3 bits e depois 2 bits do "key"
                const rangeBits = ((key << bitpos) & 0xe000) >>> 13; // 3 bits
                bitpos += 3;
                let count = ((key << bitpos) & 0xc000) >>> 14; // 2 bits
                bitpos += 2;

                if (count === 3) {
                    // Large copy
                    const in1 = readByte(inputPos);
                    const in2 = readByte(inputPos + 1);
                    inputPos += 2;

                    count = in2; // reusa count para guardar "numero de bytes a copiar"

                    if (count < 6) {
                        // Se count == 0 => terminate
                        if (count === 0) {
                            terminate = true;
                        }
                    } else {
                        // Copiar 'count' bytes a partir de (outPos - (in1 + (rangeBits << 8)))
                        const distance = in1 + (rangeBits << 8);
                        if (distance !== 0) {
                            for (let c = 0; c < count; c++) {
                                const srcIndex = output.length - distance;
                                const val = srcIndex >= 0 ? output[srcIndex] : 0;
                                output.push(val ?? 0);
                                unit++;
                            }
                        } else {
                            // distance = 0 => escreve zeros
                            unit--; // replicando o unit-- do Go
                            for (let c = 0; c < count - 1; c++) {
                                output.push(0);
                                unit++;
                            }
                        }
                    }
                } else {
                    // outro caso
                    // count += 3
                    const in1 = readByte(inputPos);
                    inputPos++;
                    count += 3;
                    const distance = in1 + (rangeBits << 8);

                    if (distance !== 0) {
                        for (let c = 0; c < count; c++) {
                            const srcIndex = output.length - distance;
                            const val = srcIndex >= 0 ? output[srcIndex] : 0;
                            output.push(val ?? 0);
                            unit++;
                        }
                    } else {
                        // distance = 0 => escreve zeros
                        unit--; // replicando o unit-- do Go
                        for (let c = 0; c < count - 1; c++) {
                            output.push(0);
                            unit++;
                        }
                    }
                }
            }
        }

        // Após ler 1 ou mais bits, checa se passamos de 7 (pois cada byte tem 8 bits)
        if (bitpos > 7) {
            bitpos &= 7; // bitpos = bitpos - 8
            keyPos++;    // avança 1 byte no "key data"
        }
    }

    const keyDataSize = keyDataEnd - keyDataStart;
    const inputDataSize = inputPos - keyDataEnd;
    const totalInputSize = keyDataSize + inputDataSize;

    return {
        keyDataSize,
        inputDataSize,
        totalInputSize,
        // Converte o array de saída em Uint8Array    
        output: new Uint8Array(output)
    };
}
