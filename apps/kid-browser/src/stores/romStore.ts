import { ref, watch, watchEffect } from 'vue'
import { defineStore } from 'pinia'
import { Rom, type RomFileDetails } from '@repo/kid-util'
import localforage from 'localforage'

const useRomStore = defineStore('romStore', () => {
  const rom = ref<Rom | null>(null)
  const romDetails = ref<RomFileDetails | null>(null)
  async function loadRomFromStorage() {
    const romBytes = await localforage.getItem<Uint8Array>('rom')
    if (romBytes) {
      await _loadRom(romBytes)
    }
  }
  function _loadRom(bytes: Uint8Array) {
    rom.value = new Rom(bytes)
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
  watch(rom, () => {
    if (rom.value) {
      rom.value.loadResources()
      rom.value.getRomFileDetails().then((details) => {
        romDetails.value = details
      })
    }
  })
  return { rom, romDetails, loadRom }
})

export default useRomStore
