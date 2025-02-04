import { crc32 } from "./hash";
import { calculatePlayerSpriteDataSize } from "./kid-utils"
import type { Rom } from "./rom";
import { unpackKidFormat } from "./unpack-kid";

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

export type EnigmaPacked = {
    pack: "enigma"
    dataStart: number;
    tile: number;
}
export type KidPacked = {
    pack: "kid"
}

export type BaseResource = {
    type?: string;
    subType?: string;
    loaded?: boolean;
    crc32?: number;
    packed?: EnigmaPacked | KidPacked;
    baseAddress: number;
    tableIndex?: number;
    inputSize?: number;
    tags?: string[];
    name?: string;
    description?: string;
    related: Set<string>;
};

export type DataResource = BaseResource & {
    data?: Uint8Array;
};

export type SheetResource = DataResource & {
    type: "sheet";
    tileIndex?: number;
};

export type UnlinkedSpriteFrameResource = BaseResource & {
    type: "sprite-frame";
    subType: "unlinked";
    tileId?: number;
    width?: number;
    height?: number;
    xOffset?: number;
    yOffset?: number;
};

export type LinkedSpriteFrameResource = DataResource & {
    type: "sprite-frame";
    subType: "linked";
    tileId?: number;
    width?: number;
    height?: number;
    xOffset?: number;
    yOffset?: number;
};

export type SpriteFrameResource = UnlinkedSpriteFrameResource | LinkedSpriteFrameResource;

export type LoadedResource<T extends BaseResource> = T & {
    loaded: true;
    crc32: number;
    inputSize: number;
}
    & (T extends DataResource ? { data: Uint8Array } : object)
    & (T extends SpriteFrameResource ? {
        tileId: number;
        width: number;
        height: number;
        xOffset: number;
        yOffset: number
    } : object);


function _finalizeLoading<T extends BaseResource>(rom: Rom, resource: T): LoadedResource<T> {
    if (!resource.inputSize) {
        throw new Error("Resource input size needs to be defined");
    }
    const bytes = rom.bytes.subarray(resource.baseAddress, resource.baseAddress + resource.inputSize);
    resource.crc32 = crc32(bytes);
    resource.loaded = true;
    return resource as LoadedResource<T>;
}

export function loadSheetResource(rom: Rom, resource: SheetResource): LoadedResource<SheetResource> {
    if (resource.loaded) {
        return resource as LoadedResource<SheetResource>;
    }
    const { baseAddress, packed } = resource;
    if (packed) {
        if (packed.pack === "kid") {
            const data = rom.bytes.subarray(baseAddress);
            const unpacked = unpackKidFormat(data);
            resource.data = unpacked.output;
            resource.inputSize = unpacked.totalInputSize;
            return _finalizeLoading(rom, resource);
        }
    } else {
        if (!resource.inputSize) {
            throw new Error("Resource input size needs to be defined when the resource is not packed");
        }
        resource.data = rom.bytes.subarray(baseAddress, baseAddress + resource.inputSize);
        resource.loaded = true;
    }
    return _finalizeLoading(rom, resource);
}

export function loadSpriteFrameResource(rom: Rom, resource: SpriteFrameResource): LoadedResource<SpriteFrameResource> {
    if (resource.loaded) {
        return resource as LoadedResource<SpriteFrameResource>;
    }
    const { baseAddress, packed } = resource;
    if (packed) {
        throw new Error("Packed sprite frames not supported");
    } else {
        let readPos = baseAddress;
        let tileId = 0;
        if (resource.subType === "unlinked") {
            tileId = rom.data.getUint16(readPos, false);
            readPos += 2;
        }
        const xOffset = rom.data.getInt8(readPos);
        const yOffset = rom.data.getInt8(readPos + 1);
        const width = rom.data.getUint16(readPos + 2, false);
        const height = rom.data.getUint16(readPos + 4, false);
        resource.tileId = tileId;
        resource.width = width;
        resource.height = height;
        resource.xOffset = xOffset;
        resource.yOffset = yOffset;
        if (resource.subType === "linked") {
            const start = baseAddress + 6;
            const dataSize = calculatePlayerSpriteDataSize(width, height);
            const totalSize = 6 + dataSize;
            const data = rom.bytes.subarray(start, start + dataSize)
            resource.inputSize = totalSize;
            resource.data = data;
            resource.loaded = true;
            return _finalizeLoading(rom, resource);
        }
        resource.inputSize = 8;
        resource.loaded = true;
        return _finalizeLoading(rom, resource);
    }
}

export function loadResource<T extends BaseResource>(rom: Rom, resource: T): LoadedResource<T> {
    if (resource.loaded) {
        return resource as LoadedResource<T>;
    }
    if (!resource.type) {
        throw new Error("Resource type needs to be defined to be loaded");
    }
    switch (resource.type) {
        case "sheet":
            return loadSheetResource(rom, resource as SheetResource) as LoadedResource<T>;
        case "sprite-frame":
            return loadSpriteFrameResource(rom, resource as SpriteFrameResource) as LoadedResource<T>;
        default:
            throw new Error(`Unsupported resource type: ${resource.type}`);
    }
}

export function addResource(rom: Rom, resource: BaseResource) {
    const resourceKey = resource.baseAddress.toString(16);
    const existingResource = rom.resourcesByAddress[resourceKey];
    if (existingResource) {
        if (resource.type !== existingResource.type) {
            if (resource.type && existingResource.type) {
                throw new Error(`Resource type mismatch at address ${resource.baseAddress.toString(16)}`);
            }
        }
        // Merge the related resources
        const related = new Set([...existingResource.related, ...resource.related]);
        
        // Merge the new resource into the existing one
        const mergedResource = { ...existingResource, ...resource, related };
        rom.resourcesByAddress[resourceKey] = mergedResource;
    } else {
        rom.resourcesByAddress[resourceKey] = resource;
    }
    checkRelated(rom, resource);
}

export function createResource(baseAddress: number, type?: string, subType?: string, related: string[] = []): BaseResource {
    return { baseAddress, type, subType, related: new Set(related) };
}

export function checkRelated(rom: Rom, resource: BaseResource) {
    for (const related of resource.related) {
        const relatedResource = rom.resourcesByAddress[related];
        if (!relatedResource) {
            // Create the related resource
            rom.resourcesByAddress[related] = { baseAddress: parseInt(related, 16), related: new Set([resource.baseAddress.toString(16)]) };
        } else {
            if (!relatedResource.related.has(resource.baseAddress.toString(16))) {
                // Add the resource to the related set
                relatedResource.related.add(resource.baseAddress.toString(16));
            }
        }
    }
}

export function getResource(rom: Rom, address: number): BaseResource | undefined {
    return rom.resourcesByAddress[address.toString(16)];
}