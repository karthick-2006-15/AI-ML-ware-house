from typing import Dict, Any, List
from simulation.entities import Robot, Station, Shelf, Product, DynamicObstacle, TaskPriority, RobotHealth
from simulation.environment import WarehouseEnv

SCENARIOS_CATALOG = [
    {
        "id": "NORMAL_OPERATION",
        "name": "Normal Operation",
        "description": "Balanced warehouse workload with 5 AMRs, steady picking orders, and optimal traffic flow.",
        "category": "Baseline",
        "badge": "Standard"
    },
    {
        "id": "HEAVY_TRAFFIC",
        "name": "Heavy Traffic Congestion",
        "description": "High-density fleet (8 AMRs) fulfilling concurrent orders in tight aisles; tests dynamic collision avoidance.",
        "category": "Stress Test",
        "badge": "High Load"
    },
    {
        "id": "BLOCKED_AISLE",
        "name": "Blocked Aisle & Rerouting",
        "description": "Sudden pallet spill / barrier blocks central thoroughfare; AMRs calculate dynamic A* detours in real-time.",
        "category": "Obstacle Avoidance",
        "badge": "Dynamic"
    },
    {
        "id": "LOW_BATTERY",
        "name": "Low Battery Fleet Cascade",
        "description": "Multiple AMRs drop below 20% threshold simultaneously; autonomous priority queueing at charging docks.",
        "category": "Power Management",
        "badge": "Autonomous"
    },
    {
        "id": "ROBOT_FAILURE",
        "name": "Robot Hardware Breakdown",
        "description": "AMR-1 suffers simulated motor stall; active inventory task is instantly recovered and reassigned to AMR-2.",
        "category": "Fault Tolerance",
        "badge": "Failover"
    },
    {
        "id": "MULTIPLE_ORDERS",
        "name": "High-Priority Order Surge",
        "description": "Sudden arrival of 15 urgent HIGH priority orders; tests priority queueing and starvation prevention.",
        "category": "Order Dispatch",
        "badge": "Surge"
    },
    {
        "id": "CHARGING_STATION_BUSY",
        "name": "Charging Dock Contention",
        "description": "Only 1 charging station operational with 4 low-battery AMRs; tests orderly waiting and apron queueing.",
        "category": "Resource Contention",
        "badge": "Bottleneck"
    },
    {
        "id": "MULTI_ROBOT_CONFLICT",
        "name": "Narrow Corridor Head-On Conflict",
        "description": "Two AMRs traveling in opposite directions in a 1-tile corridor; coordinator negotiates right-of-way and lateral yield.",
        "category": "Conflict Avoidance",
        "badge": "Head-On"
    },
    {
        "id": "DEADLOCK_TEST",
        "name": "Deadlock Detection & Resolution",
        "description": "Four AMRs converge on a 4-way intersection in cyclic lock; deadlock detector injects evasion waypoints.",
        "category": "Deadlock Resolution",
        "badge": "Deadlock"
    }
]

