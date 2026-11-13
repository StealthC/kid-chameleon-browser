<template>
  <AppPanel
    :title="title"
    icon="i-heroicons-code-bracket-square"
    :padded="false"
    class="font-mono text-xs"
  >
    <template #actions>
      <UButton
        :label="toolsOpen ? 'Hide tools' : 'Tools'"
        icon="i-heroicons-adjustments-horizontal"
        color="neutral"
        :variant="toolsOpen ? 'soft' : 'ghost'"
        size="xs"
        :aria-pressed="toolsOpen"
        @click="toolsOpen = !toolsOpen"
      />
      <UButton
        :label="copiedAll ? 'Copied' : 'Copy all'"
        icon="i-heroicons-clipboard-document"
        color="neutral"
        variant="ghost"
        size="xs"
        @click="copyAll"
      />
    </template>

    <div class="flex h-full min-h-0 flex-col">
      <div class="border-default shrink-0 space-y-2 border-b p-2.5">
        <div class="text-muted flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]">
          <span
            >Range: <span class="text-highlighted">{{ rangeLabel }}</span></span
          >
          <span>
            Size: <span class="text-highlighted">{{ data.length }}</span> bytes
            <span v-if="data.length > 0"> (0x{{ data.length.toString(16).toUpperCase() }})</span>
          </span>
          <span
            v-if="declaredSize !== undefined && declaredSize !== data.length"
            class="text-warning"
          >
            Declared {{ declaredSize }} bytes; {{ data.length }} available.
          </span>
        </div>

        <div v-if="toolsOpen" class="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          <div class="border-default bg-muted/30 rounded-md border p-2">
            <label class="text-dimmed text-[10px] tracking-wide uppercase" for="hex-jump-offset">
              Jump to offset
            </label>
            <div class="mt-1 flex items-center gap-1">
              <UInput
                id="hex-jump-offset"
                v-model="offsetInput"
                size="xs"
                class="min-w-0 flex-1 font-mono"
                placeholder="1A0, $1A0, 0x1A0"
                @keydown.enter.prevent="jumpToOffset"
              />
              <UButton
                label="Go"
                color="primary"
                variant="soft"
                size="xs"
                :disabled="data.length === 0"
                @click="jumpToOffset"
              />
            </div>
          </div>

          <div class="border-default bg-muted/30 rounded-md border p-2">
            <label class="text-dimmed text-[10px] tracking-wide uppercase" for="hex-jump-address">
              Jump to address
            </label>
            <div class="mt-1 flex items-center gap-1">
              <UInput
                id="hex-jump-address"
                v-model="addressInput"
                size="xs"
                class="min-w-0 flex-1 font-mono"
                :placeholder="`${addressFormat(baseAddress)}–${addressFormat(rangeEndInclusive)}`"
                @keydown.enter.prevent="jumpToAddress"
              />
              <UButton
                label="Go"
                color="primary"
                variant="soft"
                size="xs"
                :disabled="data.length === 0"
                @click="jumpToAddress"
              />
            </div>
          </div>

          <div class="border-default bg-muted/30 rounded-md border p-2 sm:col-span-2 xl:col-span-1">
            <label class="text-dimmed text-[10px] tracking-wide uppercase" for="hex-search">
              Search bytes
            </label>
            <div class="mt-1 flex items-center gap-1">
              <UInput
                id="hex-search"
                v-model="searchInput"
                size="xs"
                class="min-w-0 flex-1 font-mono"
                placeholder="DE AD BE EF"
                @keydown.enter.prevent="runSearch"
              />
              <UButton
                icon="i-heroicons-magnifying-glass"
                color="primary"
                variant="soft"
                size="xs"
                square
                aria-label="Search byte sequence"
                :disabled="data.length === 0"
                @click="runSearch"
              />
              <UButton
                icon="i-heroicons-chevron-left"
                color="neutral"
                variant="ghost"
                size="xs"
                square
                aria-label="Previous match"
                :disabled="searchMatches.length === 0"
                @click="stepMatch(-1)"
              />
              <UButton
                icon="i-heroicons-chevron-right"
                color="neutral"
                variant="ghost"
                size="xs"
                square
                aria-label="Next match"
                :disabled="searchMatches.length === 0"
                @click="stepMatch(1)"
              />
            </div>
            <p v-if="searchError" class="text-warning mt-1 text-[10px]">{{ searchError }}</p>
            <p v-else-if="searchMatches.length > 0" class="text-muted mt-1 text-[10px]">
              {{ activeMatch + 1 }} / {{ searchMatches.length }} at
              {{ addressFormat(baseAddress + searchMatches[activeMatch]) }}
            </p>
            <p v-else-if="searchedSequence" class="text-warning mt-1 text-[10px]">
              No matches for {{ searchedSequence }}.
            </p>
          </div>
        </div>

        <p v-if="jumpError" class="text-warning text-[11px]">{{ jumpError }}</p>
        <p v-else-if="jumpStatus" class="text-muted text-[11px]">{{ jumpStatus }}</p>
      </div>

      <div
        class="border-default flex shrink-0 flex-wrap items-center justify-between gap-2 border-b px-2.5 py-1.5"
      >
        <div class="flex items-center gap-0.5">
          <UButton
            icon="i-heroicons-chevron-double-left"
            color="neutral"
            variant="ghost"
            size="xs"
            square
            aria-label="First page"
            :disabled="!pageState.hasPrevious"
            @click="goToPage(0)"
          />
          <UButton
            icon="i-heroicons-chevron-left"
            color="neutral"
            variant="ghost"
            size="xs"
            square
            aria-label="Previous page"
            :disabled="!pageState.hasPrevious"
            @click="goToPage(pageState.page - 1)"
          />
          <span class="text-muted px-1 text-[10px]">
            Page {{ pageState.page + 1 }} / {{ pageState.pageCount }}
          </span>
          <UButton
            icon="i-heroicons-chevron-right"
            color="neutral"
            variant="ghost"
            size="xs"
            square
            aria-label="Next page"
            :disabled="!pageState.hasNext"
            @click="goToPage(pageState.page + 1)"
          />
          <UButton
            icon="i-heroicons-chevron-double-right"
            color="neutral"
            variant="ghost"
            size="xs"
            square
            aria-label="Last page"
            :disabled="!pageState.hasNext"
            @click="goToPage(pageState.pageCount - 1)"
          />
        </div>

        <div class="flex flex-wrap items-center gap-1">
          <span v-if="selection" class="text-muted mr-1 text-[10px]">
            {{ selectionLength(selection) }} byte(s) at
            {{ formatHexRange(baseAddress + selection.start, selectionLength(selection)) }}
          </span>
          <UButton
            label="Copy selection"
            icon="i-heroicons-clipboard-document"
            color="neutral"
            variant="ghost"
            size="xs"
            :disabled="!selection"
            @click="copySelection"
          />
          <UButton
            label="Clear"
            color="neutral"
            variant="ghost"
            size="xs"
            :disabled="!selection"
            @click="clearSelection"
          />
          <UButton
            label="Select page"
            color="neutral"
            variant="ghost"
            size="xs"
            :disabled="data.length === 0"
            @click="selectPage"
          />
        </div>
      </div>

      <div class="min-h-0 flex-1 overflow-auto">
        <div v-if="rows.length > 0" class="min-w-max p-2">
          <div
            class="bg-default/90 text-dimmed sticky top-0 z-10 mb-1 flex gap-3 px-1 py-0.5 text-[10px] tracking-wide uppercase backdrop-blur"
          >
            <span class="w-14 shrink-0">Address</span>
            <span>Bytes</span>
            <span class="ml-auto">ASCII</span>
          </div>
          <div
            v-for="row in rows"
            :key="row.offset"
            class="hover:bg-elevated/60 flex items-center gap-3 rounded px-1 leading-5"
          >
            <span class="text-muted w-14 shrink-0 select-none">
              {{ formatHexAddress(row.address, 6) }}
            </span>
            <span class="flex gap-px">
              <button
                v-for="byte in row.bytes"
                :key="byte.index"
                type="button"
                class="w-6 rounded text-center transition-colors"
                :class="byteClass(byte.index)"
                :aria-label="`Byte ${byte.index} at ${addressFormat(baseAddress + byte.index)}`"
                @mousedown.prevent="selectByte(byte.index, $event)"
              >
                {{ byte.hex }}
              </button>
            </span>
            <span class="text-muted ml-auto tracking-widest select-none">{{ row.ascii }}</span>
          </div>
        </div>
        <div v-else class="p-3">
          <p class="text-muted text-xs">No data available for this resource.</p>
        </div>
      </div>

      <p
        v-if="copyMessage"
        class="border-default shrink-0 border-t px-2.5 py-1 text-[11px]"
        :class="copyMessageIsError ? 'text-warning' : 'text-success'"
      >
        {{ copyMessage }}
      </p>
    </div>
  </AppPanel>
