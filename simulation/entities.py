from dataclasses import dataclass, field
from typing import List, Tuple, Optional, Dict, Any
import uuid

class TaskPriority:
    HIGH = "HIGH"
    NORMAL = "NORMAL"
    LOW = "LOW"
    
    @staticmethod
    def to_level(priority: str) -> int:
        if priority == "HIGH":
            return 3
        elif priority == "NORMAL":
            return 2
        return 1

class TaskStatus:
    CREATED = "CREATED"
    QUEUED = "QUEUED"
    PENDING = "QUEUED"
    ASSIGNED = "ASSIGNED"
    NAVIGATING_TO_SHELF = "NAVIGATING_TO_SHELF"
    PICKING = "PICKING"
    DELIVERING = "DELIVERING"
    IN_TRANSIT = "DELIVERING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"

class RobotHealth:
    HEALTHY = "HEALTHY"
    WARNING = "WARNING"
    FAILED = "FAILED"
    RECOVERING = "RECOVERING"

class StationStatus:
    AVAILABLE = "AVAILABLE"
    OCCUPIED = "OCCUPIED"
    OFFLINE = "OFFLINE"

@dataclass
class Product:
    id: str
    name: str
    demand_frequency: float = 1.0  # e.g., 1.0 = high demand, 0.1 = low demand
    quantity: int = 100
    category: str = "Electronics"

@dataclass
class Shelf:
    id: str
    x: int
    y: int
    products: List[Product] = field(default_factory=list)
    zone: str = "A"

@dataclass
class Station:
    id: str
    x: int
    y: int
    type: str  # 'packing' or 'charging'
    status: str = "AVAILABLE"  # 'AVAILABLE', 'OCCUPIED', 'OFFLINE'
    occupied_by: Optional[str] = None  # Robot ID currently using or reserving this station

@dataclass
class DynamicObstacle:
    id: str
    x: int
    y: int
    duration: int = -1  # -1 means manual/persistent until cleared
    obstacle_type: str = "barrier"  # 'barrier', 'spill', 'maintenance'

@dataclass
class Task:
    id: str
    sku: str
    product_name: str
    source_shelf_id: str
    source_x: int
    source_y: int
    dest_station_id: str
    dest_x: int
    dest_y: int
    priority: str = TaskPriority.NORMAL
    priority_level: int = 2
    status: str = TaskStatus.QUEUED
    assigned_robot_id: Optional[str] = None
    created_at: int = 0
    started_at: Optional[int] = None
    completed_at: Optional[int] = None
    estimated_distance: float = 0.0
    estimated_completion_time: float = 0.0  # In ticks / seconds
    actual_completion_time: Optional[float] = None
    starvation_counter: int = 0  # Starvation prevention counter

    @property
    def source(self) -> Tuple[int, int]:
        return (self.source_x, self.source_y)

    @property
    def destination(self) -> Tuple[int, int]:
        return (self.dest_x, self.dest_y)

    def age(self):
        self.starvation_counter += 1

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "sku": self.sku,
            "product_name": self.product_name,
            "source_shelf_id": self.source_shelf_id,
            "source": f"({self.source_x}, {self.source_y})",
            "dest_station_id": self.dest_station_id,
            "destination": f"({self.dest_x}, {self.dest_y})",
            "priority": self.priority,
            "status": self.status,
            "assigned_robot_id": self.assigned_robot_id,
            "created_at": self.created_at,
            "estimated_distance": round(self.estimated_distance, 1),
            "estimated_completion_time": round(self.estimated_completion_time, 1),
            "actual_completion_time": self.actual_completion_time
        }

@dataclass
class Order:
    """Preserved for backwards compatibility with legacy tests and modules"""
    id: str
    product: Product
    priority: int = 1
    timestamp: int = 0
    deadline: int = 0
    assigned_robot_id: Optional[str] = None
    completion_time: Optional[int] = None
    status: str = 'pending'

class Robot:
    def __init__(self, id: str, x: int, y: int):
        self.id = id
        self.x = x
        self.y = y
        self.battery = 100.0
        self.speed = 1.0  # Tiles per step
        self.health = RobotHealth.HEALTHY
        self.health_percent = 100.0
        self.accumulated_distance = 0.0
        self.completed_tasks = 0
        self.wait_counter = 0  # Track consecutive blocked ticks
        self.replans_count = 0
        self.conflicts_avoided = 0
        
        # State: idle, moving_to_shelf, picking, moving_to_packing, moving_to_charge, charging, waiting, failed
        self.status = 'idle'
        self.current_task_id: Optional[str] = None
        self.current_task_obj: Optional[Task] = None
        self.current_order: Optional[Order] = None  # Legacy support
        self.current_task: Optional[str] = None  # String summary
        self.path: List[Tuple[int, int]] = []
        self.target_shelf: Optional[Shelf] = None
        self.target_station: Optional[Station] = None
        self.assigned_at_tick: int = 0

    def move_along_path(self, is_loaded: bool = False) -> bool:
        if self.path and self.battery > 0 and self.health != RobotHealth.FAILED:
            next_pos = self.path.pop(0)
            self.x, self.y = next_pos
            # Real physical battery discharge: 0.25% unloaded, 0.35% carrying cargo
            drain = 0.35 if is_loaded else 0.25
            self.battery = max(0.0, self.battery - drain)
            self.accumulated_distance += 1.0
            return True
        return False

    def recharge(self, amount: float = 4.0) -> None:
        self.battery = min(100.0, self.battery + amount)
        if self.battery >= 100.0 and self.status == 'charging':
            self.status = 'idle'
            self.current_task = None
            self.current_task_id = None
            if self.target_station:
                self.target_station.status = 'AVAILABLE'
                self.target_station.occupied_by = None
                self.target_station = None

    def fail(self) -> None:
        self.health = RobotHealth.FAILED
        self.health_percent = 0.0
        self.status = 'failed'
        self.path = []

    def recover(self) -> None:
        self.health = RobotHealth.HEALTHY
        self.health_percent = 100.0
        self.status = 'idle'
        self.wait_counter = 0
