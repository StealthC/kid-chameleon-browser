import { storeToRefs } from 'pinia'
import { computed, unref, type MaybeRef } from 'vue'
import { useResourceLoader } from '~/composables/useResourceLoader'
import useRomStore from '~/stores/romStore'
import { addressFormat, getNameForType } from '~/utils/index'
import { getResourceSize } from '~/utils/resourceSearch'

export function useResourceDetails(resourceAddress: MaybeRef<number>) {
  const { rom } = storeToRefs(useRomStore())
  const loader = useResourceLoader()

  const resourceAddressValue = computed(() => unref(resourceAddress))
  const baseResource = loader.useGetResourceQuery(resourceAddressValue)
  const shouldLoadResource = computed(() => baseResource.data.value?.type !== 'unknown')
  const loadedResource = loader.useGetResourceLoadedQuery(resourceAddressValue, shouldLoadResource)
  const referencesQuery = loader.getReferencesResourcesQuery(resourceAddressValue)
  const referencesWithKindQuery = loader.getReferencesResourcesWithKindQuery(resourceAddressValue)
  const referencedByQuery = loader.getReferencedByResourcesQuery(resourceAddressValue)
  const referencedByWithKindQuery = loader.getReferencedByResourcesWithKindQuery(resourceAddressValue)

  const resource = computed(() => loadedResource.data.value ?? baseResource.data.value)

  const references = computed(() => referencesQuery.data.value ?? [])
  const referencesWithKind = computed(() => referencesWithKindQuery.data.value ?? [])
  const referencedBy = computed(() => referencedByQuery.data.value ?? [])
  const referencedByWithKind = computed(() => referencedByWithKindQuery.data.value ?? [])
  const isPending = computed(() => {
    if (baseResource.isPending.value) {
      return true
    }
    if (shouldLoadResource.value && loadedResource.isPending.value) {
      return true
    }
    return false
  })

  const isError = computed(() => {
    if (baseResource.isError.value) {
      return true
    }
    if (shouldLoadResource.value && loadedResource.isError.value) {
      return true
    }
    return false
  })

  const error = computed(() => baseResource.error.value ?? loadedResource.error.value)

  const title = computed(() => {
    let str = `Resource Viewer: (${addressFormat(resourceAddressValue.value)})`
    if (resource.value) {
      str += ` - ${getNameForType(resource.value.type)}`
      if (resource.value.name) str += ` - ${resource.value.name}`
    }
    return str
  })

  const hexData = computed(() => {
    if (!resource.value || !rom.value) return null

    const declaredSize = getResourceSize(resource.value)
    if (declaredSize === null || declaredSize <= 0) {
      return null
    }

    const start = resource.value.baseAddress
    const end = Math.min(rom.value.bytes.length, start + declaredSize)
    if (end <= start) {
      return null
    }

    return {
      inputData: rom.value.bytes.subarray(start, end),
      inputAddress: start,
      declaredSize,
      truncated: end - start < declaredSize,
    }
  })

  return {
    resource,
    error,
    references,
    referencesWithKind,
    referencedBy,
    referencedByWithKind,
    isError,
    isPending,
    title,
    hexData,
  }
}
