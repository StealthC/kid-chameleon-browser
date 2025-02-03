const CRC32_TABLE = (() => {
    const table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
        let crc = i;
        for (let j = 0; j < 8; j++) {
            crc = (crc & 1) ? (0xEDB88320 ^ (crc >>> 1)) : (crc >>> 1);
        }
        table[i] = crc >>> 0;
    }
    return table;
})();

/**
 * Calculate the CRC32 checksum of the given data.
 * @param data the data to calculate the CRC32 checksum of
 * @param crc the initial CRC value
 * @returns the CRC32 checksum of the data
 */
export function crc32(data: Uint8Array, crc = 0xFFFFFFFF): number {
    for (const byte of data) {
        crc = (crc >>> 8) ^ CRC32_TABLE[(crc ^ byte) & 0xFF]!;
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
}

export async function sha256(data: Uint8Array, upper = true): Promise<string> {
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hash = Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
    if (upper) {
        return hash.toUpperCase();
    }
    return hash;
}

export function mdCrc(data: Uint8Array, limit?: number): number {
    if (!limit) {
        limit = data.length;
    }
    if (limit <= 0x200) {
        throw new Error("Data length must be greater than 512 bytes");
    }
    let crc = 0;
    let pos = 0x200;
    while (pos < limit) {
        crc += data[pos++]! * 0x100;
        crc += data[pos++]!;
    }
    return crc & 0xFFFF;
}