<template>
  <div class="border-border/60 rounded-md border bg-slate-900/60 p-3 text-sm">
    <div class="mb-2 flex flex-wrap items-center justify-between gap-2">
      <h2 class="font-semibold">Resource metadata</h2>
      <span class="text-muted-foreground text-xs">Standardized fields; copy or follow linked addresses</span>
    </div>

    <div class="grid gap-3 md:grid-cols-2">
      <section v-for="section in sections" :key="section.id">
        <h3 class="text-muted-foreground mb-1 text-[11px] font-semibold uppercase tracking-wide">
          {{ section.title }}
        </h3>
        <dl class="grid grid-cols-[minmax(7rem,auto)_minmax(0,1fr)] gap-x-3 gap-y-1">
          <template v-for="item in section.items" :key="`${section.id}-${item.label}`">
            <dt class="text-muted-foreground">{{ item.label }}</dt>
            <dd class="flex min-w-0 items-start gap-1">
              <div class="min-w-0">
                <NuxtLink
                  v-if="item.linkAddress !== undefined && isResourceAddress(item.linkAddress)"
                  :to="getResourceRoute(item.linkAddress)"
                  class="text-primary font-mono underline decoration-dotted underline-offset-2"
                >
                  {{ item.value }}
                </NuxtLink>
                <span v-else :class="item.mono ? 'font-mono' : ''">{{ item.value }}</span>
                <span v-if="item.hint" class="text-muted-foreground block text-[11px] leading-tight">
                  {{ item.hint }}
                </span>
              </div>
              <Button
                v-if="item.copyValue"
                size="icon-sm"
                variant="ghost"
                class="size-6 shrink-0"
                :title="`Copy ${item.label}`"
                @click="copyItem(item.copyValue, item.label)"
              >
                <Icon name="heroicons:clipboard-document-solid" class="size-3.5" />
              </Button>
            </dd>
          </template>
        </dl>
      </section>
    </div>

    <p v-if="copyMessage" class="pt-2" :class="copyMessageIsError ? 'text-amber-300' : 'text-emerald-300'">
      {{ copyMessage }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { storeToRefs } from 'pinia'
import type { AllRomResources } from '@repo/kid-util'
import useRomStore from '~/stores/romStore'
import { Button } from '~/components/ui/button'
import { getResourceRoute } from '~/utils/index'
import { buildResourceMetadata } from '~/utils/resourceMetadata'

interface Props {
  resource: AllRomResources
  referenceCount?: number
  referencedByCount?: number
}

const props = defineProps<Props>()
const { rom } = storeToRefs(useRomStore())

const sections = computed(() =>
  buildResourceMetadata(props.resource, {
    referenceCount: props.referenceCount,
    referencedByCount: props.referencedByCount,
  }),
)

function isResourceAddress(address: number): boolean {
  return !!rom.value?.resources.getResource(address)
}

const copyMessage = ref('')
const copyMessageIsError = ref(false)
let copyTimer: number | undefined

async function copyItem(value: string, label: string) {
  if (typeof navigator === 'undefined' || !navigator.clipboard) {
    copyMessageIsError.value = true
    copyMessage.value = 'Clipboard is not available in this browser.'
    return
  }

  try {
    await navigator.clipboard.writeText(value)
    copyMessageIsError.value = false
    copyMessage.value = `Copied ${label}.`
  } catch (error) {
    copyMessageIsError.value = true
    copyMessage.value = `Copy failed: ${error instanceof Error ? error.message : 'unknown error'}`
  }

  if (typeof window !== 'undefined') {
    if (copyTimer !== undefined) {
      window.clearTimeout(copyTimer)
    }
    copyTimer = window.setTimeout(() => {
      copyMessage.value = ''
    }, 1800)
  }
}

onBeforeUnmount(() => {
  if (typeof window !== 'undefined' && copyTimer !== undefined) {
    window.clearTimeout(copyTimer)
  }
})
</script>
