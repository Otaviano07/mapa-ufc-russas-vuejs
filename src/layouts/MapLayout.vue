<template>
  <div class="map-container">
    <router-link to="/admin" class="btn-link">Acessar Admin</router-link>
    <div v-if="loading" class="loading">Carregando mapa...</div>
    <div v-if="error" class="error">{{ error }}</div>

    <div v-if="mapScale && mapDimensions && andarAtualInfo.image" class="map-content"
         :style="{ width: `${mapDimensions.width}px`, height: `${mapDimensions.height}px` }">
      <img :src="andarAtualInfo.image" alt="Mapa do Andar" class="map-image" @error="handleImageError" />

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
import { ref, computed, onMounted, watch } from 'vue';
import { useMapRouting } from '@/composables/useMapRouting';
import { useLocationStore } from '@/stores/location';
import { fetchInitialData } from '@/services/LocationService'; // Importe fetchInitialData diretamente

const locationStore = useLocationStore();
const locations = ref([]);
const loading = ref(true);
const error = ref(null);
const selectedLocation = ref(null);
const userPosition = ref({ x: 10, y: 10 }); // Posição inicial do usuário
const currentFloor = ref('terreo'); // Certifique-se de que tenha um valor inicial válido
const mapScale = ref({ x: 1, y: 1 }); // Escala inicial
const mapDimensions = ref({ width: 800, height: 600 }); // Dimensões do mapa

onMounted(async () => {
  try {
    const data = await fetchInitialData();
    if (data) {
      locations.value = data.locais;
      andaresDisponiveis.value = data.floors;
    } else {
      throw new Error('Dados retornados estão vazios.');
    }
  } catch (err) {
    error.value = `Erro ao carregar dados: ${err.message}`;
  } finally {
    loading.value = false;
  }
});

const andaresDisponiveis = ref([]); // Inicializado como array vazio para evitar undefined

const handleImageError = () => {
  error.value = 'Erro ao carregar a imagem do mapa. Verifique o caminho ou a existência do arquivo.';
  console.error('Erro ao carregar a imagem:', andarAtualInfo.value.image);
};

// Corrija o problema do andar "terreo" não encontrado
const andarAtualInfo = computed(() => {
  if (!andaresDisponiveis.value || !currentFloor.value) {
    console.warn('Andares disponíveis ou andar atual não definidos.');
    return { nome: 'Carregando...', image: '' };
  }

  const andarInfo = andaresDisponiveis.value.find(
    andar => andar.nome.toLowerCase() === currentFloor.value.toLowerCase()
  );

  if (!andarInfo) {
    console.warn(`Andar "${currentFloor.value}" não encontrado nos andares disponíveis.`);
    return { nome: currentFloor.value, image: `/maps/${currentFloor.value.toLowerCase()}.svg` };
  }

  const imagePath = `/maps/${andarInfo.nome.toLowerCase()}.svg`;
  console.log('Carregando imagem do mapa:', imagePath);

  return {
    nome: andarInfo.nome,
    image: imagePath,
  };
});

// Certifique-se de que todos os valores passados para useMapRouting sejam reativos e inicializados corretamente
const routeSegments = ref([]); // Inicializado como array vazio para evitar undefined

// Atualize o uso de useMapRouting para evitar problemas com valores indefinidos
const { calculateRouteSegments } = useMapRouting(
  userPosition,
  selectedLocation,
  currentFloor,
  mapScale,
  mapDimensions
);

// Adicione um watch para atualizar os segmentos de rota quando necessário
watch(
  [userPosition, selectedLocation, currentFloor, mapScale, mapDimensions],
  () => {
    if (userPosition.value && selectedLocation.value && currentFloor.value) {
      routeSegments.value = calculateRouteSegments();
    } else {
      routeSegments.value = [];
    }
  },
  { immediate: true }
);

/**
 * Updates the selected location to the provided location.
 *
 * @param {Object} location - The location object to be set as the selected location.
 */


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
  background-color: #f0f0f0; /* Adicionado para evitar fundo vazio */
}

.map-content {
  position: relative;
  border: 1px solid #ccc;
}

.map-image {
  width: 100%;
  height: 100%;
  object-fit: contain; /* Garante que a imagem se ajuste ao container */
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

/* Estilo compartilhado para os botões de navegação */
.btn-link {
  display: inline-block;
  color: #3498db;
  text-decoration: none;
  margin-bottom: 1.5rem;
  padding: 8px 12px;
  border-radius: 4px;
  background-color: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
  border: 1px solid #e2e8f0;
}

.btn-link:hover {
  background-color: #3498db;
  color: #fff;
  text-decoration: none;
  border-color: #2980b9;
}
</style>