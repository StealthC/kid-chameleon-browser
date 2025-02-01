import { ref } from 'vue'
import { defineStore } from 'pinia'
import { Rom, type RomFileDetails, type RomResources } from '@repo/kid-util'

const useRomStore = defineStore('rom', () => {
  const rom = ref<Rom | null>(null)
  const romDetails = ref<RomFileDetails|null>(null)
  const romResources = ref<(RomResources|null)>(null)
  async function loadRom(bytes: Uint8Array) {
    const newRom = new Rom(bytes)

    setTimeout(async () => {
      romDetails.value = await newRom.getRomFileDetails()
    }, 0);
    setTimeout(async () => {
      try {
        romResources.value = newRom.loadResources()
      } catch (e) {
        romResources.value = { spriteFrames: [], tileSheets: [] }
        console.error("Error loading resources", e)
      }
    }, 0);

    rom.value = newRom
  }

  return { rom, romDetails, romResources, loadRom }
})

export default useRomStore
