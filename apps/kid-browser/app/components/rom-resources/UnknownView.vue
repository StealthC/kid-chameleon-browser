<template>
  <div class="border-border/60 flex h-full min-h-0 flex-col gap-3 rounded-lg border bg-slate-900/60 p-3">
    <p class="text-muted-foreground text-sm">
      Unknown resource. Showing inferred metadata when available.
    </p>

    <div class="border-border/60 rounded border bg-slate-950/60 p-2">
      <Table>
        <TableBody>
          <TableRow>
            <TableCell class="text-muted-foreground text-xs">Possible Size</TableCell>
            <TableCell class="font-mono text-xs">{{ possibleSizeText }}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell class="text-muted-foreground text-xs">Address Offset</TableCell>
            <TableCell class="font-mono text-xs">{{ offsetText }}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell class="text-muted-foreground text-xs">Confidence</TableCell>
            <TableCell class="font-mono text-xs uppercase">{{ resource.confidence ?? 'unknown' }}</TableCell>
          </TableRow>
          <TableRow v-if="resource.description">
            <TableCell class="text-muted-foreground text-xs">Description</TableCell>
            <TableCell class="text-xs">{{ resource.description }}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, toRefs } from 'vue'
import type { UnknownRomResourceUnloaded } from '@repo/kid-util'
import { Table, TableBody, TableCell, TableRow } from '~/components/ui/table'
import { addressFormat } from '~/utils/index'

interface Props {
  resource: UnknownRomResourceUnloaded
}

const props = defineProps<Props>()
const { resource } = toRefs(props)

const possibleSizeText = computed(() => {
  if (typeof resource.value.possibleSize !== 'number') {
    return 'Not inferred'
  }
  return `${resource.value.possibleSize} bytes`
})

const offsetText = computed(() => {
  if (resource.value.addressOffset === undefined) {
    return '-'
  }
  return addressFormat(resource.value.addressOffset)
})
</script>
