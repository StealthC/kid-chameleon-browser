<script setup lang="ts">
import { RouterLink } from 'vue-router'
import ReadRom from '@/components/ReadRom.vue'
import VRBackDrop from '@/components/VRBackDrop.vue'
import RouterViewWrapper from '@/views/RouterViewWrapper.vue'
</script>

<template>
  <VRBackDrop />
  <div class="flex h-screen w-screen flex-col overflow-hidden">
    <header class="flex items-center justify-center bg-slate-900/80">
      <div class="mx-auto w-full sm:w-fit">
        <nav
          class="m-1 flex justify-center space-x-4 border-4 border-double border-white bg-black p-2"
        >
          <RouterLink
            active-class="active"
            class="flex items-center px-2 font-mono font-extrabold text-white select-none hover:underline uppercase"
            to="/"
            ><div class="flex flex-row items-center gap-2">
              <div class="bullet h-2 w-3 border-2"></div>
              <div>ROM</div>
            </div></RouterLink
          >
          <RouterLink
            active-class="active"
            class="flex items-center px-2 font-mono font-extrabold text-white select-none hover:underline uppercase"
            to="/resources"
            ><div class="flex flex-row items-center gap-2">
              <div class="bullet h-2 w-3 border-2"></div>
              <div>Resources</div>
            </div></RouterLink
          >
          <RouterLink
            active-class="active"
            class="flex items-center px-2 font-mono font-extrabold text-white select-none hover:underline uppercase"
            to="/about"
            ><div class="flex flex-row items-center gap-2">
              <div class="bullet h-2 w-3 border-2"></div>
              <div>About</div>
            </div></RouterLink
          >
        </nav>
      </div>
    </header>
    <div class="flex-1 overflow-hidden">
      <RouterViewWrapper />
    </div>
    <div class="pointer-events-none h-24 bg-gradient-to-t from-cyan-900 to-transparent"></div>
  </div>
  <footer class="absolute bottom-0 w-screen">
    <div class="mx-auto max-w-xl">
      <ReadRom />
    </div>
  </footer>
</template>

<style scoped lang="scss">
.active {
  .bullet {
    opacity: 100%;
  }
}
.bullet {
  opacity: 0%;
}
</style>
