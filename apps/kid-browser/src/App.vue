<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
import Toast from 'primevue/toast'
import ReadRom from '@/components/ReadRom.vue'
</script>

<template>
  <Toast />
  <header>
    <div class="wrapper">
      <nav>
        <RouterLink to="/">Home</RouterLink>
        <RouterLink to="/about">About</RouterLink>
      </nav>
    </div>
  </header>
  <RouterView />
  <footer class="bottom-0 fixed w-full">
    <ReadRom />
  </footer>
</template>

<style scoped>

</style>
