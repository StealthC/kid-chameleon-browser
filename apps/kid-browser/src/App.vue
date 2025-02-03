<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
import Toast from 'primevue/toast'
import ReadRom from '@/components/ReadRom.vue'
</script>

<template>
  <Toast />
  <div class="flex flex-col h-screen w-screen overflow-hidden">
    <header class="h-8 flex items-center justify-center">
      <div class="text-primary">
        <nav class="flex justify-center space-x-4">
          <RouterLink to="/">Home</RouterLink>
          <RouterLink to="/resources">Resources</RouterLink>
          <RouterLink to="/credits">Credits</RouterLink>
        </nav>
      </div>
    </header>
    <div class="flex-1 overflow-hidden">
      <RouterView />
    </div>
    <div class="h-24">
    </div>
  </div>
  <footer class="absolute bottom-0 w-screen bg-gradient-to-t from-cyan-900 to-transparent">
    <div class="max-w-xl mx-auto">
      <ReadRom />
    </div>
  </footer>
</template>

<style scoped></style>
