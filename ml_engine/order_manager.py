import uuid
from typing import List, Optional
from simulation.entities import Order, Product, Robot, Shelf, Station
from simulation.environment import WarehouseEnv
from ml_engine.pathfinding import astar

class OrderManager:
    def __init__(self, env: WarehouseEnv):
        self.env = env
        self.pending_orders: List[Order] = []
        self.completed_orders: List[Order] = []

    def generate_random_orders(self, count: int, all_products: List[Product]):
        for _ in range(count):
            # Deterministic selection
            idx = self.env.rng.choice(len(all_products))
            product = all_products[idx]
            
            # 1.0 frequency -> higher priority probability
            priority = 5 if self.env.rng.rand() < product.demand_frequency else self.env.rng.randint(1, 4)
            deadline = self.env.time_step + self.env.rng.randint(100, 500)
            
            order = Order(
                id=str(uuid.UUID(int=int(self.env.rng.randint(0, 2**31-1)))), 
                product=product,
                priority=priority,
                timestamp=self.env.time_step,
                deadline=deadline
            )
            self.pending_orders.append(order)

    def dispatch_orders(self):
        # FIFO: sort by timestamp ascending
        self.pending_orders.sort(key=lambda o: o.timestamp)
        
        idle_robots = [r for r in self.env.robots if r.status == 'idle']
        
        # Check battery for idle robots
        for robot in idle_robots:
            if robot.battery < 20.0:
                charging_stations = [s for s in self.env.stations if s.type == 'charging']
                if charging_stations:
                    station = charging_stations[0] 
                    path = astar(self.env, (robot.x, robot.y), (station.x, station.y))
                    if path:
                        robot.path = path
                        robot.status = 'moving_to_charge'
                        robot.current_task = 'Charging'
                        
        idle_robots = [r for r in self.env.robots if r.status == 'idle']
        
        while self.pending_orders and idle_robots:
            order = self.pending_orders[0]
            
            # Find shelf with product
            target_shelf = None
            for shelf in self.env.shelves:
                if order.product in shelf.products:
                    target_shelf = shelf
                    break
            
            if not target_shelf:
                # Can't fulfill right now
                break
                
            # Nearest-Robot Selection
            best_robot = None
            best_dist = float('inf')
            
            for robot in idle_robots:
                dist = abs(robot.x - target_shelf.x) + abs(robot.y - target_shelf.y)
                if dist < best_dist:
                    best_dist = dist
                    best_robot = robot
                    
            if not best_robot:
                break
                
            path = astar(self.env, (best_robot.x, best_robot.y), (target_shelf.x, target_shelf.y))
            if path:
                self.pending_orders.pop(0) # Successfully assigning
                idle_robots.remove(best_robot)
                
                order.status = 'assigned'
                order.assigned_robot_id = best_robot.id
                best_robot.current_order = order
                best_robot.current_task = f"Fulfill {order.id[:6]}"
                best_robot.target_shelf = target_shelf
                best_robot.path = path[:-1] # Stop adjacent to shelf
                best_robot.status = 'moving_to_shelf'
            else:
                # Pathfinding failed for the best robot, break to avoid infinite loop
                break

    def update_robot_states(self):
        packing_stations = [s for s in self.env.stations if s.type == 'packing']
        charging_stations = [s for s in self.env.stations if s.type == 'charging']
        
        for robot in self.env.robots:
            if robot.status == 'moving_to_charge':
                if not robot.path: # Reached charging station
                    robot.status = 'charging'
                    
            elif robot.status == 'moving_to_shelf':
                if not robot.path:
                    robot.status = 'picking'
                    
            elif robot.status == 'picking':
                robot.status = 'moving_to_packing'
                if packing_stations:
                    ps = packing_stations[0]
                    robot.target_station = ps
                    path = astar(self.env, (robot.x, robot.y), (ps.x, ps.y))
                    if path:
                        robot.path = path[:-1]
                
            elif robot.status == 'moving_to_packing':
                if not robot.path:
                    robot.status = 'idle'
                    robot.current_task = None
                    robot.completed_tasks += 1
                    
                    if robot.current_order:
                        robot.current_order.status = 'completed'
                        robot.current_order.completion_time = self.env.time_step
                        self.completed_orders.append(robot.current_order)
                        robot.current_order = None
                        
                    robot.target_shelf = None
                    robot.target_station = None
