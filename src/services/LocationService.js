import { ref, shallowRef } from 'vue';

// Cache de dados
const dataCache = {
  locations: shallowRef(null),
  waypoints: shallowRef(null),
  floors: shallowRef(null),
  lastFetch: {
    locations: 0,
    waypoints: 0,
    floors: 0
  }
};

// Tempo de cache em millisegundos (5 minutos)
const CACHE_DURATION = 5 * 60 * 1000;

// --- Configuração da API ---
const API_URL = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL;

if (!API_URL) {
  console.error("VITE_GOOGLE_APPS_SCRIPT_URL não está definida no arquivo .env. As chamadas de API falharão.");
}

// Estados globais do serviço (podem ser usados pelos componentes se necessário)
const loading = ref(false);
const error = ref(null);
const successMessage = ref(null);

// Helper para limpar mensagens
function clearMessages() {
  setTimeout(() => {
    error.value = null;
    successMessage.value = null;
  }, 5000);
}

/**
 * Função interna genérica para chamar a API.
 * @param {object} params - Parâmetros para enviar (inclui 'action').
 * @param {string} method - Método HTTP ('GET', 'POST', etc.). GET é o padrão.
 * @returns {Promise<object|null>} - Os dados da resposta ou null em caso de erro.
 */
async function callApi(params = {}, method = 'GET') {
  if (!API_URL) {
    const errorMessage = "URL da API não configurada no .env.";
    error.value = errorMessage;
    console.error(errorMessage);
    return null;
  }

  loading.value = true;
  error.value = null;

  const queryParams = new URLSearchParams(params);
  const url = `${API_URL}${params ? `?${queryParams.toString()}` : ''}`;

  const options = {
    method,
    mode: 'cors',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    redirect: 'follow',
  };

  if (method === 'POST') {
    options.body = queryParams.toString();
  }

  console.log(`Chamando API (${params.action || 'N/A'}) | Método: ${method}`);
  console.log('URL:', url);
  if (options.body) console.log("Body:", options.body);

  try {
    const response = await fetch(url, options);

    console.log('API Response status:', response.status);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    let result;
    const contentType = response.headers.get("content-type");

    if (contentType && contentType.includes("application/json")) {
      result = await response.json();
    } else {
      const textResponse = await response.text();
      console.warn(`Resposta da API não é JSON (Content-Type: ${contentType}). Texto:`, textResponse.substring(0, 500));
      if (response.status === 302 || textResponse.toLowerCase().includes('<title>autorização necessária</title>') || textResponse.toLowerCase().includes('required permissions')) {
        throw new Error(`Falha na API: Possível erro de permissão ou URL /dev inválida. Verifique permissões da Web App e use a URL /exec.`);
      }
      throw new Error(`Resposta inesperada (não-JSON): Status ${response.status}. Resposta: ${textResponse.substring(0, 150)}...`);
    }

    console.log("Resposta da API:", result);

    if (!response.ok || result.status === 'error' || result.error) {
      const errorMessage = result?.message || result?.error || `Erro HTTP ${response.status}`;
      throw new Error(errorMessage);
    }

    const readActions = ['read', 'readAll', 'readLocais', 'readWaypoints', 'readFloors'];
    if (params.action && !readActions.includes(params.action)) {
      successMessage.value = result.message || 'Operação realizada com sucesso!';
      clearMessages();
    }

    return result;

  } catch (err) {
    console.error(`Erro na API action=${params.action || 'N/A'}, method=${method}:`, err);
    error.value = `Falha na operação (${params.action || 'leitura'}): ${err.message}`;
    successMessage.value = null;
    return null;
  } finally {
    loading.value = false;
  }
}

export async function fetchWaypoints(forceRefresh = false) {
  console.log('Iniciando fetchWaypoints...');
  try {
    const now = Date.now();

    if (!forceRefresh &&
        dataCache.waypoints.value &&
        (now - dataCache.lastFetch.waypoints <= CACHE_DURATION)) {
      console.log('Usando cache de waypoints');
      return dataCache.waypoints.value;
    }

    const response = await callApi({ action: 'readWaypoints' });
    if (!response) return null;

    console.log('Resposta de readWaypoints:', response);

    const processedWaypoints = response.waypoints || [];
    dataCache.waypoints.value = processedWaypoints;
    dataCache.lastFetch.waypoints = now;

    console.log('Waypoints processados:', processedWaypoints);

    return processedWaypoints;
  } catch (err) {
    console.error('Erro ao buscar waypoints:', err);
    error.value = 'Falha ao carregar waypoints.';
    return null;
  }
}

