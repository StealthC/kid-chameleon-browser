import PQueue from 'p-queue'
import { Rom } from './kid-rom'
import { ExecuteInNextTick } from './kid-utils'
import { findFunctionsAndTrunks, type knownFunctions } from './discovery/functions'
import { findAllKnownAddresses, ImportantValues, type KnownAddresses } from './discovery/addresses'
import { findAllResouces } from './discovery/resources'
export { ImportantValues, type KnownAddresses } from './discovery/addresses'

export type KidDiscoveryFunction = (kd: KidDiscovery) => void | Promise<void>

export class KidDiscovery {
  knownFunctions: knownFunctions = new Map()
  knownAddresses: KnownAddresses = new Map()

  private preFunctions: KidDiscoveryFunction[] = []
  private postFunctions: KidDiscoveryFunction[] = []
  constructor(public rom: Rom) {}

  log(...args: unknown[]) {
    console.log('[KidDiscovery]', ...args)
  }

  private async runPreFunctions() {
    const queue = new PQueue({ concurrency: 4 })
    for (const fn of this.preFunctions) {
      await queue.add(ExecuteInNextTick.bind(null, fn.bind(null, this)))
    }
    await queue.onIdle()
  }

  private async runPostFunctions() {
    const queue = new PQueue({ concurrency: 4 })
    for (const fn of this.postFunctions) {
      await queue.add(ExecuteInNextTick.bind(null, fn.bind(null, this)))
    }
    await queue.onIdle()
  }

  addFunction(fn: KidDiscoveryFunction, position: 'pre' | 'post' = 'post') {
    switch (position) {
      case 'pre':
        this.preFunctions.push(fn)
        break
      default:
        this.postFunctions.push(fn)
    }
  }

  async run() {
    this.log('Starting resource discovery...')
    const startTime = Date.now()

    await this.runPreFunctions()

    await findFunctionsAndTrunks(this)
    await findAllKnownAddresses(this)
    await findAllResouces(this)

    await this.runPostFunctions()
    this.log(
      'Resource Discovery ended, took',
      Date.now() - startTime,
      'ms and found',
      this.rom.resources.resources.size,
      'resources',
    )
  }
}

export type AddressDescription = {
  name: string
  addressInJUE: number
  type: 'table' | 'function' | 'value' | 'data' | 'other'
  description: string
}

export const KnownAddressesDescriptions: Partial<
  Record<(typeof ImportantValues)[number], AddressDescription>
> = {
  assetTable: {
    name: 'Asset Table',
    addressInJUE: 0xa09fe,
    type: 'table',
    description: 'Table of pointers to sprite assets used ingame',
  },
  collisionWordTable: {
    name: 'Collision Frame Table',
    addressInJUE: 0x30bf4,
    type: 'table',
    description: 'Table of word offsets to collision frames for sprites in Asset Table',
  },
  levelIndexesTable: {
    name: 'Level Indexes Table',
    addressInJUE: 0x4043e,
    type: 'table',
    description: "Table of byte offsets to Level Word Table's levels in order of gameplay",
  },
  levelWordTable: {
    name: 'Level Word Table',
    addressInJUE: 0x40342,
    type: 'table',
    description: 'Table of word offsets to level headers',
  },
  levelWordTableBase: {
    name: 'Level Word Table Base',
    addressInJUE: 0x4033a,
    type: 'value',
    description: 'Base address for Level Word Table offsets',
  },
  platformWordTable: {
    name: 'Platforms Word Table',
    addressInJUE: 0x43a6,
    type: 'table',
    description: 'Table of word offsets to platforms layouts',
  },
  platformWordTableBase: {
    name: 'Platforms Word Table Base',
    addressInJUE: 0x2bb6,
    type: 'value',
    description: 'Base address for Platforms Word Table offsets',
  },
  levelMiscPtrTable: {
    name: 'Level Misc Pointer Table',
    addressInJUE: 0x7b018,
    type: 'table',
    description: 'Table of pointers to level misc data (Mostly GFX related)',
  },
  themeBlocksPtrTable: {
    name: 'Theme Blocks Pointer Table',
    addressInJUE: 0x7b104,
    type: 'table',
    description: 'Table of pointers to theme blocks data',
  },
  themeBackgroundPtrTable: {
    name: 'Theme Background Pointer Table',
    addressInJUE: 0x7b130,
    type: 'table',
    description: 'Table of pointers to theme background data',
  },
  themeTileMappingsPtrTable: {
    name: 'Theme Tile Mappings Pointer Table',
    addressInJUE: 0x7b168,
    type: 'table',
    description: 'Table of pointers to theme tile mappings data',
  },
  commonBlocksMappingsWordTable: {
    name: 'Common Blocks Mappings Word Table',
    addressInJUE: 0x7b8dc,
    type: 'table',
    description: 'Table of word offsets to common blocks mappings data',
  },
  themePaletteWordTable: {
    name: 'Theme Palette Word Table',
    addressInJUE: 0x7b194,
    type: 'table',
    description: 'Table of word offsets to theme palette data',
  },
  themeBackgroundPaletteWordTable: {
    name: 'Theme Background Palette Word Table',
    addressInJUE: 0x7b1aa,
    type: 'table',
    description: 'Table of word offsets to theme background palette data',
  },
  themeTileCollisionPtrTable: {
    name: 'Theme Tile Collision Pointer Table',
    addressInJUE: 0x7b1c0,
    type: 'table',
    description: 'Table of pointers to theme tile collision data',
  },
  themeBackgroundPlanePtrTable: {
    name: 'Theme Background Plane Pointer Table',
    addressInJUE: 0x7b3e4,
    type: 'table',
    description: 'Table of pointers to theme background plane data',
  },
  backgroundScrollingPtrTable: {
    name: 'Background Scrolling Pointer Table',
    addressInJUE: 0x7b1ec,
    type: 'table',
    description: 'Table of pointers to background scrolling data',
  },
  themeTitleScreenGFXPtrTable: {
    name: 'Theme Title Screen GFX Pointer Table',
    addressInJUE: 0x19a7c,
    type: 'table',
    description: 'Start of theme title screen graphics pointer table',
  },
  numberOfThemes: {
    name: 'Number of Themes',
    addressInJUE: 10,
    type: 'value',
    description: 'Number of themes in the game',
  },
  numberOfLevels: {
    name: 'Number of Levels',
    addressInJUE: 106,
    type: 'value',
    description: 'Number of levels in the game',
  },
}
