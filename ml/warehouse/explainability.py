import os
import joblib
import pandas as pd
import json

def generate_explanations():
    models_dir = os.path.join("models", "xgboost")
    dataset_path = os.path.join("data", "processed", "warehouse", "warehouse_dataset.pkl")
    
    if not os.path.exists(dataset_path):
        print("Dataset not found. Run prepare_data.py first.")
        return
        
    dataset = joblib.load(dataset_path)
    feature_names = dataset["feature_names"]
    
    explanations = {}
    
    # Stockout Model
    stockout_path = os.path.join(models_dir, "stockout_model.pkl")
    if os.path.exists(stockout_path):
        model = joblib.load(stockout_path)
        importances = model.feature_importances_
        # Sort features by importance
        sorted_idx = importances.argsort()[::-1]
        explanations["stockout_risk"] = [
            {"feature": feature_names[i], "importance": float(importances[i])} 
            for i in sorted_idx[:5]
        ]
        print("\n--- Stockout Risk Important Features ---")
        for f in explanations["stockout_risk"]:
            print(f"{f['feature']}: {f['importance']:.4f}")
            
    # KPI Performance Model
    perf_path = os.path.join(models_dir, "performance_model.pkl")
    if os.path.exists(perf_path):
        model = joblib.load(perf_path)
        importances = model.feature_importances_
        sorted_idx = importances.argsort()[::-1]
        explanations["performance_kpi"] = [
            {"feature": feature_names[i], "importance": float(importances[i])} 
            for i in sorted_idx[:5]
        ]
        print("\n--- KPI Performance Important Features ---")
        for f in explanations["performance_kpi"]:
            print(f"{f['feature']}: {f['importance']:.4f}")
            
    # Demand Model
    demand_path = os.path.join(models_dir, "demand_model.pkl")
    if os.path.exists(demand_path):
        model = joblib.load(demand_path)
        importances = model.feature_importances_
        sorted_idx = importances.argsort()[::-1]
        explanations["demand_forecast"] = [
            {"feature": feature_names[i], "importance": float(importances[i])} 
            for i in sorted_idx[:5]
        ]
        print("\n--- Demand Forecast Important Features ---")
        for f in explanations["demand_forecast"]:
            print(f"{f['feature']}: {f['importance']:.4f}")
            
    # Save explanations
    with open(os.path.join(models_dir, "explanations.json"), "w") as f:
        json.dump(explanations, f, indent=4)
        
    print(f"\nFeature importances saved to {os.path.join(models_dir, 'explanations.json')}")

if __name__ == "__main__":
    generate_explanations()
