<template>
  <div class="border-border/60 flex h-full min-h-0 flex-col gap-3 rounded-lg border bg-slate-900/60 p-3">
    <div class="flex flex-wrap items-center gap-2">
      <Badge variant="outline">Level: {{ resource.levelIndex }}</Badge>
      <Badge variant="outline">Effective: {{ resource.effectiveLevelIndex }}</Badge>
      <Badge variant="outline">Act: {{ resource.act }}</Badge>
    </div>

    <div class="border-border/60 rounded border bg-slate-950/60 p-3">
      <p class="text-muted-foreground text-xs">Resolved Title</p>
      <p class="font-semibold tracking-wide">{{ resource.titleText }}</p>
    </div>

    <div class="border-border/60 rounded border bg-slate-950/60 p-3">
      <p class="text-muted-foreground mb-2 text-xs">Lines</p>
      <ul class="space-y-1">
        <li v-for="(line, index) in resource.lines" :key="index" class="font-mono text-sm">
          {{ line }}
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { LevelTitleCardRomResourceLoaded } from '@repo/kid-util'
import { Badge } from '~/components/ui/badge'

defineProps<{ resource: LevelTitleCardRomResourceLoaded }>()
</script>
