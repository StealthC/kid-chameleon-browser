import { createRouter, createWebHashHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/resources',
      name: 'resources',
      component: () => import('../views/ResourceExplorer.vue'),
    }
  ],
})

export default router
