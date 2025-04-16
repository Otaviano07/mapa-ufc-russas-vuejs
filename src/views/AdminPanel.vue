<template>
  <div class="admin-panel">
    <LocationAdmin />
  </div>
</template>

<script setup>
import LocationAdmin from '@/components/LocationAdmin.vue';
</script>

<style scoped>
.admin-panel {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
  background: white;
  min-height: 100vh;
}
</style>