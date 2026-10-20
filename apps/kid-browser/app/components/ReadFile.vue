<template>
  <Button variant="secondary" class="relative cursor-pointer focus-within:ring-2 focus-within:ring-ring">
    <Icon name="heroicons:arrow-up-tray-solid" class="size-4" />
    Select ROM file
    <input type="file" aria-label="Select a Kid Chameleon ROM file" accept=".bin,.md,.gen,.smd,application/octet-stream" class="absolute inset-0 cursor-pointer opacity-0" @change="loadFile" />
  </Button>
</template>

<script setup lang="ts">
import { Button } from '~/components/ui/button'

const emit = defineEmits<{
  load: [bytes: ArrayBuffer]
  error: [message: string]
}>()

const loadFile = (ev: Event) => {
  const file = (ev.target as HTMLInputElement).files?.[0]
  if (file) {
    const reader = new FileReader()
    reader.onerror = () => emit('error', 'Could not read the selected file. Try another ROM file.')
    reader.onload = (e) => {
      if (e.target?.result instanceof ArrayBuffer) emit('load', e.target.result)
      else emit('error', 'The selected file could not be read as binary data.')
    }
    reader.readAsArrayBuffer(file)
  }
}
</script>
