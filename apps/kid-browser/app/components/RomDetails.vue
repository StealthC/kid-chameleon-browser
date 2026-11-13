<template>
  <div v-if="romDetails" class="space-y-4">
    <section class="border-default bg-elevated/30 overflow-hidden rounded-xl border">
      <div class="flex flex-wrap items-center gap-4 p-4 sm:p-5">
        <img src="/logo.png" alt="" class="ring-default size-14 shrink-0 rounded-xl ring-1" />
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-2">
            <h1 class="text-highlighted min-w-0 text-lg font-semibold tracking-tight break-words">
              {{ romName }}
            </h1>
            <UBadge
              :color="
                romDetails.known ? (romDetails.known.hack ? 'warning' : 'success') : 'neutral'
              "
              variant="subtle"
              :label="
                romDetails.known
                  ? romDetails.known.hack
                    ? 'Hack ROM'
                    : 'Known ROM'
                  : 'Unknown ROM'
              "
            />
          </div>
          <p class="text-muted mt-1 truncate font-mono text-[11px]">
            {{ romDetails.sha256 }}
          </p>
          <p class="text-muted mt-1 text-xs">
            {{ romDetails.header.consoleName.trim() || 'Sega Genesis / Mega Drive' }}
            <span aria-hidden="true">·</span>
            {{ romDetails.header.releaseDate.trim() || 'Unknown release' }}
            <span aria-hidden="true">·</span>
            {{ romDetails.header.region.trim() || 'Unknown region' }}
          </p>
        </div>
        <div class="flex w-full flex-wrap items-center gap-2 xl:w-auto xl:shrink-0">
          <UButton
            icon="i-heroicons-squares-2x2"
            color="neutral"
            variant="soft"
            size="sm"
            to="/resources"
          >
            Browse resources
          </UButton>
          <UButton icon="i-heroicons-map" color="neutral" variant="soft" size="sm" to="/levels">
            Level maps
          </UButton>
          <UButton
            class="lg:hidden"
            icon="i-heroicons-arrow-path"
            color="neutral"
            variant="ghost"
            size="sm"
            @click="openRomDialog"
          >
            Change ROM
          </UButton>
        </div>
      </div>

      <dl
        class="divide-default border-default bg-default/40 grid grid-cols-2 divide-x divide-y border-t sm:grid-cols-3 xl:grid-cols-6"
      >
        <div v-for="stat in heroStats" :key="stat.label" class="px-4 py-3">
          <dt class="text-dimmed text-[10px] font-semibold tracking-widest uppercase">
            {{ stat.label }}
          </dt>
          <dd class="text-highlighted mt-0.5 truncate font-mono text-sm font-semibold">
            {{ stat.value }}
          </dd>
          <p v-if="stat.hint" class="text-muted mt-0.5 truncate text-[10px]">{{ stat.hint }}</p>
        </div>
      </dl>
    </section>

    <div class="grid items-start gap-4 xl:grid-cols-2">
      <AppPanel title="File details" icon="i-heroicons-document" :fill="false">
        <dl class="space-y-2 text-sm">
          <div
            v-for="[key, value] in Object.entries(details['File Details'])"
            :key="key"
            class="grid grid-cols-[8rem_minmax(0,1fr)] gap-2"
          >
            <dt class="text-muted">{{ key }}</dt>
            <dd class="text-highlighted font-mono text-[11px] break-all">{{ value }}</dd>
          </div>
        </dl>
      </AppPanel>

      <AppPanel title="ROM header" icon="i-heroicons-cpu-chip" :fill="false">
        <dl class="space-y-2 text-sm">
          <div
            v-for="[key, value] in Object.entries(details['ROM Header'])"
            :key="key"
            class="grid grid-cols-[8rem_minmax(0,1fr)] gap-2"
          >
            <dt class="text-muted">{{ key }}</dt>
            <dd class="text-highlighted text-xs break-words">{{ value }}</dd>
          </div>
        </dl>
      </AppPanel>
    </div>

    <AppPanel title="Resource types" icon="i-heroicons-chart-bar" :fill="false">
      <template #actions>
        <UButton
          icon="i-heroicons-arrow-right"
          color="neutral"
          variant="ghost"
          size="xs"
          to="/resources"
          aria-label="Open resource browser"
        />
      </template>
      <ul class="grid gap-x-6 gap-y-1 sm:grid-cols-2 xl:grid-cols-3">
        <li v-for="entry in typeEntries" :key="entry.type">
          <button
            type="button"
            class="group hover:bg-elevated/70 flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left transition-colors"
            :title="`Browse ${entry.label}`"
            @click="browseType(entry.type)"
          >
            <span class="min-w-0 flex-1">
              <span class="flex items-baseline justify-between gap-2">
                <span class="text-default group-hover:text-highlighted truncate text-xs">
                  {{ entry.label }}
                </span>
                <span class="text-muted font-mono text-[10px]">{{ entry.count }}</span>
              </span>
              <span class="bg-elevated mt-1 block h-1 overflow-hidden rounded-full">
                <span
                  class="bg-primary/70 block h-full rounded-full"
                  :style="{ width: `${entry.percent}%` }"
                />
              </span>
            </span>
          </button>
        </li>
      </ul>
    </AppPanel>

    <AppPanel title="Discovered addresses" icon="i-heroicons-table-cells" :padded="false">
      <template #actions>
        <UBadge color="neutral" variant="subtle" :label="`${knownAddressesRows.length} entries`" />
      </template>
      <div class="max-h-[26rem] overflow-auto">
        <table class="w-full border-collapse text-left text-xs">
          <thead
            class="bg-elevated text-muted sticky top-0 z-10 text-[10px] tracking-wider uppercase"
          >
            <tr class="border-default border-b">
              <th class="px-3 py-2 font-semibold">Name</th>
              <th class="px-3 py-2 font-semibold">Address</th>
              <th class="px-3 py-2 font-semibold">Type</th>
              <th class="px-3 py-2 font-semibold">Description</th>
            </tr>
          </thead>
          <tbody class="divide-default divide-y">
            <tr
              v-for="row in knownAddressesRows"
              :key="row.name"
              class="hover:bg-elevated/60 transition-colors"
            >
              <td class="text-highlighted px-3 py-1.5 font-medium whitespace-nowrap">
                {{ row.name }}
              </td>
              <td class="text-primary px-3 py-1.5 font-mono whitespace-nowrap">
                {{ row.address }}
              </td>
              <td class="text-muted px-3 py-1.5 whitespace-nowrap">{{ row.type }}</td>
              <td class="text-muted px-3 py-1.5">{{ row.description }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </AppPanel>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import type { ResourceType } from '@repo/kid-util'
import useRomStore from '~/stores/romStore'
import { useResourcesIndex } from '~/composables/useResourcesIndex'
import { useRomDetailsView } from '~/composables/useRomDetailsView'
import { getNameForType } from '~/utils/index'
import { formatCompactSize } from '~/utils/resourceSearch'

const { rom, romDetails } = storeToRefs(useRomStore())
const { details, knownAddressesRows } = useRomDetailsView()
const { openRomDialog } = useRomDialog()
const { selectedTypeValue, activeTab } = useResourcesIndex()
const router = useRouter()

const romName = computed(() => romDetails.value?.known?.name ?? 'Unknown Kid Chameleon ROM')

const romStats = computed(() => {
  const manager = rom.value?.resources
  if (!manager) {
    return {
      total: 0,
      decoded: 0,
      types: 0,
      levels: 0,
      references: 0,
      entries: [] as { type: ResourceType; label: string; count: number }[],
    }
  }

  let decoded = 0
  for (const resource of manager.resources.values()) {
    if (resource.loaded) {
      decoded++
    }
  }

  const entries = Array.from(manager.resourcesByType.entries())
    .filter(([, addresses]) => addresses.size > 0)
    .map(([type, addresses]) => ({
      type,
      label: getNameForType(type),
      count: addresses.size,
    }))
    .sort((a, b) => b.count - a.count)

  return {
    total: manager.resources.size,
    decoded,
    types: entries.length,
    levels: manager.resourcesByType.get('level-header')?.size ?? 0,
    references: manager.referencesMap.size,
    entries,
  }
})

const typeEntries = computed(() => {
  const entries = romStats.value.entries
  const max = entries[0]?.count ?? 1
  return entries.map((entry) => ({
    ...entry,
    percent: Math.max(4, Math.round((entry.count / max) * 100)),
  }))
})

const heroStats = computed(() => [
  {
    label: 'File size',
    value: romDetails.value ? formatCompactSize(romDetails.value.size) : '—',
    hint: `${romDetails.value?.size.toLocaleString() ?? 0} bytes`,
  },
  {
    label: 'Resources',
    value: romStats.value.total.toLocaleString(),
    hint: `${romStats.value.types} types`,
  },
  {
    label: 'Decoded',
    value: romStats.value.decoded.toLocaleString(),
    hint: 'opened this session',
  },
  {
    label: 'Levels',
    value: romStats.value.levels.toLocaleString(),
    hint: 'level headers',
  },
  {
    label: 'Known addresses',
    value: `${knownAddressesRows.value.filter((row) => row.address !== '??').length}`,
    hint: `of ${knownAddressesRows.value.length}`,
  },
  {
    label: 'References',
    value: romStats.value.references.toLocaleString(),
    hint: 'mapped links',
  },
])

function browseType(type: ResourceType) {
  selectedTypeValue.value = type
  activeTab.value = 'resources'
  void router.push('/resources')
}
</script>
