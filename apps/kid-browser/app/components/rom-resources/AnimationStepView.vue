<template>
  <AppPanel title="Animation step" icon="i-heroicons-film" class="h-full">
    <div class="mb-2 flex flex-wrap items-center gap-1.5">
      <UBadge color="primary" variant="subtle" :label="kindName" />
      <UBadge color="neutral" variant="subtle" :label="`Delay: ${resource.delay}`" />
    </div>

    <dl class="border-default overflow-hidden rounded-md border">
      <div
        v-for="row in rows"
        :key="row.label"
        class="border-default grid grid-cols-[9rem_minmax(0,1fr)] border-b last:border-b-0"
      >
        <dt class="bg-muted/30 text-muted px-2.5 py-1.5 text-xs">{{ row.label }}</dt>
        <dd class="text-highlighted px-2.5 py-1.5 font-mono text-[11px]">
          <NuxtLink
            v-if="row.link !== undefined"
            :to="getResourceRoute(row.link)"
            class="text-primary hover:underline"
          >
            {{ addressFormat(row.link) }}
          </NuxtLink>
          <span v-else>{{ row.value }}</span>
        </dd>
      </div>
    </dl>
  </AppPanel>
</template>

<script setup lang="ts">
import { computed, toRefs } from 'vue'
import { type AnimationStepRomResourceLoaded } from '@repo/kid-util'
import { addressFormat, getResourceRoute } from '~/utils/index'

interface Props {
  resource: AnimationStepRomResourceLoaded
}

const props = defineProps<Props>()
const { resource } = toRefs(props)

const kindName = computed(() => {
  if (resource.value.kind === 0) return 'Stop Step'
  if (resource.value.kind === 1) return 'Delay Step'
  if (resource.value.kind === 2) return 'Repeat Step'
  return `Unknown Step (${resource.value.kind})`
})

const rows = computed(() => [
  {
    label: 'Animation script',
    value: resource.value.animationAddress ? addressFormat(resource.value.animationAddress) : '-',
    link: resource.value.animationAddress,
  },
  {
    label: 'Sprite offset',
    value:
      resource.value.spriteOffset === undefined ? '-' : addressFormat(resource.value.spriteOffset),
    link: undefined,
  },
  {
    label: 'Sprite address',
    value: resource.value.spriteAddress ? addressFormat(resource.value.spriteAddress) : '-',
    link: resource.value.spriteAddress,
  },
  {
    label: 'Next step',
    value: resource.value.nextFrameAddress ? addressFormat(resource.value.nextFrameAddress) : '-',
    link: resource.value.nextFrameAddress,
  },
])
</script>
