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


export class Resource {
    constructor(protected rom: Rom, public baseAddress: number) {
    }
}

export class RawTileSheet extends Resource {
    data: Uint8Array;
    constructor(rom: Rom, address: number, size: number) {
        super(rom, address);
        this.data = new Uint8Array(rom.data.buffer, address, size);
    }
    getData(): Uint8Array {
        return this.data;
    }
}

export class PackedTileSheet extends Resource {
    packed: PackedData;
    unpacked: UnpackedData;
    constructor(rom: Rom, address: number, format: PackedFormat = "kid") {
        super(rom, address);
        this.packed = {format, address};
        this.unpacked = unpackData(this.rom.data, this.packed);
    }
    getData(): Uint8Array {
        if (!this.unpacked.data) {
            throw new Error("Data not unpacked");
        }
        return this.unpacked.data;
    }
}