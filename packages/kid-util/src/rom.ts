import { addResource, checkRelated, createResource, loadResource, type BaseResource, type LinkedSpriteFrameResource, type LoadedResource, type SheetResource, type SpriteFrameResource, type UnlinkedSpriteFrameResource } from "./kid-resources";
import { readPtr } from "./kid-utils";
import { KnownRoms, type KnowRomDetails } from "./tables/known-roms";
import { AssetPtrTableTypes, PackedTileSheet as PackedTileSheetType, SpriteFrameType, SpriteFrameWithDataType as PlayerSpriteFrameType } from "./tables/asset-ptr-table"
import { PatternFinder } from "./pattern-search";
import { sha256, mdCrc } from "./hash";
import { unpackKidFormat, type KidUnpackResults } from "./unpack-kid";
import { findFrameCollisionFrameTable, tryFindingAllKnownAddresses, type KnownAddresses } from "./rom-discovery";


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

export type MdCartHeader = {
    consoleName: string;
    releaseDate: string;
    domesticName: string
    internationalName: string;
    version: string;
    checksum: number;
    calculatedChecksum?: number;
    ioSupport: string;
    romStart: number;
    romEnd: number;
    ramStart: number;
    ramEnd: number;
    memo: string;
    region: string;
}

export type RomFileDetails = {
    size: number;
    sha256: string;
    header: MdCartHeader;
    known?: KnowRomDetails;
}

export type RomResources = {
    spriteFrames: (SpriteFrameResource)[];
    tileSheets: (SheetResource)[];
}

export class Rom {
    data: DataView;
    resourcesByAddress: Record<string, BaseResource> = {};
    knownAddresses: KnownAddresses = {};
    private _frameCollisionTable: (FrameCollision)[] = [];
    private _assetPtrTable: number[] = [];
    private _details: RomFileDetails | null = null;
    resources: RomResources = {
        spriteFrames: [],
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
        const hash = await sha256(this.bytes);
        const header = this.readMdCartHeader();
        const known = KnownRoms[hash]
        return {
            size,
            sha256: hash,
            header,
            known
        }
    }

    private readStringChars(ptr: number, length: number): string {
        return String.fromCharCode(...this.bytes.subarray(ptr, ptr + length));
    }

    readMdCartHeader(calculateChecksum = true): MdCartHeader {
        const headerStart = 0x100
        const consoleName = this.readStringChars(headerStart + 0x00, 0x10);
        const releaseDate = this.readStringChars(headerStart + 0x10, 0x10);
        const domesticName = this.readStringChars(headerStart + 0x20, 0x30);
        const internationalName = this.readStringChars(headerStart + 0x50, 0x30);
        const version = this.readStringChars(headerStart + 0x80, 0xe);
        const checksum = this.data.getUint16(headerStart + 0x8e, false);
        const ioSupport = this.readStringChars(headerStart + 0x90 , 0x10);
        const romStart = this.data.getUint32(headerStart + 0xa0, false);
        const romEnd = this.data.getUint32(headerStart + 0xa4, false);
        const ramStart = this.data.getUint32(headerStart + 0xa8, false);
        const ramEnd = this.data.getUint32(headerStart + 0xac, false);
        const memo = this.readStringChars(headerStart + 0xc0, 0x30);
        const region = this.readStringChars(headerStart + 0xf0, 0x10);
        let calculatedChecksum: number | undefined;
        if (calculateChecksum) {
            calculatedChecksum = mdCrc(this.bytes);
        }
        return {
            consoleName,
            releaseDate,
            domesticName,
            internationalName,
            version,
            checksum,
            calculatedChecksum,
            ioSupport,
            romStart,
            romEnd,
            ramStart,
            ramEnd,
            memo,
            region
        }
    }

    readPtr(ptr: number): number {
        return readPtr(this.data, ptr);
    }

    findPattern(pattern: string): number {
        const patternFinder = new PatternFinder(pattern, this.bytes);
        const pos = patternFinder.findNext();
        if (pos === -1) {
            throw new Error(`Pattern ${pattern} not found`);
        }
        return pos
    }

    unpackKidFormat(ptr: number): KidUnpackResults {
        return unpackKidFormat(new DataView(this.bytes.buffer, this.bytes.byteOffset + ptr, this.bytes.length - ptr));
    }

