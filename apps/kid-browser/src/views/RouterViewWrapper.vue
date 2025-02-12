<template>
  <RequiresRomWrapper :requireRom="requireRom">
    <transition name="fade" mode="out-in" :duration="500" appear>
      <router-view />
    </transition>
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
  transition: opacity 0.5s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
