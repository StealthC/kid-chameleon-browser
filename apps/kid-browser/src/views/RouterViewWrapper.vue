<template>
  <RequiresRomWrapper :requireRom="requireRom">
    <router-view v-slot="{ Component }">
      <transition name="fade" mode="out-in" :duration="250" appear>
        <component :is="Component" />
      </transition>
    </router-view>
  </RequiresRomWrapper>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import RequiresRomWrapper from '@/views/RequiresRomWrapper.vue'

const route = useRoute()
const requireRom = computed(() => !!route.meta.requiresRom)
</script>

<style>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
