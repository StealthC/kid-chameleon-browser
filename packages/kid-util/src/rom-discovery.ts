import type { Rom } from "./rom";

export type KnownAddresses = {
    assetTable?: number;
    collisionFrameTable?: number;
    unpackGFXFunction?: number;
    levelIndexesTable?: number;
    levelWordTable?: number;
    levelWordTableBase?: number;
    mapHeaderIndex?: number;
    platformIndex?: number;
    bgScrollIndex?: number;
}

export function findFrameCollisionFrameTable(rom: Rom): number {
    if (rom.knownAddresses.collisionFrameTable) {
        return rom.knownAddresses.collisionFrameTable;
    }
    const pattern = "e2 40 49 f9 ?? ?? ?? ?? d8 f4 00 00"
    const ptr = rom.readPtr(rom.findPattern(pattern) + 4);
    rom.knownAddresses.collisionFrameTable = ptr;
    return ptr;
}

/** Find Asset Table (original JUE is $a09fe) */
export function findAssetTable(rom: Rom): number {
    if (rom.knownAddresses.assetTable) {
        return rom.knownAddresses.assetTable;
    }
    const pattern = "67 00 00 dc 49 f9 ?? ?? ?? ?? 3e 2b 00 22"
    const ptr = rom.readPtr(rom.findPattern(pattern) + 6);
    rom.knownAddresses.assetTable = ptr;
    return ptr;
}

export function findUnpackGFXFunction(rom: Rom): number {
    if (rom.knownAddresses.unpackGFXFunction) {
        return rom.knownAddresses.unpackGFXFunction;
    }
    const pattern = "61 d0 70 ff 26 40 28 4a"
    const ptr = rom.findPattern(pattern);
    rom.knownAddresses.unpackGFXFunction = ptr;
    return ptr;
}

export function findMultipleLevelAddresses(rom: Rom) {
    if (rom.knownAddresses.levelIndexesTable && rom.knownAddresses.levelWordTable && rom.knownAddresses.levelWordTableBase) {
        return {
            levelIndexesTable: rom.knownAddresses.levelIndexesTable,
            levelWordTable: rom.knownAddresses.levelWordTable,
            levelWordTableBase: rom.knownAddresses.levelWordTableBase
        }
    }
    /**
     *  00011a36  20  79  00       movea.l             (-> LevelIndexesTable ).l,A0                      = 0004043e
     *            04  03  3e
     *   00011a3c 10  30  00       move.b              (0x0 ,A0 ,D0w *0x1 )=> -> LevelWord00 ,D0b            = 4Ah
     *            00
     *   00011a40 48  80           ext.w               D0w
     *   00011a42 20  7c  00       movea.l             #LevelWordTable ,A0                              = 38Ch
     *            04  03  42
     *   00011a48 d0  40           add.w               D0w ,D0w
     *   00011a4a 30  30  00       move.w              (0x0 ,A0 ,D0w *0x1 )=> LevelWordTable ,D0w           = 38Ch
     *            00
     *   00011a4e 20  7c  00       movea.l             #StartingLevelIndex ,A0
     *            04  03  3a
     *   00011a54 d0  c0           adda.w              D0w ,A0
     * 
     */
    const pattern = "20 79 ?? ?? ?? ?? 10 30 00 00 48 80 20 7c ?? ?? ?? ?? d0 40 30 30 00 00 20 7c ?? ?? ?? ?? d0 c0"
    const ptr = rom.findPattern(pattern);
    const levelIndexesTable = rom.readPtr(rom.readPtr(ptr + 2));
    const levelWordTable = rom.readPtr(ptr + 14);
    const levelWordTableBase = rom.readPtr(ptr + 26);
    rom.knownAddresses.levelIndexesTable = levelIndexesTable;
    rom.knownAddresses.levelWordTable = levelWordTable;
    rom.knownAddresses.levelWordTableBase = levelWordTableBase;
    return { levelIndexesTable, levelWordTable, levelWordTableBase };
}

export function tryFindingAllKnownAddresses(rom: Rom): KnownAddresses {
    const functions = [
        findAssetTable,
        findFrameCollisionFrameTable,
        findMultipleLevelAddresses,
        findUnpackGFXFunction
    ]
    for (const fn of functions) {
        try {
            fn(rom);
        } catch (e) {
            console.error(`Error finding known address: ${fn.name} (${e as string})`);
        }
    }
    return rom.knownAddresses;
}
