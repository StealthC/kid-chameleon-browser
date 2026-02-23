<template>
  <div
    :class="
      expanded
        ? 'fixed inset-4 z-50 rounded-xl border border-white/20 bg-slate-950/95 p-3 shadow-2xl'
        : 'h-full w-full'
    "
  >
    <div class="grid h-full w-full grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_320px]">
      <div class="border-border/60 relative rounded-md border bg-slate-950/60 p-2">
        <Button
          size="icon-sm"
          variant="secondary"
          class="absolute top-3 right-3 z-20"
          :title="expanded ? 'Restore' : 'Expand'"
          @click="expanded = !expanded"
        >
          <Icon
            :name="
              expanded ? 'heroicons:arrows-pointing-in-solid' : 'heroicons:arrows-pointing-out-solid'
            "
            class="size-4"
          />
        </Button>
        <slot name="viewer" :expanded="expanded" />
      </div>

      <div class="flex flex-col gap-3 overflow-auto rounded-md border border-white/15 bg-black/20 p-3 text-sm text-slate-200">
        <slot name="sidebar" :expanded="expanded" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Button } from '~/components/ui/button'

const expanded = defineModel<boolean>('expanded', { default: false })
</script>
