<template>
  <AppPanel title="Level title card" icon="i-heroicons-identification" class="h-full">
    <div class="mb-2 flex flex-wrap items-center gap-1.5">
      <UBadge color="neutral" variant="subtle" :label="`Level: ${resource.levelIndex}`" />
      <UBadge
        color="neutral"
        variant="subtle"
        :label="`Effective: ${resource.effectiveLevelIndex}`"
      />
      <UBadge color="neutral" variant="subtle" :label="`Act: ${resource.act}`" />
    </div>

    <div class="space-y-2">
      <div class="border-default bg-muted/20 rounded-md border p-3">
        <p class="text-dimmed text-[10px] tracking-widest uppercase">Resolved Title</p>
        <p class="text-highlighted mt-1 text-base font-semibold tracking-wide">
          {{ resource.titleText }}
        </p>
      </div>

      <div class="border-default bg-muted/20 rounded-md border p-3">
        <p class="text-dimmed mb-2 text-[10px] tracking-widest uppercase">Lines</p>
        <ul class="space-y-1">
          <li
            v-for="(line, index) in resource.lines"
            :key="index"
            class="text-default font-mono text-sm"
          >
            {{ line }}
          </li>
        </ul>
      </div>
    </div>
  </AppPanel>
</template>

<script setup lang="ts">
import type { LevelTitleCardRomResourceLoaded } from '@repo/kid-util'

defineProps<{ resource: LevelTitleCardRomResourceLoaded }>()
</script>
