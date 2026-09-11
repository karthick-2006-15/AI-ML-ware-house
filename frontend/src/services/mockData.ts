import type { 
  SimState, 
  RobotState, 
  ShelfState, 
  StationState, 
  ZoneInfo, 
  TaskInfo, 
  TimelineEvent, 
  CoordinatorComparison, 
  SystemStatus 
} from '../types';

export interface ScenarioCatalogItem {
  id: string;
  name: string;
  description: string;
  category: string;
  badge: string;
}

export const MOCK_SCENARIOS: ScenarioCatalogItem[] = [
  {
    id: "NORMAL_OPERATION",
    name: "Normal Operation",
    description: "Balanced warehouse workload with 5 AMRs, steady picking orders, and optimal traffic flow.",
    category: "Baseline",
    badge: "Standard"
  },
  {
    id: "HEAVY_TRAFFIC",
    name: "Heavy Traffic Congestion",
    description: "High-density fleet (8 AMRs) fulfilling concurrent orders in tight aisles; tests dynamic collision avoidance.",
    category: "Stress Test",
    badge: "High Load"
  },
  {
    id: "BLOCKED_AISLE",
    name: "Blocked Aisle & Rerouting",
    description: "Sudden pallet spill / barrier blocks central thoroughfare; AMRs calculate dynamic A* detours in real-time.",
    category: "Obstacle Avoidance",
    badge: "Dynamic"
  },
  {
    id: "LOW_BATTERY",
    name: "Low Battery Fleet Cascade",
    description: "Multiple AMRs drop below 20% threshold simultaneously; autonomous priority queueing at charging docks.",
    category: "Power Management",
    badge: "Autonomous"
  },
  {
    id: "ROBOT_FAILURE",
    name: "Robot Hardware Breakdown",
    description: "AMR-1 suffers simulated motor stall; active inventory task is instantly recovered and reassigned to AMR-2.",
    category: "Fault Tolerance",
    badge: "Failover"
  },
  {
    id: "MULTIPLE_ORDERS",
    name: "High-Priority Order Surge",
    description: "Sudden arrival of 15 urgent HIGH priority orders; tests priority queueing and starvation prevention.",
    category: "Order Dispatch",
    badge: "Surge"
  },
  {
    id: "CHARGING_STATION_BUSY",
    name: "Charging Dock Contention",
    description: "Only 1 charging station operational with 4 low-battery AMRs; tests orderly waiting and apron queueing.",
    category: "Resource Contention",
    badge: "Bottleneck"
  },
  {
    id: "MULTI_ROBOT_CONFLICT",
    name: "Narrow Corridor Head-On Conflict",
    description: "Two AMRs traveling in opposite directions in a 1-tile corridor; coordinator negotiates right-of-way and lateral yield.",
    category: "Conflict Avoidance",
    badge: "Head-On"
  }
];

export const INITIAL_SYSTEM_STATUS: SystemStatus = {
  warehouse_detector: "YOLOv8s Custom",
  warehouse_model_loaded: true,
  warehouse_model_path: "models/final/weights/best.pt",
  warehouse_classes: ["person", "box", "pallet", "forklift", "robot", "robotic_arm"],
  general_detector: {
    loaded: true,
    classes_count: 80
  },
  xgboost: {
    loaded: true
  },
  xgboost_ready: true,
  yolo_ready: true
};

export const INITIAL_STATIONS: StationState[] = [
  { id: "P1", x: 5, y: 0, type: "packing", status: "AVAILABLE", occupied_by: null },
  { id: "C1", x: 0, y: 9, type: "charging", status: "AVAILABLE", occupied_by: null },
  { id: "C2", x: 9, y: 9, type: "charging", status: "AVAILABLE", occupied_by: null },
];

export const INITIAL_SHELVES: ShelfState[] = (() => {
  const shelves: ShelfState[] = [];
  const xs = [2, 3, 6, 7];
  let idx = 0;
  for (const x of xs) {
    for (let y = 2; y <= 6; y++) {
      const zone = x < 5 ? (y < 4 ? 'A' : 'C') : (y < 4 ? 'B' : 'D');
      shelves.push({
        id: `S${idx}`,
        x,
        y,
        zone,
        products_count: 12 + (idx % 8),
        category: ['Electronics', 'Automotive', 'Apparel', 'Industrial'][idx % 4]
      });
      idx++;
    }
  }
  return shelves;
})();

