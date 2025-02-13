<template>
  <FileUpload
    mode="basic"
    @select="loadFile"
    customUpload
    auto
    choose-label="Select ROM File"
    class="hidden-file border-primary text-primary hover:bg-primary-900 box-content cursor-pointer rounded-lg border p-2"
  />
</template>

<script setup lang="ts">
import FileUpload, { type FileUploadSelectEvent } from 'primevue/fileupload'

const emit = defineEmits<{
  load: [bytes: ArrayBuffer]
}>()
const loadFile = (ev: FileUploadSelectEvent) => {
  const file = ev.files ? ev.files[0] : null
  if (file) {
    const reader = new FileReader()
    reader.onload = (e) => emit('load', e.target?.result as ArrayBuffer)
    reader.readAsArrayBuffer(file)
  }
}
</script>

<style scoped></style>
