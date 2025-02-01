import {unpackKidFormat} from "./kid-utils"
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
    size?: number;
    getData(): Uint8Array;
}

export class RawTileSheet {
    data: Uint8Array;
    constructor(private rom: Rom, public baseAddress: number, public size: number) {
        this.data = new Uint8Array(rom.data.buffer, baseAddress, size);
    }
    getData(): Uint8Array {
        return this.data;
    }
}

export class PackedTileSheet {
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