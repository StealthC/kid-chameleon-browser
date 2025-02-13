import { createRouter, createWebHashHistory } from 'vue-router'
import AboutView from '@/views/AboutView.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/about',
      name: 'about',
      component: AboutView,
      meta: { requiresRom: false },
    },
    {
      path: '/',
      name: 'home',
      component: () => import('../views/RomView.vue'),
      meta: { requiresRom: true },
    },
    {
      path: '/resources/:address?',
      name: 'resources',
      component: () => import('../views/ResourceExplorer.vue'),
      meta: { requiresRom: true },
    },
  ],
})

export default router