export const INITIAL_ROBOTS: RobotState[] = [
  {
    id: "R0",
    x: 5,
    y: 2,
    state: "delivering",
    health: "HEALTHY",
    health_percent: 98,
    battery: 92.4,
    speed: 1.0,
    task: "Deliver PROD_06 to Packing Station",
    accumulated_distance: 38,
    completed_tasks: 4,
    replans_count: 3,
    conflicts_avoided: 5,
    path: [[5, 2], [5, 1], [5, 0]]
  },
  {
    id: "R1",
    x: 8,
    y: 3,
    state: "moving",
    health: "HEALTHY",
    health_percent: 100,
    battery: 89.1,
    speed: 1.0,
    task: "Navigating to Shelf S16",
    accumulated_distance: 24,
    completed_tasks: 2,
    replans_count: 1,
    conflicts_avoided: 3,
    path: [[8, 3], [7, 3], [6, 3]]
  },
  {
    id: "R2",
    x: 5,
    y: 7,
    state: "delivering",
    health: "HEALTHY",
    health_percent: 99,
    battery: 96.5,
    speed: 1.0,
    task: "Deliver PROD_14 to Packing Station",
    accumulated_distance: 42,
    completed_tasks: 5,
    replans_count: 2,
    conflicts_avoided: 6,
    path: [[5, 7], [5, 6], [5, 5], [5, 4], [5, 3], [5, 2], [5, 1], [5, 0]]
  },
  {
    id: "R3",
    x: 7,
    y: 8,
    state: "moving",
    health: "HEALTHY",
    health_percent: 95,
    battery: 84.8,
    speed: 1.0,
    task: "Restocking Shelf S11",
    accumulated_distance: 19,
    completed_tasks: 2,
    replans_count: 0,
    conflicts_avoided: 2,
    path: [[7, 8], [7, 7], [7, 6], [7, 5]]
  },
  {
    id: "R4",
    x: 8,
    y: 5,
    state: "yielding",
    health: "HEALTHY",
    health_percent: 97,
    battery: 91.0,
    speed: 1.0,
    task: "Yielding Right-of-Way to R2",
    accumulated_distance: 31,
    completed_tasks: 3,
    replans_count: 4,
    conflicts_avoided: 7,
    path: [[8, 5], [8, 4], [8, 3]]
  }
];

export const INITIAL_ZONES: Record<string, ZoneInfo> = {
  Zone_A: {
    name: "Fast-Pick Electronics (A)",
    robots: 2,
    tasks: 5,
    obstacles: 0,
    wait_ticks: 1,
    congestion: "LOW",
    xgb_risk: "LOW",
    performance_kpi: 0.88,
    demand_forecast: 142.5
  },
  Zone_B: {
    name: "Automotive Precision (B)",
    robots: 1,
    tasks: 4,
    obstacles: 0,
    wait_ticks: 0,
    congestion: "LOW",
    xgb_risk: "MEDIUM",
    performance_kpi: 0.74,
    demand_forecast: 98.2
  },
  Zone_C: {
    name: "Bulk Apparel (C)",
    robots: 1,
    tasks: 3,
    obstacles: 0,
    wait_ticks: 2,
    congestion: "LOW",
    xgb_risk: "LOW",
    performance_kpi: 0.91,
    demand_forecast: 115.0
  },
  Zone_D: {
    name: "Heavy Industrial (D)",
    robots: 1,
    tasks: 4,
    obstacles: 0,
    wait_ticks: 1,
    congestion: "MEDIUM",
    xgb_risk: "HIGH",
    performance_kpi: 0.65,
    demand_forecast: 174.8
  }
};

