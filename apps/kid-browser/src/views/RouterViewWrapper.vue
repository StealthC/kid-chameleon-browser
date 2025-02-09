<template>
  <component :is="wrapper">
    <router-view />
  </component>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue';
import { useRoute } from 'vue-router';

const DefaultWrapper = defineAsyncComponent(() => import('@/views/DefaultWrapper.vue'));
const RequiresRomWrapper = defineAsyncComponent(() => import('@/views/RequiresRomWrapper.vue'));
const route = useRoute();

const wrapper = computed(() => {
  if (route.meta.requiresRom) {
    return RequiresRomWrapper;
  }
  return DefaultWrapper;
});

</script>

<style scoped>

</style>
