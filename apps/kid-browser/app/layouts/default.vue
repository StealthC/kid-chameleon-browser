<template>
  <UDashboardGroup storage="local" storage-key="kid-browser-layout" unit="rem" class="bg-default">
    <UDashboardSidebar
      id="app-nav"
      collapsible
      resizable
      :default-size="15"
      :min-size="13"
      :max-size="19"
      :collapsed-size="4"
      :ui="{
        root: 'bg-muted/30',
        header: 'px-3',
        body: 'gap-1 px-2 py-3',
        footer: 'border-t border-default px-2 py-2',
      }"
    >
      <template #header="{ collapsed }">
        <NuxtLink
          to="/"
          class="focus-visible:ring-primary/60 flex min-w-0 items-center gap-2.5 rounded-md outline-none focus-visible:ring-2"
          :class="collapsed ? 'mx-auto' : ''"
          aria-label="Kid Chameleon Browser home"
        >
          <img src="/logo.png" alt="" class="ring-default size-8 shrink-0 rounded-lg ring-1" />
          <span v-if="!collapsed" class="min-w-0">
            <span class="text-highlighted block truncate text-sm font-semibold tracking-tight">
              Kid Chameleon
            </span>
            <span
              class="text-muted block truncate text-[10px] font-medium tracking-widest uppercase"
            >
              ROM Browser
            </span>
          </span>
        </NuxtLink>
      </template>

      <template #default="{ collapsed }">
        <UNavigationMenu
          :items="navItems"
          orientation="vertical"
          :collapsed="collapsed"
          :tooltip="collapsed"
          class="w-full"
        />

        <div v-if="!collapsed && rom" class="mt-auto space-y-1.5 pt-2">
          <p class="text-dimmed px-1 text-[10px] font-semibold tracking-widest uppercase">
            Session
          </p>
          <div class="grid grid-cols-2 gap-1.5">
            <div class="border-default bg-elevated/30 rounded-md border px-2 py-1.5">
              <p class="text-muted text-[10px]">Resources</p>
              <p class="text-highlighted font-mono text-sm font-semibold">
                {{ stats.resources.toLocaleString() }}
              </p>
            </div>
            <div class="border-default bg-elevated/30 rounded-md border px-2 py-1.5">
              <p class="text-muted text-[10px]">Decoded</p>
              <p class="text-highlighted font-mono text-sm font-semibold">
                {{ stats.decoded.toLocaleString() }}
              </p>
            </div>
            <div class="border-default bg-elevated/30 rounded-md border px-2 py-1.5">
              <p class="text-muted text-[10px]">Types</p>
              <p class="text-highlighted font-mono text-sm font-semibold">{{ stats.types }}</p>
            </div>
            <div class="border-default bg-elevated/30 rounded-md border px-2 py-1.5">
              <p class="text-muted text-[10px]">Levels</p>
              <p class="text-highlighted font-mono text-sm font-semibold">{{ stats.levels }}</p>
            </div>
          </div>
          <p class="text-dimmed px-1 pt-1 text-[10px] leading-tight">
            v{{ appVersion }} · Data stays local
          </p>
        </div>
      </template>

      <template #footer="{ collapsed }">
        <div class="w-full">
          <RomStatus :collapsed="collapsed" />
        </div>
      </template>
    </UDashboardSidebar>

    <slot />

    <RomLoaderDialog />
  </UDashboardGroup>
</template>

<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import useRomStore from '~/stores/romStore'

const route = useRoute()
const { rom } = storeToRefs(useRomStore())
const appVersion = useRuntimeConfig().public.appVersion

const stats = computed(() => {
  const manager = rom.value?.resources
  if (!manager) {
    return { resources: 0, decoded: 0, types: 0, levels: 0 }
  }

  let decoded = 0
  for (const resource of manager.resources.values()) {
    if (resource.loaded) {
      decoded++
    }
  }

  return {
    resources: manager.resources.size,
    decoded,
    types: Array.from(manager.resourcesByType.values()).filter((addresses) => addresses.size > 0)
      .length,
    levels: manager.resourcesByType.get('level-header')?.size ?? 0,
  }
})

const navItems = computed<NavigationMenuItem[]>(() => [
  {
    label: 'Overview',
    icon: 'i-heroicons-home',
    to: '/',
    active: route.path === '/',
    tooltip: true,
  },
  {
    label: 'Levels',
    icon: 'i-heroicons-map',
    to: '/levels',
    active: route.path.startsWith('/levels'),
    badge: stats.value.levels > 0 ? String(stats.value.levels) : undefined,
    tooltip: true,
  },
  {
    label: 'Resources',
    icon: 'i-heroicons-squares-2x2',
    to: '/resources',
    active: route.path.startsWith('/resources'),
    badge: stats.value.resources > 0 ? formatBadge(stats.value.resources) : undefined,
    tooltip: true,
  },
  {
    label: 'About',
    icon: 'i-heroicons-information-circle',
    to: '/about',
    active: route.path.startsWith('/about'),
    tooltip: true,
  },
])

function formatBadge(value: number): string {
  return value >= 1000 ? `${(value / 1000).toFixed(1)}k` : String(value)
}
</script>
