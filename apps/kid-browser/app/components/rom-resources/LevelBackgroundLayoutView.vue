<template>
  <div class="border-border/60 flex h-full min-h-0 flex-col gap-3 rounded-lg border bg-slate-900/60 p-3">
    <div class="flex flex-wrap items-center gap-2">
      <Badge variant="outline">Format: {{ resource.format }}</Badge>
      <Badge variant="outline">Background Type: {{ resource.backgroundType }}</Badge>
      <Badge variant="outline">Packed: {{ resource.isPacked ? 'yes' : 'no' }}</Badge>
      <Badge variant="outline">Placements: {{ resource.placements.length }}</Badge>
    </div>

    <div v-if="resource.indirect" class="border-border/60 rounded border bg-slate-950/60 p-2 text-xs">
      <p class="font-medium">Indirect Reference</p>
      <p class="font-mono">Ref: {{ addressFormat(resource.indirect.referenceAddress) }}</p>
      <p class="font-mono">XShift: {{ resource.indirect.xShiftRaw }}</p>
      <p class="font-mono">YShift: {{ resource.indirect.yShiftRaw }}</p>
    </div>

    <div class="border-border/60 min-h-0 flex-1 overflow-auto rounded-md border bg-slate-950/60 p-2">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>#</TableHead>
            <TableHead>Chunk</TableHead>
            <TableHead>X</TableHead>
            <TableHead>Y</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="(placement, index) in resource.placements.slice(0, 256)" :key="index">
            <TableCell class="font-mono text-xs">{{ index }}</TableCell>
            <TableCell class="font-mono text-xs">{{ placement.chunkIndexRaw }}</TableCell>
            <TableCell class="font-mono text-xs">{{ placement.xRaw }}</TableCell>
            <TableCell class="font-mono text-xs">{{ placement.yRaw }}</TableCell>
          </TableRow>
          <TableRow v-if="resource.placements.length === 0">
            <TableCell colspan="4" class="text-muted-foreground text-sm">
              No placements decoded for this background layout.
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { LevelBackgroundLayoutRomResourceLoaded } from '@repo/kid-util'
import { Badge } from '~/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table'
import { addressFormat } from '~/utils/index'

defineProps<{ resource: LevelBackgroundLayoutRomResourceLoaded }>()
</script>
