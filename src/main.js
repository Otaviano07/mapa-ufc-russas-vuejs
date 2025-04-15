import { createApp } from 'vue'
import App from './App.vue'
import router from './router' // Importa o roteador
import './assets/styles/main.css'

createApp(App).use(router).mount('#app')