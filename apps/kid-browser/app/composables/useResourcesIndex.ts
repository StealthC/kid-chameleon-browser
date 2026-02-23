import { computed, watchEffect } from 'vue'
import { storeToRefs } from 'pinia'
import { type ResourceType } from '@repo/kid-util'
import useRomStore from '~/stores/romStore'
import { getNormalizedName, parseAddressOrNull } from '~/utils/index'

export function useResourcesIndex() {
  const route = useRoute()
  const { rom } = storeToRefs(useRomStore())

  const activeTab = useState<'types' | 'resources'>('resource-list-active-tab', () => 'resources')
  const selectedTypeValue = useState<ResourceType | 'all'>('resource-list-type-filter', () => 'all')

  const selectedAddress = computed(() => {
    const value = route.params.address
    if (!value || typeof value !== 'string') return null
    return parseAddressOrNull(value)
  })

  watchEffect(() => {
    if (selectedAddress.value !== null) {
      activeTab.value = 'resources'
    }
  })

  const resourceList = computed(() => {
    const romValue = rom.value
    if (!romValue) {
      return [] as { type: ResourceType; count: number }[]
    }

    return Array.from(romValue.resources.resourcesByType.entries())
      .map(([type, resources]) => ({ type, count: resources.size }))
      .filter(({ count }) => count > 0) as { type: ResourceType; count: number }[]
  })

  const allResources = computed(() => {
    const romValue = rom.value
    if (!romValue) {
      return [] as { address: number; type: ResourceType; name: string }[]
    }

    return resourceList.value.flatMap(({ type }) => {
      const addresses = romValue.resources.resourcesByType.get(type)
      if (!addresses) {
        return []
      }

      return Array.from(addresses)
        .map((address) => {
          const resource = romValue.resources.getResource(address)
          if (!resource) {
            return null
          }
          return {
            address,
            type,
            name: getNormalizedName(resource, true),
          }
        })
        .filter((resource) => resource !== null)
    })
  })

  const filteredResources = computed(() => {
    if (selectedTypeValue.value === 'all') return allResources.value
    return allResources.value.filter((resource) => resource.type === selectedTypeValue.value)
  })

  const totalResources = computed(() => allResources.value.length)

  const selectType = (type: ResourceType) => {
    selectedTypeValue.value = type
    activeTab.value = 'resources'
  }

  const clearFilter = () => {
    selectedTypeValue.value = 'all'
  }

  return {
    activeTab,
    selectedTypeValue,
    selectedAddress,
    resourceList,
    filteredResources,
    totalResources,
    selectType,
    clearFilter,
  }
}
