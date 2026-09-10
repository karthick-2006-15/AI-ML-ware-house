import json
import asyncio
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import sys
import os

# Ensure root path is in sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from simulation.environment import WarehouseEnv
from simulation.entities import Station, Product, Shelf, Robot
from ml_engine.order_manager import OrderManager

app = FastAPI(title="Warehouse Simulation API")

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
        self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                print(f"Error sending to connection: {e}")

manager = ConnectionManager()
simulation_task = None
simulation_running = False

def setup_env():
    env = WarehouseEnv(width=10, height=10, seed=42)
    env.add_station(Station(id="P1", x=5, y=0, type="packing"))
    env.add_station(Station(id="C1", x=0, y=9, type="charging"))
    env.add_station(Station(id="C2", x=9, y=9, type="charging"))
    
    products = [Product(id=f"PROD_{i}", name=f"Product {i}") for i in range(50)]
    
    # 20 Shelves
    shelf_coords = []
    for x in [2, 3, 6, 7]:
        for y in range(2, 7):
            shelf_coords.append((x, y))
            
    for idx, (x, y) in enumerate(shelf_coords):
        shelf = Shelf(id=f"S_{idx}", x=x, y=y)
        # Distribute all products across the 20 shelves
        shelf.products = [products[p_idx] for p_idx in range(len(products)) if p_idx % len(shelf_coords) == idx]
        env.add_shelf(shelf)
            
    for i in range(5):
        env.add_robot(Robot(id=f"R{i}", x=1+i*2, y=8))
        
    return env, products

from simulation.metrics import MetricsCollector

async def run_simulation_loop():
    global simulation_running
    env, products = setup_env()
    order_manager = OrderManager(env)
    order_manager.generate_random_orders(50, products)
    
    metrics = MetricsCollector()
    
    while simulation_running:
        if len(order_manager.pending_orders) < 10:
            order_manager.generate_random_orders(25, products)

        order_manager.dispatch_orders()
        congestion = env.step()
        
        for _ in range(congestion):
            metrics.record_collision()
            
        for r in env.robots:
            if r.status == 'charging' and r.battery >= 99.0:
                metrics.record_charging_event()
                
        order_manager.update_robot_states()
        
        metrics.record_step(env, order_manager.completed_orders)
        
        # Serialize state and metrics with real paths and tasks
        state = {
            "tick": env.time_step,
            "robots": [
                {
                    "id": r.id,
                    "x": r.x,
                    "y": r.y,
                    "state": r.status,
                    "battery": round(r.battery, 1),
                    "path": list(r.path) if hasattr(r, 'path') and r.path else [],
                    "task": r.current_task if hasattr(r, 'current_task') else None
                }
                for r in env.robots
            ],
            "shelves": [{"id": s.id, "x": s.x, "y": s.y} for s in env.shelves],
            "stations": [{"id": s.id, "x": s.x, "y": s.y, "type": s.type} for s in env.stations],
            "metrics": metrics.get_metrics()
        }
        
        await manager.broadcast(state)
        await asyncio.sleep(0.3) # Realistic 300ms per grid transition

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Warehouse API is running"}

@app.post("/simulation/start")
async def start_simulation():
    global simulation_running, simulation_task
    if not simulation_running:
        simulation_running = True
        simulation_task = asyncio.create_task(run_simulation_loop())
    return {"status": "started"}

@app.post("/simulation/stop")
async def stop_simulation():
    global simulation_running
    simulation_running = False
    return {"status": "stopped"}

@app.post("/simulation/reset")
async def reset_simulation():
    global simulation_running, simulation_task
    simulation_running = False
    if simulation_task:
        simulation_task.cancel()
        simulation_task = None
    env, _ = setup_env()
    state = {
        "tick": 0,
        "robots": [
            {
                "id": r.id,
                "x": r.x,
                "y": r.y,
                "state": "idle",
                "battery": 100.0,
                "path": [],
                "task": None
            }
            for r in env.robots
        ],
        "shelves": [{"id": s.id, "x": s.x, "y": s.y} for s in env.shelves],
        "stations": [{"id": s.id, "x": s.x, "y": s.y, "type": s.type} for s in env.stations],
        "metrics": {
            "completed_orders": 0,
            "average_fulfillment_time": 0.0,
            "total_distance": 0.0,
            "collisions": 0,
            "charging_events": 0,
            "average_battery": 100.0,
            "utilization": 0.0
        }
    }
    await manager.broadcast(state)
    return {"status": "reset", "state": state}

@app.websocket("/ws/state")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
