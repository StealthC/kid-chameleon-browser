<template>
  <GlassPanel :header="title" class="flex flex-col overflow-hidden font-mono text-xs">
    <div class="flex flex-wrap items-center justify-between gap-2 pb-2">
      <div class="text-muted-foreground space-y-0.5">
        <p>Range: {{ rangeLabel }}</p>
        <p>
          Size: {{ data.length }} bytes
          <span v-if="data.length > 0"> (0x{{ data.length.toString(16).toUpperCase() }})</span>
        </p>
        <p v-if="declaredSize !== undefined && declaredSize !== data.length" class="text-amber-300">
          Declared size: {{ declaredSize }} bytes; only {{ data.length }} bytes are available in the ROM.
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-1">
        <Button size="sm" variant="ghost" @click="copyAll">{{ copiedAll ? 'Copied' : 'Copy all hex' }}</Button>
      </div>
    </div>

    <div class="mb-2 grid gap-2 md:grid-cols-2">
      <div class="border-border/60 rounded-md border bg-slate-950/40 p-2">
        <label class="text-muted-foreground text-[10px] uppercase tracking-wide" for="hex-jump-offset">
          Jump to offset (hex)
        </label>
        <div class="mt-1 flex items-center gap-1">
          <Input
            id="hex-jump-offset"
            v-model="offsetInput"
            class="h-8 font-mono text-xs"
            placeholder="e.g. 1A0, $1A0 or 0x1A0"
            @keydown.enter.prevent="jumpToOffset"
          />
          <Button size="sm" variant="secondary" :disabled="data.length === 0" @click="jumpToOffset">Go</Button>
        </div>
      </div>

      <div class="border-border/60 rounded-md border bg-slate-950/40 p-2">
        <label class="text-muted-foreground text-[10px] uppercase tracking-wide" for="hex-jump-address">
          Jump to address (hex)
        </label>
        <div class="mt-1 flex items-center gap-1">
          <Input
            id="hex-jump-address"
            v-model="addressInput"
            class="h-8 font-mono text-xs"
            :placeholder="`${addressFormat(baseAddress)}–${addressFormat(rangeEndInclusive)}`"
            @keydown.enter.prevent="jumpToAddress"
          />
          <Button size="sm" variant="secondary" :disabled="data.length === 0" @click="jumpToAddress">Go</Button>
        </div>
      </div>

      <div class="border-border/60 rounded-md border bg-slate-950/40 p-2 md:col-span-2">
        <label class="text-muted-foreground text-[10px] uppercase tracking-wide" for="hex-search">
          Search byte sequence
        </label>
        <div class="mt-1 flex flex-wrap items-center gap-1">
          <Input
            id="hex-search"
            v-model="searchInput"
            class="h-8 min-w-48 flex-1 font-mono text-xs"
            placeholder="e.g. DE AD BE EF or 0xDEADBEEF"
            @keydown.enter.prevent="runSearch"
          />
          <Button size="sm" variant="secondary" :disabled="data.length === 0" @click="runSearch">Find</Button>
          <Button
            size="sm"
            variant="ghost"
            :disabled="searchMatches.length === 0"
            title="Previous match"
            @click="stepMatch(-1)"
          >
            Prev
          </Button>
          <Button
            size="sm"
            variant="ghost"
            :disabled="searchMatches.length === 0"
            title="Next match"
            @click="stepMatch(1)"
          >
            Next
          </Button>
          <Button v-if="searchMatches.length > 0 || searchError" size="sm" variant="ghost" @click="clearSearch">
            Clear
          </Button>
        </div>
        <p v-if="searchError" class="mt-1 text-amber-300">{{ searchError }}</p>
        <p v-else-if="searchMatches.length > 0" class="text-muted-foreground mt-1">
          Match {{ activeMatch + 1 }} / {{ searchMatches.length }} for {{ searchedSequence }} at
          {{ addressFormat(baseAddress + searchMatches[activeMatch]) }}
        </p>
        <p v-else-if="searchedSequence" class="mt-1 text-amber-300">
          No matches for {{ searchedSequence }} in this range.
        </p>
      </div>

      <div v-if="jumpError" class="rounded-md border border-amber-400/40 bg-amber-950/30 p-2 text-amber-200 md:col-span-2">
        {{ jumpError }}
      </div>
      <div v-if="jumpStatus" class="text-muted-foreground md:col-span-2">{{ jumpStatus }}</div>
    </div>

    <div class="mb-2 flex flex-wrap items-center justify-between gap-2">
      <div class="flex items-center gap-1">
        <Button size="sm" variant="ghost" :disabled="!pageState.hasPrevious" @click="goToPage(0)">
          First
        </Button>
        <Button size="sm" variant="ghost" :disabled="!pageState.hasPrevious" @click="goToPage(pageState.page - 1)">
          Prev page
        </Button>
        <span class="text-muted-foreground px-1">
          Page {{ pageState.page + 1 }} / {{ pageState.pageCount }}
        </span>
        <Button size="sm" variant="ghost" :disabled="!pageState.hasNext" @click="goToPage(pageState.page + 1)">
          Next page
        </Button>
        <Button size="sm" variant="ghost" :disabled="!pageState.hasNext" @click="goToPage(pageState.pageCount - 1)">
          Last
        </Button>
      </div>
      <div class="flex flex-wrap items-center gap-1">
        <span v-if="selection" class="text-muted-foreground">
          Selected {{ selectionLength(selection) }} byte(s) at
          {{ formatHexRange(baseAddress + selection.start, selectionLength(selection)) }}
        </span>
        <Button size="sm" variant="ghost" :disabled="!selection" @click="copySelection">Copy selected</Button>
        <Button size="sm" variant="ghost" :disabled="!selection" @click="clearSelection">Clear selection</Button>
        <Button size="sm" variant="ghost" :disabled="data.length === 0" @click="selectPage">Select page</Button>
      </div>
    </div>

    <ScrollArea class="max-h-72">
      <div v-if="rows.length > 0" class="min-w-max rounded-md border border-border/60 bg-slate-950/55 p-2">
        <div class="text-muted-foreground mb-1 flex gap-3 px-1 text-[10px] uppercase tracking-wide">
          <span class="w-14 shrink-0">Address</span>
          <span>Bytes</span>
          <span class="ml-auto">ASCII</span>
        </div>
        <div
          v-for="row in rows"
          :key="row.offset"
          class="hover:bg-white/5 flex items-center gap-3 rounded px-1 leading-5"
        >
          <span class="text-muted-foreground w-14 shrink-0 select-none">
            {{ addressFormat(row.address, 6) }}
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
          <span class="text-muted-foreground ml-auto select-none tracking-widest">{{ row.ascii }}</span>
        </div>
      </div>
      <div v-else>
        <p class="text-muted-foreground p-2">No data available for this resource.</p>
      </div>
    </ScrollArea>

    <div v-if="copyMessage" class="pt-2" :class="copyMessageIsError ? 'text-amber-300' : 'text-emerald-300'">
      {{ copyMessage }}
    </div>
  </GlassPanel>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { ScrollArea } from '~/components/ui/scroll-area'
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
  return normalizeSelection(anchorIndex.value, focusIndex.value ?? anchorIndex.value, props.data.length)
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
    return 'bg-primary/60 text-primary-foreground'
  }
  if (index === activeMatchOffset.value) {
    return 'bg-amber-300 text-slate-950'
  }
  if (matchSet.value.has(index)) {
    return 'bg-amber-500/30 text-amber-100'
  }
  return 'text-slate-200 hover:bg-white/15'
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
  page.value = pageForIndex(searchMatches.value[activeMatch.value], pageSize.value, props.data.length)
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
    showCopyMessage(`Copy failed: ${error instanceof Error ? error.message : 'unknown error'}`, true)
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
  const bytes = props.data.subarray(
    selection.value.start,
    selection.value.end + 1,
  )
  void copyText(bytesToHex(bytes), 'Selected bytes')
}

onBeforeUnmount(() => {
  if (typeof window !== 'undefined' && copyTimer !== undefined) {
    window.clearTimeout(copyTimer)
  }
})
</script>
