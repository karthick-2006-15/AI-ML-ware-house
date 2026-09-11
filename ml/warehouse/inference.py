import os
import sys
import joblib
import pandas as pd

# Add repository root to sys.path
REPO_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if REPO_ROOT not in sys.path:
    sys.path.insert(0, REPO_ROOT)

class WarehouseInference:
    def __init__(self):
        models_dir = os.path.join(REPO_ROOT, "models", "xgboost")
        data_dir = os.path.join(REPO_ROOT, "data", "processed", "warehouse")
        
        # Load encoders
        self.le_category = joblib.load(os.path.join(data_dir, "le_category.pkl"))
        self.le_zone = joblib.load(os.path.join(data_dir, "le_zone.pkl"))
        
        # Load models
        self.demand_model = joblib.load(os.path.join(models_dir, "demand_model.pkl"))
        self.stockout_model = joblib.load(os.path.join(models_dir, "stockout_model.pkl"))
        self.perf_model = joblib.load(os.path.join(models_dir, "performance_model.pkl"))
        
        # Initialize upgraded Predictive Analytics XGBoost engine (0.92 ROC-AUC)
        try:
            from predictive_analytics.src.predict import WarehouseRiskPredictor
            self.risk_predictor = WarehouseRiskPredictor()
        except Exception as e:
            print(f"[WarehouseInference] Advanced risk predictor unavailable, using baseline: {e}")
            self.risk_predictor = None
        
        # Determine feature names (hardcoded from training order)
        self.feature_names = ['stock_level', 'reorder_point', 'reorder_frequency_days', 
                             'lead_time_days', 'daily_demand', 'demand_std_dev', 
                             'item_popularity_score', 'picking_time_seconds', 
                             'handling_cost_per_unit', 'unit_price', 'holding_cost_per_unit_day', 
                             'order_fulfillment_rate', 'total_orders_last_month', 'turnover_ratio', 
                             'layout_efficiency_score', 'category_encoded', 'zone_encoded']
                             
        # Load SHAP/Feature Explanations
        import json
        exp_path = os.path.join(models_dir, "explanations.json")
        if os.path.exists(exp_path):
            with open(exp_path, "r") as f:
                self.explanations = json.load(f)
        else:
            self.explanations = {}

    def predict(self, input_data: dict):
        """
        Expects a dictionary matching the training features.
        String categories will be encoded.
        """
        df = pd.DataFrame([input_data])
        
        # Encode categorical fields
        if 'category' in df.columns:
            # Handle unseen categories gracefully
            try:
                df['category_encoded'] = self.le_category.transform(df['category'])
            except ValueError:
                df['category_encoded'] = 0
            df = df.drop(columns=['category'])
            
        if 'zone' in df.columns:
            try:
                df['zone_encoded'] = self.le_zone.transform(df['zone'])
            except ValueError:
                df['zone_encoded'] = 0
            df = df.drop(columns=['zone'])
            
        # Ensure all features exist
        for f in self.feature_names:
            if f not in df.columns:
                df[f] = 0.0
                
        # Order features exactly as trained
        X = df[self.feature_names]
        
        # Predictions
        demand_pred = float(self.demand_model.predict(X)[0])
        kpi_pred = float(self.perf_model.predict(X)[0])
        
        # Use upgraded 0.92 ROC-AUC XGBoost predictor if available
        if self.risk_predictor is not None:
            try:
                risk_res = self.risk_predictor.predict(input_data.copy())
                stockout_prob = float(risk_res["high_risk_probability"])
            except Exception:
                stockout_prob = float(self.stockout_model.predict_proba(X)[0][1])
        else:
            stockout_prob = float(self.stockout_model.predict_proba(X)[0][1])
            
        risk_level = "HIGH" if stockout_prob >= 0.50 else "MEDIUM" if stockout_prob >= 0.30 else "LOW"
        
        return {
            "demand_forecast": max(0, round(demand_pred, 2)),
            "stockout_probability": round(stockout_prob, 4),
            "risk_level": risk_level,
            "performance_kpi": round(kpi_pred, 4),
            "explanations": self.explanations
        }

if __name__ == "__main__":
    # Test inference
    infer = WarehouseInference()
    sample = {
        'stock_level': 50,
        'reorder_point': 60,
        'reorder_frequency_days': 10,
        'lead_time_days': 5,
        'daily_demand': 20,
        'demand_std_dev': 2,
        'item_popularity_score': 0.8,
        'picking_time_seconds': 45,
        'handling_cost_per_unit': 1.5,
        'unit_price': 50,
        'holding_cost_per_unit_day': 0.5,
        'order_fulfillment_rate': 0.95,
        'total_orders_last_month': 300,
        'turnover_ratio': 5.0,
        'layout_efficiency_score': 0.9,
        'category': 'Electronics',
        'zone': 'A'
    }
    print(infer.predict(sample))
