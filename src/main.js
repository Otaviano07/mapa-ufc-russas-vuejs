import { createApp } from 'vue'
import App from './App.vue'
import router from './router' // <--- Importa o roteador
import './assets/styles/main.css' // Importa o CSS Global (se já não estiver)

const app = createApp(App)

app.use(router) // <--- Usa o roteador

createApp(App).mount('#app')