<template>
  <AppPanel title="Palette" icon="i-heroicons-swatch" class="h-full">
    <template #actions>
      <UBadge
        color="neutral"
        variant="subtle"
        size="sm"
        :label="`${resource.colors.length} entries`"
      />
      <UBadge color="neutral" variant="subtle" size="sm" :label="`${resource.inputSize} bytes`" />
    </template>

    <div class="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
      <div
        v-for="entry in paletteEntries"
        :key="entry.index"
        class="border-default bg-muted/20 flex items-center gap-2 rounded-md border p-1.5"
      >
        <div
          class="border-default size-7 shrink-0 rounded border"
          :style="{ backgroundColor: entry.rgbHex }"
        />
        <div class="min-w-0">
          <p class="text-highlighted font-mono text-[11px]">
            #{{ entry.index.toString(16).toUpperCase().padStart(2, '0') }}
          </p>
          <p class="text-muted font-mono text-[10px]">{{ entry.rawHex }}</p>
          <p class="text-dimmed font-mono text-[10px]">{{ entry.rgbHex }}</p>
        </div>
      </div>
    </div>
  </AppPanel>
</template>

<script setup lang="ts">
import { computed, toRefs } from 'vue'
import { mdColorToRgba, type PaletteRomResourceLoaded } from '@repo/kid-util'

interface Props {
  resource: PaletteRomResourceLoaded
}

const props = defineProps<Props>()
const { resource } = toRefs(props)

const toRgbHex = (mdColor: number) => {
  const [r, g, b] = mdColorToRgba(mdColor)
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

const paletteEntries = computed(() => {
  return resource.value.colors.map((color, index) => {
    return {
      index,
      rawHex: `0x${color.toString(16).toUpperCase().padStart(4, '0')}`,
      rgbHex: toRgbHex(color),
    }
  })
})
</script>
