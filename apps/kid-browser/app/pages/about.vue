<template>
  <div class="h-full overflow-auto p-2 md:p-3">
    <div class="mx-auto flex flex-col max-w-5xl gap-3 ">
      <GlassPanel class="prose prose-invert max-w-none">
        <template #header>
          <div class="flex items-center gap-2">
            <Icon name="heroicons:information-circle-solid" class="text-primary size-5" />
            <p class="text-base font-semibold">About this tool</p>
          </div>
        </template>
        <p>
          Kid Chameleon Browser is an interactive workspace for visualizing and inspecting Sega
          Genesis / Mega Drive ROM resources in the browser.
        </p>
        <p>It helps reverse engineering by identifying and rendering:</p>
        <ul>
          <li>Tile sheets and sprite frames</li>
          <li>Planes, palettes, and palette maps</li>
          <li>Level metadata and linked references</li>
          <li>Raw bytes through hex inspection</li>
        </ul>
        <p>
          ROM data never leaves your browser session. This repository does not include proprietary
          game assets.
        </p>
      </GlassPanel>

      <GlassPanel class="prose prose-invert max-w-none">
        <template #header>
          <div class="flex items-center gap-2">
            <Icon name="heroicons:book-open-solid" class="text-primary size-5" />
            <p class="text-base font-semibold">Credits and references</p>
          </div>
        </template>
        <p>This project builds on excellent reverse engineering work from the community:</p>
        <ul class="space-y-2">
          <li v-for="link in links" :key="link.href">
            <a
              :href="link.href"
              target="_blank"
              rel="noreferrer"
              class="inline-flex items-center gap-2 no-underline"
            >
              <Icon name="heroicons:link-16-solid" class="size-4" />
              <span class="underline-offset-4 hover:underline">{{ link.label }}</span>
            </a>
          </li>
        </ul>
      </GlassPanel>
    </div>
  </div>
</template>

<script setup lang="ts">
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
