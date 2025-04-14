<script setup>
import { ref, computed, onMounted, watch, provide } from 'vue';
import AppSidebar from './components/AppSidebar.vue';
import MapDisplay from './components/MapDisplay.vue';
import MapControls from './components/MapControls.vue';
import { useGeolocation } from './composables/useGeolocation.js';
import { useMapInteraction } from './composables/useMapInteraction.js';
import { useMapRouting } from './composables/useMapRouting.js';
import { fetchLocais, getFloors } from './services/LocationService.js';

// === Estados Globais da Aplicação ===
const allLocais = ref([]);          // Todos os locais de todos os andares
const selectedLocal = ref(null);    // O local de destino selecionado
const currentFloorId = ref('terreo'); // ID do andar atual ('terreo', 'primeiro')
const floors = ref([]);             // Dados dos andares {id, name, image}
const isMenuOpen = ref(false);      // Estado do menu lateral
const loading = ref({               // Estado de carregamento
    locais: true,
    map: true, // Pode ser combinado ou separado
});
const error = ref({                 // Estado de erro
    locais: null,
    routing: null, // Erro específico do roteamento vindo do composable
    geolocation: null // Erro da geolocalização vindo do composable
});
const mapDimensions = ref({ width: 0, height: 0 }); // Dimensões do mapa em pixels


// === Composables ===
const {
    userPosition,
    geolocationError,
    isGettingLocation,
    getUserLocationAuto,
    setUserLocationManually
} = useGeolocation();

const {
    mapScale,
    popupInfo,
    settingUserLocationMode,
    zoomIn,
    zoomOut,
    showPopup,
    hidePopup,
    handleMapClick: handleMapClickInteraction, // Renomeado para evitar conflito
    enableSetUserLocationMode,
} = useMapInteraction();

const {
    routeSegments,
    hasRoute,
    debugWaypoints,
    routingError: routeCalcError, // Erro do cálculo de rota
    calculateRoute // Função para recalcular manualmente se necessário
} = useMapRouting(userPosition, selectedLocal, currentFloorId, mapScale, mapDimensions); // Passa refs necessários


// === Dados Computados ===
const currentFloorData = computed(() => floors.value.find(f => f.id === currentFloorId.value));
const currentFloorMap = computed(() => currentFloorData.value?.image || '');
const locaisAtualAndar = computed(() => allLocais.value.filter(local => local.andar === currentFloorId.value));
const overallLoading = computed(() => loading.value.locais || loading.value.map || isGettingLocation.value);
// Combina erros para exibição (pode priorizar)
const displayError = computed(() => error.value.locais || error.value.geolocation || error.value.routing);


// === Métodos / Manipuladores de Eventos ===
const toggleMenu = () => {
  isMenuOpen.value = !isMenuOpen.value;
};

const closeMenu = () => {
    isMenuOpen.value = false;
}

const loadInitialData = async () => {
  loading.value.locais = true;
  error.value.locais = null;
  try {
    // Carrega dados dos andares primeiro
    floors.value = getFloors();
    if (floors.value.length > 0 && !floors.value.some(f => f.id === currentFloorId.value)) {
        // Define um andar padrão válido se o inicial não existir
        currentFloorId.value = floors.value[0].id;
    }

    // Carrega locais
    const locaisResult = await fetchLocais();
    allLocais.value = locaisResult;

  } catch (err) {
    console.error("Erro ao carregar dados iniciais:", err);
    error.value.locais = "Falha ao carregar dados.";
  } finally {
    loading.value.locais = false;
    loading.value.map = false; // Assume que mapa carrega junto com dados por enquanto
  }
};

const handleLocalSelect = (local) => {
  selectedLocal.value = local;
  // Se o local selecionado estiver em outro andar, muda para ele
  if (local.andar !== currentFloorId.value) {
    currentFloorId.value = local.andar;
     // A rota será recalculada pelo watch em useMapRouting quando o andar mudar
  }
  // Fecha o menu ao selecionar um local
  closeMenu();
};

