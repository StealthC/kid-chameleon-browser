<template>
  <div class="h-full min-h-0">
    <div
      v-if="romDetails"
      class="flex flex-col h-full min-h-0 gap-3"
    >
      <div class="space-y-3">
        <GlassPanel>
          <template #header>
            <div class="flex items-center justify-between gap-2">
              <p class="text-base font-semibold">File details</p>
              <Badge variant="secondary">
                {{
                  romDetails.known
                    ? romDetails.known.hack
                      ? 'Hack ROM'
                      : 'Known ROM'
                    : 'Unknown ROM'
                }}
              </Badge>
            </div>
          </template>
          <dl class="space-y-2 text-sm">
            <div
              v-for="[key, value] in Object.entries(details['File Details'])"
              :key="key"
              class="grid grid-cols-[10rem_1fr] gap-3"
            >
              <dt class="text-muted-foreground">{{ key }}</dt>
              <dd class="font-medium break-all">{{ value }}</dd>
            </div>
          </dl>
        </GlassPanel>

        <GlassPanel>
          <template #header>
            <p class="text-base font-semibold">ROM header</p>
          </template>
          <dl class="space-y-2 text-sm">
            <div
              v-for="[key, value] in Object.entries(details['ROM Header'])"
              :key="key"
              class="grid grid-cols-[10rem_1fr] gap-3"
            >
              <dt class="text-muted-foreground">{{ key }}</dt>
              <dd class="font-medium break-words">{{ value }}</dd>
            </div>
          </dl>
        </GlassPanel>
      </div>

      <GlassPanel class="min-h-0">
        <template #header>
            <div class="flex items-center justify-between gap-2">
              <p class="text-base font-semibold">Discovered addresses</p>
              <Badge variant="outline">{{ knownAddressesRows.length }} entries</Badge>
            </div>
          </template>
        <ScrollArea class="h-[28rem] max-h-full">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="row in knownAddressesRows" :key="row.name">
                <TableCell class="font-medium">{{ row.name }}</TableCell>
                <TableCell class="font-mono">{{ row.address }}</TableCell>
                <TableCell>{{ row.type }}</TableCell>
                <TableCell>{{ row.description }}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </ScrollArea>
      </GlassPanel>
    </div>

    <GlassPanel v-else class="flex h-full items-center justify-center text-center">
      <p class="text-muted-foreground text-sm">No ROM loaded.</p>
    </GlassPanel>
  </div>
</template>

<script setup lang="ts">
import { Badge } from '~/components/ui/badge'
import { ScrollArea } from '~/components/ui/scroll-area'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table'
import { useRomDetailsView } from '~/composables/useRomDetailsView'

const { romDetails, details, knownAddressesRows } = useRomDetailsView()
</script>
