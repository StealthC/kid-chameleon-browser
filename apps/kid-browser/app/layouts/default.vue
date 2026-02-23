<template>
  <VRBackDrop />
  <div class="relative z-10 flex h-screen w-screen flex-col overflow-hidden p-3 md:p-4 ">
    <header class="mb-3">
      <Card class="border-border/70 bg-slate-950/70 shadow-xl backdrop-blur">
        <CardContent class="flex flex-col gap-3 p-3 md:flex-row md:items-center md:justify-between">
          <div class="flex items-center gap-3">
            <div class="bg-primary/20 text-primary rounded-md p-2">
              <Icon name="heroicons:cpu-chip-16-solid" class="size-5" />
            </div>
            <div>
              <p class="text-sm font-semibold tracking-wide text-white">Kid Chameleon Browser</p>
              <p class="text-muted-foreground text-xs">Interactive ROM resource explorer</p>
            </div>
          </div>
          <nav class="grid grid-cols-3 gap-2">
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
          <div class="flex items-center gap-2 text-xs">
            <Badge :variant="rom ? 'default' : 'secondary'">
              {{ rom ? 'ROM loaded' : 'No ROM loaded' }}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </header>

    <div
      class="min-h-0 flex-1 overflow-hidden rounded-xl  p-2 shadow-inner pb-20"
    >
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
  { to: '/about', label: 'About', icon: 'heroicons:information-circle-solid' },
]
</script>
