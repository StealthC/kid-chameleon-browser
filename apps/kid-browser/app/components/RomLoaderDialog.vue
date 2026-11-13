<template>
  <UModal
    v-model:open="open"
    title="ROM cartridge"
    description="Load a Kid Chameleon ROM to explore its resources. Everything stays in your browser."
    :ui="{ content: 'sm:max-w-lg' }"
  >
    <template #body>
      <ReadRom @loaded="closeRomDialog" />
    </template>
  </UModal>
</template>

<script setup lang="ts">
const { open, closeRomDialog } = useRomDialog()
</script>
