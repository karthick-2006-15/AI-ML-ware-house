from typing import Dict, Any

def get_scenario_config(scenario_name: str) -> Dict[str, Any]:
    """Returns a configuration dictionary for the specified scenario."""
    
    # Base baseline configuration
    base_config = {
        "order_arrival_rate": 5,      # New orders to generate per 100 ticks
        "product_demand_skew": False, # If True, 1 product gets 80% of demand
        "robot_failure_prob": 0.0,    # Probability per tick of a robot failing
        "charging_stations": 2,       # Number of active charging stations
        "blockage": False             # If True, a major aisle is blocked
    }
    
    scenarios = {
        "normal": {},
        "high_demand": {
            "order_arrival_rate": 15
        },
        "peak_season": {
            "order_arrival_rate": 25,
            "product_demand_skew": True
        },
        "product_surge": {
            "order_arrival_rate": 10,
            "product_demand_skew": True
        },
        "robot_failure": {
            "robot_failure_prob": 0.001 # Random failure
        },
        "charging_congestion": {
            "charging_stations": 1 # Only 1 charging station for 5 robots
        },
        "warehouse_blockage": {
            "blockage": True
        }
    }
    
    if scenario_name not in scenarios:
        raise ValueError(f"Unknown scenario: {scenario_name}")
        
    config = base_config.copy()
    config.update(scenarios[scenario_name])
    return config
