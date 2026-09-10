"""
Warehouse Inventory Risk - Standalone Inference Engine
Academic Project: Autonomous Warehouse AI - Predictive Analytics
Provides:
  - WarehouseRiskPredictor class for single-item and batch inference
  - Feature engineering and pipeline artifact transformation
  - Calibrated probability output, binary risk classification, and operational action advice
  - Interactive CLI and sample test demonstration
"""

import os
import sys
import argparse
import joblib
import numpy as np
import pandas as pd

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_PATH = os.path.join(BASE_DIR, "models", "xgboost", "best_xgboost_model.pkl")
PIPELINE_PATH = os.path.join(BASE_DIR, "data", "processed", "pipeline.pkl")

class WarehouseRiskPredictor:
    def __init__(self, model_path: str = MODEL_PATH, pipeline_path: str = PIPELINE_PATH):
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model artifact not found at {model_path}")
        if not os.path.exists(pipeline_path):
            raise FileNotFoundError(f"Pipeline artifact not found at {pipeline_path}")
            
        self.model = joblib.load(model_path)
        self.pipeline = joblib.load(pipeline_path)
        self.ohe = self.pipeline["ohe"]
        self.cat_cols = self.pipeline["cat_cols"]
        self.num_cols = self.pipeline["num_cols"]
        self.feature_names = self.pipeline["feature_names"]
        self.encoded_cat_names = self.pipeline["encoded_cat_names"]

    def engineer_single(self, row: dict) -> pd.DataFrame:
        data = pd.DataFrame([row])
        return self._engineer_dataframe(data)

    def _engineer_dataframe(self, df: pd.DataFrame) -> pd.DataFrame:
        data = df.copy()
        
        # Operational Ratios
        data["days_of_supply"] = data["stock_level"] / (data["daily_demand"] + 1e-5)
        data["lead_time_demand"] = data["daily_demand"] * data["lead_time_days"]
        data["replenish_cycle_demand"] = data["daily_demand"] * (data["lead_time_days"] + data["reorder_frequency_days"])
        
        # Safety Buffer
        safety_stock_est = 1.65 * data["demand_std_dev"] * np.sqrt(data["lead_time_days"])
        data["safety_stock_coverage"] = data["stock_level"] / (safety_stock_est + 1.0)
        data["reorder_buffer_ratio"] = data["stock_level"] / (data["reorder_point"] + 1.0)
        
        # Friction and Cost
        data["carrying_to_handling_ratio"] = (data["holding_cost_per_unit_day"] * 30) / (data["handling_cost_per_unit"] + 1e-5)
        data["stockout_pressure_index"] = (data["stockout_count_last_month"] + 1.0) / (data["order_fulfillment_rate"] + 1.0)
        data["turnover_velocity"] = (data["turnover_ratio"] * data["daily_demand"]) / (data["stock_level"] + 1.0)
        data["picking_friction_index"] = data["picking_time_seconds"] / (data["layout_efficiency_score"] + 1e-5)
        
        # Temporal
        restock_dt = pd.to_datetime(data["last_restock_date"])
        data["restock_month"] = restock_dt.dt.month
        data["restock_dayofweek"] = restock_dt.dt.dayofweek
        ref_date = pd.to_datetime("2024-12-31")
        data["days_since_last_restock"] = (ref_date - restock_dt).dt.days
        
        # Transform OHE and select numerical
        num_part = data[self.num_cols].reset_index(drop=True)
        cat_encoded = pd.DataFrame(self.ohe.transform(data[self.cat_cols]), columns=self.encoded_cat_names)
        transformed = pd.concat([num_part, cat_encoded], axis=1)
        
        # Ensure exact column order
        return transformed[self.feature_names]

    def predict(self, item_data: dict) -> dict:
        """
        Runs inference on a dictionary containing raw warehouse item attributes.
        Returns risk classification, risk probability, and operational action recommendation.
        """
        # Ensure default values for auxiliary fields if omitted
        defaults = {
            "reorder_frequency_days": 14,
            "demand_std_dev": 2.5,
            "item_popularity_score": 75.0,
            "picking_time_seconds": 45.0,
            "handling_cost_per_unit": 2.5,
            "unit_price": 50.0,
            "holding_cost_per_unit_day": 0.15,
            "stockout_count_last_month": 0,
            "order_fulfillment_rate": 0.95,
            "total_orders_last_month": 120,
            "turnover_ratio": 4.5,
            "layout_efficiency_score": 80.0,
            "last_restock_date": "2024-11-15",
            "KPI_score": 85.0
        }
        for k, v in defaults.items():
            if k not in item_data:
                item_data[k] = v
                
        X_item = self.engineer_single(item_data)
        prob = float(self.model.predict_proba(X_item)[0, 1])
        risk_level = "HIGH RISK" if prob >= 0.50 else "LOW RISK"
        
        # Operational recommendation logic
        days_supply = float(item_data["stock_level"]) / (float(item_data["daily_demand"]) + 1e-5)
        if prob >= 0.70 or days_supply < 7.0:
            action = "EMERGENCY EXPEDITE: Trigger purchase order immediately; inventory projected to breach safety buffer within 7-day horizon."
            priority = "URGENT"
        elif prob >= 0.50:
            action = "REORDER ADVISORY: Stock is approaching replenishment threshold; review reorder lead times and schedule standard restock."
            priority = "HIGH"
        elif prob >= 0.30:
            action = "MONITOR: Stock levels adequate; demand variability should be observed during the next replenishment cycle."
            priority = "NORMAL"
        else:
            action = "STABLE: Healthy inventory buffer; no restocking action required."
            priority = "OPTIMAL"
            
        return {
            "item_id": item_data.get("item_id", "ITEM_UNKNOWN"),
            "category": item_data.get("category", "Unknown"),
            "zone": item_data.get("zone", "Unknown"),
            "stock_level": float(item_data["stock_level"]),
            "daily_demand": float(item_data["daily_demand"]),
            "days_of_supply": round(days_supply, 2),
            "stock_risk_class": risk_level,
            "high_risk_probability": round(prob, 4),
            "confidence_score": round(max(prob, 1 - prob) * 100, 2),
            "priority": priority,
            "operational_recommendation": action
        }

    def predict_batch(self, df_items: pd.DataFrame) -> pd.DataFrame:
        X_batch = self._engineer_dataframe(df_items)
        probs = self.model.predict_proba(X_batch)[:, 1]
        preds = (probs >= 0.5).astype(int)
        
        res_df = df_items.copy()
        res_df["pred_risk"] = preds
        res_df["high_risk_prob"] = probs.round(4)
        res_df["risk_label"] = np.where(preds == 1, "HIGH RISK", "LOW RISK")
        return res_df

