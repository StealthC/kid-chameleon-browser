<template>
  <div class="h-full overflow-auto">
    <div class="max-w-3xl mx-auto flex flex-col gap-4">
      <Panel class="prose dark:prose-invert max-w-none">
        <h2 class="m-0 pb-4">About this tool</h2>
        <p>This is a WIP project, so many features are not yet available and may never be.</p>
        <p>
          This is just a fancy tool for visualizing data from Sega Genesis/Mega-Drive Kid Chameleon
          ROMs. Its purpose is to detect and display various types of game resources, such as:
        </p>
        <ul>
          <li>Tile Sheets</li>
          <li>Sprites</li>
          <li>Animations</li>
          <li>Planes</li>
          <li>Levels</li>
          <li>And whatever else he can find...</li>
        </ul>
        <p>
          It also try to sort the resources such a way that it is easy to extract them in an orderly
          fashion for the development of another game engine (Kid Engine) or any other purpose.
        </p>
        <p>This tool is made with typescript and its GUI is made with vue.js</p>

        <p>Author: StealthC</p>
      </Panel>
      <Panel class="prose dark:prose-invert mx-auto max-w-none">
        <h2 class="m-0 pb-4">Credits and References</h2>
        <p>
          This project can't never be done without the help of the following resources and all the
          great people behind them:
        </p>
        <ul class="flex flex-col py-4 gap-1">
          <li>
            <a
              class="no-underline hover:underline"
              href="https://github.com/sonicretro/kid-chameleon-disasm"
              >Kid Chameleon Disassembly</a
            >
          </li>
          <li>
            <a
              class="no-underline hover:underline"
              href="https://github.com/mrhappyasthma/Sega-Genesis-Checksum-Utility"
              >Sega Genesis Checksum Utility</a
            >
          </li>
          <li>
            <a
              class="no-underline hover:underline"
              href="https://raw.githubusercontent.com/mrhappyasthma/Sega-Genesis-Checksum-Utility/refs/heads/master/Resources/Backup/The%20Complete%20Documentation%20About%20Genesis%20Rom%20Format%20(v1.1).txt"
              >THE COMPLETE DOCUMENTATION ABOUT GENESIS ROM FORMAT</a
            >
          </li>
          <li>
            <a
              class="no-underline hover:underline"
              href="https://kidchameleon.fandom.com/wiki/Main_Page"
              >Kid Chameleon Wiki</a
            >
          </li>
        </ul>
      </Panel>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Panel } from 'primevue'
</script>

<style scoped></style>
