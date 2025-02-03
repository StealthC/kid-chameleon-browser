import { ref } from 'vue'
import { defineStore } from 'pinia'
import { Rom, type RomFileDetails, type RomResources } from '@repo/kid-util'
import { executeNextTick } from '@/utils'
import type { KnownAddresses } from '@repo/kid-util'

const useRomStore = defineStore('rom', () => {
  const rom = ref<Rom | null>(null)
  const romDetails = ref<RomFileDetails | null>(null)
  const romResources = ref<RomResources | null>(null)
  const romKnownAddresses = ref<KnownAddresses | null>(null)
  async function loadRom(bytes: Uint8Array) {
    const newRom = new Rom(bytes)
    executeNextTick(async () => {
      romDetails.value = await newRom.getRomFileDetails()
    })
    executeNextTick(async () => {
      try {
        romResources.value = newRom.loadResources()
        romKnownAddresses.value = newRom.knownAddresses
      } catch (e) {
        romResources.value = { spriteFrames: [], tileSheets: [] }
        romKnownAddresses.value = {}
        console.error('Error loading resources', e)
      }
    })
    rom.value = newRom
  }

  return { rom, romDetails, romResources, romKnownAddresses, loadRom }
})

export default useRomStore