def apply_scenario(scenario_id: str, env: WarehouseEnv, order_manager, products: List[Product]) -> Dict[str, Any]:
    """Applies specific setup configurations, robot positions, tasks, or obstacles for the scenario."""
    env.clear_dynamic_obstacles()
    order_manager.pending_tasks.clear()
    order_manager.active_tasks.clear()
    order_manager.pending_orders.clear()
    
    # Reset robot states
    for r in env.robots:
        r.status = "idle"
        r.health = RobotHealth.HEALTHY
        r.health_percent = 100.0
        r.path = []
        r.current_task = None
        r.current_task_obj = None
        r.wait_counter = 0

    if scenario_id == "NORMAL_OPERATION" or scenario_id == "normal":
        # 5 robots, normal battery, generate 20 orders
        order_manager.generate_random_orders(20, products)
        order_manager.emit_event("SCENARIO_LOADED", "Scenario: Normal Operation loaded with 5 AMRs.", "INFO")

    elif scenario_id == "HEAVY_TRAFFIC" or scenario_id == "high_demand":
        # Add extra robots if needed to make 8 robots
        while len(env.robots) < 8:
            new_id = f"R{len(env.robots)}"
            spawn_x = (len(env.robots) * 2) % env.width
            spawn_y = 1 if len(env.robots) >= 5 else 8
            env.add_robot(Robot(id=new_id, x=spawn_x, y=spawn_y))
        order_manager.generate_random_orders(40, products)
        order_manager.emit_event("SCENARIO_LOADED", "Scenario: Heavy Traffic Congestion loaded (8 AMRs, 40 orders).", "WARNING")

    elif scenario_id == "BLOCKED_AISLE" or scenario_id == "warehouse_blockage":
        # Spawn dynamic obstacles in main north-south corridor (x=4 and x=5, y=3 and y=4)
        env.add_dynamic_obstacle(4, 3, duration=60, obstacle_type="spill")
        env.add_dynamic_obstacle(5, 3, duration=60, obstacle_type="barrier")
        order_manager.generate_random_orders(25, products)
        order_manager.emit_event("SCENARIO_LOADED", "Scenario: Blocked Aisle. Pallet spill & barrier dropped at (4,3) & (5,3)!", "WARNING")

    elif scenario_id == "LOW_BATTERY":
        # Drop all robots to 14%-22% battery
        for i, r in enumerate(env.robots):
            r.battery = 14.0 + (i * 2.0)
        order_manager.emit_event("SCENARIO_LOADED", "Scenario: Low Battery Cascade. AMRs set to critical battery levels.", "WARNING")

    elif scenario_id == "ROBOT_FAILURE" or scenario_id == "robot_failure":
        # Generate orders, assign tasks, then fail R1
        order_manager.generate_random_orders(15, products)
        order_manager.dispatch_orders()
        if len(env.robots) > 1:
            failed_robot = env.robots[1]
            order_manager.handle_robot_failure(failed_robot.id)
        order_manager.emit_event("SCENARIO_LOADED", "Scenario: Robot Breakdown. AMR-1 hardware failure triggered!", "ERROR")

    elif scenario_id == "MULTIPLE_ORDERS" or scenario_id == "peak_season":
        # Surge of high-priority tasks
        order_manager.generate_random_orders(20, products)
        for t in order_manager.pending_tasks[:12]:
            t.priority = TaskPriority.HIGH
            t.priority_level = 3
        order_manager.emit_event("SCENARIO_LOADED", "Scenario: High-Priority Order Surge loaded (12 urgent orders).", "INFO")

    elif scenario_id == "CHARGING_STATION_BUSY" or scenario_id == "charging_congestion":
        # Keep only 1 charging station, drop 4 robots below 20%
        for i, r in enumerate(env.robots[:4]):
            r.battery = 15.0 + (i * 1.5)
        # Mark second station offline if present
        charging_stations = [s for s in env.stations if s.type == "charging"]
        if len(charging_stations) > 1:
            charging_stations[1].status = "OFFLINE"
        order_manager.emit_event("SCENARIO_LOADED", "Scenario: Charging Dock Contention. 1 active charger for 4 low-battery AMRs.", "WARNING")

    elif scenario_id == "MULTI_ROBOT_CONFLICT":
        # Place 2 robots on opposite sides of a single open lane (e.g. aisle x=4)
        if len(env.robots) >= 2:
            r0 = env.robots[0]
            r1 = env.robots[1]
            r0.x, r0.y = 4, 1
            r1.x, r1.y = 4, 7
            r0.path = [(4, 2), (4, 3), (4, 4), (4, 5), (4, 6), (4, 7)]
            r1.path = [(4, 6), (4, 5), (4, 4), (4, 3), (4, 2), (4, 1)]
            r0.status = "moving_to_shelf"
            r1.status = "moving_to_shelf"
            r0.current_task = "North-South Transit"
            r1.current_task = "South-North Transit"
            order_manager.emit_event("SCENARIO_LOADED", "Scenario: Narrow Corridor Head-On Conflict. R0 at (4,1) and R1 at (4,7) moving head-on.", "WARNING")

    elif scenario_id == "DEADLOCK_TEST":
        # Place 4 robots at 4-way intersection (x=4..5, y=4..5)
        if len(env.robots) >= 4:
            positions = [(4, 3), (6, 4), (5, 6), (3, 5)]
            destinations = [(4, 6), (2, 4), (5, 3), (7, 5)]
            for i in range(4):
                r = env.robots[i]
                r.x, r.y = positions[i]
                path = order_manager.planner.plan((r.x, r.y), destinations[i])
                if path:
                    r.path = path[1:]
                r.status = "moving_to_shelf"
                r.current_task = f"Cross intersection to {destinations[i]}"
            order_manager.emit_event("SCENARIO_LOADED", "Scenario: Deadlock Test loaded. 4 AMRs converging on central junction.", "WARNING")

    return {
        "status": "applied",
        "scenario_id": scenario_id
    }

def get_scenario_config(scenario_name: str) -> Dict[str, Any]:
    """Preserved for backwards compatibility with legacy tests"""
    return {
        "order_arrival_rate": 10,
        "product_demand_skew": False,
        "robot_failure_prob": 0.0,
        "charging_stations": 2,
        "blockage": False
    }
