export interface SystemStatus {
  warehouse_detector?: string;
  warehouse_model_loaded?: boolean;
  warehouse_model_path?: string;
  warehouse_classes?: string[];
  general_detector?: {
    loaded: boolean;
    classes_count: number;
  };
  xgboost?: {
    loaded: boolean;
  };
  xgboost_ready: boolean;
  yolo_ready: boolean;
}

export interface VisionDetection {
  class: string;
  class_name?: string;
  confidence: number;
  bbox?: [number, number, number, number];
  source?: 'warehouse' | 'general';
}

export interface VisionResult {
  object_count: number;
  detections: VisionDetection[];
  annotated_image: string;
  image_summary?: string;
  inference_time_ms?: number;
}

export interface PredictInput {
  stock_level: number;
  reorder_point: number;
  reorder_frequency_days: number;
  lead_time_days: number;
  daily_demand: number;
  demand_std_dev: number;
  item_popularity_score: number;
  picking_time_seconds: number;
  handling_cost_per_unit: number;
  unit_price: number;
  holding_cost_per_unit_day: number;
  order_fulfillment_rate: number;
  total_orders_last_month: number;
  turnover_ratio: number;
  layout_efficiency_score: number;
  category: string;
  zone: string;
}

export interface ShapExplanation {
  feature: string;
  importance: number;
}

export interface PredictResult {
  demand_forecast: number;
  stockout_probability: number;
  risk_level: 'HIGH' | 'MEDIUM' | 'LOW';
  performance_kpi: number;
  explanations?: {
    stockout_risk?: ShapExplanation[];
    performance_kpi?: ShapExplanation[];
    demand_forecast?: ShapExplanation[];
  };
  priority?: 'URGENT' | 'HIGH' | 'NORMAL' | 'OPTIMAL';
  operational_recommendation?: string;
}

export interface RobotState {
  id: string;
  x: number;
  y: number;
  state: string;
  health: 'HEALTHY' | 'WARNING' | 'FAILED' | 'RECOVERING';
  health_percent?: number;
  battery: number;
  speed?: number;
  path?: [number, number][];
  task?: string | null;
  accumulated_distance?: number;
  completed_tasks?: number;
  replans_count?: number;
  conflicts_avoided?: number;
  wait_counter?: number;
}

export interface ShelfState {
  id: string;
  x: number;
  y: number;
  zone?: string;
  products_count?: number;
  category?: string;
}

export interface StationState {
  id: string;
  x: number;
  y: number;
  type: 'packing' | 'charging';
  status: 'AVAILABLE' | 'OCCUPIED' | 'OFFLINE';
  occupied_by?: string | null;
}

export interface DynamicObstacleState {
  id: string;
  x: number;
  y: number;
  duration?: number;
  obstacle_type?: 'barrier' | 'spill' | 'maintenance';
}

export interface ZoneInfo {
  name: string;
  robots: number;
  tasks: number;
  obstacles: number;
  wait_ticks: number;
  congestion: 'LOW' | 'MEDIUM' | 'HIGH';
  xgb_risk?: 'LOW' | 'MEDIUM' | 'HIGH';
  performance_kpi?: number;
  demand_forecast?: number;
}

export interface TaskInfo {
  id: string;
  sku: string;
  product_name?: string;
  source: string;
  destination: string;
  priority: 'HIGH' | 'NORMAL' | 'LOW';
  status: string;
  assigned_robot_id?: string | null;
  created_at: number;
  estimated_distance: number;
  estimated_completion_time: number;
  actual_completion_time?: number | null;
}

export interface TimelineEvent {
  id: string;
  tick: number;
  type: string;
  message: string;
  severity: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
  details?: Record<string, any>;
}

export interface CoordinatorComparison {
  intelligent_coordinator: {
    name: string;
    collisions: number;
    deadlocks_unresolved: number;
    avg_fulfillment_time: number;
    throughput_rate: number;
    fleet_utilization_pct: number;
    conflicts_resolved: number;
  };
  naive_baseline: {
    name: string;
    collisions: number;
    deadlocks_unresolved: number;
    avg_fulfillment_time: number;
    throughput_rate: number;
    fleet_utilization_pct: number;
    conflicts_resolved: number;
  };
  improvements: {
    collision_elimination: string;
    fulfillment_speedup: string;
    throughput_boost: string;
  };
}

export interface SimMetrics {
  completed_orders: number;
  pending_orders?: number;
  failed_orders?: number;
  average_fulfillment_time: number;
  total_distance: number;
  collisions: number;
  conflicts_avoided?: number;
  replanning_events?: number;
  deadlocks_detected?: number;
  deadlocks_resolved?: number;
  robot_failures?: number;
  charging_events: number;
  average_battery: number;
  utilization: number;
  active_robots?: number;
  total_robots?: number;
  throughput_rate?: number;
  comparison?: CoordinatorComparison;
  fleet_power_reserve?: number;
  space_time_efficiency?: number;
}

export interface EntityState {
  id: string;
  x: number;
  y: number;
  type?: string;
  state?: string;
  battery?: number;
  path?: [number, number][];
  task?: string;
}

export interface SimState {
  tick: number;
  running?: boolean;
  speed?: number;
  robots: RobotState[];
  shelves: ShelfState[];
  stations: StationState[];
  dynamic_obstacles?: DynamicObstacleState[];
  static_obstacles?: { x: number; y: number }[];
  zones?: Record<string, ZoneInfo>;
  tasks?: {
    pending: TaskInfo[];
    active: TaskInfo[];
  };
  tasks_queue?: TaskInfo[];
  events?: TimelineEvent[];
  timeline_events?: TimelineEvent[];
  coordinator_comparison?: CoordinatorComparison;
  grid_size?: number;
  metrics?: SimMetrics;
}

export interface ScenarioInfo {
  id: string;
  name: string;
  description: string;
  category: string;
  badge: string;
}

export type WarehouseEditTool = 
  | 'select'
  | 'shelf'
  | 'packing_station'
  | 'charging_station'
  | 'robot'
  | 'obstacle'
  | 'dynamic_obstacle'
  | 'delete';

export type RouteViewMode = 'ALL' | 'ACTIVE' | 'SELECTED' | 'NONE';

export interface SimTask {
  id: string;
  robotId: string;
  from: string;
  to: string;
  progress: number;
  status: 'IN PROGRESS' | 'COMPLETED' | 'PENDING' | 'BLOCKED';
  sku: string;
}

export interface SimEvent {
  time: string;
  robotId: string;
  description: string;
  type: 'move' | 'task' | 'charge' | 'alert';
}

export type PageId = 
  | 'dashboard' 
  | 'simulation' 
  | 'vision' 
  | 'analytics' 
  | 'experiments' 
  | 'architecture';

