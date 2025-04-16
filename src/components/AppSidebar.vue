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
    padding: 20px;
}

.sidebar.is-open {
    transform: translateX(0);
}

.floor-selector select {
    width: 100%;
    padding: 8px;
    margin-bottom: 15px;
    border: 1px solid #ddd;
    border-radius: 4px;
    background: white;
}

.search-container {
    margin-bottom: 15px;
}

.search-box {
    width: 100%;
    padding: 8px;
    border: 1px solid #ddd;
    border-radius: 4px;
}

.locations-list {
    max-height: calc(100vh - 200px);
    overflow-y: auto;
}

.location-item {
    padding: 10px;
    margin: 5px 0;
    background: #f8f9fa;
    border: 1px solid #ddd;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s ease;
}

.location-item:hover {
    background: #e9ecef;
}

.location-item.selected {
    background: #007bff;
    color: white;
    border-color: #0056b3;
}

.error {
    color: #dc3545;
    padding: 10px;
    margin-bottom: 15px;
    background: #f8d7da;
    border-radius: 4px;
}

.status-message {
    padding: 10px;
    color: #6c757d;
    text-align: center;
}
</style>