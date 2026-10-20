<template>
  <div class="border-border/60 flex h-full min-h-0 flex-col rounded-md border bg-indigo-950/55 p-3">
    <div class="mb-2 flex flex-wrap items-center gap-2">
      <p class="text-sm font-semibold">Compare with</p>
      <Input
        v-model="compareSearch"
        class="h-8 max-w-56 font-mono text-xs"
        aria-label="Search visual resources to compare"
        placeholder="Filter by name or hex address…"
      />
      <Select v-model="compareKey">
        <SelectTrigger class="h-8 w-72 max-w-full" aria-label="Comparison resource">
          <SelectValue placeholder="Select a visual resource" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem v-for="entry in candidateOptions" :key="entry.address" :value="String(entry.address)">
            {{ entry.name }} · {{ entry.typeLabel }} · {{ addressFormat(entry.address) }}
          </SelectItem>
        </SelectContent>
      </Select>
      <Button v-if="compareAddress !== null" size="sm" variant="ghost" @click="clearComparison">
        Clear
      </Button>
    </div>

    <p v-if="candidateCount > CANDIDATE_LIMIT" class="text-muted-foreground mb-2 text-[11px]">
      Showing the first {{ CANDIDATE_LIMIT }} of {{ candidateCount }} visual resources. Refine the
      filter to reach the rest.
    </p>

    <div class="min-h-0 flex-1">
      <div v-if="compareAddress === null" class="text-muted-foreground flex h-full min-h-48 items-center justify-center p-4 text-center text-sm">
        Select a second visual resource to render both side by side.
      </div>
      <div v-else-if="isPending" class="flex h-full min-h-48 items-center justify-center">
        <div class="border-primary h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"></div>
      </div>
      <div v-else-if="isError" class="rounded bg-red-900/50 p-3 text-red-300">
        Error loading comparison resource:
        <div class="mt-1 font-mono text-white">{{ error?.message }}</div>
      </div>
      <VisualResourceView v-else-if="compareResource" :resource="compareResource" />
      <div v-else class="text-muted-foreground flex h-full min-h-48 items-center justify-center p-4 text-center text-sm">
        This address has no decodable resource to compare.
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { AllRomResources } from '@repo/kid-util'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { useResourceLoader } from '~/composables/useResourceLoader'
import { useResourcesIndex } from '~/composables/useResourcesIndex'
import { addressFormat } from '~/utils/index'
import { matchesResourceQuery } from '~/utils/resourceSearch'
import { isVisualResourceType } from '~/utils/resourceVisuals'

const CANDIDATE_LIMIT = 400

interface Props {
  currentResource: AllRomResources
}

const props = defineProps<Props>()
const { allResources } = useResourcesIndex()
const loader = useResourceLoader()

const compareSearch = ref('')
const compareAddress = ref<number | null>(null)

const compareKey = computed({
  get: () => (compareAddress.value === null ? '' : String(compareAddress.value)),
  set: (value: string) => {
    compareAddress.value = value ? Number(value) : null
  },
})

const visualCandidates = computed(() =>
  allResources.value.filter(
    (entry) =>
      entry.address !== props.currentResource.baseAddress && isVisualResourceType(entry.type),
  ),
)

const candidateCount = computed(() => visualCandidates.value.length)

const candidateOptions = computed(() =>
  visualCandidates.value
    .filter((entry) => matchesResourceQuery(entry, compareSearch.value))
    .slice(0, CANDIDATE_LIMIT),
)

watch(
  () => props.currentResource.baseAddress,
  (address) => {
    if (compareAddress.value === address) {
      compareAddress.value = null
    }
  },
)

const shouldLoad = computed(() => compareAddress.value !== null)
const compareQuery = loader.useGetResourceLoadedQuery(
  computed(() => compareAddress.value),
  shouldLoad,
)

const compareResource = computed(() => compareQuery.data.value ?? null)
const isPending = computed(() => compareQuery.isPending.value)
const isError = computed(() => compareQuery.isError.value)
const error = computed(() => compareQuery.error.value)

function clearComparison() {
  compareAddress.value = null
  compareSearch.value = ''
}
</script>
