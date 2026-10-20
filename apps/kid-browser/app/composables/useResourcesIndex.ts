import { computed, watchEffect } from 'vue'
import { storeToRefs } from 'pinia'
import { type ResourceType } from '@repo/kid-util'
import useRomStore from '~/stores/romStore'
import { getNormalizedName, parseAddressOrNull } from '~/utils/index'
import {
  createResourceIndexEntry,
  filterResources,
  hasActiveResourceFilters,
  type ResourceConfidenceFilter,
  type ResourceLoadedFilter,
  type ResourceSortOrder,
} from '~/utils/resourceSearch'

const HIDDEN_RESOURCE_TYPES = ['animation-step']
const HIDDEN_RESOURCE_TYPE_SET = new Set<string>(HIDDEN_RESOURCE_TYPES)

export function useResourcesIndex() {
  const route = useRoute()
  const { rom } = storeToRefs(useRomStore())

  const activeTab = useState<'types' | 'resources'>('resource-list-active-tab', () => 'resources')
  const selectedTypeValue = useState<ResourceType | 'all'>('resource-list-type-filter', () => 'all')
  const searchQuery = useState<string>('resource-list-search', () => '')
  const sortOrder = useState<ResourceSortOrder>('resource-list-sort', () => 'address')
  const confidenceFilter = useState<ResourceConfidenceFilter>(
    'resource-list-confidence',
    () => 'all',
  )
  const loadedFilter = useState<ResourceLoadedFilter>('resource-list-loaded', () => 'all')

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
      .filter(({ type }) => !HIDDEN_RESOURCE_TYPE_SET.has(String(type)))
      .filter(({ count }) => count > 0) as { type: ResourceType; count: number }[]
  })

  const allResources = computed(() => {
    // Reading the route address makes the index recompute after navigation, so
    // decode state and sizes reflect resources opened earlier in the session.
    void selectedAddress.value

    const romValue = rom.value
    if (!romValue) {
      return []
    }

    return resourceList.value.flatMap(({ type }) => {
      const addresses = romValue.resources.resourcesByType.get(type)
      if (!addresses) {
        return []
      }

      return Array.from(addresses).flatMap((address) => {
        const resource = romValue.resources.getResource(address)
        if (!resource) {
          return []
        }

        return [createResourceIndexEntry(resource, getNormalizedName(resource, true))]
      })
    })
  })

  const currentFilters = computed(() => ({
    search: searchQuery.value,
    type: selectedTypeValue.value,
    confidence: confidenceFilter.value,
    loaded: loadedFilter.value,
    sort: sortOrder.value,
  }))

  const filteredResources = computed(() =>
    filterResources(allResources.value, currentFilters.value),
  )

  const totalResources = computed(() => allResources.value.length)
  const filteredCount = computed(() => filteredResources.value.length)
  const hasActiveFilters = computed(() => hasActiveResourceFilters(currentFilters.value))

  const selectType = (type: ResourceType) => {
    selectedTypeValue.value = type
    activeTab.value = 'resources'
  }

  const clearFilter = () => {
    selectedTypeValue.value = 'all'
    confidenceFilter.value = 'all'
    loadedFilter.value = 'all'
    searchQuery.value = ''
  }

  return {
    activeTab,
    selectedTypeValue,
    searchQuery,
    sortOrder,
    confidenceFilter,
    loadedFilter,
    selectedAddress,
    resourceList,
    allResources,
    filteredResources,
    totalResources,
    filteredCount,
    hasActiveFilters,
    selectType,
    clearFilter,
  }
}
