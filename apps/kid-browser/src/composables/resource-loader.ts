import useRomStore from '@/stores/romStore'
import { ResourceTypes, Rom, type AllRomResources } from '@repo/kid-util'
import { useQuery } from '@tanstack/vue-query'
import { storeToRefs } from 'pinia'
import { computed, unref, type MaybeRef } from 'vue'

// type typeFilter =
//   | MaybeRef<(typeof ResourceTypes)[number] | (typeof ResourceTypes)[number][]>
//   | undefined

const getLoadedResource = (rom: Rom, address: number) => {
  return rom.resources.getResourceLoaded(address)
}

const getResource = (rom: Rom, address: number) => {
  return rom.resources.getResource(address)
}

// const getMultipleResources = (rom: Rom, addresses: Iterable<number>) => {
//   return rom.resources.getMultipleResources(addresses)
// }

// const getMultipleResourcesLoaded = (rom: Rom, addresses: Iterable<number>) => {
//   return rom.resources.getMultipleResourcesLoaded(addresses)
// }

// const getReferencesResources = (rom: Rom, address: number) => {
//   return rom.resources.getReferencesResources(address)
// }

const getReferencesResourcesLoaded = (rom: Rom, resource: number|AllRomResources) => {
  return rom.resources.getReferencesResourcesLoaded(resource)
}

// const getResourcesAddressOfType = (rom: Rom, type: (typeof ResourceTypes)[number]) => {
//   return rom.resources.getResourceAddressesByType(type)
// }

const getResourcesOfType = <T extends (typeof ResourceTypes)[number]>(rom: Rom, type: T | T[]) => {
  return rom.resources.getResourcesByType<T>(type)
}



// const computedFilter = (filter: typeFilter) => {
//   if (!filter) {
//     return undefined
//   }
//   const filterValue = unref(filter)
//   if (Array.isArray(filterValue)) {
//     return unref(filterValue)
//   }
//   return [unref(filterValue)]
// }

export function useResourceLoader() {
  const romStore = storeToRefs(useRomStore())
  const { romDetails } = romStore
  const rom = computed(() => romStore.rom.value as Rom | null)
  const useGetResourceQuery = (
    address: MaybeRef<number>,
  ) => {
    return useQuery({
      queryKey: ['getResource', address, romDetails],
      queryFn: async () => {
        return getResource(unref(rom) as Rom, unref(address))
      },
    })
  }

  const useGetResourceLoadedQuery = (
    address: MaybeRef<number>,
    enabled: MaybeRef<boolean> = true,
  ) => {
    return useQuery({
      queryKey: ['getResourceLoaded', address, romDetails],
      queryFn: async () => {
        return getLoadedResource(unref(rom) as Rom, unref(address))
      },
      enabled,
    })
  }

  const getResourceListOfTypeQuery = (
    type: MaybeRef<(typeof ResourceTypes)[number] | (typeof ResourceTypes)[number][]>,
  ) => {
    return useQuery({
      queryKey: ['getResourcesOfType', type, romDetails],
      queryFn: async () => {
        if (!rom.value) {
          throw new Error('ROM not loaded')
        }
        return getResourcesOfType(unref(rom) as Rom, unref(type) as (typeof ResourceTypes)[number])
      },
    })
  }

  const getReferencesResourcesLoadedQuery = (
    resource: MaybeRef<number|AllRomResources>,
  ) => {

    return useQuery({
      queryKey: ['getReferencesResourcesLoaded', resource, romDetails],
      queryFn: async () => {
        if (!unref(rom)) {
          throw new Error('ROM not loaded')
        }
        return getReferencesResourcesLoaded(unref(rom)!, unref(resource))
      },
    })
  }

  const resourceLoader = computed(() => {
    let _usingRom = false
    if (rom.value) {
      _usingRom = true
    }
    return {
      _usingRom,
      useGetResourceQuery,
      useGetResourceLoadedQuery,
      getResourceListOfTypeQuery,
      getReferencesResourcesLoadedQuery,
    }
  })
  return resourceLoader
}
