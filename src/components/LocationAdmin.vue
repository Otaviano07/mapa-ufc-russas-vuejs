<template>
  <div class="admin-container">
    <router-link to="/">Voltar para o Mapa</router-link> <h1>Admin de Locais</h1>

    <div v-if="localLoading" class="loading">Carregando...</div>
    <div v-if="localError" class="error">{{ localError }}</div>
    <div v-if="localSuccessMessage" class="success">{{ localSuccessMessage }}</div>

    <button @click="showAddForm" :disabled="localLoading || showForm" class="btn btn-primary">Adicionar Novo Local</button>

    <div v-if="showForm" class="form-section">
      <h2>{{ isEditing ? 'Editar Local' : 'Adicionar Local' }}</h2>
      <form @submit.prevent="handleSubmit">
        <div class="form-group" v-if="isEditing">
          <label for="id">ID:</label>
          <input type="text" id="id" :value="formData.id" disabled>
        </div>
        <div class="form-group">
          <label for="tipo">Tipo:</label>
          <select id="tipo" v-model="formData.tipo" required>
            <option v-for="tipo in tiposDisponiveis" :key="tipo" :value="tipo">
              {{ tipo.charAt(0).toUpperCase() + tipo.slice(1) }}
            </option>
          </select>
        </div>
        <div class="form-group">
          <label for="nome">Nome:</label>
          <input type="text" id="nome" v-model="formData.nome" required>
        </div>
        <div class="form-group">
          <label for="andar">Andar:</label>
          <select id="andar" v-model="formData.andar" required>
            <option v-for="andar in andaresDisponiveis" :key="andar" :value="andar">
              {{ andar.charAt(0).toUpperCase() + andar.slice(1) }}
            </option>
          </select>
        </div>
        <div class="form-group">
          <label for="x">Coordenada X (0-100):</label>
          <input type="number" id="x" v-model="formData.x" required step="0.01" min="0" max="100">
        </div>
        <div class="form-group">
          <label for="y">Coordenada Y (0-100):</label>
          <input type="number" id="y" v-model="formData.y" required step="0.01" min="0" max="100">
        </div>
        <div class="form-actions">
          <button type="submit" :disabled="localLoading" class="btn btn-success">{{ isEditing ? 'Salvar Alterações' : 'Criar Local' }}</button>
          <button type="button" @click="cancelForm" :disabled="localLoading" class="btn btn-secondary">Cancelar</button>
        </div>
      </form>
    </div>

    <h2>Locais Existentes</h2>
    <div class="table-container">
      <table class="locations-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Tipo</th>
            <th>Nome</th>
            <th>X</th>
            <th>Y</th>
            <th>Andar</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
           <tr v-if="locations.length === 0 && !localLoading && !localError">
            <td colspan="7" style="text-align: center;">Nenhum local cadastrado.</td>
          </tr>
           <tr v-if="locations.length === 0 && localError">
                <td colspan="7" style="text-align: center; color: red;">Falha ao carregar locais.</td>
            </tr>
          <tr v-for="loc in locations" :key="loc.id">
            <td>{{ loc.id }}</td>
            <td>{{ loc.tipo || 'N/A' }}</td>
            <td>{{ loc.nome }}</td>
            <td>{{ loc.x?.toFixed ? loc.x.toFixed(2) : loc.x }}</td>
            <td>{{ loc.y?.toFixed ? loc.y.toFixed(2) : loc.y }}</td>
            <td>{{ loc.andar }}</td>
            <td>
              <button @click="showEditForm(loc)" :disabled="localLoading || showForm" class="btn btn-warning btn-sm">Editar</button>
              <button @click="confirmDelete(loc.id)" :disabled="localLoading || showForm" class="btn btn-danger btn-sm">Excluir</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
// Importa as funções CRUD do serviço centralizado
import {
    createLocation,
    updateLocation,
    deleteLocation,
    fetchAdminLocations // Usa a função específica para buscar locais para o admin
} from '@/services/LocationService.js';

const router = useRouter();
const locations = ref([]);
// Estados locais para feedback dentro do componente admin
const localLoading = ref(false);
const localError = ref(null);
const localSuccessMessage = ref(null);

const showForm = ref(false);
const isEditing = ref(false);
const tiposDisponiveis = [
  'location',
  'Waypoints'
];

const andaresDisponiveis = [
  'terreo',
  'primeiro'
];

// Função para salvar o formulário no localStorage
const saveFormToStorage = () => {
  localStorage.setItem('locationFormData', JSON.stringify({
    ...formData.value,
    showForm: showForm.value,
    isEditing: isEditing.value
  }));
};

// Função para carregar o formulário do localStorage
const loadFormFromStorage = () => {
  const savedData = localStorage.getItem('locationFormData');
  if (savedData) {
    const parsed = JSON.parse(savedData);
    showForm.value = parsed.showForm;
    isEditing.value = parsed.isEditing;
    delete parsed.showForm;
    delete parsed.isEditing;
    formData.value = parsed;
  }
};

