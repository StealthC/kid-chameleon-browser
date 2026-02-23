import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { ImportantValues, KnownAddressesDescriptions, type KnownAddresses } from '@repo/kid-util'
import useRomStore from '~/stores/romStore'
import { addressFormat, getByteSize } from '~/utils/index'

type DetailsData = Record<string, Record<string, string>>

export function useRomDetailsView() {
  const { romDetails, rom } = storeToRefs(useRomStore())

  const romKnownAddresses = computed(() => rom.value?.discovery.knownAddresses)

  const knownAddressesRows = computed(() => {
    const knownAddresses: KnownAddresses = romKnownAddresses.value ?? new Map()

    return (Object.keys(KnownAddressesDescriptions) as (typeof ImportantValues)[number][]).map(
      (key) => {
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
      },
    )
  })

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

  return {
    romDetails,
    knownAddressesRows,
    details,
  }
}
