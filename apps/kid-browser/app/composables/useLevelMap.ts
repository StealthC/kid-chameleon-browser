import { computed, unref, type MaybeRef } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { storeToRefs } from 'pinia'
import { loadLevelMap, type AllRomResources, type Rom } from '@repo/kid-util'
import useRomStore from '~/stores/romStore'

/**
 * Level list (discovered `level-header` resources, ordered by game level index).
 *
 * The query is gated on `romFullLoaded` (discovery finished), not on the ROM being present:
 * `loadRomData` assigns `rom` before `loadResources()` resolves, so gating earlier would cache an
 * empty list for the whole session.
 */
export function useLevelIndex() {
  const { rom, romSessionKey, romFullLoaded } = storeToRefs(useRomStore())

  const query = useQuery({
    queryKey: computed(() => ['level-headers', romSessionKey.value] as const),
    queryFn: () => {
      const currentRom = rom.value as unknown as Rom | null
      if (!currentRom) {
        return []
      }
      return [...currentRom.resources.getResourcesByType('level-header')]
        .filter(
          (resource): resource is Extract<AllRomResources, { type: 'level-header' }> =>
            resource.type === 'level-header',
        )
        .sort((left, right) => left.levelIndex - right.levelIndex)
    },
    enabled: computed(() => romFullLoaded.value && !!rom.value),
  })

  const levels = computed(() => query.data.value ?? [])

  return {
    levels,
    isLoading: query.isLoading,
    error: query.error,
  }
}

/**
 * Lets the pending overlay paint before the synchronous level composition blocks the main thread.
 * The timer covers background tabs, where animation frames are not delivered.
 */
function nextAnimationFrame(): Promise<void> {
  return new Promise((resolve) => {
    let settled = false
    const finish = () => {
      if (settled) {
        return
      }
      settled = true
      resolve()
    }
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(finish)
    }
    setTimeout(finish, 50)
  })
}

/** Composes header, foreground grid, block stream, enemy layout and background layout. */
export function useLevelMap(headerAddress: MaybeRef<number | null>) {
  const { rom, romSessionKey, romFullLoaded } = storeToRefs(useRomStore())
  const address = computed(() => unref(headerAddress))

  const query = useQuery({
    queryKey: computed(() => ['level-map', romSessionKey.value, address.value] as const),
    queryFn: async () => {
      const currentRom = rom.value as unknown as Rom | null
      const levelAddress = address.value
      if (!currentRom) {
        throw new Error('ROM not loaded')
      }
      if (levelAddress === null) {
        throw new Error('No level selected')
      }
      await nextAnimationFrame()
      return loadLevelMap(currentRom, levelAddress)
    },
    // Wait for discovery: loading a header before the resources exist would raise instead of
    // resolving once the ROM finishes.
    enabled: computed(() => romFullLoaded.value && !!rom.value && address.value !== null),
    // Each composed map now carries indexed foreground/background pixel buffers (1-5 MB); keep
    // only recently inspected levels instead of the whole session's browsing history.
    gcTime: 30_000,
  })

  return query
}
