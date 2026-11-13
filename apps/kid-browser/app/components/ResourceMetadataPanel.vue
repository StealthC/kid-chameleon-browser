<template>
  <section class="border-default bg-elevated/30 overflow-hidden rounded-lg border">
    <header class="border-default flex h-9 items-center gap-2 border-b px-3">
      <UIcon name="i-heroicons-information-circle" class="text-primary size-4" />
      <h2 class="text-muted text-[11px] font-semibold tracking-wider uppercase">
        Resource metadata
      </h2>
      <span class="text-dimmed ms-auto hidden text-[10px] sm:inline">
        Standardized fields; copy or follow linked addresses
      </span>
    </header>

    <div class="grid gap-x-4 gap-y-3 p-3 md:grid-cols-2 xl:grid-cols-3">
      <section v-for="section in sections" :key="section.id">
        <h3 class="text-dimmed mb-1 text-[10px] font-semibold tracking-widest uppercase">
          {{ section.title }}
        </h3>
        <dl class="grid grid-cols-[minmax(6.5rem,auto)_minmax(0,1fr)] gap-x-3 gap-y-1">
          <template v-for="item in section.items" :key="`${section.id}-${item.label}`">
            <dt class="text-muted text-xs">{{ item.label }}</dt>
            <dd class="flex min-w-0 items-start gap-1">
              <div class="min-w-0">
                <NuxtLink
                  v-if="item.linkAddress !== undefined && isResourceAddress(item.linkAddress)"
                  :to="getResourceRoute(item.linkAddress)"
                  class="text-primary font-mono text-xs underline decoration-dotted underline-offset-2"
                >
                  {{ item.value }}
                </NuxtLink>
                <span v-else class="text-highlighted text-xs" :class="item.mono ? 'font-mono' : ''">
                  {{ item.value }}
                </span>
                <span v-if="item.hint" class="text-dimmed block text-[10px] leading-tight">
                  {{ item.hint }}
                </span>
              </div>
              <UTooltip v-if="item.copyValue" :text="`Copy ${item.label}`">
                <UButton
                  icon="i-heroicons-clipboard-document"
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  square
                  class="size-5 shrink-0"
                  :aria-label="`Copy ${item.label}`"
                  @click="copyItem(item.copyValue, item.label)"
                />
              </UTooltip>
            </dd>
          </template>
        </dl>
      </section>
    </div>

    <p
      v-if="copyMessage"
      class="border-default border-t px-3 py-1.5 text-[11px]"
      :class="copyMessageIsError ? 'text-warning' : 'text-success'"
      role="status"
    >
      {{ copyMessage }}
    </p>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { storeToRefs } from 'pinia'
import type { AllRomResources } from '@repo/kid-util'
import useRomStore from '~/stores/romStore'
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
