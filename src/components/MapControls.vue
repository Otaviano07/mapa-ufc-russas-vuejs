<script setup>
const emit = defineEmits(['zoom-in', 'zoom-out', 'update-location', 'set-location-manual']);
</script>

<template>
  <div class="controls">
    <button @click="emit('zoom-in')" title="Aproximar">+</button>
    <button @click="emit('zoom-out')" title="Afastar">-</button>
    <button @click="emit('update-location')" title="Obter localização automática">GPS</button>
     <button @click="emit('set-location-manual')" title="Definir localização manualmente">Manual</button>
  </div>
</template>

<style scoped>
/* Estilos dos controles já estão em main.css */
button {
    font-weight: bold;
}
</style>