<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useMapRouting } from '../composables/useMapRouting';

const props = defineProps({
  mapImageUrl: {
    type: String,
    default: ''
  },
  'locais-on-floor': {
    type: Array,
    default: () => []
  },
  userPosition: {
    type: Object,
    default: null
  },
  routeSegments: {
    type: Array,
    default: () => []
  },
  debugWaypoints: {
    type: Array,
    default: () => []
  },
  selectedLocalId: {
    type: String,
    default: null
  },
  popupInfo: {
    type: Object,
    default: null
  },
  mapScale: {
    type: Number,
    default: 1
  },
  currentFloor: {
    type: String,
    required: true
  },
  loading: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits([
  'map-click',
  'marker-click',
  'marker-mouseenter',
  'marker-mouseleave',
  'update:mapDimensions'
]);

const mapRef = ref(null);
const mapImageRef = ref(null);
const mapDimensions = ref({ width: 0, height: 0 });

// Filtra locais do andar atual
const currentFloorLocations = computed(() => {
  console.log('Componente MapDisplay - Locais recebidos:', props['locais-on-floor']);
  return props['locais-on-floor'] || [];
});

// Verifica se o local está selecionado
const isLocalSelected = (local) => {
  return local.id === props.selectedLocalId;
};

// Estilo do mapa
const mapStyle = computed(() => ({
  transform: `scale(${props.mapScale})`,
  cursor: isDragging.value ? 'grabbing' : 'grab'
}));

// Estilo do cursor quando arrastando
const isDragging = ref(false);
const handleMouseDown = () => {
  isDragging.value = true;
};
const handleMouseUp = () => {
  isDragging.value = false;
};

// Handlers de eventos
const handleMapClick = (event) => {
  if (!mapRef.value) return;
  
  const rect = mapRef.value.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * 100;
  const y = ((event.clientY - rect.top) / rect.height) * 100;
  
  emit('map-click', { x, y });
};

const handleLocationClick = (location) => {
  console.log('Local clicado:', location);
  emit('marker-click', location);
};

const handleLocationHover = (location) => {
  emit('marker-mouseenter', location);
};

const handleLocationLeave = () => {
  emit('marker-mouseleave');
};

// Atualização das dimensões do mapa
const updateMapDimensions = () => {
  if (!mapRef.value) return;
  
  const rect = mapRef.value.getBoundingClientRect();
  mapDimensions.value = {
    width: rect.width,
    height: rect.height
  };
  emit('update:mapDimensions', mapDimensions.value);
};

// Verifica URL da imagem para debug
watch(() => props.mapImageUrl, (newUrl) => {
  console.log('URL da imagem do mapa atualizada:', newUrl);
}, { immediate: true });

// Lifecycle hooks
onMounted(() => {
  console.log('MapDisplay montado - URL da imagem:', props.mapImageUrl);
  updateMapDimensions();
  window.addEventListener('resize', updateMapDimensions);
});

onUnmounted(() => {
  window.removeEventListener('resize', updateMapDimensions);
});
</script>

<template>
  <div id="map-container" class="map-container" ref="mapRef" @mousedown="handleMouseDown" @mouseup="handleMouseUp" @mouseleave="handleMouseUp">
    <!-- Fallback se a imagem não carregar -->
    <div v-if="!mapImageUrl || mapImageUrl === ''" class="map-placeholder">
      <p>Imagem do mapa não disponível para o andar atual</p>
    </div>
    
    <!-- Imagem do mapa -->
    <img
      v-else
      ref="mapImageRef"
      :src="mapImageUrl"
      class="map-image"
      :style="mapStyle"
      @click="handleMapClick"
      @error="e => console.error('Erro ao carregar imagem:', e)"
      alt="Mapa do andar"
    />
    
    <!-- Marcadores de locais -->
    <div
      v-for="location in currentFloorLocations"
      :key="location.id"
      class="location-marker"
      :class="{ 'selected': isLocalSelected(location) }"
      :style="{
        left: `${location.x}%`,
        top: `${location.y}%`
      }"
      @click.stop="handleLocationClick(location)"
      @mouseenter="handleLocationHover(location)"
      @mouseleave="handleLocationLeave"
    >
      <span class="marker-label">{{ location.nome }}</span>
    </div>
    
    <!-- Waypoints de debug -->
    <div
      v-for="(waypoint, idx) in debugWaypoints"
      :key="`wp-${idx}`"
      class="waypoint-marker"
      :style="{
        left: `${waypoint.x}%`,
        top: `${waypoint.y}%`
      }"
    />
    
    <!-- Segmentos da rota -->
    <div
      v-for="(segment, index) in routeSegments"
      :key="`route-${index}`"
      class="path-line"
      :style="{
        left: `${segment.startX}%`,
        top: `${segment.startY}%`,
        width: `${segment.length}%`,
        transform: `rotate(${segment.angle}deg)`
      }"
    />
    
    <!-- Marcador de posição do usuário -->
    <div
      v-if="userPosition"
      class="user-marker"
      :style="{
        left: `${userPosition.x}%`,
        top: `${userPosition.y}%`
      }"
    />
    
    <!-- Popup de informação -->
    <div
      v-if="popupInfo && popupInfo.visible"
      class="location-popup"
      :style="{
        left: `${popupInfo.x}%`,
        top: `${popupInfo.y}%`
      }"
    >
      {{ popupInfo.content }}
    </div>
    
    <!-- Indicador de carregamento -->
    <div v-if="loading" class="loading-overlay">
      <div class="loading-spinner"></div>
      <p>Carregando mapa...</p>
    </div>
  </div>
