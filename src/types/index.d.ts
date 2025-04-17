// Definição dos tipos de dados principais do aplicativo

// Interface para um local/ponto de interesse ou Waypoint com tipo
export interface MapPoint {
  id: string;         // Unique identifier (e.g., "loc-1", "wp-1", "stair-t-1")
  andar: string;      // Floor ID (e.g., "terreo", "primeiro")
  nome?: string;       // Display name (required for locations, optional for waypoints)
  x: number;          // Percentage coordinate (0-100)
  y: number;          // Percentage coordinate (0-100)
  tipo?: 'location' | 'waypoint' | 'escada' | string; // Type identifier
  descricao?: string;  // Optional description
  // Location specific properties
  categoria?: string; // e.g., 'Acadêmico', 'Serviços'
  // Waypoint specific properties
  neighbors?: string[]; // IDs of connected waypoints/locations (standardized name)
  connections?: string[]; // Alias for neighbors if used in data
  vizinhos?: string[]; // Alias for neighbors if used in data
  // Stair specific properties
  andarDestino?: string; // Target floor ID for stairs
  idLigacao?: string;   // ID of the corresponding stair on the other floor
}


// Interface specific for Locations (inherits MapPoint or defines required fields)
export interface Local extends MapPoint {
    nome: string; // Name is required for Locals
    tipo: 'location'; // Type is fixed
    // Add other location-specific fields if necessary
    // cor?: string;
    // endereco?: string;
}

// Interface specific for Waypoints (inherits MapPoint)
export interface Waypoint extends MapPoint {
    tipo: 'waypoint' | 'escada' | string; // Can be general waypoint or specialized like 'escada'
    neighbors: string[]; // Connections are required for waypoints used in routing
}


// Interface para um andar
export interface Floor {
  id: string;         // Floor identifier (e.g., "terreo", "primeiro")
  nome: string;       // Display name (e.g., "Térreo", "1º Andar")
  image: string;      // Path to the map image (e.g., "/maps/terreo.svg")
  descricao?: string; // Optional description
}

// Interface para um segmento de rota (para desenho)
export interface RouteSegment {
  x: number;      // Start X coordinate (%)
  y: number;      // Start Y coordinate (%)
  length: number; // Length of the segment (in % units relative to map dimensions)
  angle: number;  // Angle in degrees
  floor: string;  // Floor ID this segment belongs to
}

// Interface para a posição do usuário (pode ser null se desconhecida)
export interface UserPosition {
  andar: string;      // Floor ID user is currently on
  x: number;          // Percentage coordinate (0-100)
  y: number;          // Percentage coordinate (0-100)
  accuracy: number | null; // Accuracy radius in meters (null if manually set)
}

// Interface para informações de popup no mapa
export interface PopupInfo {
  x: number;          // X coordinate for positioning (%)
  y: number;          // Y coordinate for positioning (%)
  text: string;       // Content to display
  visible: boolean;   // Visibility state
}

// Interface para dimensões do mapa (se necessário, e.g., for pixel calculations)
export interface MapDimensions {
  width: number;      // Width in pixels
  height: number;     // Height in pixels
}

// Interface para estado de carregamento (se usando estado local em vez de store)
// export interface LoadingState {
//   initialData: boolean;
//   mapImage: boolean;
//   geolocation: boolean;
// }

// Interface para estado de erro (se usando estado local)
// export interface ErrorState {
//   initialData: string | null;
//   routing: string | null;
//   geolocation: string | null;
// }

// --- Declarações de Módulos ---
// Permite importar assets diretamente em scripts/componentes
declare module "*.png" {
  const value: string;
  export default value;
}

declare module "*.jpg" {
  const value: string;
  export default value;
}

declare module "*.svg" {
  const value: string; // Usually the path to the SVG
  export default value;
}

// --- Extensões Vue (Opcional) ---
// Se você injetar globalmente propriedades (não recomendado com Composition API)
// declare module '@vue/runtime-core' {
//   interface ComponentCustomProperties {
//     $someGlobalProperty: Type;
//   }
// }