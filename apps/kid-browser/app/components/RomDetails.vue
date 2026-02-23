<template>
  <div class="h-full min-h-0">
    <div
      v-if="romDetails"
      class="grid h-full min-h-0 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]"
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
            <Badge variant="outline">{{ romKnownAddressesValues.length }} entries</Badge>
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
              <TableRow v-for="row in bodyRows" :key="row.name">
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
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { ImportantValues, KnownAddressesDescriptions, type KnownAddresses } from '@repo/kid-util'
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
import useRomStore from '~/stores/romStore'
import { addressFormat, getByteSize } from '~/utils/index'

const { romDetails, rom } = storeToRefs(useRomStore())
type DetailsData = Record<string, Record<string, string>>

const romKnownAddresses = computed(() => rom.value?.discovery.knownAddresses)

const romKnownAddressesValues = computed(() => {
  const knownAddresses: KnownAddresses = romKnownAddresses.value ?? new Map()
  const mappedAddresses = (
    Object.keys(KnownAddressesDescriptions) as (typeof ImportantValues)[number][]
  ).map((key) => {
    const knownValue = knownAddresses.get(key)
    const knownFormattedValue = knownValue ? addressFormat(knownValue) : '??'
    const description = KnownAddressesDescriptions[key] ?? {
      description: 'Not implemented yet',
      addressInJUE: 'Unknown',
      name: key,
      type: 'Unknown',
    }
    return {
      name: description.name,
      address: knownFormattedValue,
      type: description.type.toUpperCase(),
      description: description.description,
    }
  })
  return mappedAddresses
})

const bodyRows = computed(() => romKnownAddressesValues.value)

const details = computed(() => {
  if (!romDetails.value) return {} as DetailsData
  const calculatedChecksum = romDetails.value.header.calculatedChecksum
  let checksum = addressFormat(romDetails.value.header.checksum)
  if (calculatedChecksum) {
    checksum +=
      calculatedChecksum === romDetails.value.header.checksum
        ? ' (valid)'
        : ` (invalid, calculated: ${addressFormat(calculatedChecksum)})`
  }
  return {
    'File Details': {
      'File Size': `${getByteSize(romDetails.value.size)}`,
      SHA256: romDetails.value.sha256,
    },
    'ROM Header': {
      Console: romDetails.value.header.consoleName.trim(),
      Release: romDetails.value.header.releaseDate.trim(),
      'Domestic Name': romDetails.value.header.domesticName.trim(),
      'International Name': romDetails.value.header.internationalName.trim(),
      Version: romDetails.value.header.version.trim(),
      Checksum: checksum,
      Memo: romDetails.value.header.memo.trim(),
      Region: romDetails.value.header.region.trim(),
    },
  } as DetailsData
})
</script>
