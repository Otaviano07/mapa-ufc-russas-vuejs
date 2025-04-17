import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
// Import the default export (service instance)
import locationService, { fetchInitialData as fetchInitialDataFromService } from '../services/LocationService';

// --- Helper: Check if an object looks like a Floor object ---
// function isFloor(obj) {
//     return obj && typeof obj === 'object' && obj.hasOwnProperty('id') && obj.hasOwnProperty('nome');
// }
// --- Helper: Check if an object looks like a Local object ---
// function isLocal(obj) {
//      return obj && typeof obj === 'object' && obj.hasOwnProperty('id') && obj.hasOwnProperty('nome') && obj.hasOwnProperty('andar');
// }


export const useLocationStore = defineStore('locationStore', () => { // Renamed store ID slightly for clarity
  // --- State ---
  const locais = ref([]);      // Array<Local>
  const waypoints = ref([]);   // Array<Waypoint>
  const floors = ref([]);      // Array<Floor>

  const selectedLocalId = ref(null); // ID of the selected local
  const currentFloorId = ref(null); // ID of the currently viewed floor (e.g., 'terreo')

  const loading = ref(false); // Loading state for initial data or CRUD
  const error = ref(null);    // Error message string

  // --- Getters ---
  const currentFloorData = computed(() => {
    return floors.value.find(f => f.id === currentFloorId.value) || null;
  });

  const selectedLocal = computed(() => {
    return locais.value.find(local => local.id === selectedLocalId.value) || null;
  });

  const locaisOnCurrentFloor = computed(() => {
    if (!currentFloorId.value) return [];
    return locais.value.filter(local => local.andar === currentFloorId.value);
  });

    // Getter to find a floor by ID (useful internally)
    const getFloorById = (id) => {
        return floors.value.find(f => f.id === id);
    };


  // --- Actions ---

  // Action to load initial data from the service
  async function loadInitialData(forceRefresh = false) {
     // Avoid reload if already loaded, not forced, and no error
     if (locais.value.length > 0 && !forceRefresh && !error.value) {
          console.log("Store: Skipping initial data load.");
          return true;
      }

    loading.value = true;
    error.value = null;
    console.log("Store: Loading initial data...");

    try {
      // Use the imported service instance's method
      const data = await locationService.fetchInitialData(); // Assuming service handles caching if needed

      locais.value = data?.locais || [];
      waypoints.value = data?.waypoints || [];
      floors.value = data?.floors || [];

      // Set default floor if none is set or if current is invalid
      if (floors.value.length > 0) {
          const currentFloorExists = floors.value.some(f => f.id === currentFloorId.value);
          if (!currentFloorId.value || !currentFloorExists) {
               const defaultFloor = floors.value.find(f => f.id === 'terreo') || floors.value[0]; // Prefer 'terreo'
               currentFloorId.value = defaultFloor.id;
               console.log("Store: Default/Current floor set to", currentFloorId.value);
          }
      } else {
          currentFloorId.value = null; // No floors available
      }

      // Validate selectedLocalId - deselect if it no longer exists
      if (selectedLocalId.value && !locais.value.some(l => l.id === selectedLocalId.value)) {
           console.log(`Store: Clearing selected local ID ${selectedLocalId.value} as it no longer exists.`);
           selectedLocalId.value = null;
      }


       console.log("Store: Initial data loaded.");
      return true;

    } catch (e) {
      console.error('Erro na store ao carregar dados:', e);
      error.value = `Erro ao carregar dados: ${e.message || 'Erro desconhecido'}`;
      // Clear data on error
      locais.value = [];
      waypoints.value = [];
      floors.value = [];
      currentFloorId.value = null;
      selectedLocalId.value = null;
      return false;
    } finally {
      loading.value = false;
    }
  }

  // Action to select a local by its ID
  function selectLocal(localId) {
     const localExists = locais.value.some(l => l.id === localId);
     if (localExists) {
         selectedLocalId.value = localId;
         console.log("Store: Selected local ID", selectedLocalId.value);

         // Automatically change floor if the selected local is on a different floor
         const local = locais.value.find(l => l.id === localId); // Get the full object
         if (local && local.andar !== currentFloorId.value) {
              // Check if the target floor exists before changing
              if (floors.value.some(f => f.id === local.andar)) {
                 changeFloor(local.andar); // Switch to the local's floor
              } else {
                  console.warn(`Store: Cannot change to floor "${local.andar}" for local "${localId}" - floor does not exist.`);
              }
         }
     } else {
         console.warn(`Store: Local with ID "${localId}" not found for selection.`);
         selectedLocalId.value = null; // Deselect if ID is invalid
     }
  }

  // Action to change the current floor by its ID
  function changeFloor(floorId) {
    const floorExists = floors.value.some(f => f.id === floorId);
    if (floorExists) {
      if (currentFloorId.value !== floorId) {
          currentFloorId.value = floorId;
          console.log("Store: Current floor changed to", currentFloorId.value);
           // Deselect local when floor changes manually? Good practice.
           selectedLocalId.value = null;
      }
    } else {
        console.warn(`Store: Attempted to change to non-existent floor ID "${floorId}".`);
    }
  }

  // Action to clear the currently selected local
  function clearSelectedLocal() {
    selectedLocalId.value = null;
    console.log("Store: Cleared selected local.");
  }

  // --- CRUD Actions (delegate to service, then refresh data) ---

  async function createLocal(localData) {
    loading.value = true;
    error.value = null;
    try {
      const newLocal = await locationService.createLocation(localData);
      if (newLocal) {
         await loadInitialData(true); // Force refresh
         // Optionally select the newly created local?
         // selectLocal(newLocal.id);
         return true;
      } else {
          error.value = 'Falha ao criar local (serviço).'; // More specific error source
          return false;
      }
    } catch (e) {
      error.value = `Erro ao criar local: ${e.message || 'Erro desconhecido'}`;
      return false;
    } finally {
      loading.value = false;
    }
  }

  async function updateLocal(localData) { // Expects full local object with ID
    if (!localData?.id) {
         error.value = "Dados inválidos para atualização (ID faltando).";
         return false;
    }
    loading.value = true;
    error.value = null;
    try {
      const updatedLocal = await locationService.updateLocation(localData.id, localData);
       if(updatedLocal) {
           await loadInitialData(true); // Force refresh
           return true;
       } else {
            error.value = 'Falha ao atualizar local (serviço).';
           return false;
       }
    } catch (e) {
      error.value = `Erro ao atualizar local: ${e.message || 'Erro desconhecido'}`;
      return false;
    } finally {
      loading.value = false;
    }
  }

  async function deleteLocal(id) {
     if (!id) {
          error.value = "ID inválido para exclusão.";
          return false;
     }
    loading.value = true;
    error.value = null;
    try {
      const success = await locationService.deleteLocation(id);
      if (success) {
        await loadInitialData(true); // Force refresh
        // If the deleted local was selected, clear selection
        if (selectedLocalId.value === id) {
          clearSelectedLocal();
        }
        return true;
      } else {
         error.value = 'Falha ao excluir local (serviço).';
        return false;
      }
    } catch (e) {
      error.value = `Erro ao excluir local: ${e.message || 'Erro desconhecido'}`;
      return false;
    } finally {
      loading.value = false;
    }
  }

  return {
    // State
    locais,
    waypoints,
    floors,
    selectedLocalId,
    currentFloorId,
    loading,
    error,

    // Getters
    selectedLocal,
    locaisOnCurrentFloor,
    currentFloorData,
    getFloorById, // Expose helper getter if needed

    // Actions
    loadInitialData,
    selectLocal,
    changeFloor,
    clearSelectedLocal,
    createLocal,
    updateLocal,
    deleteLocal
  };
});