/**
 * Busca todos os dados iniciais necessários para o mapa.
 * @returns {Promise<{locais: Array, waypoints: Array, floors: Array}|null>}
 */
export async function fetchInitialData(forceRefresh = false) {
  try {
    const now = Date.now();
    let needsRefresh = forceRefresh;

    if (!needsRefresh) {
      needsRefresh = !dataCache.locations.value ||
                     !dataCache.waypoints.value ||
                     !dataCache.floors.value ||
                     (now - dataCache.lastFetch.locations > CACHE_DURATION) ||
                     (now - dataCache.lastFetch.waypoints > CACHE_DURATION) ||
                     (now - dataCache.lastFetch.floors > CACHE_DURATION);
    }

    if (needsRefresh) {
      const readAllResponse = await callApi({ action: 'readAll' });
      if (!readAllResponse) return null;

      dataCache.locations.value = readAllResponse.locais || [];
      dataCache.lastFetch.locations = now;

      await fetchWaypoints();
      dataCache.lastFetch.waypoints = now;

      dataCache.floors.value = readAllResponse.floors || [];
      dataCache.lastFetch.floors = now;
    }

    console.log('Dados processados:');
    console.log(`- Locais: ${dataCache.locations.value?.length || 0}`);
    console.log(`- Waypoints: ${dataCache.waypoints.value?.length || 0}`);
    console.log(`- Exemplo de waypoint:`, dataCache.waypoints.value?.[0] || {});
    console.log(`- Floors: ${dataCache.floors.value || []}`);

    return {
      locais: dataCache.locations.value || [],
      waypoints: dataCache.waypoints.value || [],
      floors: dataCache.floors.value || [{ id: 'terreo', nome: 'Térreo' }]
    };
  } catch (err) {
    console.error('Erro ao buscar dados iniciais:', err);
    error.value = 'Erro ao carregar dados iniciais.';
    return null;
  }
}

/**
 * Busca apenas os locais (para o Admin Panel, por exemplo).
 * @returns {Promise<Array|null>}
 */
export const fetchAdminLocations = async () => {
  const result = await callApi({ action: 'read' }, 'GET');

  if (result && result.locais && Array.isArray(result.locais)) {
    return result.locais;
  } else {
    console.error("Dados inválidos em fetchAdminLocations:", result);
    error.value = "Erro ao carregar locais.";
    return [];
  }
};

/**
 * Cria um novo local via API.
 * @param {object} locationData - { nome, endereco, andar }.
 * @returns {Promise<boolean>} - True se sucesso, false se falha.
 */
export const createLocation = async (locationData) => {
  const result = await callApi({
    action: 'create',
    tipo: locationData.tipo || 'location',
    nome: locationData.nome,
    andar: locationData.andar,
    x: locationData.x,
    y: locationData.y
  }, 'POST');
  return !!result;
};

/**
 * Atualiza um local existente via API.
 * @param {object} locationData - { id, nome?, endereco?, andar? }.
 * @returns {Promise<boolean>} - True se sucesso, false se falha.
 */
export const updateLocation = async (locationData) => {
  const params = {
    action: 'update',
    id: locationData.id,
    ...(locationData.tipo && { tipo: locationData.tipo }),
    ...(locationData.nome && { nome: locationData.nome }),
    ...(locationData.endereco && { endereco: locationData.endereco }),
    ...(locationData.andar && { andar: locationData.andar }),
    ...(locationData.x !== undefined && { x: locationData.x }),
    ...(locationData.y !== undefined && { y: locationData.y }),
  };
  const result = await callApi(params, 'POST');
  return !!result;
};

/**
 * Exclui um local via API.
 * @param {string|number} id - ID do local a ser excluído.
 * @returns {Promise<boolean>} - True se sucesso, false se falha.
 */
export const deleteLocation = async (id) => {
  const result = await callApi({
    action: 'delete',
    id
  }, 'POST');
  return !!result;
};

// Exporta os estados reativos para observação externa, se necessário
export const locationServiceState = {
  loading,
  error,
  successMessage
};
