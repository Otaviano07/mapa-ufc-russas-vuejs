import { ref, computed } from 'vue';

export function useMapInteraction(initialScale = 1, minScale = 0.5, maxScale = 5, zoomStep = 1.2) {

  // --- State Refs ---
  const mapScale = ref(initialScale);
  const mapTranslateX = ref(0); // Panning state X (pixels)
  const mapTranslateY = ref(0); // Panning state Y (pixels)
  const isDragging = ref(false); // Is the user currently dragging the map?
  const dragStartX = ref(0);
  const dragStartY = ref(0);
  const settingUserLocationMode = ref(false); // Is app waiting for click to set location?
  const popupInfo = ref({ visible: false, x: 0, y: 0, text: "" }); // Popup state

 // --- Computed Properties ---
  // Style object for the map container/image transform
  const mapTransformStyle = computed(() => ({
      // Apply scale first, then translate
      transform: `scale(${mapScale.value}) translate(${mapTranslateX.value}px, ${mapTranslateY.value}px)`,
      transformOrigin: 'center center', // Consistent origin from CSS
      cursor: isDragging.value ? 'grabbing' : (settingUserLocationMode.value ? 'crosshair' : 'grab'),
  }));


  // --- Methods ---

  // Zooming
  const zoom = (direction) => {
      const scaleFactor = direction === 'in' ? zoomStep : 1 / zoomStep;
      const newScale = mapScale.value * scaleFactor;
      mapScale.value = Math.max(minScale, Math.min(maxScale, newScale));
      // TODO: Implement zoom towards cursor position? (More complex)
      // For now, it zooms towards the center (transform-origin)
  };
  const zoomIn = () => zoom('in');
  const zoomOut = () => zoom('out');

  // Panning (Drag and Drop)
  const handleMouseDown = (event) => {
      // Prevent dragging if setting location manually
      if (settingUserLocationMode.value) return;
      isDragging.value = true;
      // Record starting position of drag relative to the client window
      dragStartX.value = event.clientX - mapTranslateX.value * mapScale.value; // Adjust for current translation and scale
      dragStartY.value = event.clientY - mapTranslateY.value * mapScale.value;
      // Change cursor in mapTransformStyle
  };

  const handleMouseMove = (event) => {
      if (!isDragging.value) return;
      // Calculate new translation based on mouse movement
      // The movement distance needs to be divided by the scale because the translation happens *before* scaling in the transform order
      const newTranslateX = (event.clientX - dragStartX.value) / mapScale.value;
      const newTranslateY = (event.clientY - dragStartY.value) / mapScale.value;
      mapTranslateX.value = newTranslateX;
      mapTranslateY.value = newTranslateY;
  };

  const handleMouseUp = () => {
      if (isDragging.value) {
        isDragging.value = false;
        // Reset cursor in mapTransformStyle
      }
  };

    const handleMouseLeave = () => {
        // Stop dragging if mouse leaves the map container
        if (isDragging.value) {
            handleMouseUp();
        }
    };

  // Popup Handling
  const showPopup = (local) => {
    // Basic validation for local object and coordinates
    if (local && typeof local.x === 'number' && typeof local.y === 'number' && local.nome) {
      popupInfo.value = {
          visible: true,
          x: local.x, // Expecting percentage
          y: local.y, // Expecting percentage
          text: local.nome
      };
    } else {
      console.warn("Tentativa de mostrar popup para local inválido ou sem coordenadas/nome:", local);
      hidePopup(); // Hide if data is invalid
    }
  };

  const hidePopup = () => {
    if(popupInfo.value.visible) { // Only change if currently visible
        popupInfo.value = { ...popupInfo.value, visible: false };
    }
  };

  // Manual Location Setting Mode Activation
   const enableSetUserLocationMode = () => {
       settingUserLocationMode.value = true;
       isDragging.value = false; // Ensure dragging stops if it was active
       // Cursor will change via mapTransformStyle
       console.log("Modo de definição manual ativado. Clique no mapa.");
   };

   const disableSetUserLocationMode = () => {
        settingUserLocationMode.value = false;
         // Cursor will change via mapTransformStyle
   };

  /**
   * Processa um clique no mapa. Pode fechar menu, definir localização manual, etc.
   * @param {MouseEvent} event - O evento de clique.
   * @param {HTMLElement|null} mapImageElement - O elemento da *imagem* do mapa para calcular coords relativas.
   * @param {Function} callbackSetLocation - Função para chamar ao definir localização manual (recebe xPercent, yPercent).
   * @param {Function} callbackCloseMenu - Função para chamar se precisar fechar o menu.
   */
  const handleMapClick = (event, mapImageElement, callbackSetLocation, callbackCloseMenu) => {
    // 1. Se um popup estiver visível, apenas o esconda no primeiro clique
    if (popupInfo.value.visible) {
        hidePopup();
        return; // Don't process further on this click
    }

    // 2. Tenta fechar o menu se clicar fora dele (delegado ao parent)
    if (callbackCloseMenu) {
      callbackCloseMenu();
    }

    // 3. Se estiver no modo de definir localização manual
    if (settingUserLocationMode.value) {
      if (!mapImageElement) {
        console.error("Elemento da imagem do mapa não fornecido para calcular clique manual.");
        disableSetUserLocationMode();
        return;
      }

      const mapRect = mapImageElement.getBoundingClientRect();

      // Calcula coordenadas do clique relativas ao elemento da imagem
      const clickXRelative = event.clientX - mapRect.left;
      const clickYRelative = event.clientY - mapRect.top;

      // Converte para porcentagem (0-100) relativa à dimensão da *imagem*
      // This gives the click position directly as a percentage of the image dimensions
      const xPercent = (clickXRelative / mapRect.width) * 100;
      const yPercent = (clickYRelative / mapRect.height) * 100;


      console.log(`Clique no mapa para definir local: Relativo(${clickXRelative.toFixed(1)}, ${clickYRelative.toFixed(1)}), Rect(${mapRect.width.toFixed(1)}x${mapRect.height.toFixed(1)}), Percent(${xPercent.toFixed(2)}%, ${yPercent.toFixed(2)}%)`);

      // Chama a função de callback para efetivamente definir a localização
      if (callbackSetLocation) {
        callbackSetLocation(xPercent, yPercent); // Passa as coordenadas calculadas em %
      }

      disableSetUserLocationMode(); // Sai do modo após definir
    }
    // 4. Lógica adicional de clique no mapa (ex: deselecionar local?) pode ser adicionada aqui
    // else { // If not setting location manually...
    //     // Maybe deselect current item?
    // }
  };


  return {
    // State Refs
    mapScale,
    mapTranslateX,
    mapTranslateY,
    popupInfo,
    settingUserLocationMode,
    isDragging, // Expose dragging state if needed externally

    // Computed Styles
    mapTransformStyle,

    // Methods
    zoomIn,
    zoomOut,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave, // Add leave handler
    showPopup,
    hidePopup,
    handleMapClick,
    enableSetUserLocationMode,
    disableSetUserLocationMode, // Add disable function
  };
}