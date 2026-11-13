<template>
  <section
    v-bind="$attrs"
    class="border-default bg-elevated/30 flex h-full min-h-0 flex-col overflow-hidden rounded-lg border"
  >
    <header
      v-if="title || icon || $slots.header || $slots.actions"
      class="border-default flex h-9 shrink-0 items-center gap-2 border-b px-3"
    >
      <UIcon v-if="icon" :name="icon" class="text-muted size-4 shrink-0" />
      <slot name="header">
        <h2 class="text-muted truncate text-[11px] font-semibold tracking-wider uppercase">
          {{ title }}
        </h2>
      </slot>
      <div v-if="$slots.actions" class="ms-auto flex shrink-0 items-center gap-1">
        <slot name="actions" />
      </div>
    </header>

    <div
      class="min-h-0 flex-1"
      :class="padded ? 'overflow-auto p-3' : 'flex flex-col overflow-hidden'"
    >
      <slot />
    </div>

    <footer v-if="$slots.footer" class="border-default shrink-0 border-t px-3 py-2">
      <slot name="footer" />
    </footer>
  </section>
</template>

<script setup lang="ts">
defineOptions({ inheritAttrs: false })

withDefaults(
  defineProps<{
    title?: string
    icon?: string
    padded?: boolean
  }>(),
  {
    padded: true,
  },
)
</script>
