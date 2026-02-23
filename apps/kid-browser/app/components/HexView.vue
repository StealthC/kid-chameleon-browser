<template>
  <GlassPanel :header="title" class="flex flex-col overflow-hidden font-mono text-xs">
    <div class="text-muted-foreground pb-2 text-center">
      Start: {{ start }} End: {{ end }} Size: {{ size }}
    </div>
    <ScrollArea class="max-h-52">
      <div
        v-if="stringData.length > 0"
        class="border-border/60 rounded-md border bg-slate-950/55 p-2"
      >
        <pre class="text-xs whitespace-pre">{{ stringData }}</pre>
      </div>
      <div v-else>
        <p>No data</p>
      </div>
    </ScrollArea>
  </GlassPanel>
</template>

<script setup lang="ts">
import { computed, toRefs } from 'vue'
import { ScrollArea } from '~/components/ui/scroll-area'

export type Props = {
  title?: string
  address?: number
  data: Uint8Array
  columns?: number
}

const props = defineProps<Props>()
const { data, title } = toRefs(props)
const address = computed(() => props.address ?? 0)
const columns = computed(() => props.columns ?? 16)
const start = computed(() => `$${address.value.toString(16).padStart(8, '0')}`)
const end = computed(() => `$${(address.value + data.value.length).toString(16).padStart(8, '0')}`)
const size = computed(() => `$${data.value.length.toString(16)}`)
const stringData = computed(() => {
  let result = ''
  let pos = 0
  while (pos < data.value.length) {
    const line: string = [...data.value.subarray(pos, pos + columns.value)]
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join(' ')
    result += `$${(address.value + pos).toString(16).padStart(8, '0')}  ${line}\n`
    pos += columns.value
  }
  return result
})
</script>