    loadResources() {
        if (this._resourcesLoaded)
            return this.resources;
        tryFindingAllKnownAddresses(this);
        this.readAssetPtrTable();
        for (let i = 0; i < this._assetPtrTable.length; i++) {
            const ptr = this._assetPtrTable[i]!;
            const type = AssetPtrTableTypes[i];
            if (type === PackedTileSheetType) {
                const resource = this.createResource(ptr, "sheet");
                resource.packed = {pack: "kid"};
                resource.tableIndex = i;
                this.addResource(resource);
            } else if (type === SpriteFrameType) {
                const resource = this.createResource(ptr, "sprite-frame", "unlinked");
                resource.tableIndex = i;
                this.addResource(resource);
            } else if (type === PlayerSpriteFrameType) {
                const resource = this.createResource(ptr, "sprite-frame", "linked");
                resource.tableIndex = i;
                this.addResource(resource);
            } else if (type) {
                console.error(`Unknown AssetPtrTable type ${type.toString()} at index ${i.toString(10)}`);
            }
        }
        this._resourcesLoaded = true;
        try {
            this._readFrameCollisionTable();
            this._findUntabledPackedTileSheetsDirect1().map((result) => {
                const resource = this.createResource(result.ptr, "sheet");
                resource.packed = {pack: "kid"};
                this.addResource(resource);
            });
            this._findUntabledPackedTileSheetsDirect2().map((result) => {
                const resource = this.createResource(result.ptr, "sheet");
                resource.packed = {pack: "kid"};
                this.addResource(resource);
            });
            this._findUntabledPackedTileSheetsRelative1().map((result) => {
                const resource = this.createResource(result.ptr, "sheet");
                resource.packed = {pack: "kid"};
                this.addResource(resource);
            });
            this._findUntabledPackedTileSheetsRelative2().map((result) => {
                const resource = this.createResource(result.ptr, "sheet");
                resource.packed = {pack: "kid"};
                this.addResource(resource);
            });
            this._findUntabledPackedTileSheetsWithPaletteSwap1().map((result) => {
                const resource = this.createResource(result.ptr, "sheet");
                resource.packed = {pack: "kid"};
                this.addResource(resource);
            });
            this._findUntabledPackedTileSheetsWithPaletteSwap2().map((result) => {
                const resource = this.createResource(result.ptr, "sheet");
                resource.packed = {pack: "kid"};
                this.addResource(resource);
            });
        } catch (e) {
            console.error(e);
        }
        for (const resource of Object.values(this.resourcesByAddress)) {
            if (resource.type) {
                this.loadResource(resource);
            }
            if (resource.type === "sheet") {
                this.resources.tileSheets.push(resource as SheetResource);
            } else if (resource.type === "sprite-frame") {
                this.resources.spriteFrames.push(resource as SpriteFrameResource);
            }
        }
        return this.resources;
    }

