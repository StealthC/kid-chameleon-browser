import useRomStore from '@/stores/rom'
import { ResourceTypes, type AllRomResources, type LoadedRomResource } from '@repo/kid-util'
import { useQuery, type UseQueryOptions } from '@tanstack/vue-query'
import { storeToRefs } from 'pinia'
import { computed, unref, type MaybeRef } from 'vue'

type typeFilter = MaybeRef<(typeof ResourceTypes)[number] | (typeof ResourceTypes)[number][]> | undefined

const computedFilter = (filter: typeFilter) => {
  if (!filter) {
    return undefined
  }
  const filterValue = unref(filter)
  if (Array.isArray(filterValue)) {
    return unref(filterValue)
  }
  return [unref(filterValue)]
}

export function useResourceLoader() {
  const { rom, romDetails } = storeToRefs(useRomStore())

  const useGetResourceQuery = (
    address: MaybeRef<number>,
    load = true,
    options: Partial<Omit<UseQueryOptions, 'queryKey'>> = {},
  ) => {
    return useQuery({
      queryKey: ['getResource', address, load, romDetails],
      queryFn: async () => {
        if (!rom.value) {
          throw new Error('No ROM loaded')
        }
        const addressValue = unref(address)
        if (!load) {
          return rom.value.getResource(addressValue) as AllRomResources
        } else {
          return rom.value.getLoadedResource(addressValue) as AllRomResources & LoadedRomResource
        }
      },
      ...options,
    })
  }
  const useGetRelatedResourcesQuery = (resource: MaybeRef<LoadedRomResource>, load = true, filter?: typeFilter) => {
    return useQuery({
      queryKey: ['getMultipleResources', resource, load, romDetails],
      queryFn: async () => {
        const romValue = unref(rom)
        const filterValue = computedFilter(filter)
        const loadValue = load || filterValue
        if (!romValue) {
          throw new Error('No ROM loaded')
        }
        const related = unref(resource).related
        const results = Array.from(related).map((a) => {
          if (!loadValue) {
            return romValue.getResource(a) as AllRomResources
          } else {
            return romValue.getLoadedResource(a) as AllRomResources & LoadedRomResource
          }
        })
        if (filterValue) {
          return results.filter((r) => filterValue.includes(r.type))
        }
        return results
      },
    })
  }
  const useGetMultipleResourcesQuery = (addresses: MaybeRef<Iterable<number>>, load = true, filter?: typeFilter) => {
    return useQuery({
      queryKey: ['getMultipleResources', addresses, load, filter, romDetails],
      queryFn: async () => {
        const romValue = unref(rom)
        if (!romValue) {
          throw new Error('No ROM loaded')
        }
        const addressesValue = unref(addresses)
        const results = Array.from(addressesValue).map((a) => {
          if (!load) {
            return romValue.getResource(a) as AllRomResources
          } else {
            return romValue.getLoadedResource(a) as AllRomResources & LoadedRomResource
          }
        })
        const filterValue = computedFilter(filter)
        if (filterValue) {
          return results.filter((r) => filterValue.includes(r.type))
        }
        return results
      },
    })
  }
  const getResourceListOfTypeQuery = (
    type: MaybeRef<(typeof ResourceTypes)[number] | (typeof ResourceTypes)[number][]>,
  ) => {
    return useQuery({
      queryKey: ['getResourcesOfType', type, romDetails],
      queryFn: async () => {
        if (!rom.value) {
          throw new Error('No ROM loaded')
        }
        const typeValue = unref(type)
        if (Array.isArray(typeValue)) {
          return typeValue.flatMap((t) => [...rom.value!.resourcesByType[t].values()]).sort()
        }
        return [...rom.value.resourcesByType[typeValue].values()]
      },
    })
  }
  const resourceLoader = computed(() => ({
    rom,
    useGetResourceQuery,
    useGetRelatedResourcesQuery,
    useGetMultipleResourcesQuery,
    getResourceListOfTypeQuery,
  }))
  return resourceLoader
}
