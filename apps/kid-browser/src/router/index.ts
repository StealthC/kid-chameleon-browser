import { createRouter, createWebHashHistory } from 'vue-router'
import AboutView from '@/views/AboutView.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: AboutView,
    },
    {
      path: '/rom',
      name: 'rom',
      component: () => import('../views/RomView.vue'),
    },
    {
      path: '/resources',
      name: 'resources',
      component: () => import('../views/ResourceExplorer.vue'),
    },
    {
      path: '/resources/:address',
      name: 'resourceByAddress',
      component: () => import('../views/ResourceView.vue'),
    },
  ],
})

export default router
