<template>
  <AppPanel title="Level enemy layout" icon="i-heroicons-bug-ant" :padded="false" class="h-full">
    <template #actions>
      <UBadge
        color="neutral"
        variant="subtle"
        size="sm"
        :label="`${resource.objectCount} objects`"
      />
      <UBadge
        color="neutral"
        variant="subtle"
        size="sm"
        :label="`Header ${resource.h1UnknownByte}`"
      />
    </template>

    <div class="min-h-0 flex-1 overflow-auto">
      <table class="w-full border-collapse text-left text-xs">
        <thead
          class="bg-elevated text-muted sticky top-0 z-10 text-[10px] tracking-wider uppercase"
        >
          <tr class="border-default border-b">
            <th class="px-2.5 py-1.5 font-semibold">#</th>
            <th class="px-2.5 py-1.5 font-semibold">Type / Kind</th>
            <th class="px-2.5 py-1.5 font-semibold">Flags</th>
            <th class="px-2.5 py-1.5 font-semibold">HP+1</th>
            <th class="px-2.5 py-1.5 font-semibold">X</th>
            <th class="px-2.5 py-1.5 font-semibold">Y</th>
          </tr>
        </thead>
        <tbody class="divide-default divide-y">
          <tr
            v-for="entry in resource.objects"
            :key="entry.index"
            class="hover:bg-elevated/60 transition-colors"
          >
            <td class="text-dimmed px-2.5 py-1.5 font-mono text-[11px]">{{ entry.index }}</td>
            <td class="text-highlighted px-2.5 py-1.5 font-mono text-[11px]">
              {{ entry.enemyTypeOrKind }}
            </td>
            <td class="px-2.5 py-1.5 font-mono text-[11px]">
              0x{{ entry.behaviorFlags.toString(16) }}
            </td>
            <td class="px-2.5 py-1.5 font-mono text-[11px]">{{ entry.hitPointsPlusOne }}</td>
            <td class="px-2.5 py-1.5 font-mono text-[11px]">{{ entry.xPosition }}</td>
            <td class="px-2.5 py-1.5 font-mono text-[11px]">{{ entry.yPosition }}</td>
          </tr>
          <tr v-if="resource.objects.length === 0">
            <td colspan="6" class="text-muted px-3 py-6 text-center text-xs">
              No enemy objects decoded for this layout.
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </AppPanel>
</template>

<script setup lang="ts">
import type { LevelEnemyLayoutRomResourceLoaded } from '@repo/kid-util'

defineProps<{ resource: LevelEnemyLayoutRomResourceLoaded }>()
</script>
