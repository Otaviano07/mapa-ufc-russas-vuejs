import { ref } from 'vue';

// --- Configurações ---
// !!! SUBSTITUIR PELAS COORDENADAS REAIS DO PONTO DE REFERÊNCIA (Ex: Canto Superior Esquerdo do Mapa) !!!
const campusReferenceCoordinates = {
  latitude: -4.944444, // Exemplo: Latitude REAL do ponto (0,0) do SEU mapa
  longitude: -37.955556, // Exemplo: Longitude REAL do ponto (0,0) do SEU mapa
};

// !!! AJUSTAR COM BASE NO TAMANHO REAL COBERTO PELO SEU MAPA EM METROS !!!
// Dimensões em metros (aproximadas) cobertas pelo mapa a partir do ponto de referência
const campusDimensions = {
  widthMeters: 500, // Largura REAL em metros que o mapa cobre horizontalmente
  heightMeters: 400, // Altura REAL em metros que o mapa cobre verticalmente
};
// --- Fim Configurações ---


export function useGeolocation() {
  // Posição no mapa { x: number (0-100), y: number (0-100) } | null
  const userPosition = ref(null);
  const geolocationError = ref(null); // Stores error messages or status
  const isGettingLocation = ref(false); // Tracks if location fetch is in progress

  /**
   * Converte coordenadas geográficas (lat/lng) para coordenadas percentuais no mapa (0-100).
   * Assume que campusReferenceCoordinates corresponde ao canto superior esquerdo (0%, 0%) do mapa.
   * E que o eixo Y do mapa aumenta para baixo (como em imagens/CSS).
   */
  const convertGeoToMapCoordinates = (lat, lng) => {
    // Fatores de conversão (metros por grau) - Aproximações
    const metersPerLatDegree = 111132.954 - 559.822 * Math.cos(2 * lat * Math.PI / 180) + 1.175 * Math.cos(4 * lat * Math.PI / 180);
    const metersPerLngDegree = (Math.PI / 180) * 6378137 * Math.cos(lat * Math.PI / 180); // Using WGS84 ellipsoid approximation

    // Calcula a diferença em graus da referência
    const latDiff = lat - campusReferenceCoordinates.latitude;
    const lngDiff = lng - campusReferenceCoordinates.longitude;

    // Distância em metros do ponto de referência
    // Eixo Y: Negativo latDiff porque latitude aumenta para norte, Y do mapa/imagem aumenta para sul.
    const distanceY = -latDiff * metersPerLatDegree;
    // Eixo X: Positivo lngDiff porque longitude aumenta para leste, X do mapa/imagem aumenta para direita.
    const distanceX = lngDiff * metersPerLngDegree;

    // Converte para porcentagem (0-100)
    let xPercent = (distanceX / campusDimensions.widthMeters) * 100;
    let yPercent = (distanceY / campusDimensions.heightMeters) * 100;

    console.log(`Geo (${lat.toFixed(6)}, ${lng.toFixed(6)}) -> ` +
                `Ref (${campusReferenceCoordinates.latitude.toFixed(6)}, ${campusReferenceCoordinates.longitude.toFixed(6)}) -> ` +
                `Diff (m): X=${distanceX.toFixed(2)}, Y=${distanceY.toFixed(2)} -> ` +
                `Map (${xPercent.toFixed(2)}%, ${yPercent.toFixed(2)}%)`);

    // Limita os valores entre 0 e 100% - usuário está dentro da área do mapa?
    const isInsideMap = xPercent >= 0 && xPercent <= 100 && yPercent >= 0 && yPercent <= 100;

    if (!isInsideMap) {
        console.warn("Calculated position is outside the defined map boundaries.");
        // Decide how to handle: return null, clamp to edge, or return raw values?
        // Option: Clamp to edges
        // xPercent = Math.max(0, Math.min(100, xPercent));
        // yPercent = Math.max(0, Math.min(100, yPercent));
        // return { x: xPercent, y: yPercent, accuracy: null, isOutside: true };

        // Option: Return null if outside
         geolocationError.value = "Sua localização atual está fora da área do mapa.";
         return null;
    }


    return { x: xPercent, y: yPercent }; // Only return if inside
  };

  /**
   * Tenta obter a localização geográfica do usuário e convertê-la para o mapa.
   */
  const getUserLocationAuto = () => {
    return new Promise((resolve, reject) => { // Return a promise
        if (!navigator.geolocation) {
          geolocationError.value = "Geolocalização não é suportada por este navegador.";
          userPosition.value = null;
          isGettingLocation.value = false;
          reject(new Error(geolocationError.value)); // Reject the promise
          return;
        }

        isGettingLocation.value = true;
        geolocationError.value = "Obtendo sua localização..."; // Status message
        userPosition.value = null; // Limpa posição anterior

        navigator.geolocation.getCurrentPosition(
          (position) => {
            const userLat = position.coords.latitude;
            const userLng = position.coords.longitude;
            const accuracy = position.coords.accuracy; // Accuracy in meters
            console.log(`Localização geográfica recebida: ${userLat}, ${userLng} (Precisão: ${accuracy}m)`);

            const mapCoords = convertGeoToMapCoordinates(userLat, userLng);

            if (mapCoords) {
                userPosition.value = { ...mapCoords, accuracy }; // Store coords and accuracy
                geolocationError.value = null; // Clear error/status message
                resolve(userPosition.value); // Resolve the promise with position
            } else {
                // Error message already set by convertGeoToMapCoordinates if outside map
                userPosition.value = null;
                 reject(new Error(geolocationError.value || "Localização fora do mapa.")); // Reject promise
            }
             isGettingLocation.value = false;
          },
          (err) => {
            console.error("Erro ao obter geolocalização:", err);
            let message = "Erro desconhecido ao obter localização.";
            switch (err.code) {
              case err.PERMISSION_DENIED:
                message = "Permissão de localização negada.";
                break;
              case err.POSITION_UNAVAILABLE:
                message = "Informação de localização indisponível.";
                break;
              case err.TIMEOUT:
                message = "Tempo esgotado ao buscar localização.";
                break;
            }
            geolocationError.value = message;
            userPosition.value = null; // Garante que não usa posição inválida
            isGettingLocation.value = false;
            reject(new Error(message)); // Reject the promise
          },
          {
            enableHighAccuracy: true, // Tenta obter a localização mais precisa
            timeout: 15000, // Tempo máximo para obter (15 segundos)
            maximumAge: 0, // Força obter uma nova localização (não usa cache)
          }
        );
    });
  };

  /**
   * Define a posição do usuário manualmente com base em um clique no mapa.
   * @param {number} clickXPercent - Coordenada X do clique em porcentagem (0-100).
   * @param {number} clickYPercent - Coordenada Y do clique em porcentagem (0-100).
   */
  const setUserLocationManually = (clickXPercent, clickYPercent) => {
    // Clamp values to be strictly within 0-100
    const finalX = Math.max(0, Math.min(100, clickXPercent));
    const finalY = Math.max(0, Math.min(100, clickYPercent));

    userPosition.value = { x: finalX, y: finalY, accuracy: null }; // Set accuracy to null for manual
    geolocationError.value = null; // Limpa qualquer erro anterior
    isGettingLocation.value = false; // Ensure loading state is off
    console.log(`Localização definida manualmente: X: ${finalX.toFixed(2)}%, Y: ${finalY.toFixed(2)}%`);
  };

  return {
    userPosition,         // ref({x, y, accuracy} | null)
    geolocationError,     // ref(string | null)
    isGettingLocation,    // ref(boolean)
    getUserLocationAuto,  // function() -> Promise
    setUserLocationManually // function(xPerc, yPerc)
  };
}