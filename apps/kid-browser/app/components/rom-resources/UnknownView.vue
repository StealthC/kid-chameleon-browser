<template>
  <AppPanel title="Unknown resource" icon="i-heroicons-question-mark-circle" class="h-full">
    <p class="text-muted mb-2 text-xs">
      Unknown resource. Showing inferred metadata when available.
    </p>

    <dl class="border-default overflow-hidden rounded-md border">
      <div
        v-for="row in rows"
        :key="row.label"
        class="border-default grid grid-cols-[9rem_minmax(0,1fr)] border-b last:border-b-0"
      >
        <dt class="bg-muted/30 text-muted px-2.5 py-1.5 text-xs">{{ row.label }}</dt>
        <dd class="text-highlighted px-2.5 py-1.5 font-mono text-[11px]">{{ row.value }}</dd>
      </div>
    </dl>
  </AppPanel>
</template>

<script setup lang="ts">
import { computed, toRefs } from 'vue'
import type { UnknownRomResourceUnloaded } from '@repo/kid-util'
import { addressFormat } from '~/utils/index'

interface Props {
  resource: UnknownRomResourceUnloaded
}

const props = defineProps<Props>()
const { resource } = toRefs(props)

const possibleSizeText = computed(() => {
  if (typeof resource.value.possibleSize !== 'number') {
    return 'Not inferred'
  }
  return `${resource.value.possibleSize} bytes`
})

const offsetText = computed(() => {
  if (resource.value.addressOffset === undefined) {
    return '-'
  }
  return addressFormat(resource.value.addressOffset)
})

const rows = computed(() => {
  const entries = [
    { label: 'Possible size', value: possibleSizeText.value },
    { label: 'Address offset', value: offsetText.value },
    { label: 'Confidence', value: (resource.value.confidence ?? 'unknown').toUpperCase() },
  ]
  if (resource.value.description) {
    entries.push({ label: 'Description', value: resource.value.description })
  }
  return entries
})
</script>
