<template>
  <UButton
    :disabled="disabled"
    :variant="variant"
    :color="color"
    :size="size"
    :icon="icon"
    class="focus-within:ring-primary/60 relative cursor-pointer focus-within:ring-2"
  >
    {{ label }}
    <input
      type="file"
      :disabled="disabled"
      :aria-label="label"
      accept=".bin,.md,.gen,.smd,application/octet-stream"
      class="absolute inset-0 cursor-pointer opacity-0"
      @change="loadFile"
    />
  </UButton>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    label?: string
    icon?: string
    disabled?: boolean
    variant?: 'solid' | 'outline' | 'soft' | 'subtle' | 'ghost' | 'link'
    color?: 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' | 'neutral'
    size?: 'xs' | 'sm' | 'md' | 'lg'
  }>(),
  {
    label: 'Select ROM file',
    icon: 'i-heroicons-arrow-up-tray',
    variant: 'solid',
    color: 'primary',
    size: 'md',
  },
)

const emit = defineEmits<{
  load: [bytes: ArrayBuffer]
  error: [message: string]
}>()

const loadFile = (ev: Event) => {
  const input = ev.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) {
    return
  }

  const reader = new FileReader()
  reader.onerror = () => emit('error', 'Could not read the selected file. Try another ROM file.')
  reader.onload = (event) => {
    if (event.target?.result instanceof ArrayBuffer) {
      emit('load', event.target.result)
    } else {
      emit('error', 'The selected file could not be read as binary data.')
    }
  }
  reader.readAsArrayBuffer(file)
  input.value = ''
}
</script>
