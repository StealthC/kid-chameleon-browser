import useRomStore from "@/stores/rom"
import { toAddressString, type AllRomResources } from "@repo/kid-util"
import { useQuery } from "@tanstack/vue-query"
import { storeToRefs } from "pinia"
import { computed, unref, type MaybeRef } from "vue"

export function useResourceLoader() {
  const { rom, romDetails } = storeToRefs(useRomStore())
  const useGetResourceQuery = (address: MaybeRef<number>, load = true) => {
    return useQuery({
      queryKey: ['getResource', address, load, romDetails],
      queryFn: async () => {
        if (!rom) {
          throw new Error('No ROM loaded')
        }
        if (!load) {
          return rom.value?.getResource(toAddressString(unref(address))) as AllRomResources
        } else {
          return rom.value?.getLoadedResource(toAddressString(unref(address))) as AllRomResources & {loaded: true}
        }
      },
    })
  }
  const resourceLoader = computed(() => ({
    rom,
    useGetResourceQuery
  }))
  return resourceLoader
}
