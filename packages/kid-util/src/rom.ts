import {ReadPtr} from "./smd-bin-utils";

export type RomConfig = {
    NumberOfLevels: number;
    AssetPtrTableBase: number;
}

export const DefaultRomConfig: RomConfig = {
    NumberOfLevels: 126,
    AssetPtrTableBase: 0xa09fe
}


export class Rom {
    data: DataView;
    assetPtrTable: number[] = [];
    constructor(public bytes: Uint8Array) {
        this.data = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
        this._readAssetPtrTable();
    }
    readPtr(ptr: number): number {
        return ReadPtr(this.data, ptr);
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