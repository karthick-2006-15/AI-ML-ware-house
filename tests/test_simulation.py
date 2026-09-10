import pytest
import sys
import os

# Add root to python path for testing
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from simulation.environment import WarehouseEnv
from simulation.entities import Robot, Station, Shelf, Product
from ml_engine.order_manager import OrderManager

def setup_test_env(seed=42):
    env = WarehouseEnv(width=10, height=10, seed=seed)
    products = [Product(id=f"P_{i}", name=f"P{i}", demand_frequency=1.0) for i in range(5)]
    
    # 1 Shelf, 1 Packing Station, 1 Charging Station
    shelf = Shelf(id="S1", x=2, y=2)
    shelf.products.extend(products)
    env.add_shelf(shelf)
    
    env.add_station(Station(id="P1", x=5, y=5, type="packing"))
    env.add_station(Station(id="C1", x=0, y=9, type="charging"))
    
    robot = Robot(id="R1", x=0, y=0)
    env.add_robot(robot)
    
    return env, products, robot

def test_determinism():
    """Test that two simulation runs with the same seed generate identical orders."""
    env1, products1, _ = setup_test_env(seed=123)
    om1 = OrderManager(env1)
    om1.generate_random_orders(5, products1)
    
    env2, products2, _ = setup_test_env(seed=123)
    om2 = OrderManager(env2)
    om2.generate_random_orders(5, products2)
    
    # Compare generated priorities and deadlines
    for o1, o2 in zip(om1.pending_orders, om2.pending_orders):
        assert o1.priority == o2.priority
        assert o1.deadline == o2.deadline
        assert o1.product.id == o2.product.id

def test_battery_drain_and_recharge():
    """Test that battery depletes on move and recharges at charging station."""
    env, _, robot = setup_test_env(seed=42)
    
    # Force battery drop to trigger charging behavior
    robot.battery = 15.0 
    
    om = OrderManager(env)
    
    # Run step - order manager should direct robot to charging station
    om.dispatch_orders() 
    assert robot.status == 'moving_to_charge'
    
    # Walk the path
    initial_distance = robot.accumulated_distance
    while robot.path:
        env.step()
        om.update_robot_states()
        
    assert robot.status == 'charging'
    assert robot.battery < 15.0 # Battery should have drained while moving
    assert robot.accumulated_distance > initial_distance
    
    # Run step again to simulate charging
    battery_before_charge = robot.battery
    env.step()
    assert robot.battery > battery_before_charge
    
def test_collision_avoidance():
    """Test that robots cannot move into shelves."""
    env, _, robot = setup_test_env()
    
    # Shelf is at 2,2. Try to move robot into 2,2
    robot.x, robot.y = 1, 2
    robot.path = [(2, 2)]
    
    # The step should recognize 2,2 is invalid and NOT move the robot
    env.step()
    assert robot.x == 1
    assert robot.y == 2

def test_nearest_robot_dispatch():
    """Test that the Nearest-Robot heuristic assigns the closest robot to the shelf."""
    env, _, _ = setup_test_env(seed=12)
    
    robot2 = Robot(id="R2", x=2, y=1)
    env.add_robot(robot2)
    
    om = OrderManager(env)
    om.generate_random_orders(1, env.shelves[0].products)
    om.dispatch_orders()
    
    assert env.robots[1].current_order is not None # R2 (closest) gets it
    assert env.robots[0].current_order is None # R1 (furthest) does not

def test_dynamic_collision_avoidance():
    """Test that a robot triggers a congestion event when blocked."""
    env, _, robot1 = setup_test_env()
    robot2 = Robot(id="R2", x=1, y=0)
    env.add_robot(robot2)
    
    # R1 wants to go right to 1,0. R2 is already at 1,0.
    robot1.path = [(1, 0)]
    
    congestion = env.step()
    
    assert congestion == 1
    assert robot1.x == 0 # Didn't move
    assert robot1.wait_counter == 1
