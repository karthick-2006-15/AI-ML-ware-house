from dataclasses import dataclass, field
from typing import List, Tuple, Optional
import uuid

@dataclass
class Product:
    id: str
    name: str
    demand_frequency: float = 1.0  # e.g., 1.0 = high demand, 0.1 = low demand
    quantity: int = 100

@dataclass
class Shelf:
    id: str
    x: int
    y: int
    products: List[Product] = field(default_factory=list)

@dataclass
class Station:
    id: str
    x: int
    y: int
    type: str # 'packing' or 'charging'

@dataclass
class Order:
    id: str
    product: Product
    priority: int = 1 # 1 = low, 5 = high
    timestamp: int = 0
    deadline: int = 0
    assigned_robot_id: Optional[str] = None
    completion_time: Optional[int] = None
    status: str = 'pending' # pending, assigned, completed

class Robot:
    def __init__(self, id: str, x: int, y: int):
        self.id = id
        self.x = x
        self.y = y
        self.battery = 100.0
        self.speed = 1.0 # Tiles per step
        self.health = 100.0 # 0 = broken, 100 = perfect
        self.accumulated_distance = 0.0
        self.completed_tasks = 0
        self.wait_counter = 0 # Phase 3: track blocked ticks
        
        self.status = 'idle' # idle, moving_to_shelf, picking, moving_to_packing, charging
        self.current_task: Optional[str] = None # Describes the current intent, e.g., "Order-1234", "Charging"
        self.current_order: Optional[Order] = None
        self.path: List[Tuple[int, int]] = []
        self.target_shelf: Optional[Shelf] = None
        self.target_station: Optional[Station] = None

    def move_along_path(self):
        if self.path and self.battery > 0 and self.health > 0:
            next_pos = self.path.pop(0)
            self.x, self.y = next_pos
            self.battery = max(0.0, self.battery - 0.2) # Drain battery on move
            self.accumulated_distance += 1.0
            return True
        return False
