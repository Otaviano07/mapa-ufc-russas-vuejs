import { createRouter, createWebHistory } from 'vue-router';
import MapLayout from '@/layouts/MapLayout.vue';
import MapHome from '@/views/MapHome.vue';
import AdminPanel from '@/views/AdminPanel.vue';

const routes = [
  {
    path: '/',
    component: MapLayout,
    children: [
      {
        path: '',
        name: 'MapHome',
        component: MapHome
      },
      {
        path: 'admin',
        name: 'AdminPanel',
        component: AdminPanel
      }
    ]
  }
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
});

export default router;
