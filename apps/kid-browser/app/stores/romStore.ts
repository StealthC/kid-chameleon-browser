import { ref, watch, watchEffect } from 'vue'
import { defineStore } from 'pinia'
import { Rom, type RomFileDetails } from '@repo/kid-util'

const useRomStore = defineStore('romStore', () => {
  const rom = ref<Rom | null>(null)
  const romDetails = ref<RomFileDetails | null>(null)
  const romLoading = ref<boolean>(false)
  const romFullLoaded = ref<boolean>(false)
  const router = useRouter()

  async function loadRomFromStorage() {
    if (!import.meta.client) return
    const localforage = (await import('localforage')).default
    const romBytes = await localforage.getItem<Uint8Array>('rom')
    if (romBytes) {
      _loadRom(romBytes)
    }
  }

  function _loadRom(bytes: Uint8Array) {
    romFullLoaded.value = false
    romLoading.value = true
    rom.value = new Rom(bytes)
  }

  function unloadRom() {
    rom.value = null
    romDetails.value = null
    romFullLoaded.value = false
    romLoading.value = false
    if (import.meta.client) {
      import('localforage').then(({ default: localforage }) => localforage.removeItem('rom'))
    }
  }

  async function loadRom(bytes: Uint8Array) {
    _loadRom(bytes)
    if (import.meta.client) {
      const localforage = (await import('localforage')).default
      await localforage.setItem('rom', bytes)
    }
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
        if (router.currentRoute.value.name === 'about') {
          router.push('/')
        }
      })
    }
  })

  return { rom, romDetails, romFullLoaded, romLoading, loadRom, unloadRom }
})

export default useRomStore
