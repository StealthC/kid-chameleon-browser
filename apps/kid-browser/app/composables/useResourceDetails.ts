import { isLoadedResource } from '@repo/kid-util'
import { storeToRefs } from 'pinia'
import { computed, unref, type MaybeRef } from 'vue'
import { useResourceLoader } from '~/composables/useResourceLoader'
import useRomStore from '~/stores/romStore'
import { addressFormat, getNameForType } from '~/utils/index'

export function useResourceDetails(resourceAddress: MaybeRef<number>) {
  const { rom } = storeToRefs(useRomStore())
  const loader = useResourceLoader()

  const resourceAddressValue = computed(() => unref(resourceAddress))
  const resource = loader.useGetResourceLoadedQuery(resourceAddressValue)
  const referencesQuery = loader.getReferencesResourcesQuery(resourceAddressValue)

  const references = computed(() => referencesQuery.data.value ?? [])
  const { isError, isPending } = resource

  const title = computed(() => {
    let str = `Resource Viewer: (${addressFormat(resourceAddressValue.value)})`
    if (resource.data.value) {
      str += ` - ${getNameForType(resource.data.value.type)}`
      if (resource.data.value.name) str += ` - ${resource.data.value.name}`
    }
    return str
  })

  const hexData = computed(() => {
    if (!resource.data.value || !isLoadedResource(resource.data.value) || !rom.value) return null

    return {
      inputData: rom.value.bytes.subarray(
        resource.data.value.baseAddress,
        resource.data.value.baseAddress + resource.data.value.inputSize,
      ),
      inputAddress: resource.data.value.baseAddress,
    }
  })

  return {
    resource,
    references,
    isError,
    isPending,
    title,
    hexData,
  }
}