// Função chamada pelo MapDisplay quando o mapa é clicado
const handleMapClick = (event, mapRect) => {
    // Passa para o composable de interação, fornecendo callbacks
    handleMapClickInteraction(
        event,
        mapRect,
        (xPercent, yPercent) => { // Callback para definir localização manual
            setUserLocationManually(xPercent, yPercent);
             error.value.geolocation = null; // Limpa msg sobre modo manual
        },
        () => { // Callback para tentar fechar o menu
             // Fecha o menu somente se estiver aberto e o clique não foi no botão
             if (isMenuOpen.value && !event.target.closest('.menu-toggle-button')) {
                 closeMenu();
             }
        }
    );
     // Se não estiver no modo de definir localização, um clique no mapa pode deselecionar o local? (Opcional)
     // if (!settingUserLocationMode.value) {
     //     selectedLocal.value = null;
     // }
};

// Inicia a busca automática de localização (acionado pelo botão)
const triggerAutoLocation = () => {
    getUserLocationAuto();
    closeMenu(); // Fecha o menu ao tentar obter localização
};

// Ativa o modo de definição manual (acionado pelo botão)
const triggerManualLocationMode = () => {
    enableSetUserLocationMode();
    error.value.geolocation = "Clique no mapa para definir sua localização."; // Informa o usuário
    closeMenu();
};

// === Watchers ===
// Observa erros dos composables para atualizar o estado de erro local
watch(geolocationError, (newError) => {
    if (!settingUserLocationMode.value){ // Não sobrescreve msg de "clique no mapa"
      error.value.geolocation = newError;
    }
});
watch(routeCalcError, (newError) => { error.value.routing = newError; });

// Limpa seleção se mudar de andar e o local selecionado não pertencer mais ao andar atual
watch(currentFloorId, (newFloor, oldFloor) => {
    if (selectedLocal.value && selectedLocal.value.andar !== newFloor) {
        // Mantém selecionado mas a rota sumirá, ou deseleciona?
        // selectedLocal.value = null; // Desseleciona ao mudar de andar
    }
     // Limpa popups ao mudar de andar
     hidePopup();
});


// === Ciclo de Vida ===
onMounted(() => {
  loadInitialData();
  getUserLocationAuto(); // Tenta obter localização ao iniciar
});

</script>

<template>
  <div class="app-container">
    <button class="menu-toggle-button" @click="toggleMenu" title="Abrir/Fechar Menu">☰</button>

    <AppSidebar
      :is-open="isMenuOpen"
      :all-locais="allLocais"
      :floors="floors"
      :current-floor-id="currentFloorId"
      :selected-local-id="selectedLocal?.id"
      :loading="loading.locais"
      :error="error.locais"
      @update:currentFloorId="currentFloorId = $event"
      @select-local="handleLocalSelect"
      @close="closeMenu"
    />

    <div class="main-content" style="flex-grow: 1; position: relative;">
        <MapDisplay
            :map-image-url="currentFloorMap"
            :locais-on-floor="locaisAtualAndar"
            :user-position="userPosition"
            :route-segments="routeSegments"
            :debug-waypoints="debugWaypoints"
            :selected-local-id="selectedLocal?.id"
            :popup-info="popupInfo"
            :map-scale="mapScale"
            :loading="loading.map"
            @map-click="handleMapClick"
            @marker-click="handleLocalSelect"
            @marker-mouseenter="showPopup"
            @marker-mouseleave="hidePopup"
            @update:map-dimensions="mapDimensions = $event"
        />

        <MapControls
            @zoom-in="zoomIn"
            @zoom-out="zoomOut"
            @update-location="triggerAutoLocation"
            @set-location-manual="triggerManualLocationMode"
        />

        <div v-if="overallLoading && !displayError" class="loading">
             <span v-if="isGettingLocation">Obtendo localização...</span>
             <span v-else-if="loading.locais || loading.map">Carregando dados...</span>
         </div>
         <div v-if="displayError" class="error">
             {{ displayError }}
         </div>
          <div v-if="settingUserLocationMode" class="error" style="top: 10%; background: lightblue; color: black; border: 1px solid blue;">
                {{ error.geolocation }} </div>


    </div>

  </div>
</template>

<style scoped>
/* Estilos específicos para o layout do App.vue, se necessário */
.main-content {
  width: 100%; /* Garante que ocupe o espaço */
  height: 100vh;
}
/* Ajuste para sobrepor o erro global se necessário */
 .error {
    z-index: 1100; /* Acima de outros elementos */
 }
 .loading {
     z-index: 1100;
 }
</style>