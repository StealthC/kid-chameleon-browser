import { ref, watchEffect } from 'vue'
import { defineStore } from 'pinia'
import { Rom, type RomFileDetails } from '@repo/kid-util'
import type { KnownAddresses } from '@repo/kid-util'
import localforage from 'localforage'

const useRomStore = defineStore('rom', () => {
  const rom = ref<Rom | null>(null)
  const romDetails = ref<RomFileDetails | null>(null)
  const romKnownAddresses = ref<KnownAddresses | null>(null)
  async function loadRomFromStorage() {
    const romBytes = await localforage.getItem<Uint8Array>('rom')
    if (romBytes) {
      await _loadRom(romBytes)
    }
  }
  function _loadRom(bytes: Uint8Array) {
    const newRom = new Rom(bytes)
    rom.value = newRom
    romKnownAddresses.value = newRom.discovery.knownAddresses
    rom.value.loadResources()
    newRom.getRomFileDetails().then((details) => {
      romDetails.value = details
    })
  }
  async function loadRom(bytes: Uint8Array) {
    _loadRom(bytes)
    await localforage.setItem('rom', bytes)
  }
  watchEffect(() => {
    if (!rom.value) {
      loadRomFromStorage()
    }
  })
  return { rom, romDetails, romKnownAddresses, loadRom }
})

export default useRomStore
