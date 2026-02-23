<template>
  <label
    class="box-content cursor-pointer rounded-lg border border-primary p-2 text-primary hover:bg-primary/10"
  >
    Select ROM File
    <input type="file" class="hidden" @change="loadFile" />
  </label>
</template>

<script setup lang="ts">
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
