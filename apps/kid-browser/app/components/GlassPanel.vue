<template>
  <Card
    :class="[
      'border-border/70 flex h-full min-h-0 flex-col bg-slate-950/70 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-slate-950/60',
      $attrs.class,
    ]"
  >
    <CardHeader v-if="header || $slots.header" class="pb-3">
      <slot name="header">
        <CardTitle class="text-base tracking-wide">{{ header }}</CardTitle>
      </slot>
    </CardHeader>
    <CardContent class="min-h-0 flex-1 overflow-auto pt-0">
      <slot></slot>
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'

type Props = {
  header?: string
}
const { header } = defineProps<Props>()
</script>
