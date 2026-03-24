
export interface GraphNode {
  id: string;
  name: string;
  type: 'root' | 'topic' | 'subtopic' | 'entity';
  val: number; // Size/Importance
  description?: string;
  urls?: { title: string; uri: string }[]; // New: Web Addresses
  expanded?: boolean;
  x?: number;
  y?: number;
  z?: number; // 3D depth
  fx?: number | null;
  fy?: number | null;
  vx?: number;
  vy?: number;
  vz?: number;
  spawnProgress?: number; // For enter animation (0 to 1)
  scale?: number;
}

export interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  color?: string;
}

export interface Connection {
  id: string;
  source: string;
  target: string;
  color?: string;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export interface SearchResult {
  summary: string;
  relatedTopics: { name: string; description: string }[];
  links: { title: string; uri: string }[];
}

export interface DeepAnalysisResult {
  analysis: string;
  newConcepts: { name: string; description: string }[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'system';
  content: string;
  dataPayload?: GraphData; // Optional data payload to merge into the graph
  timestamp: number;
}

export enum VisualMode {
  NETWORK_2D = '2D Network',
  ORBITAL_3D = '3D Orbital',
  HOLOGRAPHIC_4D = '4D Holographic',
  DATA_SCAPE = 'Cyber Topology', 
  INVENTORY_GRID = 'Holo Grid', 
  SCHEMATIC_BLUEPRINT = 'Schematic', 
  LIVE_STREAM_DECK = 'Live Stream Deck', // NEW
}

// --- NEW WIDGET TYPES ---
export type WidgetType = 'VIDEO' | 'METRIC' | 'LOG_STREAM' | 'TASK_PROGRESS' | 'NEXUS_VOLUME' | 'SOCKET_STREAM' | 'WEATHER' | 'CLOCK' | 'CPU_USAGE' | 'NETWORK_TRAFFIC' | 'STOCK_TICKER' | 'NEWS_FEED' | 'RADAR_SWEEP' | 'AUDIO_VISUALIZER' | 'HEART_RATE' | 'BATTERY_STATUS' | 'MEMORY_USAGE' | 'DISK_SPACE' | 'SERVER_PING' | 'DOWNLOAD_SPEED' | 'UPLOAD_SPEED' | 'ACTIVE_USERS' | 'REVENUE_CHART' | 'CONVERSION_RATE' | 'ERROR_RATE' | 'DATABASE_LOAD' | 'CACHE_HIT_RATIO' | 'API_REQUESTS' | 'LATENCY_GRAPH' | 'UPTIME_COUNTER' | 'SECURITY_ALERTS' | 'THREAT_LEVEL' | 'FIREWALL_STATUS' | 'ENCRYPTION_STATUS' | 'VPN_CONNECTION' | 'SATELLITE_TRACKING' | 'GPS_COORDINATES' | 'COMPASS' | 'ALTIMETER' | 'SPEEDOMETER' | 'TACHOMETER' | 'FUEL_GAUGE' | 'ENGINE_TEMP' | 'OIL_PRESSURE' | 'GEAR_INDICATOR' | 'G_FORCE_METER' | 'GYROSCOPE' | 'ACCELEROMETER' | 'MAGNETIC_FIELD' | 'LIGHT_SENSOR' | 'PROXIMITY_SENSOR' | 'PRESSURE_SENSOR' | 'HUMIDITY_SENSOR' | 'CO2_LEVEL' | 'AIR_QUALITY' | 'RADIATION_LEVEL' | 'SEISMIC_ACTIVITY' | 'SOLAR_FLARE' | 'LUNAR_PHASE' | 'TIDE_LEVEL' | 'WIND_DIRECTION' | 'PRECIPITATION_PROB';

export interface DashboardWidget {
    id: string;
    type: WidgetType;
    title: string;
    sourceUrl?: string; // For Video or API
    refreshRate?: number; // ms
    x?: number; // Grid positions (optional for simple layout)
    y?: number;
    w?: number;
    h?: number;
}

export interface EnvironmentSettings {
  backgroundType: 'nebula' | 'stars' | 'grid' | 'solid' | 'custom';
  backgroundColor: string;
  customBackgroundUrl?: string;
  skyboxType: 'none' | 'space' | 'city' | 'abstract' | 'custom';
  skyboxUrl?: string;
  enclosedBox: boolean;
  boxSize: number;
  boxTextures: {
    front?: string;
    back?: string;
    top?: string;
    bottom?: string;
    left?: string;
    right?: string;
  };
  terrain?: {
    enabled: boolean;
    seed: number;
    scale: number;
    height: number;
    color: string;
    wireframe: boolean;
    animate: boolean;
    speed: number;
  };
}
