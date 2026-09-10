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
        if idx < len(products):
            shelf.products.append(products[idx])
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
        order_manager.dispatch_orders()
        congestion = env.step()
        
        for _ in range(congestion):
            metrics.record_collision()
            
        for r in env.robots:
            if r.status == 'charging' and r.battery == 100.0:
                # Count when charge completes
                metrics.record_charging_event()
                
        order_manager.update_robot_states()
        
        metrics.record_step(env, order_manager.completed_orders)
        
        # Serialize state and metrics
        state = {
            "tick": env.time_step,
            "robots": [{"id": r.id, "x": r.x, "y": r.y, "state": r.status, "battery": round(r.battery, 1)} for r in env.robots],
            "shelves": [{"id": s.id, "x": s.x, "y": s.y} for s in env.shelves],
            "stations": [{"id": s.id, "x": s.x, "y": s.y, "type": s.type} for s in env.stations],
            "metrics": metrics.get_metrics()
        }
        
        await manager.broadcast(state)
        await asyncio.sleep(0.1) # 10 ticks per second

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

@app.websocket("/ws/state")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
