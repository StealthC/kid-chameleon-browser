import { PackedTileSheet, type TileSheetResource } from "./kid-resources";
import { hashSha256, readPtr, unpackKidFormat, type KidUnpackResults } from "./kid-utils";
import { KnownRoms, type KnowRomDetails } from "./tables/known-roms";
import { AssetPtrTableTypes, PackedTileSheet as PSheetType } from "./tables/asset-ptr-table"


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
        return this.resources;
    }

    /** Read all the pointers of the Asset Point Table
     * The AssetPtrTable is a table of pointers to various asset types like 
     * color palletes, 
     * sprite frames and player sprite frames
     */
    readAssetPtrTable(): number[] {
        if (this._assetPtrTable.length > 0)
            return this._assetPtrTable;
        const AssetPtrTableStart = 0xa09fe;
        const AssetPtrTableEnd = 0xa1c72;
        for (let ptr = AssetPtrTableStart; ptr < AssetPtrTableEnd; ptr += 4) {
            this._assetPtrTable.push(this.readPtr(ptr));
        }
        return this._assetPtrTable;
    }
}