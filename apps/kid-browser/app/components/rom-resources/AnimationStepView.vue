<template>
  <div class="border-border/60 flex h-full min-h-0 flex-col gap-3 rounded-lg border bg-slate-900/60 p-3">
    <div class="flex items-center gap-2">
      <Badge variant="outline">{{ kindName }}</Badge>
      <Badge variant="outline">Delay: {{ resource.delay }}</Badge>
    </div>

    <div class="border-border/60 rounded border bg-slate-950/60 p-2">
      <Table>
        <TableBody>
          <TableRow>
            <TableCell class="text-muted-foreground text-xs">Animation Script</TableCell>
            <TableCell class="font-mono text-xs">
              <NuxtLink v-if="resource.animationAddress" :to="getResourceRoute(resource.animationAddress)">
                {{ addressFormat(resource.animationAddress) }}
              </NuxtLink>
              <span v-else>-</span>
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell class="text-muted-foreground text-xs">Sprite Offset</TableCell>
            <TableCell class="font-mono text-xs">{{ formatValue(resource.spriteOffset) }}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell class="text-muted-foreground text-xs">Sprite Address</TableCell>
            <TableCell class="font-mono text-xs">
              <NuxtLink v-if="resource.spriteAddress" :to="getResourceRoute(resource.spriteAddress)">
                {{ addressFormat(resource.spriteAddress) }}
              </NuxtLink>
              <span v-else>-</span>
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell class="text-muted-foreground text-xs">Next Step</TableCell>
            <TableCell class="font-mono text-xs">
              <NuxtLink v-if="resource.nextFrameAddress" :to="getResourceRoute(resource.nextFrameAddress)">
                {{ addressFormat(resource.nextFrameAddress) }}
              </NuxtLink>
              <span v-else>-</span>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, toRefs } from 'vue'
import { type AnimationStepRomResourceLoaded } from '@repo/kid-util'
import { Badge } from '~/components/ui/badge'
import { Table, TableBody, TableCell, TableRow } from '~/components/ui/table'
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

const formatValue = (value?: number) => {
  if (value === undefined) return '-'
  return addressFormat(value)
}
</script>