// Inicializa o formulário
// Função para validar e corrigir coordenadas
const validateCoordinates = (value) => {
  if (value === null || value === undefined) return 0;
  const num = parseFloat(value);
  return Math.max(0, Math.min(100, num));
};

const formData = ref({
  id: null,
  tipo: 'location',
  nome: '',
  andar: 'terreo',
  x: null,
  y: null
});

const resetForm = () => {
  formData.value = {
    id: null,
    tipo: 'location',
    nome: '',
    andar: 'terreo',
    x: null,
    y: null
  };
  localStorage.removeItem('locationFormData');
};

// Carrega dados salvos quando o componente é montado
onMounted(() => {
  loadLocations();
  loadFormFromStorage();
});

// Watch para salvar alterações do formulário
watch(
  [formData, showForm, isEditing],
  () => {
    saveFormToStorage();
  },
  { deep: true }
);

// Limpa mensagens locais após um tempo
function clearLocalMessages() {
  setTimeout(() => {
    localError.value = null;
    localSuccessMessage.value = null;
  }, 5000); // Limpa após 5 segundos
}

// --- Funções de Interação com o Serviço ---

async function loadLocations() {
  localLoading.value = true;
  localError.value = null; // Limpa erro anterior
  locations.value = []; // Limpa locais antes de buscar
  try {
    localLoading.value = true;
    const result = await fetchAdminLocations();
    locations.value = result;
  } catch (error) {
    localError.value = `Erro ao carregar locais: ${error.message}`;
    locations.value = [];
  } finally {
    localLoading.value = false;
    if(localError.value) clearLocalMessages(); // Limpa msg de erro tbm
  }
}

async function handleAddLocation() {
  localLoading.value = true;
  localError.value = null;
  localSuccessMessage.value = null;
  try {
     // Prepara os dados do formData
     const dataToSend = {
        nome: formData.value.nome,
        endereco: formData.value.endereco,
        andar: formData.value.andar,
        x: formData.value.x,
        y: formData.value.y
     };
    const success = await createLocation(dataToSend); // Usa a função do serviço
    if (success) {
      localSuccessMessage.value = "Local adicionado com sucesso!"; // Mensagem local
      await loadLocations(); // Recarrega a lista
      cancelForm(); // Esconde o formulário
      clearLocalMessages();
    } else {
      // Se retornou false, o erro provavelmente está no estado global do serviço
      // Poderíamos buscá-lo ou mostrar uma msg genérica
      localError.value = "Falha ao adicionar local.";
      clearLocalMessages();
    }
  } catch (err) {
     console.error("Erro ao adicionar local:", err);
     localError.value = `Erro ao criar: ${err.message}`;
     clearLocalMessages();
  } finally {
    localLoading.value = false;
  }
}

async function handleUpdateLocation() {
  localLoading.value = true;
  localError.value = null;
  localSuccessMessage.value = null;
   try {
      const dataToSend = {
        id: formData.value.id,
        nome: formData.value.nome,
        endereco: formData.value.endereco,
        andar: formData.value.andar,
        x: formData.value.x,
        y: formData.value.y
      };
    const success = await updateLocation(dataToSend); // Usa a função do serviço
    if (success) {
      localSuccessMessage.value = "Local atualizado com sucesso!"; // Mensagem local
      await loadLocations(); // Recarrega a lista
      cancelForm(); // Esconde o formulário
      clearLocalMessages();
    } else {
      localError.value = "Falha ao atualizar local.";
      clearLocalMessages();
    }
  } catch (err) {
     console.error("Erro ao atualizar local:", err);
     localError.value = `Erro ao atualizar: ${err.message}`;
     clearLocalMessages();
   } finally {
    localLoading.value = false;
  }
}

async function handleDeleteLocation(id) {
  localLoading.value = true;
  localError.value = null;
  localSuccessMessage.value = null;
   try {
    const success = await deleteLocation(id); // Usa a função do serviço
    if (success) {
      localSuccessMessage.value = "Local excluído com sucesso!"; // Mensagem local
      await loadLocations(); // Recarrega a lista
      clearLocalMessages();
    } else {
      localError.value = "Falha ao excluir local.";
      clearLocalMessages();
    }
   } catch (err) {
      console.error("Erro ao excluir local:", err);
      localError.value = `Erro ao excluir: ${err.message}`;
      clearLocalMessages();
   } finally {
    localLoading.value = false;
  }
}

// --- Funções de UI ---
const handleSubmit = async () => {
  try {
    if (localLoading.value) return;

    // Validar e corrigir coordenadas antes de enviar
    formData.value.x = validateCoordinates(formData.value.x);
    formData.value.y = validateCoordinates(formData.value.y);

    localLoading.value = true;
    localError.value = '';

    if (isEditing.value) {
      await handleUpdateLocation();
    } else {
      await handleAddLocation();
    }

    // Limpa o formulário e recarrega os dados
    resetForm();
    showForm.value = false;
    isEditing.value = false;
    localStorage.removeItem('locationFormData');
    await loadLocations();
  } catch (error) {
    console.error('Erro ao salvar local:', error);
    localError.value = 'Erro ao salvar local. Por favor, tente novamente.';
  } finally {
    localLoading.value = false;
  }
};

