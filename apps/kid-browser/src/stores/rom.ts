import { ref } from 'vue'
import { defineStore } from 'pinia'
import { PackedTileSheet, RawTileSheet, Resource, Rom, type RomFileDetails, type RomResources } from '@repo/kid-util'

const useRomStore = defineStore('rom', () => {
  const rom = ref<Rom|null>(null)
  const romDetails = ref<RomFileDetails|null>(null)
  const emptyResources = { tileSheets: [] }
  const romResources = ref<(RomResources)>(emptyResources)
  async function loadRom(bytes: Uint8Array) {
    const newRom = new Rom(bytes)
    romDetails.value = await newRom.getRomFileDetails()
    try {
      romResources.value = newRom.loadResources()
    } catch (e) {
      romResources.value = emptyResources
      console.error("Error loading resources", e)
    }
    rom.value = newRom
  }

  return { rom, romDetails, romResources, loadRom }
})

export default useRomStore