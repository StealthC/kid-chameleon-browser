import { fileURLToPath, URL } from 'node:url'
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  base: process.env.BASE || '/',
  plugins: [
    vue(),
    vueDevTools(),
    tailwindcss(),
  ],
  define: {
    '__APP_VERSION__': JSON.stringify(process.env.npm_package_version),
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  server: {
    host: '0.0.0.0'
  }
})
