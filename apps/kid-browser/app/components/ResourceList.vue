<template>
  <GlassPanel class="h-full">
    <template #header>
      <div class="flex items-center justify-between gap-2">
        <p class="text-base font-semibold tracking-wide">Resource Browser</p>
        <Badge variant="secondary">{{ filteredCount }} / {{ totalResources }}</Badge>
      </div>
    </template>

    <Tabs v-model="activeTab" class="flex h-full min-h-0 flex-col">
      <TabsList class="grid w-full grid-cols-2">
        <TabsTrigger value="types">Types</TabsTrigger>
        <TabsTrigger value="resources">Resources</TabsTrigger>
      </TabsList>

      <TabsContent value="types" class="mt-3 min-h-0 flex-1 overflow-hidden">
        <ScrollArea class="h-full">
          <div class="space-y-1 pe-3">
            <button
              v-for="resource in resourceList"
              :key="resource.type"
              type="button"
              class="hover:border-border hover:bg-accent flex w-full items-center justify-between rounded-md border border-transparent px-3 py-2 text-left transition"
              @click="selectType(resource.type)"
            >
              <span class="font-medium">{{ getNameForType(resource.type) }}</span>
              <Badge variant="outline">{{ resource.count }}</Badge>
            </button>
          </div>
        </ScrollArea>
      </TabsContent>

      <TabsContent value="resources" class="mt-3 min-h-0 flex-1 overflow-hidden">
        <div class="mb-3 space-y-2 pe-3">
          <Input
            v-model="searchQuery"
            aria-label="Search resources"
            placeholder="Search name, type or hex address ($A09FE)…"
          />
          <div class="grid grid-cols-2 items-center gap-2">
            <Select v-model="selectedTypeValue">
              <SelectTrigger aria-label="Filter by type">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem
                  v-for="resource in resourceList"
                  :key="resource.type"
                  :value="resource.type"
                >
                  {{ getNameForType(resource.type) }}
                </SelectItem>
              </SelectContent>
            </Select>
            <Select v-model="sortOrder">
              <SelectTrigger aria-label="Sort resources"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="address">Address</SelectItem>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="type">Type</SelectItem>
                <SelectItem value="size">Size</SelectItem>
              </SelectContent>
            </Select>
            <Select v-model="confidenceFilter">
              <SelectTrigger aria-label="Filter by discovery confidence">
                <SelectValue placeholder="Confidence" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any confidence</SelectItem>
                <SelectItem value="certain">Certain</SelectItem>
                <SelectItem value="possible">Possible</SelectItem>
                <SelectItem value="unspecified">Not recorded</SelectItem>
              </SelectContent>
            </Select>
            <Select v-model="loadedFilter">
              <SelectTrigger aria-label="Filter by decode state">
                <SelectValue placeholder="Decode state" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any decode state</SelectItem>
                <SelectItem value="loaded">Decoded</SelectItem>
                <SelectItem value="unloaded">Not decoded</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="flex items-start justify-between gap-2">
            <p class="text-muted-foreground text-[11px] leading-tight">
              Address search accepts $A09FE, 0xA09FE or A09FE. Name and type terms can be combined.
            </p>
            <Button variant="ghost" size="sm" :disabled="!hasActiveFilters" @click="clearFilter">
              Clear filters
            </Button>
          </div>
        </div>

        <ScrollArea class="h-full">
          <div class="space-y-1 pe-3">
            <NuxtLink
              v-for="resource in filteredResources"
              :key="resource.address"
              :to="getResourceRoute(resource.address)"
              class="hover:border-border hover:bg-accent flex items-center justify-between gap-2 rounded-md border border-transparent px-3 py-2 transition"
              :class="{ 'border-primary/50 bg-primary/10': selectedAddress === resource.address }"
              :aria-current="selectedAddress === resource.address ? 'page' : undefined"
              :title="`${resource.name} · ${resource.typeLabel} · ${formatCompactSize(resource.size)}`"
            >
              <span class="min-w-0">
                <span class="block truncate font-medium">{{ resource.name }}</span>
                <span class="mt-0.5 flex flex-wrap items-center gap-1">
                  <span class="text-muted-foreground text-[10px] uppercase tracking-wide">
                    {{ resource.typeLabel }}
                  </span>
                  <Badge
                    v-if="resource.confidence === 'possible'"
                    variant="outline"
                    class="border-amber-400/50 px-1.5 py-0 text-[10px] text-amber-200 uppercase tracking-wide"
                  >
                    Possible
                  </Badge>
                  <Badge
                    v-if="resource.loaded"
                    variant="secondary"
                    class="px-1.5 py-0 text-[10px] uppercase tracking-wide"
                  >
                    Decoded
                  </Badge>
                  <span v-if="resource.size !== null" class="text-muted-foreground text-[10px] font-mono">
                    {{ formatCompactSize(resource.size) }}
                  </span>
                </span>
              </span>
              <span class="text-muted-foreground shrink-0 font-mono text-xs">
                {{ addressFormat(resource.address) }}
              </span>
            </NuxtLink>
            <p v-if="filteredResources.length === 0" class="text-muted-foreground px-2 py-4 text-sm">
              No resources match the current search and filters.
            </p>
          </div>
        </ScrollArea>
      </TabsContent>
    </Tabs>
  </GlassPanel>
</template>

<script setup lang="ts">
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { ScrollArea } from '~/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs'
import { useResourcesIndex } from '~/composables/useResourcesIndex'
import {
  addressFormat,
  getNameForType,
  getResourceRoute,
} from '~/utils/index'
import { formatCompactSize } from '~/utils/resourceSearch'

const {
  activeTab,
  selectedTypeValue,
  searchQuery,
  sortOrder,
  confidenceFilter,
  loadedFilter,
  selectedAddress,
  resourceList,
  filteredResources,
  totalResources,
  filteredCount,
  hasActiveFilters,
  selectType,
  clearFilter,
} = useResourcesIndex()
</script>
