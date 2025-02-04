import { ref, watchEffect } from 'vue'
import { defineStore } from 'pinia'
import { Rom, type RomFileDetails, type RomResources } from '@repo/kid-util'
import { executeNextTick } from '@/utils'
import type { KnownAddresses } from '@repo/kid-util'
import localforage from 'localforage'

const useRomStore = defineStore('rom', () => {
  const rom = ref<Rom | null>(null)
  const romDetails = ref<RomFileDetails | null>(null)
  const romResources = ref<RomResources | null>(null)
  const romKnownAddresses = ref<KnownAddresses | null>(null)
  async function loadRomFromStorage() {
    const romBytes = await localforage.getItem<Uint8Array>('rom')
    if (romBytes) {
      await _loadRom(romBytes)
    }
  }
  async function _loadRom(bytes: Uint8Array) {
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
  async function loadRom(bytes: Uint8Array) {
    await _loadRom(bytes)
    await localforage.setItem('rom', bytes)
  }
  watchEffect(() => {
    if (!rom.value) {
      loadRomFromStorage()
    }
  })
  return { rom, romDetails, romResources, romKnownAddresses, loadRom }
})

export default useRomStore
