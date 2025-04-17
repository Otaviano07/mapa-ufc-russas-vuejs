<template>
  <div class="admin-panel-view">
    <LocationAdmin />
  </div>
</template>

<script setup>
// This view simply acts as a container for the LocationAdmin component.
import LocationAdmin from '@/components/LocationAdmin.vue';

// No additional logic needed here for basic display.
// Could add logic for fetching view-specific data or handling route params if necessary.
</script>

<style scoped>
.admin-panel-view {
  padding: 0; /* Remove padding if LocationAdmin handles its own */
  /* background-color: #f0f2f5; */ /* Optional background for the view */
  min-height: 100vh; /* Ensure view takes full height */
}

/* Styles from LocationAdmin should handle the internal layout and appearance. */
/* Avoid duplicating styles here unless overriding or adding view-specific wrappers. */

/* Example: Max width could be controlled here instead of in the component */
/*
.admin-panel-view {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
}
*/
</style>