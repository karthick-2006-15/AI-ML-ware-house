import sys
import os
import argparse
import time

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from simulation.environment import WarehouseEnv
from simulation.entities import Station, Product, Shelf, Robot
from simulation.metrics import MetricsCollector
from simulation.scenarios import get_scenario_config
from simulation.data_logger import DataLogger
from ml_engine.order_manager import OrderManager

def setup_scenario_env(config, seed):
    env = WarehouseEnv(width=10, height=10, seed=seed)
    
    # Add packing station
    env.add_station(Station(id="P1", x=5, y=0, type="packing"))
    
    # Add charging stations based on config
    num_chargers = config.get("charging_stations", 2)
    if num_chargers >= 1:
        env.add_station(Station(id="C1", x=0, y=9, type="charging"))
    if num_chargers >= 2:
        env.add_station(Station(id="C2", x=9, y=9, type="charging"))
        
    products = [Product(id=f"PROD_{i}", name=f"Product {i}") for i in range(50)]
    
    if config.get("product_demand_skew"):
        # Make one product extremely popular
        products[0].demand_frequency = 0.9
        for p in products[1:]:
            p.demand_frequency = 0.05
    
    shelf_coords = []
    for x in [2, 3, 6, 7]:
        for y in range(2, 7):
            shelf_coords.append((x, y))
            
    for idx, (x, y) in enumerate(shelf_coords):
        shelf = Shelf(id=f"S_{idx}", x=x, y=y)
        if idx < len(products):
            shelf.products.append(products[idx])
        env.add_shelf(shelf)
        
    if config.get("blockage"):
        # Add a fake shelf to block the main vertical aisle at x=4
        env.add_shelf(Shelf(id="BLOCKAGE", x=4, y=4))
            
    for i in range(5):
        env.add_robot(Robot(id=f"R{i}", x=1+i*2, y=8))
        
    return env, products

def run_generation(scenario: str, ticks: int, seed: int):
    config = get_scenario_config(scenario)
    output_dir = os.path.join("data", "raw", scenario)
    
    env, products = setup_scenario_env(config, seed)
    order_manager = OrderManager(env)
    metrics = MetricsCollector()
    logger = DataLogger(output_dir)
    
    # Initial batch
    order_manager.generate_random_orders(10, products)
    
    print(f"Generating dataset for scenario '{scenario}' ({ticks} ticks, seed {seed})...")
    start_time = time.time()
    
    for tick in range(ticks):
        # Dynamic order generation
        if tick % 100 == 0:
            order_manager.generate_random_orders(config["order_arrival_rate"], products)
            
        # Robot failures
        failure_prob = config.get("robot_failure_prob", 0.0)
        if failure_prob > 0:
            for r in env.robots:
                if r.health > 0 and env.rng.rand() < failure_prob:
                    r.health = 0
                    r.status = 'broken'
                    r.path = []
                    
        order_manager.dispatch_orders()
        congestion = env.step()
        
        for _ in range(congestion):
            metrics.record_collision()
            
        for r in env.robots:
            if r.status == 'charging' and r.battery == 100.0:
                metrics.record_charging_event()
                
        order_manager.update_robot_states()
        metrics.record_step(env, order_manager.completed_orders)
        
        # Log data
        logger.log_telemetry(tick, env.robots)
        if tick % 10 == 0: # Log metrics every 10 ticks to save space
            logger.log_metrics(tick, metrics.get_metrics())
            
        # Log newly completed orders
        for order in order_manager.completed_orders:
            # We only log them once, so we need to track what we've logged.
            # For simplicity, we just pass all completed orders that finished AT this tick
            if order.completion_time == env.time_step:
                logger.log_order(order)
                
    logger.save()
    elapsed = time.time() - start_time
    print(f"Dataset generated in {elapsed:.2f} seconds.")
    print(f"Saved to {output_dir}/")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--scenario", type=str, default="normal")
    parser.add_argument("--ticks", type=int, default=5000)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()
    
    run_generation(args.scenario, args.ticks, args.seed)
