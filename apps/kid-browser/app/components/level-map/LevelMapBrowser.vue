<template>
  <div class="bg-default flex h-full min-h-0 flex-col">
    <header class="border-default flex h-11 shrink-0 items-center gap-2 border-b px-3">
      <UIcon name="i-heroicons-map" class="text-primary size-4" />
      <h2 class="text-highlighted text-sm font-semibold">Levels</h2>
      <UBadge
        color="neutral"
        variant="subtle"
        size="sm"
        :label="`${filteredLevelItems.length} / ${levelItems.length}`"
      />
      <div class="ms-auto flex items-center gap-1">
        <UTooltip v-if="collapsible" text="Collapse level browser">
          <UButton
            icon="i-heroicons-x-mark"
            color="neutral"
            variant="ghost"
            size="xs"
            square
            aria-label="Collapse level browser"
            @click="emit('collapse')"
          />
        </UTooltip>
      </div>
    </header>

    <div class="border-default shrink-0 border-b p-2">
      <UInput
        v-model="search"
        icon="i-heroicons-magnifying-glass"
        size="sm"
        placeholder="Filter levels…"
        aria-label="Filter levels"
        class="w-full"
      />
    </div>

    <div class="min-h-0 flex-1 overflow-y-auto p-1">
      <button
        v-for="level in filteredLevelItems"
        :key="level.address"
        type="button"
        class="flex w-full flex-col items-start gap-0.5 rounded-md border px-2 py-1.5 text-left transition-colors"
        :class="
          level.levelIndex === selectedLevelIndex
            ? 'border-primary/40 bg-primary/10'
            : 'hover:bg-elevated/70 border-transparent'
        "
        @click="selectLevel(level.levelIndex)"
      >
        <span class="flex w-full items-baseline justify-between gap-2">
          <span class="text-default min-w-0 truncate text-xs font-medium">
            {{ level.name }}
          </span>
          <span class="text-muted shrink-0 font-mono text-[10px]">
            0x{{ level.levelIndex.toString(16).toUpperCase().padStart(2, '0') }}
          </span>
        </span>
        <span class="text-dimmed font-mono text-[10px]">
          {{ level.widthBlocks }}×{{ level.heightBlocks }} cells · theme {{ level.theme }}
        </span>
      </button>

      <p v-if="filteredLevelItems.length === 0" class="text-muted px-3 py-8 text-center text-xs">
        {{
          levelItems.length === 0
            ? 'No level headers were discovered in this ROM.'
            : 'No levels match the filter.'
        }}
      </p>
    </div>

    <footer class="border-default shrink-0 border-t px-3 py-1.5">
      <p class="text-dimmed text-[10px] leading-tight">
        One row per unique header address; levels sharing a header are grouped.
      </p>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { isLoadedResource, type LevelHeaderRomResourceLoaded } from '@repo/kid-util'
import { useLevelIndex } from '~/composables/useLevelMap'

defineProps<{
  collapsible?: boolean
}>()

const emit = defineEmits<{
  select: [levelIndex: number]
  collapse: []
}>()

const route = useRoute()
const router = useRouter()
const { levels } = useLevelIndex()
const search = ref('')

const levelItems = computed(() =>
  levels.value.map((resource) => {
    const loaded = isLoadedResource(resource)
      ? (resource as LevelHeaderRomResourceLoaded)
      : undefined
    return {
      address: resource.baseAddress,
      levelIndex: resource.levelIndex ?? 0,
      name: resource.name ?? `Level 0x${(resource.levelIndex ?? 0).toString(16)}`,
      widthBlocks: loaded?.widthInBlocks ?? 0,
      heightBlocks: (loaded?.heightInBlocks ?? 0) + (loaded?.yOffsetInBlocks ?? 0),
      theme: loaded?.themeIndex ?? 0,
    }
  }),
)

const filteredLevelItems = computed(() => {
  const term = search.value.trim().toLowerCase()
  if (!term) return levelItems.value
  return levelItems.value.filter(
    (level) =>
      level.name.toLowerCase().includes(term) ||
      level.levelIndex.toString(16).includes(term) ||
      `0x${level.levelIndex.toString(16)}`.includes(term),
  )
})

const selectedLevelIndex = computed<number | null>(() => {
  const raw = route.query.level
  const parsed = typeof raw === 'string' ? Number.parseInt(raw, 16) : Number.NaN
  if (Number.isFinite(parsed)) {
    const match = levelItems.value.find((level) => level.levelIndex === parsed)
    if (match) {
      return match.levelIndex
    }
  }
  return levelItems.value[0]?.levelIndex ?? null
})

function selectLevel(levelIndex: number) {
  void router.replace({ query: { ...route.query, level: levelIndex.toString(16) } })
  emit('select', levelIndex)
}
</script>
