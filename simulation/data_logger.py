import pandas as pd
import os

class DataLogger:
    def __init__(self, output_dir: str):
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)
        
        self.orders_data = []
        self.telemetry_data = []
        self.metrics_data = []
        
    def log_order(self, order):
        if order.status == 'completed':
            self.orders_data.append({
                "order_id": order.id,
                "product_id": order.product.id,
                "priority": order.priority,
                "timestamp": order.timestamp,
                "deadline": order.deadline,
                "completion_time": order.completion_time,
                "assigned_robot_id": order.assigned_robot_id
            })
            
    def log_telemetry(self, tick: int, robots: list):
        for r in robots:
            self.telemetry_data.append({
                "tick": tick,
                "robot_id": r.id,
                "x": r.x,
                "y": r.y,
                "battery": round(r.battery, 2),
                "health": round(r.health, 2),
                "status": r.status,
                "wait_counter": r.wait_counter
            })
            
    def log_metrics(self, tick: int, metrics: dict):
        metrics["tick"] = tick
        self.metrics_data.append(metrics)
        
    def save(self):
        if self.orders_data:
            pd.DataFrame(self.orders_data).to_csv(os.path.join(self.output_dir, "orders.csv"), index=False)
        if self.telemetry_data:
            pd.DataFrame(self.telemetry_data).to_csv(os.path.join(self.output_dir, "robot_telemetry.csv"), index=False)
        if self.metrics_data:
            pd.DataFrame(self.metrics_data).to_csv(os.path.join(self.output_dir, "system_metrics.csv"), index=False)
