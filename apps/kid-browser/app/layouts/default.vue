<template>
  <VRBackDrop />
  <div class="relative z-10 flex h-screen w-screen flex-col overflow-hidden p-3 md:p-4 ">
    <header class="mb-3">
      <div class="flex gap-3 flex-row items-center  px-2">
        <GlassPanel>
          <div class="flex items-center gap-3">
            <img src="/logo.png" alt="Logo" class="size-15 rounded-full" />
            <div>
              <p class="text-sm font-semibold tracking-wide text-white">Kid Chameleon Browser</p>
              <p class="text-muted-foreground text-xs">Interactive ROM resource explorer</p>
            </div>
          </div>
        </GlassPanel>
        <div class="flex-1 flex items-center justify-center">
          <GlassPanel>
            <nav class="grid grid-cols-4 gap-2">
              <NuxtLink v-for="item in navItems" :key="item.to" :to="item.to" custom>
                <template #default="{ navigate, href, isActive }">
                  <Button :variant="isActive ? 'secondary' : 'ghost'" size="sm" as-child>
                    <a :href="href" @click="navigate" class="w-full">
                      <Icon :name="item.icon" class="size-4" />
                      {{ item.label }}
                    </a>
                  </Button>
                </template>
              </NuxtLink>
            </nav>
          </GlassPanel>
        </div>

      </div>

    </header>

    <div class="min-h-0 flex-1 overflow-auto rounded-xl p-2 shadow-inner pb-20">
      <slot />
    </div>

    <footer class="absolute left-0 bottom-0 w-full">
      <div class="mx-auto w-full max-w-2xl">
        <ReadRom />
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Card, CardContent } from '~/components/ui/card'
import useRomStore from '~/stores/romStore'

const { rom } = storeToRefs(useRomStore())

const navItems = [
  { to: '/', label: 'Home', icon: 'heroicons:home-solid' },
  { to: '/resources', label: 'Resources', icon: 'heroicons:squares-2x2-solid' },
  { to: '/pixi-lab', label: 'Pixi Lab', icon: 'heroicons:arrows-pointing-out-solid' },
  { to: '/about', label: 'About', icon: 'heroicons:information-circle-solid' },
]
</script>
