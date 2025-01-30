import { ref } from 'vue'
import { defineStore } from 'pinia'
import { Rom } from '@repo/kid-util'

const useRomStore = defineStore('counter', () => {
  const rom = ref<Rom|null>(null)
  function loadRom(bytes: Uint8Array) {
    rom.value = new Rom(bytes)
  }

  return { rom, loadRom }
})

export default useRomStore