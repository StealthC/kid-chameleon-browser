<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
import Toast from 'primevue/toast'
import ReadRom from '@/components/ReadRom.vue'
</script>

<template>
  <Toast />
  <div class="flex h-screen w-screen flex-col overflow-hidden">
    <header class="flex items-center justify-center p-2">
      <div class="text-primary">
        <nav class="flex justify-center space-x-4">
          <RouterLink
            active-class="bg-primary text-black"
            class="rounded-lg border border-primary p-2 px-4 hover:bg-primary-900"
            to="/"
            >Home</RouterLink
          >
          <RouterLink
            active-class="bg-primary text-black"
            class="rounded-lg border border-primary p-2 px-4 hover:bg-primary-900"
            to="/rom"
            >ROM Info</RouterLink
          >
          <RouterLink
            active-class="bg-primary text-black"
            class="rounded-lg border border-primary p-2 px-4 hover:bg-primary-900"
            to="/resources"
            >Resources</RouterLink
          >
        </nav>
      </div>
    </header>
    <div class="flex-1 overflow-hidden">
      <RouterView />
    </div>
    <div class="pointer-events-none h-24 bg-gradient-to-t from-cyan-900 to-transparent"></div>
  </div>
  <footer class="absolute bottom-0 w-screen">
    <div class="mx-auto max-w-xl">
      <ReadRom />
    </div>
  </footer>
</template>

<style scoped></style>
