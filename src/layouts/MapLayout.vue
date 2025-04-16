<template>
    <div class="app-container">
      <button class="menu-toggle-button" @click="toggleMenu" title="Abrir/Fechar Menu">☰</button>
      <nav class="top-nav">
        <router-link to="/admin" class="nav-link">Admin</router-link>
      </nav>
  
      <AppSidebar
        :is-open="isMenuOpen"
        :all-locais="allLocais"
        :floors="floors"
        :current-floor-id="currentFloorId"
        :selected-local-id="selectedLocal?.id"
        :loading="loading.initialData" :error="error.locais" @update:currentFloorId="changeFloor"
        @select-local="handleLocalSelect"
        @close="closeMenu" />
  
      <div class="main-content" style="flex-grow: 1; position: relative;">
        <template v-if="$route.name === 'MapHome'">
          <MapDisplay
            :map-image-url="currentFloorMap"
            :locais-on-floor="locaisAtualAndar"
            :user-position="userPosition"
            :route-segments="routeSegments"
            :debug-waypoints="debugWaypoints" :selected-local-id="selectedLocal?.id"
            :popup-info="popupInfo"
            :map-scale="mapScale"
            :current-floor="currentFloorId"
            :loading="loading.map" @map-click="handleMapClick"
            @marker-click="handleLocalSelect"
            @marker-mouseenter="showPopup"
            @marker-mouseleave="hidePopup"
            @update:map-dimensions="mapDimensions = $event" />
    
          <MapControls
            @zoom-in="zoomIn"
            @zoom-out="zoomOut"
            @update-location="triggerAutoLocation"
            @set-location-manual="triggerManualLocationMode" />
    
          <div v-if="overallLoading && !displayError" class="loading">
               <span v-if="loading.initialData">Carregando dados do mapa...</span>
               <span v-else-if="isGettingLocation">Obtendo localização...</span>
               <span v-else>Carregando...</span>
           </div>
    
          <div v-if="displayError" class="error">{{ displayError }}</div>
    
          <div v-if="settingUserLocationMode" class="manual-location-prompt">
             {{ manualModeMessage }}
          </div>
        </template>
        
        <router-view />
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, computed, onMounted, watch } from 'vue';
  import AppSidebar from '@/components/AppSidebar.vue';
  import MapDisplay from '@/components/MapDisplay.vue';
  import MapControls from '@/components/MapControls.vue';
  import { useGeolocation } from '@/composables/useGeolocation.js';
  import { useMapInteraction } from '@/composables/useMapInteraction.js';
  import { useMapRouting } from '@/composables/useMapRouting.js';
  // Importa a função unificada do serviço
  import { fetchInitialData, locationServiceState } from '@/services/LocationService.js';
  
  // --- Estado Principal ---
  const allLocais = ref([]);
  const floors = ref([]);
  const waypoints = ref([]); // Novo ref para waypoints
  const selectedLocal = ref(null);
  const currentFloorId = ref('terreo'); // Andar inicial padrão
  const isMenuOpen = ref(false);
  const mapDimensions = ref({ width: 0, height: 0 });
  
  // Estados de Loading e Erro - mais detalhados
  const loading = ref({
      initialData: true, // Combina loading de locais, waypoints, andares
      map: true, // Pode ser redundante se o mapa só carrega após initialData
  });
  const error = ref({
      initialData: null, // Erro ao carregar dados gerais
      locais: null, // Mantido para erro específico da sidebar, se necessário
      routing: null, // Vindo do useMapRouting
      geolocation: null // Vindo do useGeolocation
  });
  const manualModeMessage = ref(''); // Mensagem para modo manual
  
  // --- Composables ---
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
    handleMapClick: handleMapClickInteraction,
    enableSetUserLocationMode,
  } = useMapInteraction();
  
  // Passa o ref de waypoints para o composable de roteamento
  const {
    routeSegments,
    hasRoute,
    debugWaypoints, // Recebe waypoints de debug
    routingError: routeCalcError,
    calculateRoute // Pode não ser mais necessário chamar manualmente
  } = useMapRouting(userPosition, selectedLocal, currentFloorId, mapScale, mapDimensions, waypoints);
  
  // --- Dados Computados ---
  const currentFloorData = computed(() => floors.value.find(f => f.id === currentFloorId.value));
  const currentFloorMap = computed(() => currentFloorData.value?.image || '');
  const locaisAtualAndar = computed(() => {
    console.log('Todos os locais:', allLocais.value);
    console.log('Andar atual:', currentFloorId.value);
    const locaisFiltrados = allLocais.value.filter(local => local.andar === currentFloorId.value);
    console.log('Locais filtrados:', locaisFiltrados);
    return locaisFiltrados;
  });

  const overallLoading = computed(() => loading.value.initialData || isGettingLocation.value);
  // Combina erros para exibição principal (pode priorizar)
  const displayError = computed(() =>
      error.value.initialData ||
      error.value.geolocation ||
      error.value.routing ||
      locationServiceState.error.value // Observa erro global do serviço tbm
  );
  
  
  // --- Métodos / Manipuladores de Eventos ---
  const toggleMenu = () => { isMenuOpen.value = !isMenuOpen.value; };
  const closeMenu = () => { isMenuOpen.value = false; };
  
  const loadInitialData = async () => {
    loading.value.initialData = true;
    loading.value.map = true; // Assume que mapa depende dos dados
    error.value.initialData = null;
    error.value.locais = null; // Limpa erro específico também
    try {
      const initialData = await fetchInitialData(); // Chama a função unificada
      if (initialData) {
        allLocais.value = initialData.locais;
        floors.value = initialData.floors;
        waypoints.value = initialData.waypoints; // Atualiza o ref de waypoints
  
        // Se não houver andares, cria um andar padrão
        if (floors.value.length === 0) {
          console.log("Criando andar padrão 'terreo'");
          floors.value = [{ id: 'terreo', nome: 'Térreo' }];
        }

        // Define andar padrão se necessário
        if (!currentFloorId.value || !floors.value.some(f => f.id === currentFloorId.value)) {
          currentFloorId.value = floors.value[0].id;
          console.log("Definindo andar padrão:", currentFloorId.value);
        }

        // Log de status
        console.log(`Status dos dados:
          - Locais: ${allLocais.value.length}
          - Andares: ${floors.value.length}
          - Waypoints: ${waypoints.value.length}
          - Andar atual: ${currentFloorId.value}`);
      } else {
          // Erro já deve estar em locationServiceState.error ou error.value do serviço
          error.value.initialData = locationServiceState.error.value || "Falha ao carregar dados iniciais.";
      }
    } catch (err) {
       // Captura erros inesperados no processo
      console.error("Erro crítico ao carregar dados iniciais:", err);
      error.value.initialData = `Erro inesperado: ${err.message}`;
    } finally {
      loading.value.initialData = false;
      loading.value.map = false; // Permite que o mapa seja exibido
    }
  };
  
  const changeFloor = (newFloorId) => {
      if (currentFloorId.value !== newFloorId) {
          console.log("Mudando para andar:", newFloorId);
          currentFloorId.value = newFloorId;
          selectedLocal.value = null; // Desseleciona local ao mudar de andar
          hidePopup(); // Esconde popup
          // A rota será recalculada automaticamente pelo watcher em useMapRouting
      }
  };
  
  
  const handleLocalSelect = (local) => {
    if (!local) return;
    selectedLocal.value = local;
    // Se o local selecionado estiver em outro andar, muda para ele
    if (local.andar !== currentFloorId.value) {
       changeFloor(local.andar); // Usa a função changeFloor
    }
    // Fecha o menu ao selecionar um local
    closeMenu();
  };
  
  // Função chamada pelo MapDisplay quando o mapa é clicado
  const handleMapClick = (event) => {
    const mapElement = document.getElementById('map-container');
    
    // Passa para o composable de interação, fornecendo callbacks
    handleMapClickInteraction(
      event,
      mapElement,
      (xPercent, yPercent) => { // Callback para definir localização manual
        setUserLocationManually(xPercent, yPercent);
        error.value.geolocation = null; // Limpa msg de erro de geo
        manualModeMessage.value = ''; // Limpa msg de modo manual
      },
      () => { // Callback para tentar fechar o menu
        // Fecha o menu somente se estiver aberto e o clique não foi no botão toggle
        if (isMenuOpen.value && !event.target.closest('.menu-toggle-button')) {
          closeMenu();
        }
      }
    );

    // Se NÃO estiver no modo de definir localização, um clique no mapa deseleciona o local
    if (!settingUserLocationMode.value) {
      selectedLocal.value = null;
      hidePopup();
    }
  };
  
  // Inicia a busca automática de localização (acionado pelo botão)
  const triggerAutoLocation = () => {
    getUserLocationAuto(); // Chama a função do composable
    closeMenu(); // Fecha o menu ao tentar obter localização
  };
  
  // Ativa o modo de definição manual (acionado pelo botão)
  const triggerManualLocationMode = () => {
    enableSetUserLocationMode(); // Ativa o modo no composable de interação
    manualModeMessage.value = "Clique no mapa para definir sua localização."; // Informa o usuário
    error.value.geolocation = null; // Limpa outros erros de geo
    closeMenu();
  };
  
  // --- Watchers ---
  
  // Observa erros dos composables para atualizar o estado de erro local
  watch(geolocationError, (newError) => {
      // Só atualiza o erro de geolocalização se NÃO estiver no modo de definição manual
      if (!settingUserLocationMode.value) {
          error.value.geolocation = newError;
          manualModeMessage.value = ''; // Garante que a msg manual seja limpa se houver erro real
      }
  });
  watch(routeCalcError, (newError) => { error.value.routing = newError; });
  
  // Observa mudança no andar (já tratado em changeFloor, mas pode ter lógica adicional aqui se necessário)
  // watch(currentFloorId, (newFloor, oldFloor) => { ... });
  
  
  // Limpa a seleção e o popup se o local selecionado não pertencer mais ao andar atual
  // (Embora changeFloor já deselecione, este watcher pode ser útil se currentFloorId mudar por outros meios)
  watch(selectedLocal, (newLocal) => {
      if (newLocal && newLocal.andar !== currentFloorId.value) {
          // Isso não deveria acontecer se changeFloor deseleciona, mas como segurança:
          selectedLocal.value = null;
          hidePopup();
      }
  });
  
  
  // Observa o estado de erro global do LocationService
  watch(() => locationServiceState.error.value, (newServiceError) => {
      if (newServiceError && !error.value.initialData) {
          // Mostra erro do serviço se não houver erro mais específico já sendo mostrado
          // Poderia ser mais granular
          console.error("Erro detectado no LocationService:", newServiceError);
      }
  });
  
  
  // --- Ciclo de Vida ---
  onMounted(() => {
    loadInitialData(); // Carrega locais, waypoints, andares da API
  });
