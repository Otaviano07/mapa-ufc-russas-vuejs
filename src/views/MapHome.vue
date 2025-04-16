<template>
  <div class="map-container">
    <MapDisplay
      :waypoints="waypoints"
      :locations="locations"
      :current-floor="currentFloor"
      :user-position="userPosition"
      :selected-location="selectedLocation"
    />
    <MapControls
      :locations="locations"
      :current-floor="currentFloor"
      @floor-change="handleFloorChange"
      @location-select="handleLocationSelect"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { fetchInitialData } from '../services/LocationService';
import MapDisplay from '../components/MapDisplay.vue';
import MapControls from '../components/MapControls.vue';
import { useGeolocation } from '../composables/useGeolocation';

// Estados reativos
const waypoints = ref([]);
const locations = ref([]);
const currentFloor = ref('terreo');
const selectedLocation = ref(null);
const loading = ref(false);
const error = ref(null);

// Integração com geolocalização
const { position: userPosition } = useGeolocation();

// Handlers
const handleFloorChange = (floor) => {
  currentFloor.value = floor;
};

const handleLocationSelect = (location) => {
  selectedLocation.value = location;
};

// Carregamento inicial dos dados
const loadInitialData = async () => {
  loading.value = true;
  error.value = null;
  
  try {
    const data = await fetchInitialData();
    console.log('MapHome - Dados iniciais recebidos:', data);
    
    if (data) {
      waypoints.value = data.waypoints || [];
      locations.value = data.locais || [];
      
      console.log('MapHome - Detalhes dos dados carregados:');
      console.log('Número de waypoints:', waypoints.value.length);
      console.log('Waypoints:', waypoints.value);
      console.log('Número de locais:', locations.value.length);
      console.log('Locais:', locations.value);
      console.log('Andar atual:', currentFloor.value);
    }
  } catch (e) {
    console.error('Erro ao carregar dados iniciais:', e);
    error.value = 'Erro ao carregar dados do mapa';
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  loadInitialData();
});
</script>

<style scoped>
.map-container {
  position: relative;
  width: 100%;
  height: 100vh;
  display: flex;
}
</style>