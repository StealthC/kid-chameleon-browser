import useRomStore from '@/stores/rom'
import { ResourceTypes, type AllRomResources } from '@repo/kid-util'
import { useQuery, type UseQueryOptions } from '@tanstack/vue-query'
import { storeToRefs } from 'pinia'
import { computed, unref, type MaybeRef } from 'vue'

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
          return rom.value.getLoadedResource(addressValue) as AllRomResources & { loaded: true }
        }
      },
      ...options,
    })
  }
  const useGetMultipleResourcesQuery = (addresses: MaybeRef<number[]>, load = true) => {
    if (!rom.value) {
      throw new Error('No ROM loaded')
    }
    const addressesValue = unref(addresses)
    if (Array.isArray(addressesValue)) {
      return addressesValue.map((a) => {
        if (!load) {
          return rom.value!.getResource(a) as AllRomResources
        } else {
          return rom.value!.getLoadedResource(a) as AllRomResources & { loaded: true }
        }
      })
    }
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
    useGetMultipleResourcesQuery,
    getResourceListOfTypeQuery,
  }))
  return resourceLoader
}
