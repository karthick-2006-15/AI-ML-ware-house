import numpy as np
from typing import List, Tuple, Dict, Optional, Any
import uuid
from simulation.entities import Robot, Shelf, Station, DynamicObstacle, Product, RobotHealth

class WarehouseEnv:
    def __init__(self, width: int = 10, height: int = 10, seed: Optional[int] = 42):
        self.width = width
        self.height = height
        self.seed = seed
        self.rng = np.random.RandomState(seed)
        
        # Grid representation:
        # 0 = Empty floor
        # 1 = Shelf
        # 2 = Packing Station
        # 3 = Charging Station
        # 4 = Static Obstacle / Wall
        # 5 = Dynamic Obstacle
        self.grid = np.zeros((height, width), dtype=int)
        
        self.robots: List[Robot] = []
        self.shelves: List[Shelf] = []
        self.stations: List[Station] = []
        self.dynamic_obstacles: List[DynamicObstacle] = []
        self.static_obstacles: List[Tuple[int, int]] = []
        
        # Spatial reservation table for current tick: (x, y) -> robot_id
        self.reservations: Dict[Tuple[int, int], str] = {}
        
        self.time_step = 0

    def get_zone(self, x: int, y: int) -> str:
        """Divides 10x10 warehouse into 4 distinct quadrants: Zone A, B, C, D"""
        if x < self.width // 2:
            return "A" if y < self.height // 2 else "C"
        else:
            return "B" if y < self.height // 2 else "D"

    def get_zone_for_position(self, x: int, y: int) -> str:
        return self.get_zone(x, y)

    def get_zone_statistics(self) -> Dict[str, Dict[str, Any]]:
        """Calculates real-time operational density, waiting time, and congestion for each zone"""
        zones = {
            "A": {"name": "Zone A — High Velocity", "robots": 0, "tasks": 0, "obstacles": 0, "wait_ticks": 0, "congestion": "LOW"},
            "B": {"name": "Zone B — Medium Velocity", "robots": 0, "tasks": 0, "obstacles": 0, "wait_ticks": 0, "congestion": "LOW"},
            "C": {"name": "Zone C — Bulk Storage", "robots": 0, "tasks": 0, "obstacles": 0, "wait_ticks": 0, "congestion": "LOW"},
            "D": {"name": "Zone D — Staging & Docks", "robots": 0, "tasks": 0, "obstacles": 0, "wait_ticks": 0, "congestion": "LOW"},
        }
        
        for r in self.robots:
            z = self.get_zone(r.x, r.y)
            zones[z]["robots"] += 1
            zones[z]["wait_ticks"] += r.wait_counter
            if r.current_task_obj:
                zones[z]["tasks"] += 1

        for o in self.dynamic_obstacles:
            z = self.get_zone(o.x, o.y)
            zones[z]["obstacles"] += 1

        for z_key, z_data in zones.items():
            # Composite score based on robot density, wait counter, and active obstacles
            score = (z_data["robots"] * 1.5) + (z_data["wait_ticks"] * 0.8) + (z_data["obstacles"] * 2.0)
            if score >= 6.0 or z_data["wait_ticks"] >= 4:
                z_data["congestion"] = "HIGH"
            elif score >= 3.0 or z_data["wait_ticks"] >= 2:
                z_data["congestion"] = "MEDIUM"
            else:
                z_data["congestion"] = "LOW"
                
        return zones

    def add_robot(self, robot: Robot) -> bool:
        if self.is_valid_position(robot.x, robot.y, ignore_robots=False):
            self.robots.append(robot)
            return True
        return False

    def add_shelf(self, shelf: Shelf):
        self.shelves.append(shelf)
        if 0 <= shelf.y < self.height and 0 <= shelf.x < self.width:
            self.grid[shelf.y, shelf.x] = 1
            shelf.zone = self.get_zone(shelf.x, shelf.y)

    def add_station(self, station: Station):
        self.stations.append(station)
        if 0 <= station.y < self.height and 0 <= station.x < self.width:
            self.grid[station.y, station.x] = 2 if station.type == 'packing' else 3

    def add_dynamic_obstacle(self, x: int, y: int, duration: int = -1, obstacle_type: str = "barrier") -> Optional[DynamicObstacle]:
        """Places a dynamic temporary obstacle, e.g. maintenance barrier, pallet spill"""
        if x < 0 or x >= self.width or y < 0 or y >= self.height:
            return None
        # Cannot spawn obstacle directly on a robot or packing/charging station
        for r in self.robots:
            if r.x == x and r.y == y:
                return None
        for s in self.stations:
            if s.x == x and s.y == y:
                return None
                
        # Remove any existing obstacle at that spot
        self.dynamic_obstacles = [o for o in self.dynamic_obstacles if not (o.x == x and o.y == y)]
        
        obs = DynamicObstacle(id=f"OBS_{x}_{y}_{uuid.uuid4().hex[:4]}", x=x, y=y, duration=duration, obstacle_type=obstacle_type)
        self.dynamic_obstacles.append(obs)
        self.grid[y, x] = 5
        return obs

    def remove_dynamic_obstacle(self, x: int, y: int) -> bool:
        initial_len = len(self.dynamic_obstacles)
        self.dynamic_obstacles = [o for o in self.dynamic_obstacles if not (o.x == x and o.y == y)]
        if len(self.dynamic_obstacles) < initial_len:
            if self.grid[y, x] == 5:
                self.grid[y, x] = 0
            return True
        return False

    def clear_dynamic_obstacles(self):
        for o in self.dynamic_obstacles:
            if self.grid[o.y, o.x] == 5:
                self.grid[o.y, o.x] = 0
        self.dynamic_obstacles.clear()

    # --- Interactive Warehouse Editor Helpers ---

    def can_place(self, x: int, y: int, item_type: str) -> Tuple[bool, str]:
        """Validates whether an item can be placed without violating warehouse topology rules"""
        if x < 0 or x >= self.width or y < 0 or y >= self.height:
            return False, "Coordinates out of bounds."
            
        current = self.grid[y, x]
        robot_here = any(r.x == x and r.y == y for r in self.robots)
        
        if item_type == "robot":
            if current != 0:
                return False, "Cannot place robot on a shelf, obstacle, or station."
            if robot_here:
                return False, "Cell already occupied by another robot."
            return True, "Valid placement."
            
        if robot_here:
            return False, "Cannot place object on an active robot."
            
        if item_type == "shelf":
            if current != 0:
                return False, "Cell is already occupied."
            return True, "Valid shelf placement."
            
        if item_type in ["packing_station", "charging_station"]:
            if current != 0:
                return False, "Cell is already occupied."
            return True, "Valid station placement."
            
        if item_type in ["obstacle", "dynamic_obstacle"]:
            if current in [2, 3]:
                return False, "Cannot place obstacle on a charging or packing station."
            return True, "Valid obstacle placement."
            
        return True, "Valid placement."

    def delete_at(self, x: int, y: int) -> Dict[str, Any]:
        """Removes whatever object is at (x, y)"""
        # 1. Check dynamic obstacles
        if self.remove_dynamic_obstacle(x, y):
            return {"status": "deleted", "type": "dynamic_obstacle"}
            
        # 2. Check shelves
        for s in list(self.shelves):
            if s.x == x and s.y == y:
                self.shelves.remove(s)
                self.grid[y, x] = 0
                return {"status": "deleted", "type": "shelf", "id": s.id}
                
        # 3. Check stations (prevent deleting the last packing or charging station)
        for st in list(self.stations):
            if st.x == x and st.y == y:
                same_type = [s for s in self.stations if s.type == st.type]
                if len(same_type) <= 1:
                    return {"status": "error", "message": f"Cannot delete the only remaining {st.type} station."}
                self.stations.remove(st)
                self.grid[y, x] = 0
                return {"status": "deleted", "type": f"{st.type}_station", "id": st.id}
                
        # 4. Check static obstacles
        if (x, y) in self.static_obstacles:
            self.static_obstacles.remove((x, y))
            self.grid[y, x] = 0
            return {"status": "deleted", "type": "static_obstacle"}
            
        # 5. Check robots (prevent deleting if only 1 robot left)
        for r in list(self.robots):
            if r.x == x and r.y == y:
                if len(self.robots) <= 1:
                    return {"status": "error", "message": "Cannot delete the only remaining robot in the fleet."}
                self.robots.remove(r)
                return {"status": "deleted", "type": "robot", "id": r.id}
                
        return {"status": "empty", "message": "Cell was already empty."}

    def is_valid_position(self, x: int, y: int, ignore_robots: bool = False, requesting_robot_id: Optional[str] = None) -> bool:
        """Determines if tile is traversable by a robot"""
        if x < 0 or x >= self.width or y < 0 or y >= self.height:
            return False
            
        cell = self.grid[y, x]
        # 1 = Shelf, 4 = Static Obstacle, 5 = Dynamic Obstacle
        if cell in [1, 4, 5]:
            return False
            
        if not ignore_robots:
            for robot in self.robots:
                if robot.id != requesting_robot_id and robot.x == x and robot.y == y:
                    return False
        return True

    def is_obstacle(self, x: int, y: int) -> bool:
        if x < 0 or x >= self.width or y < 0 or y >= self.height:
            return True
        return self.grid[y, x] in [1, 4, 5]

    def step(self) -> int:
        """Advances physical environment state, ages dynamic obstacles, and updates battery recharge"""
        self.time_step += 1
        
        # Age dynamic obstacles if duration is positive
        expired_obstacles = []
        for obs in self.dynamic_obstacles:
            if obs.duration > 0:
                obs.duration -= 1
                if obs.duration == 0:
                    expired_obstacles.append((obs.x, obs.y))
                    
        for ex_x, ex_y in expired_obstacles:
            self.remove_dynamic_obstacle(ex_x, ex_y)
            
        # Passive charging at dock & idle battery drain
        for robot in self.robots:
            if robot.status == 'charging':
                robot.recharge(amount=4.0)
            elif robot.status == 'idle':
                robot.battery = max(0.0, robot.battery - 0.02)
                
        return len(expired_obstacles)

