<template>
  <AppPanel title="Animation" icon="i-heroicons-play" :padded="false" class="h-full">
    <template #actions>
      <UBadge color="neutral" variant="subtle" size="sm" :label="`${steps.length} steps`" />
      <UBadge
        color="neutral"
        variant="subtle"
        size="sm"
        :label="`${resource.totalFrames} frames`"
      />
      <UBadge
        color="neutral"
        variant="subtle"
        size="sm"
        :label="`End ${formatAddress(resource.terminatorAddress)}`"
      />
    </template>

    <div class="min-h-0 flex-1 overflow-auto">
      <table class="w-full border-collapse text-left text-xs">
        <thead
          class="bg-elevated text-muted sticky top-0 z-10 text-[10px] tracking-wider uppercase"
        >
          <tr class="border-default border-b">
            <th class="px-2.5 py-1.5 font-semibold">Address</th>
            <th class="px-2.5 py-1.5 font-semibold">Kind</th>
            <th class="px-2.5 py-1.5 font-semibold">Delay</th>
            <th class="px-2.5 py-1.5 font-semibold">Sprite</th>
            <th class="px-2.5 py-1.5 font-semibold">Preview</th>
            <th class="px-2.5 py-1.5 font-semibold">Next</th>
          </tr>
        </thead>
        <tbody class="divide-default divide-y">
          <tr
            v-for="step in steps"
            :key="step.baseAddress"
            class="hover:bg-elevated/60 transition-colors"
          >
            <td class="px-2.5 py-1.5 font-mono text-[11px]">
              <NuxtLink
                :to="getResourceRoute(step.baseAddress)"
                class="text-primary hover:underline"
              >
                {{ addressFormat(step.baseAddress) }}
              </NuxtLink>
            </td>
            <td class="text-muted px-2.5 py-1.5">{{ getKindName(step.kind) }}</td>
            <td class="text-highlighted px-2.5 py-1.5 font-mono text-[11px]">{{ step.delay }}</td>
            <td class="px-2.5 py-1.5 font-mono text-[11px]">
              <NuxtLink
                v-if="step.spriteAddress"
                :to="getResourceRoute(step.spriteAddress)"
                class="text-primary hover:underline"
              >
                {{ addressFormat(step.spriteAddress) }}
              </NuxtLink>
              <span v-else class="text-dimmed">-</span>
            </td>
            <td class="px-2.5 py-1.5">
              <div
                v-if="spritePreviewByStepAddress.get(step.baseAddress)"
                class="border-default size-8 overflow-hidden rounded border"
              >
                <SpriteRenderer
                  :bytes="spritePreviewByStepAddress.get(step.baseAddress)!.bytes"
                  :width="spritePreviewByStepAddress.get(step.baseAddress)!.width"
                  :height="spritePreviewByStepAddress.get(step.baseAddress)!.height"
                  :tile-id="spritePreviewByStepAddress.get(step.baseAddress)!.tileId"
                />
              </div>
              <span v-else class="text-dimmed text-xs">-</span>
            </td>
            <td class="px-2.5 py-1.5 font-mono text-[11px]">
              <NuxtLink
                v-if="step.nextFrameAddress"
                :to="getResourceRoute(step.nextFrameAddress)"
                class="text-primary hover:underline"
              >
                {{ addressFormat(step.nextFrameAddress) }}
              </NuxtLink>
              <span v-else class="text-dimmed">-</span>
            </td>
          </tr>
          <tr v-if="steps.length === 0">
            <td colspan="6" class="text-muted px-3 py-6 text-center text-xs">
              No animation steps linked to this script.
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </AppPanel>
</template>

<script setup lang="ts">
import {
  isAnimationStepResource,
  isLinkedSpriteFrameResource,
  type AnimationRomResourceLoaded,
} from '@repo/kid-util'
import { computed, ref, toRefs, watch } from 'vue'
import { storeToRefs } from 'pinia'
import useRomStore from '~/stores/romStore'
import { useResourceLoader } from '~/composables/useResourceLoader'
import { addressFormat, getResourceRoute } from '~/utils/index'
import SpriteRenderer from './SpriteRenderer.vue'

interface Props {
  resource: AnimationRomResourceLoaded
}

const props = defineProps<Props>()
const { resource } = toRefs(props)
const loader = useResourceLoader()
const related = loader.getReferencesResourcesLoadedQuery(computed(() => resource.value.baseAddress))
const { rom } = storeToRefs(useRomStore())

const steps = computed(() => {
  const list = (related.data.value ?? []).filter(isAnimationStepResource)
  return list.sort((a, b) => a.baseAddress - b.baseAddress)
})

type SpritePreview = {
  bytes: Uint8Array
  width: number
  height: number
  tileId: number
}

const spritePreviewByStepAddress = ref(new Map<number, SpritePreview>())

watch(
  [steps, rom],
  async ([nextSteps, nextRom]) => {
    if (!nextRom || nextSteps.length === 0) {
      spritePreviewByStepAddress.value = new Map<number, SpritePreview>()
      return
    }

    const previewEntries = await Promise.all(
      nextSteps.map(async (step) => {
        if (!step.spriteAddress) return null
        const sprite = await nextRom.resources.getResourceLoaded(step.spriteAddress)
        if (!sprite || !isLinkedSpriteFrameResource(sprite)) {
          return null
        }
        return [
          step.baseAddress,
          {
            bytes: sprite.data,
            width: sprite.width,
            height: sprite.height,
            tileId: 0,
          },
        ] as const
      }),
    )

    const map = new Map<number, SpritePreview>()
    for (const entry of previewEntries) {
      if (!entry) continue
      map.set(entry[0], entry[1])
    }
    spritePreviewByStepAddress.value = map
  },
  { immediate: true },
)

const getKindName = (kind: number) => {
  if (kind === 0) return 'Stop'
  if (kind === 1) return 'Delay'
  if (kind === 2) return 'Repeat'
  return `Unknown (${kind})`
}

const formatAddress = (address?: number) => {
  return address === undefined ? '-' : addressFormat(address)
}
</script>
