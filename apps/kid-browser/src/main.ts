//import './assets/base.css'
import './assets/style.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
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
app.use(router)

app.mount('#app')
console.log(`
+------------------+
| +--------------+ |
| |  +-------+   | |
| |  |  +--+ ++  | |
| |  |  |  |  |  | |
| |  |  +--+ ++  | |
| |  |  +----+   | |
| |  |  |        | |
| |  +--+        | |
| +--------------+ |
+------------------+
Kid Chameleon Browser version ${__APP_VERSION__} is running and ready to go!
`)
