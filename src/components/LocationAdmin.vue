<template>
  <div class="admin-container">
    <router-link to="/">Voltar para o Mapa</router-link>
    <h1>Admin de Locais</h1>

    <div v-if="localLoading" class="loading">Carregando...</div>
    <div v-if="localError" class="error">{{ localError }}</div>
    <div v-if="localSuccessMessage" class="success">{{ localSuccessMessage }}</div>

    <!-- Botão para abrir o formulário -->
    <button @click="showAddForm" :disabled="localLoading || showForm" class="btn btn-primary">Adicionar Novo Local</button>

    <!-- Formulário exibido como modal -->
    <div v-if="showForm" class="modal-overlay">
      <div class="modal">
        <h2>{{ isEditing ? 'Editar Local' : 'Novo Local' }}</h2>
        <form @submit.prevent="handleSubmit">
          <div class="form-group" v-if="isEditing">
            <label for="id">ID:</label>
            <input type="text" id="id" :value="formData.id" disabled>
          </div>
          <div class="form-group">
            <label for="nome">Nome:</label>
            <input type="text" id="nome" v-model="formData.nome" required>
          </div>
          <div class="form-group-row">
            <div class="form-group">
              <label for="tipo">Tipo:</label>
              <select id="tipo" v-model="formData.tipo" required>
                <option v-for="tipo in tiposDisponiveis" :key="tipo" :value="tipo">
                  {{ tipo.charAt(0).toUpperCase() + tipo.slice(1) }}
                </option>
              </select>
            </div>
            <div class="form-group">
              <label for="andar">Andar:</label>
              <select id="andar" v-model="formData.andar" required>
                <option v-for="andar in andaresDisponiveis" :key="andar" :value="andar">
                  {{ andar.charAt(0).toUpperCase() + andar.slice(1) }}
                </option>
              </select>
            </div>
          </div>
          <div class="form-group-row">
            <div class="form-group">
              <label for="x">Coordenada X:</label>
              <input type="number" id="x" v-model.number="formData.x" disabled />
            </div>
            <div class="form-group">
              <label for="y">Coordenada Y:</label>
              <input type="number" id="y" v-model.number="formData.y" disabled />
            </div>
          </div>
          <div class="modal-actions">
            <button type="button" @click="cancelForm" :disabled="localLoading" class="btn btn-secondary">Cancelar</button>
            <button type="submit" :disabled="localLoading" class="btn btn-success">
              {{ isEditing ? 'Salvar Alterações' : 'Salvar Local' }}
            </button>
            
          </div>
        </form>
      </div>
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
            <td colspan="7" class="empty-row">Nenhum local cadastrado.</td>
          </tr>
          <tr v-if="locations.length === 0 && localError">
            <td colspan="7" class="error-row">Falha ao carregar locais.</td>
          </tr>
          <tr v-for="loc in locations" :key="loc.id">
            <td>{{ loc.id }}</td>
            <td>{{ loc.tipo || 'N/A' }}</td>
            <td>{{ loc.nome }}</td>
            <td>{{ loc.x?.toFixed ? loc.x.toFixed(2) : loc.x }}</td>
            <td>{{ loc.y?.toFixed ? loc.y.toFixed(2) : loc.y }}</td>
            <td>{{ loc.andar }}</td>
            <td>
              <div class="dropdown" @click.stop>
                <button class="btn btn-actions" @click="toggleDropdown(loc.id)">Ações</button>
                <div v-if="dropdownOpen === loc.id" class="dropdown-menu">
                  <button @click="showEditForm(loc)" :disabled="localLoading || showForm" class="dropdown-item">Editar</button>
                  <button @click="confirmDelete(loc.id)" :disabled="localLoading || showForm" class="dropdown-item">Excluir</button>
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
// Assuming LocationService instance is exported as default or named export
import locationService from '@/services/LocationService.js'; // Adjusted import assuming default/named export

const router = useRouter();
const locations = ref([]);
const localLoading = ref(false);
const localError = ref(null);
const localSuccessMessage = ref(null);

const showForm = ref(false);
const isEditing = ref(false);
const tiposDisponiveis = ['location', 'Waypoints']; // Corrected: Should match data model (e.g., 'waypoint')
const andaresDisponiveis = ['terreo', 'primeiro']; // Should ideally come from store/service