</template>

<script setup lang="ts">
import { useMediaQuery } from '@vueuse/core'
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { addressFormat } from '~/utils/index'
import {
  bytesToHex,
  findByteSequence,
  formatHexAddress,
  formatHexRange,
  formatHexByte,
  getHexPageState,
  normalizeSelection,
  pageForIndex,
  parseHexByteSequence,
  parseHexNumber,
  selectionLength,
  toAscii,
  type HexSelection,
} from '~/utils/hex'

export type Props = {
  title?: string
  address?: number
  data: Uint8Array
  columns?: number
  pageSize?: number
  declaredSize?: number
}

type HexByteCell = {
  index: number
  hex: string
}

type HexRow = {
  offset: number
  address: number
  bytes: HexByteCell[]
  ascii: string
}

const props = defineProps<Props>()

const baseAddress = computed(() => props.address ?? 0)
const columns = computed(() => Math.max(1, Math.min(32, props.columns ?? 16)))
const pageSize = computed(() => Math.max(columns.value, props.pageSize ?? 256))
const rangeEndInclusive = computed(() =>
  props.data.length > 0 ? baseAddress.value + props.data.length - 1 : baseAddress.value,
)
const rangeLabel = computed(() => formatHexRange(baseAddress.value, props.data.length))

const isMobile = useMediaQuery('(max-width: 767px)')
const toolsOpen = ref(!isMobile.value)
const page = ref(0)
const pageState = computed(() => getHexPageState(props.data.length, page.value, pageSize.value))

