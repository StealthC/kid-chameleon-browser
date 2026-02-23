import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { Rom, type RomFileDetails } from '@repo/kid-util'

export type RomStatus = 'idle' | 'restoring' | 'loading' | 'ready' | 'error'

const useRomStore = defineStore('romStore', () => {
  const rom = ref<Rom | null>(null)
  const romDetails = ref<RomFileDetails | null>(null)
  const status = ref<RomStatus>('idle')
  const errorMessage = ref<string | null>(null)
  const initialized = ref<boolean>(false)
  let initPromise: Promise<void> | null = null

  const romLoading = computed(() => status.value === 'loading' || status.value === 'restoring')
  const romFullLoaded = computed(() => status.value === 'ready')

  function getErrorMessage(err: unknown): string {
    if (err instanceof Error) {
      return err.message
    }
    return 'Unknown ROM loading error'
  }

  async function getLocalforage() {
    if (!import.meta.client) {
      return null
    }
    const localforage = (await import('localforage')).default
    return localforage
  }

  async function loadRomData(bytes: Uint8Array): Promise<void> {
    const nextRom = new Rom(bytes)
    rom.value = nextRom
    romDetails.value = null
    await Promise.all([
      nextRom.loadResources(),
      nextRom.getRomFileDetails().then((details) => {
        romDetails.value = details
      }),
    ])
  }

  async function initFromStorage(): Promise<void> {
    if (initialized.value) {
      return
    }
    if (initPromise) {
      return initPromise
    }

    initPromise = (async () => {
      if (!import.meta.client) {
        initialized.value = true
        return
      }

      status.value = 'restoring'
      errorMessage.value = null

      try {
        const localforage = await getLocalforage()
        const romBytes = await localforage?.getItem<Uint8Array>('rom')

        if (!romBytes) {
          status.value = 'idle'
          return
        }

        await loadRomData(romBytes)
        status.value = 'ready'
      } catch (err) {
        rom.value = null
        romDetails.value = null
        status.value = 'error'
        errorMessage.value = getErrorMessage(err)
      } finally {
        initialized.value = true
        initPromise = null
      }
    })()

    return initPromise
  }

  async function unloadRom() {
    rom.value = null
    romDetails.value = null
    status.value = 'idle'
    errorMessage.value = null

    if (import.meta.client) {
      const localforage = await getLocalforage()
      await localforage?.removeItem('rom')
    }
  }

  async function loadRom(bytes: Uint8Array) {
    status.value = 'loading'
    errorMessage.value = null

    try {
      await loadRomData(bytes)

      if (import.meta.client) {
        const localforage = await getLocalforage()
        await localforage?.setItem('rom', bytes)
      }

      status.value = 'ready'
    } catch (err) {
      rom.value = null
      romDetails.value = null
      status.value = 'error'
      errorMessage.value = getErrorMessage(err)
    }
  }

  return {
    rom,
    romDetails,
    status,
    errorMessage,
    initialized,
    romFullLoaded,
    romLoading,
    initFromStorage,
    loadRom,
    unloadRom,
  }
})

export default useRomStore
