<template>
  <UDashboardPanel id="about" :ui="{ body: 'gap-0 overflow-hidden p-0 sm:p-0' }">
    <template #header>
      <UDashboardNavbar title="About" icon="i-heroicons-information-circle" class="lg:hidden" />
    </template>

    <template #body>
      <div class="h-full overflow-y-auto">
        <div class="mx-auto grid w-full max-w-6xl gap-4 p-4 sm:p-6 lg:grid-cols-2">
          <UCard class="lg:col-span-2">
            <template #header>
              <div class="flex flex-wrap items-center gap-2">
                <UIcon name="i-heroicons-cpu-chip" class="text-primary size-5" />
                <h1 class="text-highlighted text-base font-semibold">Kid Chameleon Browser</h1>
                <UBadge
                  class="ms-auto"
                  color="neutral"
                  variant="subtle"
                  size="sm"
                  :label="`v${appVersion}`"
                />
              </div>
            </template>
            <p class="text-default text-sm leading-relaxed">
              An interactive workspace for visualizing and inspecting Sega Genesis / Mega Drive ROM
              resources in the browser. Load your own ROM and explore sprites, tile sheets, planes,
              palettes, level maps, references and raw bytes.
            </p>
            <ul class="text-muted mt-3 grid gap-2 text-sm sm:grid-cols-2">
              <li class="flex items-center gap-2">
                <UIcon name="i-heroicons-squares-2x2" class="text-primary size-4" />
                Tile sheets and sprite frames
              </li>
              <li class="flex items-center gap-2">
                <UIcon name="i-heroicons-swatch" class="text-primary size-4" />
                Planes, palettes and palette maps
              </li>
              <li class="flex items-center gap-2">
                <UIcon name="i-heroicons-map" class="text-primary size-4" />
                Level metadata and linked references
              </li>
              <li class="flex items-center gap-2">
                <UIcon name="i-heroicons-code-bracket-square" class="text-primary size-4" />
                Raw bytes through hex inspection
              </li>
            </ul>
            <UAlert
              class="mt-4"
              color="neutral"
              variant="subtle"
              icon="i-heroicons-shield-check"
              title="Your ROM never leaves this browser"
              description="ROM data is processed and stored only in local browser storage. This repository does not include proprietary game assets."
            />
          </UCard>

          <UCard>
            <template #header>
              <div class="flex items-center gap-2">
                <UIcon name="i-heroicons-book-open" class="text-primary size-4" />
                <h2 class="text-highlighted text-sm font-semibold">Credits and references</h2>
              </div>
            </template>
            <p class="text-muted mb-3 text-sm">
              This project builds on reverse engineering work from the community.
            </p>
            <ul class="space-y-1">
              <li v-for="link in links" :key="link.href">
                <a
                  :href="link.href"
                  target="_blank"
                  rel="noreferrer"
                  class="text-default hover:bg-elevated/70 hover:text-highlighted flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors"
                >
                  <UIcon
                    name="i-heroicons-arrow-top-right-on-square"
                    class="text-primary size-3.5"
                  />
                  <span>{{ link.label }}</span>
                </a>
              </li>
            </ul>
          </UCard>

          <UCard>
            <template #header>
              <div class="flex items-center gap-2">
                <UIcon name="i-heroicons-wrench-screwdriver" class="text-primary size-4" />
                <h2 class="text-highlighted text-sm font-semibold">Built with</h2>
              </div>
            </template>
            <dl class="space-y-2 text-sm">
              <div class="flex items-center justify-between gap-2">
                <dt class="text-muted">Framework</dt>
                <dd class="text-highlighted font-mono text-xs">Nuxt 4</dd>
              </div>
              <div class="flex items-center justify-between gap-2">
                <dt class="text-muted">Component library</dt>
                <dd class="text-highlighted font-mono text-xs">Nuxt UI 4</dd>
              </div>
              <div class="flex items-center justify-between gap-2">
                <dt class="text-muted">Rendering</dt>
                <dd class="text-highlighted font-mono text-xs">PixiJS</dd>
              </div>
              <div class="flex items-center justify-between gap-2">
                <dt class="text-muted">ROM analysis</dt>
                <dd class="text-highlighted font-mono text-xs">@repo/kid-util</dd>
              </div>
            </dl>
          </UCard>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
useHead({ title: 'About · Kid Chameleon Browser' })
const appVersion = useRuntimeConfig().public.appVersion

const links = [
  {
    label: 'Kid Chameleon Disassembly',
    href: 'https://github.com/sonicretro/kid-chameleon-disasm',
  },
  {
    label: 'Sega Genesis Checksum Utility',
    href: 'https://github.com/mrhappyasthma/Sega-Genesis-Checksum-Utility',
  },
  {
    label: 'Genesis ROM format documentation',
    href: 'https://raw.githubusercontent.com/mrhappyasthma/Sega-Genesis-Checksum-Utility/refs/heads/master/Resources/Backup/The%20Complete%20Documentation%20About%20Genesis%20Rom%20Format%20(v1.1).txt',
  },
  {
    label: 'Kid Chameleon Wiki',
    href: 'https://kidchameleon.fandom.com/wiki/Main_Page',
  },
]
</script>
