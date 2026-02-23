<template>
  <div class="border-border/60 flex h-full min-h-0 flex-col gap-3 rounded-lg border bg-slate-900/60 p-3">
    <div class="grid gap-2 sm:grid-cols-3">
      <Badge variant="outline">Steps: {{ steps.length }}</Badge>
      <Badge variant="outline">Total Frames: {{ resource.totalFrames }}</Badge>
      <Badge variant="outline">Terminator: {{ formatAddress(resource.terminatorAddress) }}</Badge>
    </div>

    <div class="border-border/60 min-h-0 flex-1 overflow-auto rounded-md border bg-slate-950/60 p-2">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Address</TableHead>
            <TableHead>Kind</TableHead>
            <TableHead>Delay</TableHead>
            <TableHead>Sprite</TableHead>
            <TableHead>Preview</TableHead>
            <TableHead>Next</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="step in steps" :key="step.baseAddress">
            <TableCell class="font-mono text-xs">
              <NuxtLink :to="getResourceRoute(step.baseAddress)">
                {{ addressFormat(step.baseAddress) }}
              </NuxtLink>
            </TableCell>
            <TableCell class="text-xs">{{ getKindName(step.kind) }}</TableCell>
            <TableCell class="font-mono text-xs">{{ step.delay }}</TableCell>
            <TableCell class="font-mono text-xs">
              <NuxtLink
                v-if="step.spriteAddress"
                :to="getResourceRoute(step.spriteAddress)"
              >
                {{ addressFormat(step.spriteAddress) }}
              </NuxtLink>
              <span v-else class="text-muted-foreground">-</span>
            </TableCell>
            <TableCell>
              <div v-if="spritePreviewByStepAddress.get(step.baseAddress)" class="h-8 w-8 overflow-hidden rounded border border-white/20">
                <SpriteRenderer
                  :bytes="spritePreviewByStepAddress.get(step.baseAddress)!.bytes"
                  :width="spritePreviewByStepAddress.get(step.baseAddress)!.width"
                  :height="spritePreviewByStepAddress.get(step.baseAddress)!.height"
                  :tile-id="spritePreviewByStepAddress.get(step.baseAddress)!.tileId"
                />
              </div>
              <span v-else class="text-muted-foreground text-xs">-</span>
            </TableCell>
            <TableCell class="font-mono text-xs">
              <NuxtLink
                v-if="step.nextFrameAddress"
                :to="getResourceRoute(step.nextFrameAddress)"
              >
                {{ addressFormat(step.nextFrameAddress) }}
              </NuxtLink>
              <span v-else class="text-muted-foreground">-</span>
            </TableCell>
          </TableRow>
          <TableRow v-if="steps.length === 0">
            <TableCell colspan="6" class="text-muted-foreground text-sm">
              No animation steps linked to this script.
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  </div>
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
import { Badge } from '~/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table'
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
