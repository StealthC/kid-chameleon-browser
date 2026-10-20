import { computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import useRomStore from '~/stores/romStore'
import { getResourceRoute } from '~/utils/index'

const HISTORY_LIMIT = 100

export function useResourceNavigation() {
  const router = useRouter()
  const { romSessionKey } = storeToRefs(useRomStore())

  const history = useState<number[]>('resource-nav-history', () => [])
  const cursor = useState<number>('resource-nav-cursor', () => -1)

  watch(romSessionKey, () => {
    history.value = []
    cursor.value = -1
  })

  const currentAddress = computed(() =>
    cursor.value >= 0 && cursor.value < history.value.length ? history.value[cursor.value] : null,
  )
  const canGoBack = computed(() => cursor.value > 0)
  const canGoForward = computed(
    () => cursor.value >= 0 && cursor.value < history.value.length - 1,
  )
  const historyPosition = computed(() =>
    history.value.length === 0 ? '0 / 0' : `${cursor.value + 1} / ${history.value.length}`,
  )

  function recordVisit(address: number) {
    if (!Number.isFinite(address) || address < 0) {
      return
    }

    if (currentAddress.value === address) {
      return
    }

    const next = history.value.slice(0, cursor.value + 1)
    next.push(address)

    const trimmed =
      next.length > HISTORY_LIMIT ? next.slice(next.length - HISTORY_LIMIT) : next

    history.value = trimmed
    cursor.value = trimmed.length - 1
  }

  function navigateToAddress(address: number) {
    return router.push(getResourceRoute(address))
  }

  function goBack() {
    if (!canGoBack.value) {
      return Promise.resolve()
    }
    cursor.value -= 1
    const address = history.value[cursor.value]
    return address === undefined ? Promise.resolve() : navigateToAddress(address)
  }

  function goForward() {
    if (!canGoForward.value) {
      return Promise.resolve()
    }
    cursor.value += 1
    const address = history.value[cursor.value]
    return address === undefined ? Promise.resolve() : navigateToAddress(address)
  }

  return {
    history,
    cursor,
    currentAddress,
    canGoBack,
    canGoForward,
    historyPosition,
    recordVisit,
    navigateToAddress,
    goBack,
    goForward,
  }
}
