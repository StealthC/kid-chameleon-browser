<template>
  <div class="font-mono text-xs">
    <div v-if="romDetails" class="flex flex-col gap-4">
      <Panel v-for="category in Object.keys(details)" :key="category" :header="category">
        <ul>
          <li
            v-for="[key, value] in Object.entries(details[category])"
            :key="key"
            class="grid grid-cols-[max-content_1fr] gap-x-2"
          >
            <span class="block w-40 font-bold">{{ key }}:</span>
            <span class="overflow-hidden text-ellipsis">{{ value }}</span>
          </li>
        </ul>
      </Panel>
      <Panel header="Discovered Addresses">
        <table class="w-full">
          <tr v-for="row in romKnownAddressesValues" :key="row[0]">
            <td v-for="cell in row" :key="cell" class="border border-gray-600 p-1">
              {{ cell }}
            </td>
          </tr>
        </table>
      </Panel>
    </div>
    <div v-else>
      <p>No ROM loaded</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Panel } from 'primevue'
import useRomStore from '@/stores/romStore'
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { addressFormat, getByteSize } from '@/utils'
import { ImportantValues, KnownAddressesDescriptions, type KnownAddresses } from '@repo/kid-util'

const { romDetails, rom } = storeToRefs(useRomStore())
type DetailsData = Record<string, Record<string, string>>

const romKnownAddresses = computed(() => rom.value?.discovery.knownAddresses)

const romKnownAddressesValues = computed(() => {
  const knownAdresses: KnownAddresses = romKnownAddresses.value ?? new Map()
  const mappedAddresses = (
    Object.keys(KnownAddressesDescriptions) as (typeof ImportantValues)[number][]
  ).map((key) => {
    const knownValue = knownAdresses.get(key)
    const knownFormattedValue = knownValue ? addressFormat(knownValue) : '??'
    const description = KnownAddressesDescriptions[key] ?? {
      description: 'Not Implemented yet',
      addressInJUE: 'Unknown',
      name: key,
      type: 'Unknown',
    }
    return [
      description.name,
      knownFormattedValue,
      description.type.toUpperCase(),
      description.description,
    ]
  })
  return [['Name', 'Address', 'Type', 'Description'], ...mappedAddresses]
})

const details = computed(() => {
  if (!romDetails.value) {
    return {}
  }
  const calculatedChecksum = romDetails.value.header.calculatedChecksum
  let checksum = addressFormat(romDetails.value.header.checksum)
  if (calculatedChecksum) {
    checksum +=
      calculatedChecksum === romDetails.value.header.checksum
        ? '🟢'
        : `🔴(Calculated: ${addressFormat(calculatedChecksum)})`
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

<style scoped></style>
