<template>
  <GlassPanel :header="title" class="p-m-2 font-mono text-xs">
    <div class="pb-2 text-center">Start: {{ start }} End: {{ end }} Size: {{ size }}</div>
    <div class="max-h-80 overflow-auto">
      <div class="flex flex-col items-center" v-if="stringData.length > 0">
        <pre>{{ stringData }}</pre>
      </div>
      <div v-else>
        <p>No data</p>
      </div>
    </div>
  </GlassPanel>
</template>

<script setup lang="ts">
import { computed, toRefs } from 'vue'
import GlassPanel from './GlassPanel.vue'

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

<style scoped></style>
