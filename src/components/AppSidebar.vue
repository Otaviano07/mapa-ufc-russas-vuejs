<template>
  <div>
    <!-- Botão para abrir o menu lateral -->
    <button class="btn-open-sidebar" @click="openSidebar">Abrir Menu</button>

    <!-- Menu lateral -->
    <div class="app-sidebar" :class="{ 'is-open': isOpen }">
      <div class="app-sidebar-header">
        <h2 class="app-sidebar-title">Locais</h2>
        <button class="app-sidebar-close" @click="closeSidebar">Fechar</button>
      </div>
      <div class="app-sidebar-search">
        <input type="text" placeholder="Buscar local" v-model="searchTerm" />
      </div>
      <div class="app-sidebar-list">
        <LocationItem
          v-for="local in filteredLocais"
          :key="local.id"
          :local="local"
          :isSelected="local.id === selectedLocalId"
          @select-local="$emit('select-local', local.id)"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import LocationItem from './LocationItem.vue';

const props = defineProps({
  allLocais: Array,
  selectedLocalId: [Number, String, null],
});

const emit = defineEmits(['select-local']);

const isOpen = ref(false); // Controle do estado do menu lateral
const searchTerm = ref('');

const openSidebar = () => {
  isOpen.value = true;
};

const closeSidebar = () => {
  isOpen.value = false;
};

const filteredLocais = computed(() => {
  const term = searchTerm.value.toLowerCase().trim();
  if (!term) {
    return props.allLocais;
  }
  return props.allLocais.filter(local =>
    local.nome.toLowerCase().includes(term)
  );
});
</script>

<style scoped>
.app-sidebar {
  position: fixed;
  top: 0;
  right: 0;
  width: 300px;
  height: 100%;
  background-color: #fff;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
  transform: translateX(100%); /* Menu escondido */
  transition: transform 0.3s ease-in-out;
  z-index: 2000; /* Garantir que o menu fique acima do mapa */
  visibility: hidden; /* Esconde o menu por padrão */
  opacity: 0; /* Torna o menu invisível */
}

.app-sidebar.is-open {
  transform: translateX(0); /* Menu visível */
  visibility: visible; /* Torna o menu visível */
  opacity: 1; /* Torna o menu opaco */
}

.app-sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid #ddd;
}

.app-sidebar-title {
  font-size: 1.2rem;
  font-weight: bold;
}

.app-sidebar-close {
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 1.2rem;
}

.app-sidebar-search {
  padding: 16px;
}

.app-sidebar-search input {
  width: 100%;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.app-sidebar-list {
  padding: 16px;
}

/* Botão para abrir o menu lateral */
.btn-open-sidebar {
  position: fixed;
  top: 20px;
  left: 20px;
  padding: 10px 20px;
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: background-color 0.3s ease;
}

.btn-open-sidebar:hover {
  background-color: #2980b9;
}
</style>