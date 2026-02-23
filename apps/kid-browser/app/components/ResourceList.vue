<template>
  <GlassPanel class="h-full">
    <template #header>
      <div class="flex items-center justify-between gap-2">
        <p class="text-base font-semibold tracking-wide">Resource Browser</p>
        <Badge variant="secondary">{{ totalResources }} total</Badge>
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
        <div class="mb-3 grid grid-cols-[1fr_auto] items-center gap-2 pe-3">
          <Select v-model="selectedTypeValue">
            <SelectTrigger>
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
          <Button variant="ghost" size="sm" @click="clearFilter">Clear</Button>
        </div>

        <ScrollArea class="h-full">
          <div class="space-y-1 pe-3">
            <NuxtLink
              v-for="resource in filteredResources"
              :key="resource.address"
              :to="getResourceRoute(resource.address)"
              class="hover:border-border hover:bg-accent flex items-center justify-between gap-2 rounded-md border border-transparent px-3 py-2 transition"
              :class="{ 'border-primary/50 bg-primary/10': selectedAddress === resource.address }"
            >
              <span class="truncate font-medium">{{ resource.name }}</span>
              <span class="text-muted-foreground font-mono text-xs">
                {{ addressFormat(resource.address) }}
              </span>
            </NuxtLink>
          </div>
        </ScrollArea>
      </TabsContent>
    </Tabs>
  </GlassPanel>
</template>

<script setup lang="ts">
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
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

const {
  activeTab,
  selectedTypeValue,
  selectedAddress,
  resourceList,
  filteredResources,
  totalResources,
  selectType,
  clearFilter,
} = useResourcesIndex()
</script>
