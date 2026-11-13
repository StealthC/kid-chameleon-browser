// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  ssr: false,
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },
  css: ['~/assets/css/main.css'],
  components: {
    dirs: [
      { path: '~/components', pathPrefix: true },
      { path: '~/components/rom-resources', pathPrefix: false },
    ],
  },
  modules: ['@nuxt/ui', '@pinia/nuxt', '@nuxt/icon'],
  ui: {
    // The app is dark-only and intentionally offline-friendly.
    colorMode: false,
    fonts: false,
  },
  icon: {
    serverBundle: 'local',
    clientBundle: {
      scan: true,
      sizeLimitKb: 512,
    },
  },
  app: {
    head: {
      charset: 'utf-8',
      viewport: 'width=device-width, initial-scale=1.0',
      title: 'Kid Chameleon Browser',
      htmlAttrs: {
        class: 'dark',
      },
      link: [
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
        { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32x32.png' },
        { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicon-16x16.png' },
        { rel: 'manifest', href: '/site.webmanifest' },
      ],
    },
  },
  runtimeConfig: {
    public: {
      appVersion: process.env.npm_package_version ?? '0.0.0',
    },
  },
})
