import useRomStore from '~/stores/romStore'
import { ResourceTypes, Rom, type ResourceType } from '@repo/kid-util'
import { useQuery } from '@tanstack/vue-query'
import { storeToRefs } from 'pinia'
import { computed, unref, type MaybeRef } from 'vue'

const getLoadedResource = (rom: Rom, address: number) => {
  return rom.resources.getResourceLoaded(address)
}

const getResource = (rom: Rom, address: number) => {
  return rom.resources.getResource(address)
}

const getReferencesResources = (rom: Rom, resourceAddress: number) => {
  return rom.resources.getReferencesResources(resourceAddress)
}

const getReferencesResourcesLoaded = (rom: Rom, resourceAddress: number) => {
  return rom.resources.getReferencesResourcesLoaded(resourceAddress)
}

const getReferencedByResources = (rom: Rom, resourceAddress: number) => {
  return rom.resources.getMultipleResources(rom.resources.getReferencedBy(resourceAddress))
}

const getReferencedByResourcesLoaded = (rom: Rom, resourceAddress: number) => {
  return rom.resources.getMultipleResourcesLoaded(rom.resources.getReferencedBy(resourceAddress))
}

const getResourcesOfType = <T extends (typeof ResourceTypes)[number]>(rom: Rom, type: T | T[]) => {
  return rom.resources.getResourcesByType<T>(type)
}

export function useResourceLoader() {
  const { rom } = storeToRefs(useRomStore())
  const hasRom = computed(() => !!rom.value)

  const isValidAddress = (value: unknown): value is number => {
    return typeof value === 'number' && Number.isFinite(value)
  }

  const getRomOrThrow = (): Rom => {
    if (!rom.value) {
      throw new Error('ROM not loaded')
    }
    return rom.value as Rom
  }

  const useGetResourceQuery = (address: MaybeRef<number | null | undefined>) => {
    const addressValue = computed(() => unref(address))
    const enabled = computed(() => hasRom.value && isValidAddress(addressValue.value))
    return useQuery({
      queryKey: computed(() => ['resource', addressValue.value] as const),
      queryFn: () => {
        if (!isValidAddress(addressValue.value)) {
          throw new Error('Invalid resource address')
        }
        return getResource(getRomOrThrow(), addressValue.value)
      },
      enabled,
    })
  }

  const useGetResourceLoadedQuery = (
    address: MaybeRef<number | null | undefined>,
    enabled: MaybeRef<boolean> = true,
  ) => {
    const addressValue = computed(() => unref(address))
    const queryEnabled = computed(
      () => hasRom.value && isValidAddress(addressValue.value) && unref(enabled),
    )

    return useQuery({
      queryKey: computed(() => ['resource-loaded', addressValue.value] as const),
      queryFn: () => {
        if (!isValidAddress(addressValue.value)) {
          throw new Error('Invalid resource address')
        }
        return getLoadedResource(getRomOrThrow(), addressValue.value)
      },
      enabled: queryEnabled,
    })
  }

  const getResourceListOfTypeQuery = (
    type: MaybeRef<ResourceType | ResourceType[]>,
  ) => {
    const typeValue = computed(() => unref(type))
    const typeKey = computed(() =>
      Array.isArray(typeValue.value) ? typeValue.value.join('|') : typeValue.value,
    )

    return useQuery({
      queryKey: computed(() => ['resources-by-type', typeKey.value] as const),
      queryFn: () => {
        return getResourcesOfType(getRomOrThrow(), typeValue.value)
      },
      enabled: hasRom,
    })
  }

  const getReferencesResourcesQuery = (resourceAddress: MaybeRef<number | null | undefined>) => {
    const addressValue = computed(() => unref(resourceAddress))
    const enabled = computed(() => hasRom.value && isValidAddress(addressValue.value))

    return useQuery({
      queryKey: computed(() => ['resource-references', addressValue.value] as const),
      queryFn: () => {
        if (!isValidAddress(addressValue.value)) {
          throw new Error('Invalid resource address')
        }
        return getReferencesResources(getRomOrThrow(), addressValue.value)
      },
      enabled,
    })
  }

  const getReferencesResourcesLoadedQuery = (
    resourceAddress: MaybeRef<number | null | undefined>,
  ) => {
    const addressValue = computed(() => unref(resourceAddress))
    const enabled = computed(() => hasRom.value && isValidAddress(addressValue.value))

    return useQuery({
      queryKey: computed(() => ['resource-references-loaded', addressValue.value] as const),
      queryFn: () => {
        if (!isValidAddress(addressValue.value)) {
          throw new Error('Invalid resource address')
        }
        return getReferencesResourcesLoaded(getRomOrThrow(), addressValue.value)
      },
      enabled,
    })
  }

  const getReferencedByResourcesQuery = (
    resourceAddress: MaybeRef<number | null | undefined>,
  ) => {
    const addressValue = computed(() => unref(resourceAddress))
    const enabled = computed(() => hasRom.value && isValidAddress(addressValue.value))

    return useQuery({
      queryKey: computed(() => ['resource-referenced-by', addressValue.value] as const),
      queryFn: () => {
        if (!isValidAddress(addressValue.value)) {
          throw new Error('Invalid resource address')
        }
        return getReferencedByResources(getRomOrThrow(), addressValue.value)
      },
      enabled,
    })
  }

  const getReferencedByResourcesLoadedQuery = (
    resourceAddress: MaybeRef<number | null | undefined>,
  ) => {
    const addressValue = computed(() => unref(resourceAddress))
    const enabled = computed(() => hasRom.value && isValidAddress(addressValue.value))

    return useQuery({
      queryKey: computed(() => ['resource-referenced-by-loaded', addressValue.value] as const),
      queryFn: () => {
        if (!isValidAddress(addressValue.value)) {
          throw new Error('Invalid resource address')
        }
        return getReferencedByResourcesLoaded(getRomOrThrow(), addressValue.value)
      },
      enabled,
    })
  }

  return {
    hasRom,
    useGetResourceQuery,
    useGetResourceLoadedQuery,
    getResourceListOfTypeQuery,
    getReferencesResourcesQuery,
    getReferencesResourcesLoadedQuery,
    getReferencedByResourcesQuery,
    getReferencedByResourcesLoadedQuery,
  }
}
