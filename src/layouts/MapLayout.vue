<template>
  <div class="map-container">
    <div v-if="loading" class="loading">Carregando mapa...</div>
    <div v-if="error" class="error">{{ error }}</div>

    <div v-if="mapScale && mapDimensions" class="map-content" :style="{ width: `${mapDimensions.width}px`, height: `${mapDimensions.height}px` }">
      <img :src="andarAtualInfo.image" alt="Mapa do Andar" class="map-image" />

      <div v-for="loc in locations" :key="loc.id" class="location-pin"
           :style="{ left: `${loc.x * mapScale.x}%`, top: `${loc.y * mapScale.y}%` }"
           @click="selectLocation(loc)">
        {{ loc.nome }}
      </div>

      <div v-for="segment in routeSegments" :key="segment.index" class="route-segment"
           :style="{ left: `${segment.x * mapScale.x}%`, top: `${segment.y * mapScale.y}%`,
                      width: `${segment.length * mapScale.x}%`, transform: `rotate(${segment.angle}deg)` }">
      </div>

      <div v-if="userPosition" class="user-position"
           :style="{ left: `${userPosition.x * mapScale.x}%`, top: `${userPosition.y * mapScale.y}%` }">
        Você está aqui
      </div>
    </div>

    <div class="location-details" v-if="selectedLocation">
      <h2>{{ selectedLocation.nome }}</h2>
      <p>{{ selectedLocation.descricao }}</p>
      <button @click="clearSelection">Fechar</button>
    </div>


  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useMapRouting } from '@/composables/useMapRouting';
import { useLocationStore } from '@/stores/location';
import { fetchInitialData } from '@/services/LocationService'; // Importe fetchInitialData diretamente

const locationStore = useLocationStore();
const locations = ref([]);
const loading = ref(true);
const error = ref(null);
const selectedLocation = ref(null);
const userPosition = ref({ x: 10, y: 10 }); // Posição inicial do usuário
const currentFloor = ref('terreo'); // Andar inicial
const mapScale = ref({ x: 1, y: 1 }); // Escala inicial
const mapDimensions = ref({ width: 800, height: 600 }); // Dimensões do mapa

onMounted(async () => {
  try {
    const data = await fetchInitialData(); // Chame fetchInitialData diretamente
    if (data) {
      locations.value = data.locais;
      andaresDisponiveis.value = data.floors;
    }
  } catch (err) {
    error.value = `Erro ao carregar dados: ${err.message}`;
  } finally {
    loading.value = false;
  }
});

const andaresDisponiveis = ref(null);

const andarAtualInfo = computed(() => {
  console.log('Verificando andar atual:', currentFloor.value);
  console.log('Andares disponíveis:', andaresDisponiveis.value);

  if (!andaresDisponiveis.value) {
    return { nome: 'Carregando...', image: '' };
  }

  const andarInfo = andaresDisponiveis.value.find(andar => andar.nome.toLowerCase() === currentFloor.value);

  if (!andarInfo) {
    return { nome: 'Andar não encontrado', image: '' };
  }

  return {
    nome: andarInfo.nome,
    image: `/maps/${andarInfo.nome.toLowerCase()}.svg`
  };
});

const { routeSegments } = useMapRouting(
  userPosition,
  selectedLocation,
  currentFloor,
  mapScale,
  mapDimensions,
  
);

/*************  ✨ Windsurf Command ⭐  *************/
/**
 * Updates the selected location to the provided location.
 *
 * @param {Object} location - The location object to be set as the selected location.
 */

/*******  b7aecb73-4466-4de7-b736-0ef4c0977dfc  *******/
function selectLocation(location) {
  selectedLocation.value = location;
}

function clearSelection() {
  selectedLocation.value = null;
}
</script>

<style scoped>
.map-container {
  position: relative;
  width: 100%;
  height: 100vh;
}

.map-content {
  position: relative;
  border: 1px solid #ccc;
}

.map-image {
  width: 100%;
  height: 100%;
}

.location-pin,
.user-position {
  position: absolute;
  background-color: rgba(255, 0, 0, 0.7);
  color: white;
  padding: 5px;
  border-radius: 5px;
  cursor: pointer;
}

.route-segment {
  position: absolute;
  height: 3px;
  background-color: blue;
  transform-origin: left;
}

.location-details,
.debug-waypoints {
  position: absolute;
  top: 10px;
  right: 10px;
  background-color: white;
  padding: 10px;
  border: 1px solid #ccc;
}
</style>