def run_demo():
    print("=" * 65)
    print("    AUTONOMOUS WAREHOUSE INVENTORY RISK INFERENCE ENGINE")
    print("=" * 65)
    predictor = WarehouseRiskPredictor()
    
    # Case 1: High Risk Item (Low stock, high daily demand)
    sample_high = {
        "item_id": "ITEM_CRITICAL_01",
        "category": "Electronics",
        "zone": "Zone A",
        "stock_level": 25,
        "daily_demand": 12.0,
        "lead_time_days": 5,
        "reorder_point": 60,
        "last_restock_date": "2024-10-01"
    }
    
    # Case 2: Low Risk Item (Abundant stock, low demand)
    sample_low = {
        "item_id": "ITEM_HEALTHY_02",
        "category": "Apparel",
        "zone": "Zone B",
        "stock_level": 350,
        "daily_demand": 8.0,
        "lead_time_days": 3,
        "reorder_point": 40,
        "last_restock_date": "2024-12-10"
    }
    
    for sample in [sample_high, sample_low]:
        result = predictor.predict(sample)
        print(f"\nEvaluating: {result['item_id']} [{result['category']} | {result['zone']}]")
        print(f"  - Stock Level:     {result['stock_level']} units")
        print(f"  - Daily Demand:    {result['daily_demand']} units/day")
        print(f"  - Days of Supply:  {result['days_of_supply']} days")
        print(f"  - Classification:  {result['stock_risk_class']} (Prob: {result['high_risk_probability']:.4f}, Conf: {result['confidence_score']}%)")
        print(f"  - Priority:        {result['priority']}")
        print(f"  - Recommendation:  {result['operational_recommendation']}")
        
    print("\n" + "=" * 65)

if __name__ == "__main__":
    run_demo()
