import {calculatePlayerSpriteDataSize, unpackKidFormat} from "./kid-utils"
import type { Rom } from "./rom";

export type PackedFormat = "kid" | "enigma"

export type PackedData = {
    format: PackedFormat;
    address: number;
    packedSize?: number;
}

export type UnpackedData = {
    packed: PackedData;
    unpackedSize?: number;
    data?: Uint8Array;
}

export function unpackData(data: DataView, packed: PackedData): UnpackedData {
    if (packed.format === "kid") {
        const address = packed.address;
        const dataView = new DataView(data.buffer, address);
        const unpackDetails = unpackKidFormat(dataView);
        packed.packedSize = unpackDetails.totalInputSize;
        return {
            packed,
            unpackedSize: unpackDetails.output.length,
            data: unpackDetails.output
        };
    } else {
        throw new Error(`Unsupported packed format: ${packed.format}`);
    }
}

export type Resource = {
    baseAddress: number;
    tableIndex?: number;
    size?: number;
}

export type DataResource = {
    getData(): Uint8Array;
} & Resource;

export type SpriteFrameData = {
    tileId: number
    xOffset: number
    yOffset: number
    width: number
    height: number
}
export class SpriteFrameResource implements Resource {
    data: SpriteFrameData;
    constructor(private rom: Rom, public baseAddress: number) {
        const tileId = rom.data.getUint16(baseAddress, false);
        const xOffset = rom.data.getInt8(baseAddress + 2);
        const yOffset = rom.data.getInt8(baseAddress + 3);
        const width = rom.data.getUint16(baseAddress + 4, false);
        const height = rom.data.getUint16(baseAddress + 6, false);
        this.data = {tileId, xOffset, yOffset, width, height};
    }
}

export type PlayerSpriteFrameData = {
    xOffset: number
    yOffset: number
    width: number
    height: number
    data: Uint8Array
}
export class PlayerSpriteFrameResource implements DataResource {
    data: PlayerSpriteFrameData;
    constructor(private rom: Rom, public baseAddress: number) {
        const xOffset = rom.data.getInt8(baseAddress);
        const yOffset = rom.data.getInt8(baseAddress + 1);
        const width = rom.data.getUint16(baseAddress + 2, false);
        const height = rom.data.getUint16(baseAddress + 4, false);
        const start = baseAddress + 6;
        const size = calculatePlayerSpriteDataSize(width, height);
        const data = rom.bytes.subarray(start, start + size)
        this.data = {xOffset, yOffset, width, height, data};
    }
    getData(): Uint8Array {
        return new Uint8Array();
    }
}

export class RawTileSheet implements DataResource {
    data: Uint8Array;
    constructor(private rom: Rom, public baseAddress: number, public size: number) {
        this.data = rom.bytes.subarray(baseAddress, baseAddress + size);
    }
    getData(): Uint8Array {
        return this.data;
    }
}

export class PackedTileSheet implements DataResource {
    packed: PackedData;
    unpacked: UnpackedData;
    constructor(private rom: Rom, public baseAddress: number, format: PackedFormat = "kid") {
        this.packed = {format, address: baseAddress};
        this.unpacked = unpackData(this.rom.data, this.packed);
    }
    getData(): Uint8Array {
        if (!this.unpacked.data) {
            throw new Error("Data not unpacked");
        }
        return this.unpacked.data;
    }
}

export type TileSheetResource = RawTileSheet | PackedTileSheet;