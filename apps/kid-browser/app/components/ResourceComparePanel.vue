<template>
  <div class="flex h-full min-h-0 flex-col">
    <div class="border-default flex shrink-0 flex-wrap items-center gap-1.5 border-b pb-2">
      <p class="text-highlighted text-xs font-semibold">Compare with</p>
      <UInput
        v-model="compareSearch"
        icon="i-heroicons-magnifying-glass"
        size="xs"
        class="w-40"
        aria-label="Search visual resources to compare"
        placeholder="Filter…"
      />
      <USelect
        :model-value="compareKey"
        :items="candidateOptions"
        size="xs"
        class="min-w-0 flex-1"
        placeholder="Select a visual resource"
        aria-label="Comparison resource"
        @update:model-value="setCompareKey"
      />
      <UButton
        v-if="compareAddress !== null"
        icon="i-heroicons-x-mark"
        color="neutral"
        variant="ghost"
        size="xs"
        square
        aria-label="Clear comparison"
        @click="clearComparison"
      />
    </div>

    <p v-if="candidateCount > CANDIDATE_LIMIT" class="text-dimmed shrink-0 pt-1 text-[10px]">
      Showing the first {{ CANDIDATE_LIMIT }} of {{ candidateCount }} visual resources. Refine the
      filter to reach the rest.
    </p>

    <div class="min-h-0 flex-1 pt-2">
      <div
        v-if="compareAddress === null"
        class="flex h-full min-h-40 items-center justify-center p-3 text-center"
      >
        <p class="text-muted max-w-xs text-xs">
          Select a second visual resource to render both side by side.
        </p>
      </div>
      <div v-else-if="isPending" class="flex h-full min-h-40 items-center justify-center">
        <UIcon name="i-heroicons-arrow-path" class="text-primary size-6 animate-spin" />
      </div>
      <UAlert
        v-else-if="isError"
        color="error"
        variant="subtle"
        icon="i-heroicons-exclamation-triangle"
        title="Error loading comparison resource"
        :description="error?.message"
      />
      <VisualResourceView v-else-if="compareResource" :resource="compareResource" />
      <div v-else class="flex h-full min-h-40 items-center justify-center p-3 text-center">
        <p class="text-muted text-xs">This address has no decodable resource to compare.</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { AllRomResources } from '@repo/kid-util'
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

const compareKey = computed(() =>
  compareAddress.value === null ? '' : String(compareAddress.value),
)

function setCompareKey(value: unknown) {
  const parsed = typeof value === 'number' ? value : Number(value)
  compareAddress.value = Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

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
    .slice(0, CANDIDATE_LIMIT)
    .map((entry) => ({
      label: `${entry.name} · ${entry.typeLabel} · ${addressFormat(entry.address)}`,
      value: String(entry.address),
    })),
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
