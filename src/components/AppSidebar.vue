<script setup>
import { ref, computed, watch } from 'vue';
import LocationItem from './LocationItem.vue';

const props = defineProps({
  isOpen: Boolean,
  allLocais: Array,
  floors: Array,
  currentFloorId: String,
  selectedLocalId: [Number, String, null],
  loading: Boolean,
  error: String
});

const emit = defineEmits(['update:currentFloorId', 'select-local', 'close']);

const searchTerm = ref('');

// Filtra locais baseado na busca E opcionalmente no andar atual
// Decisão: Mostrar sempre locais do andar atual + resultados da busca em outros andares
const filteredLocais = computed(() => {
  const term = searchTerm.value.toLowerCase().trim();
  if (!term) {
    // Sem busca, mostra apenas os do andar atual
    return props.allLocais.filter(local => local.andar === props.currentFloorId);
  } else {
    // Com busca, mostra os que batem com a busca (em qualquer andar)
    return props.allLocais.filter(local =>
      local.nome.toLowerCase().includes(term)
    );
  }
});

const internalCurrentFloor = ref(props.currentFloorId);

// Observa mudança externa no currentFloorId
watch(() => props.currentFloorId, (newVal) => {
  internalCurrentFloor.value = newVal;
});

const changeFloor = () => {
  //searchTerm.value = ''; // Limpa busca ao trocar de andar? Opcional.
  emit('update:currentFloorId', internalCurrentFloor.value);
};

const handleSelectLocal = (local) => {
  emit('select-local', local);
  // Opcional: Fechar sidebar ao selecionar?
  // emit('close');
};
</script>

<template>
  <div class="sidebar" :class="{ 'is-open': isOpen }">
    <h1>Locais</h1>

    <div class="floor-selector">
      <select v-model="internalCurrentFloor" @change="changeFloor">
        <option v-for="floor in floors" :key="floor.id" :value="floor.id">
          {{ floor.nome }}
        </option>
      </select>
    </div>

    <div class="search-container">
      <input v-model="searchTerm" class="search-box" placeholder="Buscar local..." />
    </div>

    <div v-if="error" class="error">
      {{ error }}
    </div>

    <div v-if="loading && !allLocais.length" class="status-message">Carregando locais...</div>

    <div v-if="!loading && !filteredLocais.length && searchTerm" class="status-message">
      Nenhum local encontrado para "{{ searchTerm }}".
    </div>
    <div v-if="!loading && !filteredLocais.length && !searchTerm" class="status-message">
      Nenhum local neste andar.
    </div>

    <div class="locations-list">
      <div
        v-for="local in filteredLocais"
        :key="local.id"
        class="location-item"
        :class="{ 'selected': selectedLocalId === local.id }"
        @click="handleSelectLocal(local)"
      >
        {{ local.nome }}
      </div>
    </div>

  </div>
</template>

<style scoped>
.sidebar {
  width: 300px;
  height: 100vh;
  background: white;
  position: fixed;
  left: 0;
  top: 0;
  transform: translateX(-100%);
  transition: transform 0.3s ease;
  z-index: 1000;
  box-shadow: 2px 0 5px rgba(0, 0, 0, 0.1);
  padding: 20px; /* Adicionado padding que faltava do main.css */
  display: flex; /* Adicionado do main.css */
  flex-direction: column; /* Adicionado do main.css */
  overflow-y: auto; /* Adicionado do main.css */
  box-sizing: border-box; /* Adicionado do main.css */
}

.sidebar.is-open {
  transform: translateX(0);
}

h1 { /* Estilo de h1 movido do main.css para cá */
  font-size: 1.5rem;
  margin-top: 40px;
  margin-bottom: 20px;
}

.floor-selector select {
  width: 100%;
  padding: 8px;
  margin-bottom: 15px;
  border: 1px solid #ddd; /* Cor diferente do main.css, usando esta */
  border-radius: 4px;
  background: white;
}

.search-container {
  margin-bottom: 15px;
}

.search-box { /* Estilo do main.css, mas aplicado aqui */
  width: 100%;
  padding: 10px; /* Tamanho diferente do main.css, usando este */
  margin-bottom: 20px; /* Adicionado margin-bottom do main.css */
  border: 1px solid #ddd; /* Cor diferente do main.css, usando esta */
  border-radius: 5px;
  box-sizing: border-box;
}

.locations-list {
  max-height: calc(100vh - 200px); /* Ajustado para considerar outros elementos */
  overflow-y: auto;
  /* margin-top: 15px; /* Adicionado espaçamento */
}

.location-item { /* Estilos baseados no main.css e no scoped */
  padding: 10px;
  margin: 5px 0; /* Adicionado margin vertical */
  background: #f8f9fa;
  border: 1px solid #ddd; /* Cor diferente do main.css */
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05); /* Sombra do main.css */
}

.location-item:hover {
  background: #e9ecef; /* Cor do main.css */
}

.location-item.selected { /* Estilo baseado no main.css e scoped */
  background: #007bff; /* Cor do main.css (variável) */
  color: white;
  border-color: #0056b3; /* Cor diferente do main.css */
  font-weight: bold; /* Adicionado do main.css */
}

.error {
  color: #dc3545; /* Cor diferente da variável main.css */
  padding: 10px;
  margin-bottom: 15px;
  background: #f8d7da; /* Cor diferente da variável main.css */
  border: 1px solid #dc3545; /* Adicionado borda */
  border-radius: 4px;
  text-align: center; /* Adicionado centralização */
}

.status-message {
  padding: 10px;
  color: #6c757d;
  text-align: center;
  font-style: italic; /* Adicionado estilo */
}

/* Incorporando Media Queries relevantes do main.css */
@media screen and (max-width: 768px) {
  .sidebar {
    width: var(--sidebar-width-mobile); /* Usa variável */
    padding: 15px;
  }
  h1 {
    font-size: 1.3rem;
    margin-top: 55px; /* Ajustado para botão toggle */
  }
}

@media screen and (max-width: 480px) {
  .sidebar {
    width: 90vw;
    padding: 10px;
  }
   h1 {
    font-size: 1.2rem;
    margin-top: 50px; /* Ajustado para botão toggle */
  }
}
</style>