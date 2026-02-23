<template>
  <div v-if="!romFullLoaded" class="flex h-full flex-col items-center justify-center px-4">
    <div v-if="romLoading" class="flex flex-col items-center gap-4">
      <div
        class="border-primary h-12 w-12 animate-spin rounded-full border-4 border-t-transparent"
      ></div>
      <p class="text-muted-foreground">Loading ROM...</p>
    </div>
    <div
      v-else
      class="border-border/70 max-w-md rounded-xl border bg-slate-950/70 p-6 text-center shadow-xl backdrop-blur"
    >
      <p class="text-xl font-semibold">This page requires a loaded ROM</p>
      <p class="text-muted-foreground mt-2 text-sm">
        Use the cartridge panel below to select your Kid Chameleon ROM file.
      </p>
    </div>
  </div>
  <slot v-else />
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import useRomStore from '~/stores/romStore'

const { romFullLoaded, romLoading } = storeToRefs(useRomStore())
</script>
