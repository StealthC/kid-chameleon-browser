import { ref, watch, watchEffect } from 'vue'
import { defineStore } from 'pinia'
import { Rom, type RomFileDetails } from '@repo/kid-util'
import localforage from 'localforage'
import { useRouter } from 'vue-router'

const useRomStore = defineStore('romStore', () => {
  const rom = ref<Rom | null>(null)
  const romDetails = ref<RomFileDetails | null>(null)
  const romLoading = ref<boolean>(false)
  const romFullLoaded = ref<boolean>(false)
  const router = useRouter()
  async function loadRomFromStorage() {
    const romBytes = await localforage.getItem<Uint8Array>('rom')
    if (romBytes) {
      await _loadRom(romBytes)
    }
  }
  function _loadRom(bytes: Uint8Array) {
    romLoading.value = true
    rom.value = new Rom(bytes)
  }

  function unloadRom() {
    rom.value = null
    romDetails.value = null
    romFullLoaded.value = false
    romLoading.value = false
    localforage.removeItem('rom')
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
      Promise.all([
        rom.value.loadResources(),
        rom.value.getRomFileDetails().then((details) => {
          romDetails.value = details
        }),
      ]).then(() => {
        romFullLoaded.value = true
        romLoading.value = false
        if (router.currentRoute.value.name === 'home') {
          router.push('/rom')
        }
      })
    }
  })
  return { rom, romDetails, romFullLoaded, romLoading, loadRom, unloadRom }
})

export default useRomStore