watch(pageState, (state) => {
  if (state.page !== page.value) {
    page.value = state.page
  }
})

watch(
  () => [props.address, props.data],
  () => {
    page.value = 0
    anchorIndex.value = null
    focusIndex.value = null
    searchInput.value = ''
    clearSearch()
    jumpError.value = null
    jumpStatus.value = null
  },
)

watch(
  () => props.data.length,
  (length) => {
    if (length === 0) {
      page.value = 0
    }
  },
)

const rows = computed<HexRow[]>(() => {
  const data = props.data
  const state = pageState.value
  const columnCount = columns.value
  const result: HexRow[] = []

  for (let offset = state.offsetStart; offset < state.offsetEnd; offset += columnCount) {
    const rowEnd = Math.min(offset + columnCount, state.offsetEnd)
    const bytes: HexByteCell[] = []
    let ascii = ''

    for (let index = offset; index < rowEnd; index++) {
      const byte = data[index]
      if (byte === undefined) {
        continue
      }
      bytes.push({ index, hex: formatHexByte(byte) })
      ascii += toAscii(byte)
    }

    result.push({
      offset,
      address: baseAddress.value + offset,
      bytes,
      ascii,
    })
  }

  return result
})

const anchorIndex = ref<number | null>(null)
const focusIndex = ref<number | null>(null)

const selection = computed<HexSelection | null>(() => {
  if (anchorIndex.value === null) {
    return null
  }
  return normalizeSelection(
    anchorIndex.value,
    focusIndex.value ?? anchorIndex.value,
    props.data.length,
  )
})

const searchInput = ref('')
const searchError = ref<string | null>(null)
const searchMatches = ref<number[]>([])
const searchedSequence = ref('')
const activeMatch = ref(0)

const matchSet = computed(() => new Set(searchMatches.value))
const activeMatchOffset = computed(() => searchMatches.value[activeMatch.value] ?? null)

function isSelected(index: number): boolean {
  return selection.value !== null && index >= selection.value.start && index <= selection.value.end
}

function byteClass(index: number): string {
  if (isSelected(index)) {
    return 'bg-primary text-inverted'
  }
  if (index === activeMatchOffset.value) {
    return 'bg-warning text-inverted'
  }
  if (matchSet.value.has(index)) {
    return 'bg-warning/25 text-warning'
  }
  return 'text-default hover:bg-elevated'
}

function selectByte(index: number, event: MouseEvent) {
  if (event.shiftKey && anchorIndex.value !== null) {
    focusIndex.value = index
    return
  }
  anchorIndex.value = index
  focusIndex.value = index
}

function clearSelection() {
  anchorIndex.value = null
  focusIndex.value = null
}

function selectPage() {
  if (props.data.length === 0) {
    return
  }
  anchorIndex.value = pageState.value.offsetStart
  focusIndex.value = Math.max(pageState.value.offsetStart, pageState.value.offsetEnd - 1)
}

function goToPage(nextPage: number) {
  page.value = Math.max(0, Math.min(nextPage, pageState.value.pageCount - 1))
}

