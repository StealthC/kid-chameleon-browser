<template>
  <div>
    <label class="rom-reader">
      <FileUpload mode="basic" @select="loadFile" customUpload auto severity="secondary" choose-label="Select ROM File" class="p-button-outlined" />
    </label>
  </div>
</template>

<script setup lang="ts">
import FileUpload, { type FileUploadSelectEvent } from 'primevue/fileupload';

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
