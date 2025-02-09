import { createRouter, createWebHashHistory } from 'vue-router'
import AboutView from '@/views/AboutView.vue'
import useRomStore from '@/stores/romStore'
import { storeToRefs } from 'pinia'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: AboutView,
      meta: { requiresRom: false },
    },
    {
      path: '/rom',
      name: 'rom',
      component: () => import('../views/RomView.vue'),
      meta: { requiresRom: true },
    },
    {
      path: '/resources',
      name: 'resources',
      component: () => import('../views/ResourceExplorer.vue'),
      meta: { requiresRom: true },
    },
    {
      path: '/resources/:address',
      name: 'resourceByAddress',
      component: () => import('../views/ResourceViewPage.vue'),
      meta: { requiresRom: true },
    },
  ],
})
router.beforeEach((to, from, next) => {
  const { romFullLoaded, romLoading } = storeToRefs(useRomStore())
  if (to.meta.requiresRom) {
    if (romFullLoaded.value) {
      next()
    } else if (!romLoading.value) {
      next({ name: 'home' })
    } else {
      next(false)
    }
  } else {
    next()
  }
})

export default router