</script>

<style scoped>
.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
  position: relative;
  overflow: hidden;
}

.main-content {
  flex: 1;
  position: relative;
  overflow: hidden;
  width: 100%;
  height: 100vh;
}

.error, .loading {
  z-index: 1100;
}

.manual-location-prompt {
  position: absolute;
  top: 10%;
  left: 50%;
  transform: translateX(-50%);
  background: lightblue;
  color: black;
  border: 1px solid blue;
  padding: 10px 15px;
  border-radius: 5px;
  z-index: 1100;
  box-shadow: 0 2px 5px rgba(0,0,0,0.2);
  font-weight: bold;
  text-align: center;
}

.top-nav {
  position: fixed;
  top: 1rem;
  right: 1rem;
  z-index: 1000;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 0 0 0 8px;
  padding: 10px;
}

.nav-link {
  padding: 0.5rem 1rem;
  margin: 0 10px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  text-decoration: none;
  color: #333;
  transition: background-color 0.3s;
}

.nav-link:hover {
  background: #f8f8f8;
}

.nav-link.router-link-active {
  background-color: #007bff;
  color: white;
}

.menu-toggle-button {
  position: fixed;
  top: 1rem;
  left: 1rem;
  z-index: 1000;
  padding: 0.5rem;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1.5em;
}

.menu-toggle-button:hover {
  background: #f8f8f8;
}
</style>