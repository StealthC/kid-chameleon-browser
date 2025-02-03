<template>
  <div class="font-mono text-xs overflow-auto">
    <div v-if="romDetails" class="flex flex-col gap-2">
      <Panel v-for="category in Object.keys(details)" :key="category" :header="category">
        <ul>
          <li
            v-for="[key, value] in Object.entries(details[category])"
            :key="key"
            class="grid grid-cols-[max-content_1fr] gap-x-2"
          >
            <span class="font-bold w-40 block">{{ key }}:</span>
            <span class="overflow-hidden text-ellipsis">{{ value }}</span>
          </li>
        </ul>
      </Panel>
    </div>
    <div v-else>
      <p>No ROM loaded</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Panel } from 'primevue'
import useRomStore from '@/stores/rom'
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { addressFormat, getByteSize } from '@/utils'

const { romDetails, romKnownAddresses } = storeToRefs(useRomStore())
type DetailsData = Record<string, Record<string, string>>

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
  const romKnownAddressesValues = romKnownAddresses.value
    ? Object.fromEntries(
        Object.entries(romKnownAddresses.value).map(([key, value]) => [key, addressFormat(value)]),
      )
    : {}

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
    'Discovered Known Addresses': romKnownAddressesValues,
  } as DetailsData
})
</script>

<style scoped></style>