const offsetInput = ref('')
const addressInput = ref('')
const jumpError = ref<string | null>(null)
const jumpStatus = ref<string | null>(null)

function jumpToOffset() {
  jumpStatus.value = null
  const value = parseHexNumber(offsetInput.value)
  if (value === null) {
    jumpError.value = 'Invalid offset. Use hexadecimal digits, for example 1A0, $1A0 or 0x1A0.'
    return
  }

  if (props.data.length === 0) {
    jumpError.value = `This resource has no bytes to jump into (${rangeLabel.value}).`
    return
  }

  if (value >= props.data.length) {
    jumpError.value = `Offset ${formatHexAddress(value)} is outside 0–${formatHexAddress(props.data.length - 1)} for this range.`
    return
  }

  jumpError.value = null
  page.value = pageForIndex(value, pageSize.value, props.data.length)
  jumpStatus.value = `Moved to offset ${formatHexAddress(value)} (${addressFormat(baseAddress.value + value)}).`
}

function jumpToAddress() {
  jumpStatus.value = null
  const value = parseHexNumber(addressInput.value)
  if (value === null) {
    jumpError.value = 'Invalid address. Use hexadecimal digits, for example $A09FE or 0xA09FE.'
    return
  }

  if (props.data.length === 0) {
    jumpError.value = `This resource has no readable bytes (range ${rangeLabel.value}).`
    return
  }

  if (value < baseAddress.value || value >= baseAddress.value + props.data.length) {
    jumpError.value = `Address ${addressFormat(value)} is outside ${formatHexRange(baseAddress.value, props.data.length)}.`
    return
  }

  jumpError.value = null
  page.value = pageForIndex(value - baseAddress.value, pageSize.value, props.data.length)
  jumpStatus.value = `Moved to ${addressFormat(value)} (offset ${formatHexAddress(value - baseAddress.value)}).`
}

function runSearch() {
  const parsed = parseHexByteSequence(searchInput.value)
  if (parsed.error !== null) {
    searchError.value = parsed.error
    searchMatches.value = []
    searchedSequence.value = ''
    return
  }

  searchError.value = null
  searchedSequence.value = Array.from(parsed.bytes, formatHexByte).join(' ')
  searchMatches.value = findByteSequence(props.data, parsed.bytes)
  activeMatch.value = 0

  if (searchMatches.value.length > 0) {
    page.value = pageForIndex(searchMatches.value[0], pageSize.value, props.data.length)
  }
}

function clearSearch() {
  searchError.value = null
  searchMatches.value = []
  searchedSequence.value = ''
  activeMatch.value = 0
}

function stepMatch(direction: number) {
  if (searchMatches.value.length === 0) {
    return
  }
  const count = searchMatches.value.length
  activeMatch.value = (activeMatch.value + direction + count) % count
  page.value = pageForIndex(
    searchMatches.value[activeMatch.value],
    pageSize.value,
    props.data.length,
  )
}

const copyMessage = ref('')
const copyMessageIsError = ref(false)
const copiedAll = ref(false)
let copyTimer: number | undefined

function showCopyMessage(message: string, isError = false) {
  copyMessage.value = message
  copyMessageIsError.value = isError
  if (typeof window !== 'undefined') {
    if (copyTimer !== undefined) {
      window.clearTimeout(copyTimer)
    }
    copyTimer = window.setTimeout(() => {
      copyMessage.value = ''
      copiedAll.value = false
    }, 1800)
  }
}

async function copyText(text: string, label: string) {
  if (typeof navigator === 'undefined' || !navigator.clipboard) {
    showCopyMessage('Clipboard is not available in this browser.', true)
    return
  }

  try {
    await navigator.clipboard.writeText(text)
    showCopyMessage(`${label} copied (${text.length} characters).`)
  } catch (error) {
    showCopyMessage(
      `Copy failed: ${error instanceof Error ? error.message : 'unknown error'}`,
      true,
    )
  }
}

function copyAll() {
  if (props.data.length === 0) {
    showCopyMessage('There are no bytes to copy.', true)
    return
  }
  copiedAll.value = true
  void copyText(bytesToHex(props.data), 'All bytes')
}

function copySelection() {
  if (!selection.value) {
    showCopyMessage('Select one or more bytes first.', true)
    return
  }
  const bytes = props.data.subarray(selection.value.start, selection.value.end + 1)
  void copyText(bytesToHex(bytes), 'Selected bytes')
}

onBeforeUnmount(() => {
  if (typeof window !== 'undefined' && copyTimer !== undefined) {
    window.clearTimeout(copyTimer)
  }
})
</script>
