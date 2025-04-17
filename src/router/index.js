import { createRouter, createWebHistory } from 'vue-router';
// Layouts
import MapLayout from '@/layouts/MapLayout.vue';
// Views
import MapHome from '@/views/MapHome.vue'; // This might be redundant if MapLayout handles the map directly
import AdminPanel from '@/views/AdminPanel.vue';

const routes = [
  {
    // Main application route using the MapLayout
    path: '/',
    component: MapLayout,
    // Children routes rendered within MapLayout's <router-view> (if it had one)
    // If MapLayout IS the map view, MapHome might not be needed as a child.
    // Let's assume MapLayout renders the map directly and doesn't need a child for the home map view.
    // children: [
    //   {
    //     path: '', // Default child route for '/'
    //     name: 'MapHome',
    //     component: MapHome
    //   }
    // ]
  },
  {
    // Admin panel route - potentially uses a different layout or no layout
    path: '/admin',
    name: 'AdminPanel',
    component: AdminPanel
    // meta: { requiresAuth: true } // Example: Add auth requirement if needed
  }
  // Add other top-level routes here if necessary
];

const router = createRouter({
  // Use history mode for cleaner URLs (requires server config for deployment)
  history: createWebHistory(import.meta.env.BASE_URL || '/'), // Provide a fallback base
  routes, // Short for `routes: routes`
  // Optional: Scroll behavior for navigation
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition;
    } else {
      return { top: 0 }; // Scroll to top on new page load
    }
  }
});

// Optional: Navigation guards (e.g., for authentication)
// router.beforeEach((to, from, next) => {
//   const requiresAuth = to.matched.some(record => record.meta.requiresAuth);
//   const isAuthenticated = /* Check authentication status */;
//
//   if (requiresAuth && !isAuthenticated) {
//     next('/login'); // Redirect to login page
//   } else {
//     next(); // Proceed as normal
//   }
// });

export default router;