import { PackedTileSheet, type TileSheetResource } from "./kid-resources";
import { findPattern, hashSha256, readPtr, unpackKidFormat, type KidUnpackResults } from "./kid-utils";
import { KnownRoms, type KnowRomDetails } from "./tables/known-roms";
import { AssetPtrTableTypes, PackedTileSheet as PSheetType } from "./tables/asset-ptr-table"


export type FrameCollision = {
    left: number;
    width: number;
    top: number;
    height: number;
    isZero?: boolean;
    isInvalid?: boolean;
    address: number;
}

export type RomConfig = {
    NumberOfLevels: number;
    AssetPtrTableBase: number;
}

export const DefaultRomConfig: RomConfig = {
    NumberOfLevels: 126,
    AssetPtrTableBase: 0xa09fe
}

export type RomFileDetails = {
    size: number;
    sha256: string;
    known?: KnowRomDetails;
}

export type RomResources = {
    tileSheets: (TileSheetResource)[];
}

export class Rom {
    data: DataView;
    private _frameCollisionTable: (FrameCollision)[] = [];
    private _assetPtrTable: number[] = [];
    private _details: RomFileDetails | null = null;
    resources: RomResources = {
        tileSheets: []
    }
    private _resourcesLoaded = false;
    constructor(public bytes: Uint8Array) {
        this.data = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    }
    async getRomFileDetails(): Promise<RomFileDetails> {
        if (this._details)
            return this._details
        const size = this.bytes.length;
        const sha256 = await hashSha256(this.bytes);
        const known = KnownRoms[sha256]
        return {
            size,
            sha256,
            known
        }
    }
    readPtr(ptr: number): number {
        return readPtr(this.data, ptr);
    }
    findPattern(pattern: string): number {
        return findPattern(this.bytes, pattern);
    }

    unpackKidFormat(ptr: number): KidUnpackResults {
        return unpackKidFormat(new DataView(this.bytes.buffer, this.bytes.byteOffset + ptr, this.bytes.length - ptr));
    }

    loadResources() {
        if (this._resourcesLoaded)
            return this.resources;
        this.readAssetPtrTable();
        for (let i = 0; i < this._assetPtrTable.length; i++) {
            const ptr = this._assetPtrTable[i]!;
            const type = AssetPtrTableTypes[i];
            if (type === PSheetType) {
                this.resources.tileSheets.push(new PackedTileSheet(this, ptr));
            }
        }
        this._resourcesLoaded = true;
        try {
            console.log(this._readFrameCollisionTable());
        } catch (e) {
            console.error(e);
        }
        return this.resources;
    }

    private _getFrameCollisionFrameTable(): number {
        const pattern = "e2 40 49 f9 ?? ?? ?? ?? d8 f4 00 00"
        const ptr = this.readPtr(this.findPattern(pattern) + 4);
        console.log("FrameCollisionFrameTable", ptr.toString(16));
        return ptr;
    }

    private _readFrameCollisionTable(): (FrameCollision)[] {
        if (this._frameCollisionTable.length > 0)
            return this._frameCollisionTable;
        const ptr = this._getFrameCollisionFrameTable();
        // There is to be a limit because the original table have invalid references
        const addressLimit = ptr + 0x1390
        let firstData = Infinity;
        let pos = ptr;
        while (pos < firstData) {
            const dataPtr = this.data.getInt16(pos, false);
            const address = ptr + dataPtr;
            if (address >= addressLimit) {
                this._frameCollisionTable.push({
                    left: 0,
                    width: 0,
                    top: 0,
                    height: 0,
                    isZero: true,
                    isInvalid: true,
                    address
                });
                pos += 2;
                continue;
            }
            firstData = Math.min(firstData, address);
            const left = this.data.getInt16(address, false);
            if (left === 0) {
                this._frameCollisionTable.push({
                    left: 0,
                    width: 0,
                    top: 0,
                    height: 0,
                    isZero: true,
                    address
                });
                pos += 2;
                continue;
            }
            const width = this.data.getInt16(address + 2, false);
            const top = this.data.getInt16(address + 4, false);
            const height = this.data.getInt16(address + 6, false);
            this._frameCollisionTable.push({
                left,
                width,
                top,
                height,
                address
            });
            pos += 2;
        }
        return this._frameCollisionTable;
    }
    /** Read all the pointers of the Asset Point Table
     * The AssetPtrTable is a table of pointers to various asset types like 
     * color palletes, 
     * sprite frames and player sprite frames
     */
    readAssetPtrTable(): number[] {
        if (this._assetPtrTable.length > 0)
            return this._assetPtrTable;
        //const AssetPtrTableStart = 0xa09fe;
        //const AssetPtrTableEnd = 0xa1c72;
        // Find the pattern that points to the AssetPtrTable looking in a function that draws a sprite
        const drawSpritePattern = findPattern(this.bytes, "67 00 00 dc 49 f9 ?? ?? ?? ?? 3e 2b 00 22") + 6;
        const AssetPtrTableStart = this.readPtr(drawSpritePattern);
        const AssetPtrTableEnd = AssetPtrTableStart + 0x49D * 4;
        for (let ptr = AssetPtrTableStart; ptr < AssetPtrTableEnd; ptr += 4) {
            this._assetPtrTable.push(this.readPtr(ptr));
        }
        return this._assetPtrTable;
    }
}