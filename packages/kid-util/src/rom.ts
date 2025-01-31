import { hashSha256, readPtr } from "./smd-bin-utils";
import { KnownRoms, type KnowRomDetails } from "./tables/known-roms";

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

export class Rom {
    data: DataView;
    assetPtrTable: number[] = [];
    private _details: RomFileDetails | null = null;
    constructor(public bytes: Uint8Array) {
        this.data = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
        //this._readAssetPtrTable();
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

    /** Read all the pointers of the Asset Point Table
     * The AssetPtrTable is a table of pointers to various asset types like 
     * color palletes, 
     * sprite frames and player sprite frames
     */
    private _readAssetPtrTable() {
        const AssetPtrTableStart = 0xa09fe;
        const AssetPtrTableEnd = 0xa1c72;
        for (let ptr = AssetPtrTableStart; ptr < AssetPtrTableEnd; ptr += 4) {
            this.assetPtrTable.push(this.readPtr(ptr));
        }
    }
}