<template>
  <VRBackDrop />
  <div class="flex h-screen w-screen flex-col overflow-hidden">
    <header class="flex items-center justify-center bg-slate-900/80">
      <div class="mx-auto w-full sm:w-fit">
        <nav
          class="m-1 flex justify-center space-x-4 border-4 border-double border-white bg-black p-2"
        >
          <NuxtLink
            active-class="active"
            class="group flex items-center px-2 font-mono font-extrabold text-white uppercase select-none hover:underline"
            to="/"
          >
            <div class="flex flex-row items-center gap-2">
              <div class="h-2 w-3 border-2 opacity-0 group-[.active]:opacity-100"></div>
              <div>HOME</div>
            </div>
          </NuxtLink>
          <NuxtLink
            active-class="active"
            class="group flex items-center px-2 font-mono font-extrabold text-white uppercase select-none hover:underline"
            to="/resources"
          >
            <div class="flex flex-row items-center gap-2">
              <div class="h-2 w-3 border-2 opacity-0 group-[.active]:opacity-100"></div>
              <div>Resources</div>
            </div>
          </NuxtLink>
          <NuxtLink
            active-class="active"
            class="group flex items-center px-2 font-mono font-extrabold text-white uppercase select-none hover:underline"
            to="/about"
          >
            <div class="flex flex-row items-center gap-2">
              <div class="h-2 w-3 border-2 opacity-0 group-[.active]:opacity-100"></div>
              <div>About</div>
            </div>
          </NuxtLink>
        </nav>
      </div>
    </header>

    <div class="flex-1 overflow-hidden">
      <slot />
    </div>

    <div class="pointer-events-none h-24 bg-gradient-to-t from-cyan-900 to-transparent"></div>
  </div>

  <footer class="absolute bottom-0 w-screen">
    <div class="mx-auto max-w-xl">
      <ReadRom />
    </div>
  </footer>
</template>

