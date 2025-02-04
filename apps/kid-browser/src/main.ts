import './assets/base.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ToastService from 'primevue/toastservice'
import PrimeVue from 'primevue/config'
import App from './App.vue'
import router from './router'
import { VueQueryPlugin } from '@tanstack/vue-query'

const app = createApp(App)

app.use(VueQueryPlugin)
app.use(createPinia())
app.use(PrimeVue, {
  theme: 'none',
})
app.use(ToastService)
app.use(router)

app.mount('#app')
