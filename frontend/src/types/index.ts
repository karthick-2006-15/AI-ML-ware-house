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

export interface SimMetrics {
  completed_orders?: number;
  average_fulfillment_time?: number;
  total_distance?: number;
  collisions?: number;
  average_battery?: number;
  charging_events?: number;
  utilization?: number;
}

export interface SimState {
  tick: number;
  robots: EntityState[];
  shelves: EntityState[];
  stations: EntityState[];
  metrics?: SimMetrics;
}

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
