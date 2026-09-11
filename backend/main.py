import json
import asyncio
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import sys
import os

# Ensure root path is in sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from simulation.environment import WarehouseEnv
from simulation.entities import Station, Product, Shelf, Robot, DynamicObstacle, StationStatus, RobotHealth, TaskPriority
from simulation.scenarios import SCENARIOS_CATALOG, apply_scenario
from simulation.metrics import MetricsCollector
from ml_engine.order_manager import OrderManager

app = FastAPI(title="Autonomous Warehouse AI Simulation API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from backend.api_ml import ml_router
app.include_router(ml_router)

class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        dead_conns = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                dead_conns.append(connection)
        for dc in dead_conns:
            self.disconnect(dc)

manager = ConnectionManager()

# Global Simulation State
current_env: Optional[WarehouseEnv] = None
current_order_manager: Optional[OrderManager] = None
current_metrics: Optional[MetricsCollector] = None
current_products: List[Product] = []

simulation_task: Optional[asyncio.Task] = None
simulation_running: bool = False
simulation_speed: float = 1.0

def setup_env():
    global current_env, current_order_manager, current_metrics, current_products
    env = WarehouseEnv(width=10, height=10, seed=42)
    env.add_station(Station(id="P1", x=5, y=0, type="packing"))
    env.add_station(Station(id="C1", x=0, y=9, type="charging"))
    env.add_station(Station(id="C2", x=9, y=9, type="charging"))
    
    categories = ["Electronics", "Automotive", "Apparel", "Industrial"]
    products = [
        Product(
            id=f"PROD_{i:02d}",
            name=f"SKU-{100+i}",
            category=categories[i % len(categories)],
            demand_frequency=0.9 if i % 5 == 0 else 0.4
        ) 
        for i in range(40)
    ]
    
    # 20 Shelves
    shelf_coords = []
    for x in [2, 3, 6, 7]:
        for y in range(2, 7):
            shelf_coords.append((x, y))
            
    for idx, (x, y) in enumerate(shelf_coords):
        shelf = Shelf(id=f"S_{idx}", x=x, y=y)
        shelf.products = [products[p_idx] for p_idx in range(len(products)) if p_idx % len(shelf_coords) == idx]
        env.add_shelf(shelf)
            
    for i in range(5):
        env.add_robot(Robot(id=f"R{i}", x=1 + i * 2, y=8))
        
    current_env = env
    current_products = products
    current_order_manager = OrderManager(env)
    current_order_manager.generate_random_orders(30, products)
    current_metrics = MetricsCollector()
    
    return env, current_order_manager, current_metrics, products

def build_state_payload() -> dict:
    """Serializes complete multi-robot simulation state, metrics, zone intelligence, and events"""
    global current_env, current_order_manager, current_metrics, simulation_running, simulation_speed
    if not current_env or not current_order_manager or not current_metrics:
        setup_env()

    env = current_env
    om = current_order_manager
    metrics = current_metrics

    # Zone stats enriched with XGBoost predictions
    zone_stats = env.get_zone_statistics()
    if om.zone_predictions:
        for z_key, z_info in zone_stats.items():
            pred = om.zone_predictions.get(z_key, {})
            z_info["xgb_risk"] = pred.get("risk_level", z_info["congestion"])
            z_info["performance_kpi"] = pred.get("performance_kpi", 0.85)
            z_info["demand_forecast"] = pred.get("demand_forecast", 100.0)

    robots_data = [
        {
            "id": r.id,
            "x": r.x,
            "y": r.y,
            "state": r.status,
            "health": r.health,
            "health_percent": getattr(r, 'health_percent', 100.0),
            "battery": round(r.battery, 1),
            "speed": r.speed,
            "path": list(r.path) if hasattr(r, 'path') and r.path else [],
            "task": r.current_task if hasattr(r, 'current_task') else None,
            "accumulated_distance": round(r.accumulated_distance, 1),
            "completed_tasks": r.completed_tasks,
            "replans_count": r.replans_count,
            "conflicts_avoided": r.conflicts_avoided,
            "wait_counter": r.wait_counter
        }
        for r in env.robots
    ]

    shelves_data = [
        {
            "id": s.id,
            "x": s.x,
            "y": s.y,
            "zone": s.zone,
            "products_count": len(s.products),
            "category": s.products[0].category if s.products else "General"
        } 
        for s in env.shelves
    ]

    stations_data = [
        {
            "id": s.id,
            "x": s.x,
            "y": s.y,
            "type": s.type,
            "status": s.status,
            "occupied_by": s.occupied_by
        }
        for s in env.stations
    ]

    dynamic_obstacles_data = [
        {
            "id": o.id,
            "x": o.x,
            "y": o.y,
            "duration": o.duration,
            "obstacle_type": o.obstacle_type
        }
        for o in env.dynamic_obstacles
    ]

    tasks_data = {
        "pending": [t.to_dict() for t in om.pending_tasks[:25]],
        "active": [t.to_dict() for t in om.active_tasks]
    }

    events = om.pop_events()

    return {
        "tick": env.time_step,
        "running": simulation_running,
        "speed": simulation_speed,
        "robots": robots_data,
        "shelves": shelves_data,
        "stations": stations_data,
        "dynamic_obstacles": dynamic_obstacles_data,
        "static_obstacles": [{"x": x, "y": y} for (x, y) in env.static_obstacles],
        "zones": zone_stats,
        "tasks": tasks_data,
        "events": events,
        "metrics": metrics.get_metrics(env, om)
    }

async def run_simulation_loop():
    global simulation_running, simulation_speed, current_env, current_order_manager, current_metrics, current_products
    
    while simulation_running:
        if current_order_manager and len(current_order_manager.pending_tasks) < 8:
            current_order_manager.generate_random_orders(15, current_products)

        # Execute coordinated simulation tick
        if current_order_manager:
            current_order_manager.step()

        # Update real metrics
        if current_metrics and current_env and current_order_manager:
            current_metrics.record_step(current_env, current_order_manager)

        # Broadcast state to all WebSocket clients
        state = build_state_payload()
        await manager.broadcast(state)

        # Sleep adjusted by simulation speed multiplier
        base_delay = 0.3
        delay = max(0.03, base_delay / max(0.1, simulation_speed))
        await asyncio.sleep(delay)

# --- Pydantic Request Models ---
class SpeedRequest(BaseModel):
    speed: float

class ScenarioRequest(BaseModel):
    scenario_id: str

class ObstacleRequest(BaseModel):
    x: int
    y: int
    duration: int = -1
    obstacle_type: str = "barrier"

class DeleteObstacleRequest(BaseModel):
    x: Optional[int] = None
    y: Optional[int] = None

class EditRequest(BaseModel):
    action: str  # "place" or "delete"
    type: str    # "shelf", "packing_station", "charging_station", "robot", "obstacle"
    x: int
    y: int

class TaskRequest(BaseModel):
    sku: str = "Premium Item"
    priority: str = "NORMAL"
    source_x: Optional[int] = None
    source_y: Optional[int] = None
    dest_x: Optional[int] = None
    dest_y: Optional[int] = None

class RobotActionRequest(BaseModel):
    robot_id: str

# --- REST Endpoints ---
@app.get("/")
def read_root():
    return {"status": "ok", "message": "Autonomous Warehouse AI Simulation API is online"}

@app.get("/simulation/state")
def get_simulation_state():
    return build_state_payload()

@app.post("/simulation/start")
async def start_simulation():
    global simulation_running, simulation_task
    if current_env is None:
        setup_env()
    if not simulation_running:
        simulation_running = True
        simulation_task = asyncio.create_task(run_simulation_loop())
    state = build_state_payload()
    await manager.broadcast(state)
    return {"status": "started", "running": True}

@app.post("/simulation/stop")
async def stop_simulation():
    global simulation_running
    simulation_running = False
    state = build_state_payload()
    await manager.broadcast(state)
    return {"status": "stopped", "running": False}

@app.post("/simulation/step")
async def step_simulation():
    """Manual single-step execution for debugging / demonstration"""
    global current_env, current_order_manager, current_metrics, current_products
    if current_env is None:
        setup_env()
        
    if current_order_manager and len(current_order_manager.pending_tasks) < 5:
        current_order_manager.generate_random_orders(10, current_products)
        
    if current_order_manager:
        current_order_manager.step()
        
    if current_metrics and current_env and current_order_manager:
        current_metrics.record_step(current_env, current_order_manager)
        
    state = build_state_payload()
    await manager.broadcast(state)
    return {"status": "stepped", "tick": state["tick"]}

@app.post("/simulation/reset")
async def reset_simulation():
    global simulation_running, simulation_task
    simulation_running = False
    if simulation_task:
        simulation_task.cancel()
        simulation_task = None
    setup_env()
    state = build_state_payload()
    await manager.broadcast(state)
    return {"status": "reset", "state": state}

@app.post("/simulation/speed")
async def set_speed(req: SpeedRequest):
    global simulation_speed
    simulation_speed = max(0.2, min(10.0, req.speed))
    state = build_state_payload()
    await manager.broadcast(state)
    return {"status": "speed_updated", "speed": simulation_speed}

@app.get("/simulation/scenarios")
def get_scenarios():
    return {"scenarios": SCENARIOS_CATALOG}

@app.post("/simulation/scenario")
async def load_scenario(req: ScenarioRequest):
    global current_env, current_order_manager, current_products
    if current_env is None:
        setup_env()
    res = apply_scenario(req.scenario_id, current_env, current_order_manager, current_products)
    state = build_state_payload()
    await manager.broadcast(state)
    return res

@app.post("/simulation/obstacle")
async def add_obstacle(req: ObstacleRequest):
    global current_env, current_order_manager
    if current_env is None:
        setup_env()
    obs = current_env.add_dynamic_obstacle(req.x, req.y, req.duration, req.obstacle_type)
    if not obs:
        raise HTTPException(status_code=400, detail="Cannot place obstacle at this location.")
    if current_order_manager:
        current_order_manager.emit_event(
            "DYNAMIC_OBSTACLE",
            f"Dynamic obstacle ({req.obstacle_type}) dropped at ({req.x}, {req.y}). AMRs recalculating paths.",
            "WARNING",
            {"x": req.x, "y": req.y}
        )
    state = build_state_payload()
    await manager.broadcast(state)
    return {"status": "created", "obstacle": {"id": obs.id, "x": obs.x, "y": obs.y}}

@app.delete("/simulation/obstacle")
async def remove_obstacle(req: DeleteObstacleRequest):
    global current_env, current_order_manager
    if current_env is None:
        return {"status": "no_env"}
    if req.x is not None and req.y is not None:
        removed = current_env.remove_dynamic_obstacle(req.x, req.y)
        if current_order_manager and removed:
            current_order_manager.emit_event("OBSTACLE_CLEARED", f"Obstacle at ({req.x}, {req.y}) cleared.", "INFO")
    else:
        current_env.clear_dynamic_obstacles()
        if current_order_manager:
            current_order_manager.emit_event("OBSTACLE_CLEARED", "All dynamic obstacles cleared from floor.", "INFO")
    state = build_state_payload()
    await manager.broadcast(state)
    return {"status": "cleared"}

@app.post("/simulation/edit")
async def edit_warehouse(req: EditRequest):
    """Interactive Warehouse Editor endpoint for adding/deleting elements"""
    global current_env, current_order_manager, current_products
    if current_env is None:
        setup_env()
    
    if req.action == "place":
        valid, msg = current_env.can_place(req.x, req.y, req.type)
        if not valid:
            raise HTTPException(status_code=400, detail=msg)
            
        if req.type == "shelf":
            s_id = f"S_{req.x}_{req.y}"
            new_shelf = Shelf(id=s_id, x=req.x, y=req.y)
            if current_products:
                new_shelf.products = [current_products[len(current_env.shelves) % len(current_products)]]
            current_env.add_shelf(new_shelf)
        elif req.type == "packing_station":
            current_env.add_station(Station(id=f"P_{req.x}_{req.y}", x=req.x, y=req.y, type="packing"))
        elif req.type == "charging_station":
            current_env.add_station(Station(id=f"C_{req.x}_{req.y}", x=req.x, y=req.y, type="charging"))
        elif req.type == "robot":
            current_env.add_robot(Robot(id=f"R{len(current_env.robots)}", x=req.x, y=req.y))
        elif req.type == "obstacle":
            current_env.static_obstacles.append((req.x, req.y))
            current_env.grid[req.y, req.x] = 4
            
        if current_order_manager:
            current_order_manager.emit_event("WAREHOUSE_EDIT", f"Placed {req.type} at ({req.x}, {req.y}).", "INFO")

    elif req.action == "delete":
        res = current_env.delete_at(req.x, req.y)
        if res.get("status") == "error":
            raise HTTPException(status_code=400, detail=res.get("message"))
        if current_order_manager:
            current_order_manager.emit_event("WAREHOUSE_EDIT", f"Removed object at ({req.x}, {req.y}).", "INFO")
            
    state = build_state_payload()
    await manager.broadcast(state)
    return {"status": "success", "action": req.action, "type": req.type, "x": req.x, "y": req.y}

@app.post("/simulation/task")
async def create_custom_task(req: TaskRequest):
    global current_env, current_order_manager
    if current_env is None:
        setup_env()
    
    src = (req.source_x if req.source_x is not None else 2, req.source_y if req.source_y is not None else 2)
    dst = (req.dest_x if req.dest_x is not None else 5, req.dest_y if req.dest_y is not None else 0)
    
    task = current_order_manager.add_custom_task(req.sku, req.priority, src, dst)
    state = build_state_payload()
    await manager.broadcast(state)
    return {"status": "created", "task": task.to_dict()}

@app.post("/simulation/robot/fail")
async def fail_robot(req: RobotActionRequest):
    global current_order_manager
    if current_order_manager:
        current_order_manager.handle_robot_failure(req.robot_id)
        state = build_state_payload()
        await manager.broadcast(state)
        return {"status": "failed", "robot_id": req.robot_id}
    return {"status": "error"}

@app.post("/simulation/robot/recover")
async def recover_robot(req: RobotActionRequest):
    global current_order_manager
    if current_order_manager:
        current_order_manager.handle_robot_recovery(req.robot_id)
        state = build_state_payload()
        await manager.broadcast(state)
        return {"status": "recovered", "robot_id": req.robot_id}
    return {"status": "error"}

@app.post("/simulation/robot/charge")
async def force_charge_robot(req: RobotActionRequest):
    global current_env, current_order_manager
    if current_env and current_order_manager:
        robot = next((r for r in current_env.robots if r.id == req.robot_id), None)
        if robot:
            robot.battery = 15.0 # Trigger immediate auto-charge
            current_order_manager.emit_event("CHARGE_COMMAND", f"Manual charge order issued for {req.robot_id}.", "WARNING")
            state = build_state_payload()
            await manager.broadcast(state)
            return {"status": "charge_initiated", "robot_id": req.robot_id}
    return {"status": "error"}

@app.websocket("/ws/state")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        # Send initial state snapshot immediately upon connection
        init_state = build_state_payload()
        await websocket.send_json(init_state)
        while True:
            data = await websocket.receive_text()
            # Handle incoming client commands over WS if any
            try:
                cmd = json.loads(data)
                if cmd.get("type") == "PING":
                    await websocket.send_json({"type": "PONG"})
            except Exception:
                pass
    except WebSocketDisconnect:
        manager.disconnect(websocket)