const defaultFormData = () => ({
  id: null,
  tipo: 'location', // Default type
  nome: '',
  andar: 'terreo', // Default floor
  x: null,
  y: null,
});

const formData = ref(defaultFormData());

const saveFormToStorage = () => {
  if (showForm.value) { // Only save if form is actually shown
    localStorage.setItem('locationFormData', JSON.stringify({
      ...formData.value,
      showForm: showForm.value,
      isEditing: isEditing.value,
    }));
  } else {
      localStorage.removeItem('locationFormData'); // Clean up if form is not shown
  }
};

const loadFormFromStorage = () => {
  const savedData = localStorage.getItem('locationFormData');
  if (savedData) {
    try {
        const parsed = JSON.parse(savedData);
        showForm.value = parsed.showForm ?? false; // Use default if undefined
        isEditing.value = parsed.isEditing ?? false;
        // Only load form data if the form should be shown
        if(showForm.value) {
            formData.value = {
                id: parsed.id ?? null,
                tipo: tiposDisponiveis.includes(parsed.tipo) ? parsed.tipo : 'location',
                nome: parsed.nome ?? '',
                andar: andaresDisponiveis.includes(parsed.andar) ? parsed.andar : 'terreo',
                x: parsed.x ?? null,
                y: parsed.y ?? null,
            };
        } else {
             resetForm(); // Reset if form shouldn't be shown
        }
    } catch (e) {
        console.error("Failed to parse form data from localStorage", e);
        resetForm();
        localStorage.removeItem('locationFormData');
    }
  }
};

const validateCoordinates = (value) => {
  const num = parseFloat(value);
  if (isNaN(num)) return 0; // Return 0 if not a valid number
  return Math.max(0, Math.min(100, num)); // Clamp between 0 and 100
};


const resetForm = () => {
  formData.value = defaultFormData();
  localStorage.removeItem('locationFormData'); // Ensure removal on reset
};

onMounted(() => {
  loadLocations();
  loadFormFromStorage(); // Load potentially saved form state
  document.addEventListener('click', closeDropdown);
});

onUnmounted(() => {
  document.removeEventListener('click', closeDropdown);
});

// Watch relevant states to save to localStorage
watch([formData, showForm, isEditing], saveFormToStorage, { deep: true });

function clearLocalMessages() {
  setTimeout(() => {
    localError.value = null;
    localSuccessMessage.value = null;
  }, 5000); // Clears messages after 5 seconds
}

async function loadLocations() {
  localLoading.value = true;
  localError.value = null;
  // locations.value = []; // Don't clear immediately, avoids flickering
  try {
    // Use the imported service instance directly
    const result = await locationService.getAllLocations(); // Assuming getAllLocations exists
    locations.value = result || []; // Ensure it's an array
  } catch (error) {
    console.error('Erro ao carregar locais:', error);
    localError.value = `Erro ao carregar locais: ${error.message || 'Erro desconhecido'}`;
    locations.value = []; // Clear on error
    clearLocalMessages();
  } finally {
    localLoading.value = false;
  }
}

// Combined Add/Update Logic (called by handleSubmit)
async function handleSaveLocation() {
    localLoading.value = true;
    localError.value = null;
    localSuccessMessage.value = null;

    // Validate coordinates before sending
    const dataToSend = {
        ...formData.value,
        x: validateCoordinates(formData.value.x),
        y: validateCoordinates(formData.value.y),
    };

    try {
        let success = false;
        if (isEditing.value) {
            // Ensure ID is present for update
            if (!dataToSend.id) throw new Error("ID do local é necessário para atualização.");
            success = await locationService.updateLocation(dataToSend.id, dataToSend); // Assuming updateLocation exists
            if(success) localSuccessMessage.value = 'Local atualizado com sucesso!';

        } else {
            // Remove ID for creation if it exists somehow
            delete dataToSend.id;
            const newLocation = await locationService.createLocation(dataToSend); // Assuming createLocation exists
            success = !!newLocation; // Check if creation returned a truthy value
            if(success) localSuccessMessage.value = 'Local adicionado com sucesso!';
        }

        if (success) {
            await loadLocations(); // Reload the list
            cancelForm(); // Close form and reset
            clearLocalMessages();
        } else {
            localError.value = isEditing.value ? 'Falha ao atualizar local.' : 'Falha ao adicionar local.';
            clearLocalMessages();
        }
    } catch (err) {
        console.error(`Erro ao ${isEditing.value ? 'atualizar' : 'adicionar'} local:`, err);
        localError.value = `Erro ao ${isEditing.value ? 'atualizar' : 'criar'}: ${err.message || 'Erro desconhecido'}`;
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
    // Use the imported service instance directly
    const success = await locationService.deleteLocation(id); // Assuming deleteLocation exists
    if (success) {
      localSuccessMessage.value = 'Local excluído com sucesso!';
      await loadLocations(); // Reload list
       // If the deleted item was being edited, close the form
      if (isEditing.value && formData.value.id === id) {
          cancelForm();
      }
      clearLocalMessages();
    } else {
      localError.value = 'Falha ao excluir local.';
      clearLocalMessages();
    }
  } catch (err) {
    console.error('Erro ao excluir local:', err);
    localError.value = `Erro ao excluir: ${err.message || 'Erro desconhecido'}`;
    clearLocalMessages();
  } finally {
    localLoading.value = false;
  }
}