    private _readFrameCollisionTable(): (FrameCollision)[] {
        if (this._frameCollisionTable.length > 0)
            return this._frameCollisionTable;
        const ptr = findFrameCollisionFrameTable(this);
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

    createResource(baseAddress: number, type?: string, subType?: string, related: string[] = []): BaseResource {
        return createResource(baseAddress, type, subType, related);
    }

    addResource(resource: BaseResource) {
        addResource(this, resource);
    }

    checkRelated(resource: BaseResource) {
        checkRelated(this, resource);
    }

    loadResource<T extends BaseResource>(resource: T): LoadedResource<T> {
        return loadResource(this, resource);
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
        const drawSpritePattern = this.findPattern("67 00 00 dc 49 f9 ?? ?? ?? ?? 3e 2b 00 22") + 6;
        const AssetPtrTableStart = this.readPtr(drawSpritePattern);
        const AssetPtrTableEnd = AssetPtrTableStart + 0x49D * 4;
        for (let ptr = AssetPtrTableStart; ptr < AssetPtrTableEnd; ptr += 4) {
            this._assetPtrTable.push(this.readPtr(ptr));
        }
        return this._assetPtrTable;
    }

    private _findUntabledPackedTileSheetsDirect1() {
        /**
         *         
         * 0001d188 30  3c  7b       move.w              #0x7ba0 ,D0w
         *          a0
         * 0001d18c 41  f9  00       lea                 (BYTE_ARRAY_0002d51b ).l,A0
         *          02  d5  1b
         * 0001d192 4e  b9  00       jsr                 UnpackGfx .l
         *          01  19  38
         * 
         */
        const pattern = "30 3c ?? ?? 41 f9 ?? ?? ?? ?? 4e b9 ?? ?? ?? ??"; // Calls to UnpackGfx 
        const patternFinder = new PatternFinder(pattern, this.bytes);
        const matchs = patternFinder.findAll();
        const results = matchs.map((pos) => {
            const tile = this.data.getUint16(pos + 2, false);
            const ptr = this.readPtr(pos + 6);
            return { pos, tile, ptr }
        })
        return results;
    }

    private _findUntabledPackedTileSheetsDirect2() {
        /**
         *         
         * 0001b58a 30  3c  9a       move.w              #-0x65a0 ,D0w
         *          60
         * 0001b58e 20  7c  00       movea.l             #KidTitleTextPackedGFX ,A0
         *          02  49  85
         * 0001b594 4e  b9  00       jsr                 UnpackGfx .l
         *          01  19  38
         * 
         */
        const pattern = "30 3c ?? ?? 20 7C ?? ?? ?? ?? 4e b9 ?? ?? ?? ??"; // Calls to UnpackGfx 
        const patternFinder = new PatternFinder(pattern, this.bytes);
        const matchs = patternFinder.findAll();
        const results = matchs.map((pos) => {
            const tile = this.data.getUint16(pos + 2, false);
            const ptr = this.readPtr(pos + 6);
            return { pos, tile, ptr }
        })
        return results;
    }

    private _findUntabledPackedTileSheetsRelative1() {
        /**
         * 
         * 
         * 0001d15e 30  3c  27       move.w              #0x27c0 ,D0w
         *          c0
         * 0001d162 41  fa  2a       lea                 (0x2abc ,PC )=> EndingBossScreenPackedGFX ,A0
         *          bc
         * 0001d166 4e  b9  00       jsr                 UnpackGfx .l
         *          01  19  38
         * 
        */
        const pattern = "30 3c ?? ?? 41 fa ?? ?? 4e b9 ?? ?? ?? ??"; // Calls to UnpackGfx 
        const patternFinder = new PatternFinder(pattern, this.bytes);
        const matchs = patternFinder.findAll();
        const results = matchs.map((pos) => {
            const tile = this.data.getUint16(pos + 2, false);
            const rel = this.data.getInt16(pos + 6, false);
            const ptr = pos + 6 + rel;
            return { pos, rel, tile, ptr }
        })
        return results;
    }

    private _findUntabledPackedTileSheetsRelative2() {
        /**
         * 
         * 00012de0 30  3c  17       move.w              #0x1780 ,D0w
         *          80
         * 00012de4 41  fa  01       lea                 (0x14a ,PC )=> PackedGFXSegaLogo ,A0
         *          4a
         * 00012de8 61  00  15       bsr.w               UnpackGfx
         *          10
         * 
        */
        const pattern = "30 3c ?? ?? 41 fa ?? ?? 61 00 ?? ?? ?? ??"; // Calls to UnpackGfx 
        const patternFinder = new PatternFinder(pattern, this.bytes);
        const matchs = patternFinder.findAll();
        const results = matchs.map((pos) => {
            const tile = this.data.getUint16(pos + 2, false);
            const rel = this.data.getInt16(pos + 6, false);
            const ptr = pos + 6 + rel;
            return { pos, rel, tile, ptr }
        })
        return results;
    }

    private _findUntabledPackedTileSheetsWithPaletteSwap1() {
        /**
         * 
         * 0001d0ec 30  3c  17       move.w              #0x1780 ,D0w
         *          80
         * 0001d0f0 20  78  71       movea.l             (-> HologramBackgroundPackedGFX ).w,A0 => Hologra  = 0000c65a
         *          86
         * 0001d0f4 47  fa  00       lea                 (0x22 ,PC )=> EndingHologramBackgroundPaletteMap
         *          22
         * 0001d0f8 4e  b9  00       jsr                 UnpackGFXWithPaletteMap .l
         *          01  19  40
         * 
        */
        const pattern = "30 3c ?? ?? 20 78 ?? ?? 47 fa ?? ?? 4e b9 ?? ?? ?? ??"; // Calls to UnpackGFXWithPaletteMap 
        const patternFinder = new PatternFinder(pattern, this.bytes);
        const matchs = patternFinder.findAll();
        const results = matchs.map((pos) => {
            const tile = this.data.getUint16(pos + 2, false);
            const ptr = this.readPtr(this.data.getInt16(pos + 6, false));
            const palRel = this.data.getInt16(pos + 10, false);
            const palPtr = pos + 10 + palRel;
            return { pos, palRel, palPtr, tile, ptr }
        })
        return results;
    }

    private _findUntabledPackedTileSheetsWithPaletteSwap2() {
        /**
         * 
         * 0001b128 30  3c  fa       move.w              #-0x5a0 ,D0w
         *          60
         * 0001b12c 41  fa  29       lea                 (0x2958 ,PC )=> TitleTextPackedGFX ,A0
         *          58
         * 0001b130 47  fa  12       lea                 (0x12be ,PC )=> TitleTextAlternatePaletteMapping
         *          be
         * 0001b134 4e  b9  00       jsr                 UnpackGFXWithPaletteMap .l
         *          01  19  40
         * 
         * 
        */
        const pattern = "30 3c ?? ?? 41 fa ?? ?? 47 fa ?? ?? 4e b9 ?? ?? ?? ??"; // Calls to UnpackGFXWithPaletteMap 
        const patternFinder = new PatternFinder(pattern, this.bytes);
        const matchs = patternFinder.findAll();
        const results = matchs.map((pos) => {
            const tile = this.data.getUint16(pos + 2, false);
            const rel = this.data.getInt16(pos + 6, false);
            const ptr = pos + 6 + rel;
            const palRel = this.data.getInt16(pos + 10, false);
            const palPtr = pos + 10 + palRel;
            return { pos, palRel, palPtr, tile, ptr }
        })
        return results;
    }
}