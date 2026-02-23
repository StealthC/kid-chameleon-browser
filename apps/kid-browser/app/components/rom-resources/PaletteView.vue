<template>
  <div class="border-border/60 flex h-full min-h-0 flex-col gap-3 rounded-lg border bg-slate-900/60 p-3">
    <div class="flex items-center gap-2">
      <Badge variant="outline">Entries: {{ resource.colors.length }}</Badge>
      <Badge variant="outline">Data Size: {{ resource.inputSize }} bytes</Badge>
    </div>

    <div class="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
      <div
        v-for="entry in paletteEntries"
        :key="entry.index"
        class="border-border/60 flex items-center gap-2 rounded-md border bg-slate-950/70 p-2"
      >
        <div
          class="h-7 w-7 shrink-0 rounded border border-white/20"
          :style="{ backgroundColor: entry.rgbHex }"
        />
        <div class="min-w-0">
          <p class="font-mono text-xs">#{{ entry.index.toString(16).toUpperCase().padStart(2, '0') }}</p>
          <p class="text-muted-foreground font-mono text-[11px]">{{ entry.rawHex }}</p>
          <p class="text-muted-foreground font-mono text-[11px]">{{ entry.rgbHex }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, toRefs } from 'vue'
import type { PaletteRomResourceLoaded } from '@repo/kid-util'
import { Badge } from '~/components/ui/badge'

interface Props {
  resource: PaletteRomResourceLoaded
}

const props = defineProps<Props>()
const { resource } = toRefs(props)

const toRgbHex = (mdColor: number) => {
  const r3 = (mdColor >> 1) & 0x7
  const g3 = (mdColor >> 5) & 0x7
  const b3 = (mdColor >> 9) & 0x7
  const to8 = (v: number) => Math.round((v / 7) * 255)
  const r = to8(r3)
  const g = to8(g3)
  const b = to8(b3)
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
