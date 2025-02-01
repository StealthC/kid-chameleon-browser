<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
import Toast from 'primevue/toast'
import ReadRom from '@/components/ReadRom.vue'
</script>

<template>
  <Toast />
  <div class="flex flex-col h-screen w-screen overflow-hidden">
    <header>
      <div class="text-primary">
        <nav class="flex justify-center space-x-4">
          <RouterLink to="/">Home</RouterLink>
          <RouterLink to="/resources">Resources</RouterLink>
        </nav>
      </div>
    </header>
    <div class="flex-grow overflow-hidden">
      <RouterView />
    </div>
    <footer class="w-full">
      <ReadRom />
    </footer>
  </div>
</template>

<style scoped></style>