const handleSubmit = async () => {
  if (localLoading.value) return;
  await handleSaveLocation(); // Call the combined save function
};

// Função para transformar latitude e longitude em valores entre 0 e 100
const transformCoordinates = (latitude, longitude) => {
  const minLat = -4.973; // Valor mínimo de latitude no mapa
  const maxLat = -4.971; // Valor máximo de latitude no mapa
  const minLon = -37.978; // Valor mínimo de longitude no mapa
  const maxLon = -37.976; // Valor máximo de longitude no mapa

  const x = ((longitude - minLon) / (maxLon - minLon)) * 100;
  const y = ((latitude - minLat) / (maxLat - minLat)) * 100;

  return { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) };
};

function showAddForm() {
  const defaultLat = -4.972; // Latitude padrão para novos locais
  const defaultLon = -37.977; // Longitude padrão para novos locais

  // Calcula os valores iniciais de x e y
  const { x, y } = transformCoordinates(defaultLat, defaultLon);

  formData.value = {
    ...defaultFormData(),
    x, // Coordenada X calculada
    y, // Coordenada Y calculada
  };

  isEditing.value = false; // Define que não está editando
  showForm.value = true; // Exibe o formulário
  localError.value = null; // Limpa mensagens de erro
  localSuccessMessage.value = null; // Limpa mensagens de sucesso
}

function showEditForm(location) {
  isEditing.value = true;
  // Ensure all fields from defaultFormData are present
  formData.value = {
    id: location.id,
    tipo: tiposDisponiveis.includes(location.tipo) ? location.tipo : 'location',
    nome: location.nome || '',
    andar: andaresDisponiveis.includes(location.andar) ? location.andar : 'terreo',
    x: location.x ?? null, // Use nullish coalescing
    y: location.y ?? null,
  };
  showForm.value = true;
  localError.value = null; // Clear messages when opening form
  localSuccessMessage.value = null;
}

function cancelForm() {
  resetForm();
  showForm.value = false;
  isEditing.value = false;
  localStorage.removeItem('locationFormData'); // Explicitly remove on cancel
}

function confirmDelete(id) {
  if (window.confirm(`Tem certeza que deseja excluir o local com ID "${id}"? Esta ação não pode ser desfeita.`)) {
    handleDeleteLocation(id);
  }
}

const dropdownOpen = ref(null); // Controle do menu suspenso

function toggleDropdown(id) {
  dropdownOpen.value = dropdownOpen.value === id ? null : id; // Alterna entre abrir e fechar
}

function closeDropdown() {
  dropdownOpen.value = null; // Fecha o menu suspenso
}
</script>

<style scoped>
.admin-container {
  padding: 20px;
  /* height: 100vh; */ /* Avoid fixed height for scroll */
  min-height: calc(100vh - 40px); /* Allow padding */
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
  border-bottom: 1px solid #e2e8f0;
  padding-bottom: 0.5rem;
}

.admin-container h2 {
  color: #2c3e50;
  margin: 2rem 0 1rem 0; /* Adjusted margin */
  font-size: 1.5rem;
  font-weight: 500;
}

