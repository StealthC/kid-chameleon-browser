import PQueue from 'p-queue'
import type { KidDiscovery, KidDiscoveryFunction } from '~/kid-discovery'
import { ExecuteInNextTick } from '~/kid-utils'

//
//
// FUNCTION DISCOVERY
//
//

export const ImportantFunctions = [
  'unpackGFX',
  'unpackEnigma',
  'unpackKid',
  'unpackGFXWithPalette',
  'UnpackGFXWithPlane',
] as const

type functionData = { address: number; trunks: Set<number> }
export type knownFunctions = Map<(typeof ImportantFunctions)[number], functionData>

const KnownFunctionsDiscoveryFn: Record<(typeof ImportantFunctions)[number], KidDiscoveryFunction> =
  {
    unpackGFX: findUnpackGFXFunction,
    unpackGFXWithPalette: findUnpackGFXWithPaletteMapFunction,
    UnpackGFXWithPlane: findUnpackGFXWithPlaneFunction,
    unpackEnigma: findEnigmaUnpackFunction,
    unpackKid: findUnpackKidFunction,
  }

export async function findFunctionsAndTrunks(kd: KidDiscovery) {
  kd.log('Trying to find functions...')
  const queue = new PQueue({ concurrency: 4 })
  const fns = Object.values(KnownFunctionsDiscoveryFn)
  for (const fn of fns) {
    await queue.add(ExecuteInNextTick.bind(null, fn.bind(null, kd)))
  }
  await queue.onIdle()
  kd.log('Found', kd.knownFunctions.size, 'functions')
  findFunctionsTrunks(kd)
}

function findFunctionsTrunks(kd: KidDiscovery) {
  kd.log('Finding trunks for all discovered functions...')
  const pattern = '4e fa ?? ??' // jmp (offset after pattern)
  const finder = kd.rom.createPatternFinder(pattern)
  const allJumps = finder.findAll()
  kd.log('Found', allJumps.length, 'jumps')
  let trunks = 0
  for (const jmp of allJumps) {
    const PC = jmp + 2
    const offset = kd.rom.data.getInt16(jmp + 2, false)
    const target = PC + offset

    for (const value of kd.knownFunctions.values()) {
      if (target === value.address) {
        trunks++
        value.trunks.add(jmp)
      }
    }
  }
  kd.log('Found', trunks, 'trunks')
}

function findUnpackGFXFunction(kd: KidDiscovery) {
  const pattern = '61 ?? 70 ff 26 40 28 4a'
  const address = kd.rom.findPattern(pattern)
  kd.knownFunctions.set('unpackGFX', { address, trunks: new Set() })
}

function findUnpackGFXWithPlaneFunction(kd: KidDiscovery) {
  const pattern = '2f 09 61 ?? 49 f9 ff ff 02 80 76 00 78 00 1a 33 30 00'
  const address = kd.rom.findPattern(pattern)
  kd.knownFunctions.set('UnpackGFXWithPlane', { address, trunks: new Set() })
}

function findUnpackGFXWithPaletteMapFunction(kd: KidDiscovery) {
  const pattern = '61 ?? ?? ?? 49 f9 ff ff 02 80 76 00 78 00 1a 33 30 00'
  const address = kd.rom.findPattern(pattern)
  kd.knownFunctions.set('unpackGFXWithPalette', { address, trunks: new Set() })
}

function findEnigmaUnpackFunction(kd: KidDiscovery) {
  const pattern = '48 e7 ff 7c 36 40 10 18 48 80 3a 40 18 18 e7 0c 34 58'
  const address = kd.rom.findPattern(pattern)
  kd.knownFunctions.set('unpackEnigma', { address, trunks: new Set() })
}

function findUnpackKidFunction(kd: KidDiscovery) {
  const pattern = '70 00 38 3c 07 ff 7a 00 7c 00 3e 0b 53 42 67 00 03 90'
  const address = kd.rom.findPattern(pattern)
  kd.knownFunctions.set('unpackKid', { address, trunks: new Set() })
}
