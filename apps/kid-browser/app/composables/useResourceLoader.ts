import useRomStore from '~/stores/romStore'
import { ResourceTypes, Rom, type AllRomResources, type ResourceType } from '@repo/kid-util'
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

export type RelatedResourceWithKind = {
  resource: AllRomResources
  kind: 'hard' | 'soft'
}

const getReferencesResourcesWithKind = (
  rom: Rom,
  resourceAddress: number,
): RelatedResourceWithKind[] => {
  return rom.resources.getReferences(resourceAddress).flatMap((targetAddress) => {
    const resource = rom.resources.getResource(targetAddress)
    const kind = rom.resources.getReferenceKind(resourceAddress, targetAddress)
    if (!resource || !kind) {
      return []
    }
    return [{ resource, kind }]
  })
}

const getReferencedByResourcesWithKind = (
  rom: Rom,
  resourceAddress: number,
): RelatedResourceWithKind[] => {
  return rom.resources.getReferencedBy(resourceAddress).flatMap((sourceAddress) => {
    const resource = rom.resources.getResource(sourceAddress)
    const kind = rom.resources.getReferenceKind(sourceAddress, resourceAddress)
    if (!resource || !kind) {
      return []
    }
    return [{ resource, kind }]
  })
}

const getResourcesOfType = <T extends (typeof ResourceTypes)[number]>(rom: Rom, type: T | T[]) => {
  return rom.resources.getResourcesByType<T>(type)
}

export function useResourceLoader() {
  const { rom, romSessionKey } = storeToRefs(useRomStore())
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
      queryKey: computed(() => ['resource', romSessionKey.value, addressValue.value] as const),
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
      queryKey: computed(() => ['resource-loaded', romSessionKey.value, addressValue.value] as const),
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
      queryKey: computed(() => ['resources-by-type', romSessionKey.value, typeKey.value] as const),
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
      queryKey: computed(
        () => ['resource-references', romSessionKey.value, addressValue.value] as const,
      ),
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
      queryKey: computed(
        () => ['resource-references-loaded', romSessionKey.value, addressValue.value] as const,
      ),
      queryFn: () => {
        if (!isValidAddress(addressValue.value)) {
          throw new Error('Invalid resource address')
        }
        return getReferencesResourcesLoaded(getRomOrThrow(), addressValue.value)
      },
      enabled,
    })
  }

  const getReferencesResourcesWithKindQuery = (
    resourceAddress: MaybeRef<number | null | undefined>,
  ) => {
    const addressValue = computed(() => unref(resourceAddress))
    const enabled = computed(() => hasRom.value && isValidAddress(addressValue.value))

    return useQuery({
      queryKey: computed(
        () => ['resource-references-kind', romSessionKey.value, addressValue.value] as const,
      ),
      queryFn: () => {
        if (!isValidAddress(addressValue.value)) {
          throw new Error('Invalid resource address')
        }
        return getReferencesResourcesWithKind(getRomOrThrow(), addressValue.value)
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
      queryKey: computed(
        () => ['resource-referenced-by', romSessionKey.value, addressValue.value] as const,
      ),
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
      queryKey: computed(
        () => ['resource-referenced-by-loaded', romSessionKey.value, addressValue.value] as const,
      ),
      queryFn: () => {
        if (!isValidAddress(addressValue.value)) {
          throw new Error('Invalid resource address')
        }
        return getReferencedByResourcesLoaded(getRomOrThrow(), addressValue.value)
      },
      enabled,
    })
  }

  const getReferencedByResourcesWithKindQuery = (
    resourceAddress: MaybeRef<number | null | undefined>,
  ) => {
    const addressValue = computed(() => unref(resourceAddress))
    const enabled = computed(() => hasRom.value && isValidAddress(addressValue.value))

    return useQuery({
      queryKey: computed(
        () => ['resource-referenced-by-kind', romSessionKey.value, addressValue.value] as const,
      ),
      queryFn: () => {
        if (!isValidAddress(addressValue.value)) {
          throw new Error('Invalid resource address')
        }
        return getReferencedByResourcesWithKind(getRomOrThrow(), addressValue.value)
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
    getReferencesResourcesWithKindQuery,
    getReferencedByResourcesQuery,
    getReferencedByResourcesLoadedQuery,
    getReferencedByResourcesWithKindQuery,
  }
}