/* Link Styling */
.admin-container > a { /* Style the top-level link */
  display: inline-block; /* Make it blocky */
  color: #3498db;
  text-decoration: none;
  margin-bottom: 1.5rem; /* Space below link */
  padding: 8px 12px;
  border-radius: 4px;
  background-color: #fff;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  transition: all 0.2s ease;
  border: 1px solid #e2e8f0;
}

.admin-container > a:hover {
  background-color: #3498db;
  color: #fff;
  text-decoration: none;
  border-color: #2980b9;
}

/* Estilo para o botão "Acessar Admin" */
.btn-admin {
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

.btn-admin:hover {
  background-color: #3498db;
  color: #fff;
  text-decoration: none;
  border-color: #2980b9;
}

/* Messages */
.loading, .error, .success {
  padding: 12px 15px;
  margin: 1rem 0;
  border-radius: 4px;
  font-weight: 500;
  border: 1px solid transparent;
}
.loading {
  color: #31708f;
  background-color: #d9edf7;
  border-color: #bce8f1;
}
.error {
  color: #a94442;
  background-color: #f2dede;
  border-color: #ebccd1;
}
.success {
  color: #3c763d;
  background-color: #dff0d8;
  border-color: #d6e9c6;
}


/* Button base */
.btn {
  display: inline-block; /* Ensure buttons behave predictably */
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-weight: 500;
  font-size: 0.95rem; /* Slightly larger */
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: center;
  vertical-align: middle;
  margin-right: 8px; /* Add spacing between buttons */
}
.btn:last-child {
    margin-right: 0;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-sm { /* Added Small button variant */
    padding: 6px 12px;
    font-size: 0.875rem;
}

/* Specific Button Colors */
.btn-primary { background-color: #3498db; color: white; }
.btn-primary:hover:not(:disabled) { background-color: #2980b9; }

.btn-success { background-color: #2ecc71; color: white; }
.btn-success:hover:not(:disabled) { background-color: #27ae60; }

.btn-warning { background-color: #f1c40f; color: #2c3e50; }
.btn-warning:hover:not(:disabled) { background-color: #f39c12; }

.btn-danger { background-color: #e74c3c; color: white; }
.btn-danger:hover:not(:disabled) { background-color: #c0392b; }

.btn-secondary { background-color: #95a5a6; color: white; }
.btn-secondary:hover:not(:disabled) { background-color: #7f8c8d; }

/* Add New Button */
.admin-container > button.btn-primary { /* Style the top-level add button */
    margin-bottom: 1.5rem;
}

/* Form Section */
.form-section {
  margin: 20px 0;
  padding: 25px;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  border: 1px solid #e2e8f0;
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
  border: 1px solid #e2e8f0; /* Thinner border */
  border-radius: 6px;
  font-size: 1rem;
  background-color: #fff;
  transition: all 0.2s ease;
  box-sizing: border-box; /* Include padding/border in width */
}

input[type="text"]:hover,
input[type="number"]:hover,
select:hover {
  border-color: #cbd5e0;
}

input[type="text"]:focus,
input[type="number"]:focus,
select:focus {
  outline: none;
  border-color: #3498db;
  box-shadow: 0 0 0 3px rgba(52,152,219,0.2);
}

input[disabled] { /* Style disabled inputs */
    background-color: #e9ecef;
    cursor: not-allowed;
}

.form-actions {
  margin-top: 1.5rem;
  display: flex;
  gap: 12px;
  padding-top: 1.5rem;
  border-top: 1px solid #e2e8f0; /* Separator line */
}

/* Table Styling */
.table-container {
  margin-top: 20px;
  overflow-x: auto; /* Permite rolagem horizontal em telas pequenas */
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  border: 1px solid #e2e8f0;
}

.locations-table {
  width: 100%;
  border-collapse: collapse; /* Remove espaçamento entre células */
  border-spacing: 0;
  text-align: left;
}

.locations-table thead {
  background-color: #f8fafc;
  color: #1e293b;
  font-weight: 600;
}

.locations-table th {
  padding: 12px 16px;
  border-bottom: 2px solid #e2e8f0;
  font-size: 0.9rem;
  text-transform: uppercase;
}

.locations-table td {
  padding: 12px 16px;
  border-bottom: 1px solid #e2e8f0;
  font-size: 0.95rem;
  color: #475569;
}

.locations-table tbody tr:hover {
  background-color: #f1f5f9; /* Cor de destaque ao passar o mouse */
}

.locations-table tbody tr:last-child td {
  border-bottom: none; /* Remove a borda inferior da última linha */
}

.empty-row {
  text-align: center;
  color: #6b7280;
  font-style: italic;
}

.error-row {
  text-align: center;
  color: #e74c3c;
  font-weight: bold;
}

/* Botões na tabela */
.btn-sm {
  padding: 6px 12px;
  font-size: 0.875rem;
}

.btn-warning {
  background-color: #f1c40f;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.btn-warning:hover:not(:disabled) {
  background-color: #f39c12;
}

.btn-danger {
  background-color: #e74c3c;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.btn-danger:hover:not(:disabled) {
  background-color: #c0392b;
}

/* Estilo do modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal {
  background: white;
  padding: 20px;
  border-radius: 8px;
  width: 70%;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
}

/* Diferenciação visual para campos de entrada e seleção */
.modal input[type="text"],
.modal input[type="number"] {
  background-color: #f9f9f9; /* Cor clara para campos de entrada */
  border: 1px solid #ccc;
  padding: 10px;
  border-radius: 4px;
  width: 100%;
  margin-top: 5px;
}

.modal select {
  background-color: #eef6ff; /* Cor azul clara para campos de seleção */
  border: 1px solid #ccc;
  padding: 10px;
  border-radius: 4px;
  width: 100%;
  margin-top: 5px;
}

.modal input[type="text"]:focus,
.modal input[type="number"]:focus,
.modal select:focus {
  outline: none;
  border-color: #3498db;
  box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.2);
}

/* Estilo para os rótulos */
.modal label {
  font-weight: bold;
  margin-bottom: 5px;
  display: block;
  color: #2c3e50;
}

/* Botões no modal */
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.btn-success {
  background-color: #2ecc71;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}

.btn-success:hover {
  background-color: #27ae60;
}

.btn-secondary {
  background-color: #95a5a6;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}

.btn-secondary:hover {
  background-color: #7f8c8d;
}

/* Estilo para alinhar os campos de coordenadas lado a lado */
.form-group-row {
  display: flex;
  gap: 20px; /* Espaçamento entre os campos */
}

.form-group-row .form-group {
  flex: 1; /* Faz com que os campos tenham o mesmo tamanho */
}

/* Estilo para o botão de ações */
.btn-actions {
  background-color: #3498db;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.3s ease, transform 0.2s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.btn-actions:hover {
  background-color: #2980b9;
  transform: translateY(-2px); /* Efeito de elevação ao passar o mouse */
}

.btn-actions:active {
  transform: translateY(0); /* Remove elevação ao clicar */
}

/* Estilo do menu suspenso */
.dropdown {
  position: relative;
  display: inline-block;
}

.dropdown-menu {
  position: absolute;
  top: calc(100% + 5px); /* Espaçamento entre o botão e o menu */
  left: 0;
  background-color: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  min-width: 140px;
  padding: 8px 0;
  animation: fadeIn 0.2s ease-in-out; /* Animação de entrada */
}

.dropdown-item {
  display: block;
  width: 100%;
  padding: 10px 16px;
  text-align: left;
  background: none;
  border: none;
  color: #475569;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s ease, color 0.2s ease;
}

.dropdown-item:hover {
  background-color: #f1f5f9;
  color: #1e293b;
}

.dropdown-item:disabled {
  color: #9ca3af;
  cursor: not-allowed;
}

/* Animação de entrada do menu */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Ajustes responsivos */
@media (max-width: 768px) {
  .admin-container {
    padding: 10px;
  }

  .locations-table th,
  .locations-table td {
    font-size: 0.9rem; /* Reduz o tamanho do texto */
    padding: 8px; /* Ajusta o espaçamento */
  }

  .btn {
    padding: 6px 12px; /* Reduz o tamanho dos botões */
    font-size: 0.9rem;
  }
}

@media (max-width: 480px) {
  .locations-table {
    font-size: 0.8rem; /* Reduz ainda mais o tamanho do texto */
  }

  .modal {
    width: 90%; /* Ajusta a largura do modal para telas pequenas */
  }
}
</style>