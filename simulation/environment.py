import numpy as np
from typing import List, Tuple, Dict, Optional
from simulation.entities import Robot, Shelf, Station

class WarehouseEnv:
    def __init__(self, width: int = 10, height: int = 10, seed: Optional[int] = 42):
        self.width = width
        self.height = height
        self.seed = seed
        self.rng = np.random.RandomState(seed)
        
        self.grid = np.zeros((height, width), dtype=int)
        
        # 0 = empty, 1 = obstacle/shelf, 2 = packing station, 3 = charging station
        self.robots: List[Robot] = []
        self.shelves: List[Shelf] = []
        self.stations: List[Station] = []
        
        self.time_step = 0

    def add_robot(self, robot: Robot):
        self.robots.append(robot)

    def add_shelf(self, shelf: Shelf):
        self.shelves.append(shelf)
        if 0 <= shelf.y < self.height and 0 <= shelf.x < self.width:
            self.grid[shelf.y, shelf.x] = 1 # Mark as obstacle

    def add_station(self, station: Station):
        self.stations.append(station)
        if 0 <= station.y < self.height and 0 <= station.x < self.width:
            if station.type == 'packing':
                self.grid[station.y, station.x] = 2
            elif station.type == 'charging':
                self.grid[station.y, station.x] = 3

    def is_valid_position(self, x: int, y: int, ignore_robots: bool = False) -> bool:
        if x < 0 or x >= self.width or y < 0 or y >= self.height:
            return False
        if self.grid[y, x] == 1: # Shelf/Obstacle
            return False
            
        if not ignore_robots:
            for robot in self.robots:
                if robot.x == x and robot.y == y:
                    return False
        return True

    def step(self) -> int:
        self.time_step += 1
        congestion_events = 0
        
        for robot in self.robots:
            if robot.status == 'charging':
                robot.battery = min(100.0, robot.battery + 5.0)
                if robot.battery == 100.0:
                    robot.status = 'idle'
                    robot.current_task = None
            else:
                robot.battery = max(0.0, robot.battery - 0.05)
                
            if robot.path and robot.battery > 0 and robot.health > 0:
                next_x, next_y = robot.path[0]
                if self.is_valid_position(next_x, next_y):
                    robot.move_along_path()
                    robot.wait_counter = 0
                else:
                    robot.wait_counter += 1
                    congestion_events += 1
                    if robot.wait_counter > 3:
                        # Clear path to force order_manager to recalculate in the next tick
                        robot.path = []
                        robot.wait_counter = 0
                        
        return congestion_events
