import uuid
import math
from typing import List, Optional, Dict, Any, Tuple
from simulation.entities import (
    Order, Product, Robot, Shelf, Station,
    Task, TaskPriority, TaskStatus, RobotHealth, StationStatus
)
from simulation.environment import WarehouseEnv
from ml_engine.pathfinding import AStarPlanner, astar
from ml_engine.multi_robot_coordinator import MultiRobotCoordinator

# Load XGBoost inference module gracefully
try:
    from ml.warehouse.inference import WarehouseInference
    _xgb_inference = WarehouseInference()
except Exception as _e:
    print(f"[OrderManager] XGBoost inference unavailable: {_e}")
    _xgb_inference = None

class OrderManager:
    def __init__(self, env: WarehouseEnv):
        self.env = env
        self.planner = AStarPlanner(env)
        self.coordinator = MultiRobotCoordinator(env, self.planner)
        
        # Tasks & Orders
        self.pending_tasks: List[Task] = []
        self.active_tasks: List[Task] = []
        self.completed_tasks: List[Task] = []
        self.failed_tasks: List[Task] = []
        
        # Backwards-compatible orders lists
        self.pending_orders: List[Order] = []
        self.completed_orders: List[Order] = []
        
        # Live events buffer for timeline
        self.events_buffer: List[Dict[str, Any]] = []
        
        # XGBoost Zone Cache (updated periodically)
        self.zone_predictions: Dict[str, Dict[str, Any]] = {}
        self.last_xgb_update_tick: int = -100

    def emit_event(self, event_type: str, message: str, severity: str = "INFO", details: Optional[Dict] = None):
        """Buffer a human-readable event for the real-time timeline."""
        event = {
            "id": str(uuid.uuid4())[:8],
            "tick": self.env.time_step,
            "type": event_type,
            "message": message,
            "severity": severity, # "INFO", "SUCCESS", "WARNING", "ERROR"
            "details": details or {}
        }
        self.events_buffer.append(event)
        # Keep buffer bounded to recent 100 events
        if len(self.events_buffer) > 100:
            self.events_buffer = self.events_buffer[-100:]

    def pop_events(self) -> List[Dict[str, Any]]:
        """Retrieve and clear recent events."""
        events = list(self.events_buffer)
        self.events_buffer.clear()
        return events

    def generate_random_orders(self, count: int, all_products: List[Product]):
        """Generate random tasks with realistic priority distribution."""
        for _ in range(count):
            idx = self.env.rng.choice(len(all_products))
            product = all_products[idx]
            
            # Find a shelf stocking this product
            target_shelf = None
            for shelf in self.env.shelves:
                if product in shelf.products:
                    target_shelf = shelf
                    break
            if not target_shelf and self.env.shelves:
                target_shelf = self.env.shelves[self.env.rng.choice(len(self.env.shelves))]
            
            packing_stations = [s for s in self.env.stations if s.type == "packing"]
            packing_station = packing_stations[0] if packing_stations else None

            # Priority sampling: 20% HIGH, 50% NORMAL, 30% LOW
            p_roll = self.env.rng.rand()
            if p_roll < 0.20:
                priority = TaskPriority.HIGH
            elif p_roll < 0.70:
                priority = TaskPriority.NORMAL
            else:
                priority = TaskPriority.LOW

            task_id = f"TSK-{uuid.uuid4().hex[:6].upper()}"
            src = (target_shelf.x, target_shelf.y) if target_shelf else (2, 2)
            dst = (packing_station.x, packing_station.y) if packing_station else (5, 0)
            
            # Estimate delivery time using XGBoost if available
            est_time = self._estimate_task_duration(src, dst)
            
            task = Task(
                id=task_id,
                sku=product.id,
                product_name=product.name,
                source_shelf_id=target_shelf.id if target_shelf else "S0",
                source_x=src[0],
                source_y=src[1],
                dest_station_id=packing_station.id if packing_station else "P1",
                dest_x=dst[0],
                dest_y=dst[1],
                priority=priority,
                priority_level=TaskPriority.to_level(priority),
                status=TaskStatus.QUEUED,
                created_at=self.env.time_step,
                estimated_distance=float(abs(src[0] - dst[0]) + abs(src[1] - dst[1])),
                estimated_completion_time=float(est_time)
            )
            self.pending_tasks.append(task)
            
            # Backwards-compatible Order object
            order = Order(
                id=task_id,
                product=product,
                priority=1 if priority == TaskPriority.HIGH else 3,
                timestamp=self.env.time_step,
                deadline=self.env.time_step + int(est_time * 2.5)
            )
            self.pending_orders.append(order)

    def add_custom_task(self, sku: str, priority_str: str, source: Tuple[int, int], destination: Tuple[int, int]) -> Task:
        """Create a user-defined task from UI."""
        p_map = {
            "HIGH": TaskPriority.HIGH,
            "NORMAL": TaskPriority.NORMAL,
            "LOW": TaskPriority.LOW
        }
        priority = p_map.get(priority_str.upper(), TaskPriority.NORMAL)
        task_id = f"TSK-{str(uuid.uuid4())[:6].upper()}"
        est_time = self._estimate_task_duration(source, destination)
        
        task = Task(
            id=task_id,
            sku=sku,
            product_name=sku,
            source_shelf_id="CUSTOM",
            source_x=source[0],
            source_y=source[1],
            dest_station_id="CUSTOM",
            dest_x=destination[0],
            dest_y=destination[1],
            priority=priority,
            priority_level=TaskPriority.to_level(priority),
            status=TaskStatus.QUEUED,
            created_at=self.env.time_step,
            estimated_distance=float(abs(source[0] - destination[0]) + abs(source[1] - destination[1])),
            estimated_completion_time=float(est_time)
        )
        self.pending_tasks.append(task)
        self.emit_event("TASK_CREATED", f"Task {task.id} ({task.sku}) created with priority {priority}", "INFO", {"task_id": task.id})
        return task

    def _estimate_task_duration(self, source: Tuple[int, int], destination: Tuple[int, int]) -> int:
        """Estimate delivery time using Manhattan distance and XGBoost performance KPI."""
        dist = abs(source[0] - destination[0]) + abs(source[1] - destination[1])
        base_ticks = max(10, dist * 2)
        
        if _xgb_inference is not None and self.zone_predictions:
            zone_id = self.env.get_zone_for_position(source[0], source[1])
            zone_info = self.zone_predictions.get(zone_id, {})
            kpi = zone_info.get("performance_kpi", 0.75)
            # Lower KPI or higher risk increases estimated duration
            multiplier = 1.0 + max(0.0, (1.0 - kpi) * 0.8)
            return int(base_ticks * multiplier)
        return int(base_ticks)

    def _update_xgb_zone_predictions(self):
        """Query XGBoost model for each zone to predict congestion risk and KPIs."""
        if _xgb_inference is None:
            return
        
        zone_stats = self.env.get_zone_statistics()
        for zone_id, stats in zone_stats.items():
            robot_count = stats.get("robot_count", 0)
            obstacles_count = stats.get("dynamic_obstacles", 0)
            
            # Map simulation metrics into XGBoost feature schema
            sim_input = {
                'stock_level': max(10, 80 - robot_count * 8),
                'reorder_point': 45,
                'reorder_frequency_days': 7,
                'lead_time_days': 4,
                'daily_demand': 15 + robot_count * 5,
                'demand_std_dev': 3,
                'item_popularity_score': 0.75,
                'picking_time_seconds': 30 + obstacles_count * 10,
                'handling_cost_per_unit': 1.2,
                'unit_price': 40,
                'holding_cost_per_unit_day': 0.4,
                'order_fulfillment_rate': 0.96 if obstacles_count == 0 else 0.82,
                'total_orders_last_month': 280,
                'turnover_ratio': 4.5,
                'layout_efficiency_score': 0.95 if obstacles_count == 0 else 0.65,
                'category': 'Electronics',
                'zone': zone_id[-1] if zone_id.startswith("Zone ") else "A"
            }
            try:
                res = _xgb_inference.predict(sim_input)
                self.zone_predictions[zone_id] = {
                    "risk_level": res.get("risk_level", "LOW"),
                    "stockout_probability": res.get("stockout_probability", 0.1),
                    "performance_kpi": res.get("performance_kpi", 0.85),
                    "demand_forecast": res.get("demand_forecast", 100.0)
                }
            except Exception as e:
                pass

    def check_battery_and_recharge(self):
        """Monitor battery levels and route low-battery AMRs to charging stations."""
        charging_stations = [s for s in self.env.stations if s.type == "charging"]
        
        for robot in self.env.robots:
            # If already charging, recharge
            if robot.status == "charging":
                robot.recharge(amount=1.0)
                if robot.battery >= 95.0:
                    # Fully recharged, undock
                    robot.status = "idle"
                    robot.current_task = None
                    # Free station
                    for s in charging_stations:
                        if s.occupied_by == robot.id:
                            s.occupied_by = None
                            s.status = StationStatus.AVAILABLE
                    self.emit_event(
                        "CHARGING_COMPLETE",
                        f"Robot {robot.id} charged to {round(robot.battery)}% and returned to fleet.",
                        "SUCCESS",
                        {"robot_id": robot.id, "battery": robot.battery}
                    )
                continue

            # If moving to charge, check if arrived
            if robot.status == "moving_to_charge":
                if not robot.path:
                    # Arrived at charging station
                    robot.status = "charging"
                    self.emit_event(
                        "CHARGING_STARTED",
                        f"Robot {robot.id} docked at charger. Battery: {round(robot.battery)}%.",
                        "INFO",
                        {"robot_id": robot.id}
                    )
                continue

            # Low battery emergency threshold (< 20%)
            if robot.battery < 20.0 and robot.status not in ["failed", "recovering", "moving_to_charge", "charging"]:
                # Abort or release active task if any
                if robot.current_task:
                    self._abort_and_requeue_task(robot)

                # Find best available charging station
                available_stations = [s for s in charging_stations if s.is_available or s.occupied_by == robot.id]
                if not available_stations:
                    # All charging stations occupied; pick closest one to queue at apron
                    target_station = min(charging_stations, key=lambda s: abs(robot.x - s.x) + abs(robot.y - s.y)) if charging_stations else None
                else:
                    target_station = min(available_stations, key=lambda s: abs(robot.x - s.x) + abs(robot.y - s.y))

                if target_station:
                    path = self.planner.plan((robot.x, robot.y), (target_station.x, target_station.y))
                    if path:
                        robot.path = path[1:] # steps to reach station
                        robot.status = "moving_to_charge"
                        robot.current_task = f"Charging at {target_station.id}"
                        target_station.status = StationStatus.OCCUPIED
                        target_station.occupied_by = robot.id
                        self.emit_event(
                            "BATTERY_LOW",
                            f"Robot {robot.id} battery low ({round(robot.battery)}%). Routing to charger {target_station.id}.",
                            "WARNING",
                            {"robot_id": robot.id, "station_id": target_station.id}
                        )

    def _abort_and_requeue_task(self, robot: Robot):
        """Release a robot's task back into the pending queue with boosted priority."""
        for t in list(self.active_tasks):
            if t.assigned_robot_id == robot.id:
                t.assigned_robot_id = None
                t.status = TaskStatus.PENDING
                t.priority = TaskPriority.HIGH # Boost priority due to disruption
                self.active_tasks.remove(t)
                self.pending_tasks.insert(0, t)
                self.emit_event(
                    "TASK_REQUEUED",
                    f"Task {t.id} unassigned from {robot.id} and requeued with HIGH priority.",
                    "WARNING",
                    {"task_id": t.id, "robot_id": robot.id}
                )
        robot.current_task = None

    def handle_robot_failure(self, robot_id: str):
        """Inject a hardware failure on a specific AMR."""
        robot = next((r for r in self.env.robots if r.id == robot_id), None)
        if not robot:
            return
        robot.fail()
        self._abort_and_requeue_task(robot)
        self.emit_event(
            "ROBOT_FAILED",
            f"CRITICAL: Robot {robot_id} suffered hardware failure at ({robot.x}, {robot.y})!",
            "ERROR",
            {"robot_id": robot_id, "x": robot.x, "y": robot.y}
        )

    def handle_robot_recovery(self, robot_id: str):
        """Recover a failed AMR back to healthy status."""
        robot = next((r for r in self.env.robots if r.id == robot_id), None)
        if not robot:
            return
        robot.recover()
        self.emit_event(
            "ROBOT_RECOVERED",
            f"Robot {robot_id} rebooted and restored to active duty.",
            "SUCCESS",
            {"robot_id": robot_id}
        )

    def age_pending_tasks(self):
        """Starvation prevention: age pending tasks; upgrade priority if waiting too long."""
        for task in self.pending_tasks:
            task.age()
            if task.starvation_counter >= 35 and task.priority == TaskPriority.LOW:
                task.priority = TaskPriority.NORMAL
                self.emit_event("PRIORITY_AGED", f"Task {task.id} priority promoted to NORMAL due to wait time.", "INFO")
            elif task.starvation_counter >= 70 and task.priority == TaskPriority.NORMAL:
                task.priority = TaskPriority.HIGH
                self.emit_event("PRIORITY_AGED", f"Task {task.id} priority promoted to HIGH (starvation prevention).", "WARNING")

    def dispatch_orders(self):
        """
        Intelligent Robot Assignment (Weighted Scoring Model).
        Score = w1*dist + w2*time + w3*zone_congestion + w4*(100-battery) + w5*workload
        Lowest score robot is assigned to highest priority task.
        """
        if not self.pending_tasks:
            return

        # Sort pending tasks: HIGH > NORMAL > LOW, then by starvation age descending
        def task_sort_key(t: Task):
            p_val = 0 if t.priority == TaskPriority.HIGH else 1 if t.priority == TaskPriority.NORMAL else 2
            return (p_val, -t.starvation_counter, t.created_at)

        self.pending_tasks.sort(key=task_sort_key)

        # Candidate robots: healthy, idle, battery > 20%
        available_robots = [
            r for r in self.env.robots 
            if r.health == RobotHealth.HEALTHY and r.status == "idle" and r.battery >= 20.0
        ]

        if not available_robots:
            return

        tasks_to_assign = list(self.pending_tasks)
        for task in tasks_to_assign:
            if not available_robots:
                break

            # Find best robot for this task
            best_robot = None
            best_score = float("inf")
            best_path = None

            for robot in available_robots:
                # 1. Manhattan Distance
                dist = abs(robot.x - task.source[0]) + abs(robot.y - task.source[1])
                
                # 2. Zone Congestion Cost
                zone_id = self.env.get_zone_for_position(task.source[0], task.source[1])
                zone_pred = self.zone_predictions.get(zone_id, {})
                risk_level = zone_pred.get("risk_level", "LOW")
                zone_cost = 6.0 if risk_level == "HIGH" else 2.5 if risk_level == "MEDIUM" else 0.0
                
                # 3. Battery Drain Penalty (prefer AMRs with plentiful charge)
                battery_penalty = max(0.0, (100.0 - robot.battery) * 0.15)
                
                # 4. Workload Penalty
                workload_penalty = robot.replans_count * 0.2

                total_score = (dist * 1.2) + zone_cost + battery_penalty + workload_penalty

                if total_score < best_score:
                    # Verify path exists
                    path = self.planner.plan((robot.x, robot.y), task.source)
                    if path:
                        best_score = total_score
                        best_robot = robot
                        best_path = path

            if best_robot and best_path:
                self.pending_tasks.remove(task)
                available_robots.remove(best_robot)
                
                task.status = TaskStatus.ASSIGNED
                task.assigned_robot_id = best_robot.id
                task.started_at = self.env.time_step
                self.active_tasks.append(task)
                
                best_robot.current_task = f"Pick {task.sku}"
                best_robot.target_x = task.source[0]
                best_robot.target_y = task.source[1]
                best_robot.path = best_path[1:] # Step along path
                best_robot.status = "moving_to_shelf"
                
                self.emit_event(
                    "TASK_ASSIGNED",
                    f"Assigned {task.sku} [{task.priority}] to {best_robot.id} (Score: {round(best_score, 1)}).",
                    "INFO",
                    {"task_id": task.id, "robot_id": best_robot.id, "score": round(best_score, 1)}
                )

    def update_robot_states(self):
        """Advance tasks through picking, transport to packing station, and fulfillment."""
        packing_stations = [s for s in self.env.stations if s.type == "packing"]
        default_packing = packing_stations[0] if packing_stations else None

        for robot in self.env.robots:
            if robot.health != RobotHealth.HEALTHY:
                continue

            # Moving to pick up shelf item
            if robot.status == "moving_to_shelf":
                if not robot.path: # Arrived at pickup position
                    robot.status = "picking"
                    robot.wait_counter = 2 # 2 ticks to pick inventory

            elif robot.status == "picking":
                robot.wait_counter -= 1
                if robot.wait_counter <= 0:
                    # Item picked! Find destination (packing station)
                    task = next((t for t in self.active_tasks if t.assigned_robot_id == robot.id), None)
                    dest = task.destination if task else ((default_packing.x, default_packing.y) if default_packing else (5, 0))
                    
                    path = self.planner.plan((robot.x, robot.y), dest)
                    if path:
                        robot.path = path[1:]
                        robot.status = "moving_to_packing"
                        robot.target_x = dest[0]
                        robot.target_y = dest[1]
                        robot.current_task = f"Deliver {task.sku if task else 'Item'}"
                        if task:
                            task.status = TaskStatus.IN_TRANSIT
                        self.emit_event(
                            "ITEM_PICKED",
                            f"Robot {robot.id} picked item. Delivering to station.",
                            "INFO",
                            {"robot_id": robot.id}
                        )

            elif robot.status == "moving_to_packing":
                if not robot.path: # Arrived at packing station
                    robot.status = "idle"
                    robot.current_task = None
                    robot.completed_tasks += 1
                    
                    # Mark task as completed
                    task = next((t for t in self.active_tasks if t.assigned_robot_id == robot.id), None)
                    if task:
                        task.status = TaskStatus.COMPLETED
                        task.completed_at = self.env.time_step
                        task.actual_duration = task.completed_at - (task.started_at or task.created_at)
                        self.active_tasks.remove(task)
                        self.completed_tasks.append(task)
                        
                        # Also record in backwards-compatible orders
                        for o in self.pending_orders:
                            if o.id == task.id:
                                o.status = "completed"
                                o.completion_time = self.env.time_step
                                self.completed_orders.append(o)
                                self.pending_orders.remove(o)
                                break
                                
                        self.emit_event(
                            "ORDER_FULFILLED",
                            f"Order {task.id} ({task.sku}) fulfilled by {robot.id} in {task.actual_duration} ticks!",
                            "SUCCESS",
                            {"task_id": task.id, "robot_id": robot.id, "duration": task.actual_duration}
                        )

    def step(self):
        """Execute one complete coordinated simulation tick."""
        # 1. Update XGBoost predictions every 10 ticks
        if self.env.time_step - self.last_xgb_update_tick >= 10:
            self._update_xgb_zone_predictions()
            self.last_xgb_update_tick = self.env.time_step

        # 2. Advance dynamic obstacles in environment
        self.env.step()

        # 3. Check battery status and route to chargers if low
        self.check_battery_and_recharge()

        # 4. Age pending tasks (anti-starvation)
        self.age_pending_tasks()

        # 5. Dispatch pending tasks using intelligent scoring
        self.dispatch_orders()

        # 6. Coordinate multi-robot collision-free motion
        coord_events = self.coordinator.coordinate_step()
        for ce in coord_events:
            self.emit_event(ce.get("type", "COORDINATION"), ce.get("message", ""), ce.get("severity", "INFO"), ce.get("details", {}))

        # 7. Update picking, packing, completion transitions
        self.update_robot_states()

