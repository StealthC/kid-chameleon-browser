<template>
  <div class="border-border/60 flex h-full min-h-0 flex-col gap-3 rounded-lg border bg-slate-900/60 p-3">
    <div class="flex flex-wrap items-center gap-2">
      <Badge variant="outline">Objects: {{ resource.objectCount }}</Badge>
      <Badge variant="outline">Header Byte: {{ resource.h1UnknownByte }}</Badge>
    </div>

    <div class="border-border/60 min-h-0 flex-1 overflow-auto rounded-md border bg-slate-950/60 p-2">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>#</TableHead>
            <TableHead>Type/Kind</TableHead>
            <TableHead>Flags</TableHead>
            <TableHead>HP+1</TableHead>
            <TableHead>X</TableHead>
            <TableHead>Y</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="entry in resource.objects" :key="entry.index">
            <TableCell class="font-mono text-xs">{{ entry.index }}</TableCell>
            <TableCell class="font-mono text-xs">{{ entry.enemyTypeOrKind }}</TableCell>
            <TableCell class="font-mono text-xs">0x{{ entry.behaviorFlags.toString(16) }}</TableCell>
            <TableCell class="font-mono text-xs">{{ entry.hitPointsPlusOne }}</TableCell>
            <TableCell class="font-mono text-xs">{{ entry.xPosition }}</TableCell>
            <TableCell class="font-mono text-xs">{{ entry.yPosition }}</TableCell>
          </TableRow>
          <TableRow v-if="resource.objects.length === 0">
            <TableCell colspan="6" class="text-muted-foreground text-sm">
              No enemy objects decoded for this layout.
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { LevelEnemyLayoutRomResourceLoaded } from '@repo/kid-util'
import { Badge } from '~/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table'

defineProps<{ resource: LevelEnemyLayoutRomResourceLoaded }>()
</script>
