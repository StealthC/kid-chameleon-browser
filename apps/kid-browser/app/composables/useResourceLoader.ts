import useRomStore from '~/stores/romStore'
import { ResourceTypes, Rom, type AllRomResources } from '@repo/kid-util'
import { useQuery } from '@tanstack/vue-query'
import { storeToRefs } from 'pinia'
import { computed, unref, type MaybeRef } from 'vue'

const getLoadedResource = (rom: Rom, address: number) => {
  return rom.resources.getResourceLoaded(address)
}

const getResource = (rom: Rom, address: number) => {
  return rom.resources.getResource(address)
}

const getReferencesResources = (rom: Rom, resource: number | AllRomResources) => {
  return rom.resources.getReferencesResources(resource)
}

const getReferencesResourcesLoaded = (rom: Rom, resource: number | AllRomResources) => {
  return rom.resources.getReferencesResourcesLoaded(resource)
}

const getResourcesOfType = <T extends (typeof ResourceTypes)[number]>(rom: Rom, type: T | T[]) => {
  return rom.resources.getResourcesByType<T>(type)
}

export function useResourceLoader() {
  const romStore = storeToRefs(useRomStore())
  const rom = computed(() => romStore.rom.value as Rom | null)

  const useGetResourceQuery = (address: MaybeRef<number>) => {
    return useQuery({
      queryKey: ['getResource', address],
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
      queryKey: ['getResourceLoaded', address],
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
      queryKey: ['getResourcesOfType', type],
      queryFn: async () => {
        if (!rom.value) throw new Error('ROM not loaded')
        return getResourcesOfType(unref(rom) as Rom, unref(type) as (typeof ResourceTypes)[number])
      },
    })
  }

  const getReferencesResourcesQuery = (resource: MaybeRef<number | AllRomResources>) => {
    return useQuery({
      queryKey: ['getReferencesResources', resource],
      queryFn: async () => {
        if (!unref(rom)) throw new Error('ROM not loaded')
        return getReferencesResources(unref(rom)!, unref(resource))
      },
    })
  }

  const getReferencesResourcesLoadedQuery = (resource: MaybeRef<number | AllRomResources>) => {
    return useQuery({
      queryKey: ['getReferencesResourcesLoaded', resource],
      queryFn: async () => {
        if (!unref(rom)) throw new Error('ROM not loaded')
        return getReferencesResourcesLoaded(unref(rom)!, unref(resource))
      },
    })
  }

  const resourceLoader = computed(() => ({
    _usingRom: !!rom.value,
    useGetResourceQuery,
    useGetResourceLoadedQuery,
    getResourceListOfTypeQuery,
    getReferencesResourcesQuery,
    getReferencesResourcesLoadedQuery,
  }))

  return resourceLoader
}