</template>

<style scoped>
.map-container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background-color: #f0f0f0;
}

.map-placeholder {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  background-color: #e9e9e9;
  color: #666;
  font-weight: bold;
  text-align: center;
  padding: 20px;
}

.map-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  transform-origin: center center;
  background-color: #fff;
}

.location-marker {
  position: absolute;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background-color: #007bff; /* Cor do marcador */
  border: 2px solid #fff; /* Borda branca */
  transform: translate(-50%, -50%); /* Centraliza o marcador */
  cursor: pointer; /* Muda o cursor para uma mão */
}

.location-marker::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-top: 10px solid #007bff; /* Cor do alfinete */
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
}

.location-marker:hover {
  transform: translate(-50%, -50%) scale(1.2);
  box-shadow: 0 0 0 3px white, 0 0 8px rgba(0, 0, 0, 0.5);
}

.location-marker.selected {
  background-color: #4CAF50;
  width: 24px;
  height: 24px;
  box-shadow: 0 0 0 3px white, 0 0 10px rgba(76, 175, 80, 0.8);
  z-index: 25;
  animation: pulse-marker 2s infinite;
}

.marker-label {
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 3px 6px;
  border-radius: 3px;
  font-size: 12px;
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.3s, transform 0.3s;
  margin-bottom: 5px;
}

.location-marker:hover .marker-label {
  opacity: 1;
  transform: translateX(-50%) translateY(-5px);
}

.location-marker.selected .marker-label {
  opacity: 1;
  background-color: rgba(76, 175, 80, 0.9);
  transform: translateX(-50%) translateY(-5px);
  font-weight: bold;
}

.user-marker {
  position: absolute;
  width: 20px;
  height: 20px;
  background-color: #2196F3;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  z-index: 25;
  box-shadow: 0 0 0 2px white, 0 0 15px rgba(33, 150, 243, 0.8);
  animation: pulse 1.5s infinite;
}

.waypoint-marker {
  position: absolute;
  width: 8px;
  height: 8px;
  background-color: #44bb44;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  z-index: 15;
}

.path-line {
  position: absolute;
  height: 4px;
  background-color: #6FA1EC;
  transform-origin: 0 50%;
  z-index: 10;
  pointer-events: none;
}

.location-popup {
  position: absolute;
  background-color: rgba(0, 0, 0, 0.75);
  color: white;
  padding: 5px 10px;
  border-radius: 4px;
  font-size: 0.9em;
  white-space: nowrap;
  transform: translate(-50%, -130%);
  z-index: 30;
  pointer-events: none;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(255, 255, 255, 0.7);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 100;
}

.loading-spinner {
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-radius: 50%;
  border-top: 4px solid #3498db;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin-bottom: 10px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@keyframes pulse {
  0% { box-shadow: 0 0 0 2px white, 0 0 5px rgba(33, 150, 243, 0.8); }
  50% { box-shadow: 0 0 0 2px white, 0 0 20px rgba(33, 150, 243, 0.8); }
  100% { box-shadow: 0 0 0 2px white, 0 0 5px rgba(33, 150, 243, 0.8); }
}

@keyframes pulse-marker {
  0% { transform: translate(-50%, -50%) scale(1); }
  50% { transform: translate(-50%, -50%) scale(1.1); }
  100% { transform: translate(-50%, -50%) scale(1); }
}

@media (max-width: 768px) {
  .location-marker {
    width: 16px;
    height: 16px;
  }
  
  .location-marker.selected {
    width: 20px;
    height: 20px;
  }
  
  .user-marker {
    width: 16px;
    height: 16px;
  }
  
  .marker-label {
    font-size: 10px;
    padding: 2px 4px;
  }
}
</style>