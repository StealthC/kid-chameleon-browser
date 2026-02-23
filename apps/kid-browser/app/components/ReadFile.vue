<template>
  <Button variant="secondary" class="relative cursor-pointer">
    <Icon name="heroicons:arrow-up-tray-solid" class="size-4" />
    Select ROM file
    <input type="file" class="absolute inset-0 cursor-pointer opacity-0" @change="loadFile" />
  </Button>
</template>

<script setup lang="ts">
import { Button } from '~/components/ui/button'

const emit = defineEmits<{
  load: [bytes: ArrayBuffer]
}>()

const loadFile = (ev: Event) => {
  const file = (ev.target as HTMLInputElement).files?.[0]
  if (file) {
    const reader = new FileReader()
    reader.onload = (e) => emit('load', e.target?.result as ArrayBuffer)
    reader.readAsArrayBuffer(file)
  }
}
</script>