export const INITIAL_TASKS_QUEUE: TaskInfo[] = [
  {
    id: "TASK-104",
    sku: "SKU-7729",
    product_name: "LIDAR Navigation Sensor Core",
    source: "Shelf S7 (Zone A)",
    destination: "Packing Station P1",
    priority: "HIGH",
    status: "DISPATCHED",
    assigned_robot_id: "R0",
    created_at: 12,
    estimated_distance: 6,
    estimated_completion_time: 18
  },
  {
    id: "TASK-105",
    sku: "SKU-3410",
    product_name: "Hydraulic Valve Manifold",
    source: "Shelf S16 (Zone B)",
    destination: "Packing Station P1",
    priority: "HIGH",
    status: "EN_ROUTE",
    assigned_robot_id: "R1",
    created_at: 14,
    estimated_distance: 9,
    estimated_completion_time: 23
  },
  {
    id: "TASK-106",
    sku: "SKU-9902",
    product_name: "Li-Ion 48V Battery Module",
    source: "Shelf S14 (Zone D)",
    destination: "Packing Station P1",
    priority: "HIGH",
    status: "DISPATCHED",
    assigned_robot_id: "R2",
    created_at: 15,
    estimated_distance: 10,
    estimated_completion_time: 25
  },
  {
    id: "TASK-107",
    sku: "SKU-1884",
    product_name: "High-Tensile Shrink Film",
    source: "Shelf S11 (Zone B)",
    destination: "Packing Station P1",
    priority: "NORMAL",
    status: "QUEUED",
    assigned_robot_id: null,
    created_at: 18,
    estimated_distance: 8,
    estimated_completion_time: 26
  },
  {
    id: "TASK-108",
    sku: "SKU-2415",
    product_name: "Optical Encoder Disc",
    source: "Shelf S3 (Zone A)",
    destination: "Packing Station P1",
    priority: "NORMAL",
    status: "QUEUED",
    assigned_robot_id: null,
    created_at: 20,
    estimated_distance: 5,
    estimated_completion_time: 25
  },
  {
    id: "TASK-109",
    sku: "SKU-5521",
    product_name: "Pneumatic Gripper Finger",
    source: "Shelf S9 (Zone C)",
    destination: "Packing Station P1",
    priority: "LOW",
    status: "QUEUED",
    assigned_robot_id: null,
    created_at: 22,
    estimated_distance: 7,
    estimated_completion_time: 29
  }
];

export const INITIAL_TIMELINE_EVENTS: TimelineEvent[] = [
  {
    id: "EVT-01",
    tick: 48,
    type: "DISPATCH",
    message: "Closed-loop replenishment order dispatched to AMR-0 for SKU-7729 (XGBoost 91.9% High Risk).",
    severity: "INFO"
  },
  {
    id: "EVT-02",
    tick: 42,
    type: "COORDINATION",
    message: "Space-time reservation conflict avoided between AMR-2 and AMR-4 at (5, 4). AMR-4 yielding right-of-way.",
    severity: "SUCCESS"
  },
  {
    id: "EVT-03",
    tick: 36,
    type: "ORDER_COMPLETE",
    message: "AMR-0 completed fulfillment order #12 at Packing Station P1 in 14.2s (Zero Physical Collisions).",
    severity: "SUCCESS"
  },
  {
    id: "EVT-04",
    tick: 28,
    type: "SAFETY_CHECK",
    message: "Space-Time A* reservation grid validated: 0 collision risks detected across 5 operating AMRs.",
    severity: "INFO"
  }
];

export const INITIAL_COORDINATOR_COMPARISON: CoordinatorComparison = {
  intelligent_coordinator: {
    name: "Space-Time A* Coordinator",
    collisions: 0,
    deadlocks_unresolved: 0,
    avg_fulfillment_time: 14.2,
    throughput_rate: 42.5,
    fleet_utilization_pct: 94.2,
    conflicts_resolved: 24
  },
  naive_baseline: {
    name: "Naive Greedy Pathfinding",
    collisions: 18,
    deadlocks_unresolved: 7,
    avg_fulfillment_time: 46.8,
    throughput_rate: 13.1,
    fleet_utilization_pct: 58.4,
    conflicts_resolved: 0
  },
  improvements: {
    collision_elimination: "100% Collision Elimination",
    fulfillment_speedup: "3.3x Faster Fulfillment",
    throughput_boost: "+224% Throughput Increase"
  }
};

export const createInitialSimState = (): SimState => ({
  tick: 48,
  running: false,
  speed: 1.0,
  grid_size: 10,
  robots: JSON.parse(JSON.stringify(INITIAL_ROBOTS)),
  shelves: JSON.parse(JSON.stringify(INITIAL_SHELVES)),
  stations: JSON.parse(JSON.stringify(INITIAL_STATIONS)),
  dynamic_obstacles: [],
  zones: JSON.parse(JSON.stringify(INITIAL_ZONES)),
  tasks_queue: JSON.parse(JSON.stringify(INITIAL_TASKS_QUEUE)),
  timeline_events: JSON.parse(JSON.stringify(INITIAL_TIMELINE_EVENTS)),
  coordinator_comparison: JSON.parse(JSON.stringify(INITIAL_COORDINATOR_COMPARISON)),
  metrics: {
    completed_orders: 14,
    pending_orders: 6,
    conflicts_avoided: 24,
    collisions: 0,
    total_distance: 154,
    charging_events: 5,
    average_battery: 92.4,
    utilization: 0.88,
    average_fulfillment_time: 14.2,
    fleet_power_reserve: 90.8,
    space_time_efficiency: 98.4
  }
});
