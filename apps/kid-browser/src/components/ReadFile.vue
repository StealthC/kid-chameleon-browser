<template>
  <div>
    <label class="rom-reader">
      <input type="file" @change="loadFile" />
    </label>
  </div>
</template>

<script setup lang="ts">

const emit = defineEmits<{
  load: [bytes: ArrayBuffer]
}>()
const loadFile = (ev: Event) => {
  const target = ev.target as HTMLInputElement | null
  const file = target?.files ? target.files[0] : null
  const reader = new FileReader()
  if (file) {
    reader.onload = (e) => emit('load', e.target?.result as ArrayBuffer)
    reader.readAsArrayBuffer(file)
  }
}
</script>

<style scoped></style>
