<template>
  <AppPanel title="Level background layout" icon="i-heroicons-photo" :padded="false" class="h-full">
    <template #actions>
      <UBadge color="neutral" variant="subtle" size="sm" :label="`Format ${resource.format}`" />
      <UBadge
        color="neutral"
        variant="subtle"
        size="sm"
        :label="`Type ${resource.backgroundType}`"
      />
      <UBadge
        color="neutral"
        variant="subtle"
        size="sm"
        :label="resource.isPacked ? 'Packed' : 'Unpacked'"
      />
      <UBadge
        color="neutral"
        variant="subtle"
        size="sm"
        :label="`${resource.placements.length} placements`"
      />
    </template>

    <div class="flex h-full min-h-0 flex-col">
      <div
        v-if="resource.indirect"
        class="border-default bg-muted/20 shrink-0 border-b px-3 py-2 text-xs"
      >
        <p class="text-dimmed text-[10px] tracking-wider uppercase">Indirect reference</p>
        <p class="text-highlighted mt-0.5 font-mono text-[11px]">
          Ref {{ addressFormat(resource.indirect.referenceAddress) }} · XShift
          {{ resource.indirect.xShiftRaw }} · YShift {{ resource.indirect.yShiftRaw }}
        </p>
      </div>

      <div class="min-h-0 flex-1 overflow-auto">
        <table class="w-full border-collapse text-left text-xs">
          <thead
            class="bg-elevated text-muted sticky top-0 z-10 text-[10px] tracking-wider uppercase"
          >
            <tr class="border-default border-b">
              <th class="px-2.5 py-1.5 font-semibold">#</th>
              <th class="px-2.5 py-1.5 font-semibold">Chunk</th>
              <th class="px-2.5 py-1.5 font-semibold">X</th>
              <th class="px-2.5 py-1.5 font-semibold">Y</th>
            </tr>
          </thead>
          <tbody class="divide-default divide-y">
            <tr
              v-for="(placement, index) in resource.placements.slice(0, 256)"
              :key="index"
              class="hover:bg-elevated/60 transition-colors"
            >
              <td class="text-dimmed px-2.5 py-1.5 font-mono text-[11px]">{{ index }}</td>
              <td class="px-2.5 py-1.5 font-mono text-[11px]">{{ placement.chunkIndexRaw }}</td>
              <td class="px-2.5 py-1.5 font-mono text-[11px]">{{ placement.xRaw }}</td>
              <td class="px-2.5 py-1.5 font-mono text-[11px]">{{ placement.yRaw }}</td>
            </tr>
            <tr v-if="resource.placements.length === 0">
              <td colspan="4" class="text-muted px-3 py-6 text-center text-xs">
                No placements decoded for this background layout.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </AppPanel>
</template>

<script setup lang="ts">
import type { LevelBackgroundLayoutRomResourceLoaded } from '@repo/kid-util'
import { addressFormat } from '~/utils/index'

defineProps<{ resource: LevelBackgroundLayoutRomResourceLoaded }>()
</script>