function showAddForm() {
  resetForm();
  isEditing.value = false;
  showForm.value = true;
  localError.value = null;
  localSuccessMessage.value = null;
}

function showEditForm(location) {
  isEditing.value = true;
  // Preenche o form com os dados do local. Certifique-se que a API retorna todos necessários.
  formData.value = {
    id: location.id,
    nome: location.nome || '',
    endereco: location.endereco || '', // Necessita que a API retorne 'endereco'
    andar: location.andar || '',
    // x: location.x, // Preenche se for editável
    // y: location.y, // Preenche se for editável
  };
  showForm.value = true;
  localError.value = null;
  localSuccessMessage.value = null;
}

function cancelForm() {
  resetForm();
  showForm.value = false;
  isEditing.value = false;
  localStorage.removeItem('locationFormData');
}

function confirmDelete(id) {
  if (window.confirm(`Tem certeza que deseja excluir o local com ID "${id}"? Esta ação não pode ser desfeita.`)) {
    handleDeleteLocation(id);
  }
}


</script>

<style scoped>
.admin-container {
  padding: 20px;
  height: 100vh;
  overflow-y: auto;
  max-width: 1200px;
  margin: 0 auto;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  background-color: #f8f9fa;
}

.admin-container h1 {
  color: #2c3e50;
  margin-bottom: 1.5rem;
  font-size: 2rem;
  font-weight: 600;
}

.admin-container h2 {
  color: #2c3e50;
  margin: 1.5rem 0;
  font-size: 1.5rem;
  font-weight: 500;
}

a {
  color: #3498db;
  text-decoration: none;
  margin-right: 10px;
  padding: 8px 12px;
  border-radius: 4px;
  background-color: #fff;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  transition: all 0.2s ease;
}

a:hover {
  background-color: #3498db;
  color: #fff;
  text-decoration: none;
}

.form-section {
  margin: 20px 0;
  padding: 25px;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.form-group {
  margin-bottom: 1.2rem;
}

label {
  display: block;
  margin-bottom: 0.5rem;
  color: #2c3e50;
  font-weight: 500;
  font-size: 0.95rem;
}

input[type="text"],
input[type="number"],
select {
  width: 100%;
  padding: 10px 12px;
  border: 2px solid #e2e8f0;
  border-radius: 6px;
  font-size: 1rem;
  background-color: #fff;
  transition: all 0.2s ease;
}

input[type="text"]:hover,
input[type="number"]:hover {
  border-color: #cbd5e0;
}

input[type="text"]:focus,
input[type="number"]:focus {
  outline: none;
  border-color: #3498db;
  box-shadow: 0 0 0 3px rgba(52,152,219,0.2);
}

.form-actions {
  margin-top: 1.5rem;
  display: flex;
  gap: 12px;
}

/* Estilos para a tabela */
.table-container {
  margin-top: 20px;
  max-height: calc(100vh - 500px);
  overflow-y: auto;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  scrollbar-width: thin;
  scrollbar-color: #94a3b8 #f1f5f9;
}

.table-container::-webkit-scrollbar {
  width: 8px;
}

.table-container::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 8px;
}

.table-container::-webkit-scrollbar-thumb {
  background-color: #94a3b8;
  border-radius: 8px;
  border: 2px solid #f1f5f9;
}

.locations-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
}

.locations-table thead {
  position: sticky;
  top: 0;
  z-index: 1;
}

.locations-table th {
  background-color: #f8fafc;
  color: #1e293b;
  font-weight: 600;
  padding: 16px;
  text-align: left;
  border-bottom: 2px solid #e2e8f0;
  white-space: nowrap;
}

.locations-table td {
  padding: 14px 16px;
  border-bottom: 1px solid #e2e8f0;
  color: #475569;
}

.locations-table tr:last-child td {
  border-bottom: none;
}

.locations-table tbody tr {
  transition: all 0.2s ease;
}

.locations-table tbody tr:hover {
  background-color: #f1f5f9;
}

.locations-table td button {
  margin-right: 8px;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 0.875rem;
  transition: all 0.2s ease;
}

/* Estilos para os botões */
.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background-color: #3498db;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background-color: #2980b9;
}

.btn-success {
  background-color: #2ecc71;
  color: white;
}

.btn-success:hover:not(:disabled) {
  background-color: #27ae60;
}

.btn-warning {
  background-color: #f1c40f;
  color: #2c3e50;
}

.btn-warning:hover:not(:disabled) {
  background-color: #f39c12;
}

.btn-danger {
  background-color: #e74c3c;
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background-color: #c0392b;
}

.btn-secondary {
  background-color: #95a5a6;
  color: white;
}

.btn-secondary:hover:not(:disabled) {
  background-color: #7f8c8d;
}
</style>