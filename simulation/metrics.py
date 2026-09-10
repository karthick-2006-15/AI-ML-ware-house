from typing import List
import numpy as np

class MetricsCollector:
    def __init__(self):
        self.completed_orders = 0
        self.total_fulfillment_time = 0
        self.total_distance = 0.0
        self.collisions = 0
        self.charging_events = 0
        
        self.battery_history: List[float] = []
        self.utilization_history: List[float] = []
        
    def record_step(self, env, completed_orders_list):
        # Update distance
        current_total_dist = sum(r.accumulated_distance for r in env.robots)
        self.total_distance = current_total_dist
        
        # Update completed orders
        self.completed_orders = len(completed_orders_list)
        self.total_fulfillment_time = sum(
            (o.completion_time - o.timestamp) for o in completed_orders_list if o.completion_time
        )
        
        # Battery history
        avg_battery = np.mean([r.battery for r in env.robots]) if env.robots else 0
        self.battery_history.append(avg_battery)
        
        # Utilization (active robots vs total)
        active_robots = sum(1 for r in env.robots if r.status not in ['idle', 'charging'])
        utilization = active_robots / len(env.robots) if env.robots else 0
        self.utilization_history.append(utilization)

    def record_collision(self):
        self.collisions += 1

    def record_charging_event(self):
        self.charging_events += 1

    def get_metrics(self) -> dict:
        avg_fulfillment = self.total_fulfillment_time / self.completed_orders if self.completed_orders > 0 else 0
        avg_battery = np.mean(self.battery_history) if self.battery_history else 0
        avg_utilization = np.mean(self.utilization_history) if self.utilization_history else 0
        
        return {
            "completed_orders": self.completed_orders,
            "average_fulfillment_time": round(avg_fulfillment, 2),
            "total_distance": round(self.total_distance, 2),
            "collisions": self.collisions,
            "charging_events": self.charging_events,
            "average_battery": round(avg_battery, 2),
            "utilization": round(avg_utilization, 2)
        }
