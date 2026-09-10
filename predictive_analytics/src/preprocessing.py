"""
Preprocessing & Feature Engineering Pipeline
Academic Project: Autonomous Warehouse AI - Predictive Analytics
Implements:
  - Warehouse domain feature engineering (9 operational features)
  - Date decomposition
  - Strict leakage elimination (removes forecasted_demand_next_7d)
  - One-Hot Categorical Encoding
  - Numerical Standardization (for linear baseline)
  - Stratified 70/15/15 Train/Val/Test Split (seed=42)
  - Pipeline serialization for reproducible inference
"""

import os
import joblib
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import OneHotEncoder, StandardScaler

from data_loader import get_prepared_dataframe

PROCESSED_DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "processed")

def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    data = df.copy()
    
    # 1. Operational Ratios & Runout Metrics
    data["days_of_supply"] = data["stock_level"] / (data["daily_demand"] + 1e-5)
    data["lead_time_demand"] = data["daily_demand"] * data["lead_time_days"]
    data["replenish_cycle_demand"] = data["daily_demand"] * (data["lead_time_days"] + data["reorder_frequency_days"])
    
    # 2. Safety Buffer & Reorder Point Coverage
    safety_stock_est = 1.65 * data["demand_std_dev"] * np.sqrt(data["lead_time_days"])
    data["safety_stock_coverage"] = data["stock_level"] / (safety_stock_est + 1.0)
    data["reorder_buffer_ratio"] = data["stock_level"] / (data["reorder_point"] + 1.0)
    
    # 3. Cost & Operational Friction Indices
    data["carrying_to_handling_ratio"] = (data["holding_cost_per_unit_day"] * 30) / (data["handling_cost_per_unit"] + 1e-5)
    data["stockout_pressure_index"] = (data["stockout_count_last_month"] + 1.0) / (data["order_fulfillment_rate"] + 1.0)
    data["turnover_velocity"] = (data["turnover_ratio"] * data["daily_demand"]) / (data["stock_level"] + 1.0)
    data["picking_friction_index"] = data["picking_time_seconds"] / (data["layout_efficiency_score"] + 1e-5)
    
    # 4. Temporal Features from last_restock_date
    restock_dt = pd.to_datetime(data["last_restock_date"])
    data["restock_month"] = restock_dt.dt.month
    data["restock_dayofweek"] = restock_dt.dt.dayofweek
    ref_date = pd.to_datetime("2024-12-31")
    data["days_since_last_restock"] = (ref_date - restock_dt).dt.days
    
    return data

def build_preprocessing_pipeline():
    os.makedirs(PROCESSED_DATA_DIR, exist_ok=True)
    df = get_prepared_dataframe()
    
    # Target
    y = df["stock_risk"].copy()
    
    # Feature Engineering
    df_feat = engineer_features(df)
    
    # Data Leakage Elimination: Drop future demand, target, and arbitrary IDs
    leak_and_id_cols = [
        "item_id", "storage_location_id", "last_restock_date",
        "forecasted_demand_next_7d", "stock_risk"
    ]
    X_raw = df_feat.drop(columns=leak_and_id_cols)
    print(f"[PREPROCESS] Raw features before encoding: {X_raw.columns.tolist()}")
    
    # Separate categorical and numerical features
    cat_cols = ["category", "zone"]
    num_cols = [c for c in X_raw.columns if c not in cat_cols]
    
    # First split: 70% Train, 30% Temp (Val + Test)
    X_train_raw, X_temp_raw, y_train, y_temp = train_test_split(
        X_raw, y, test_size=0.30, random_state=42, stratify=y
    )
    # Second split: Temp -> 15% Validation, 15% Test
    X_val_raw, X_test_raw, y_val, y_test = train_test_split(
        X_temp_raw, y_temp, test_size=0.50, random_state=42, stratify=y_temp
    )
    
    # Fit OneHotEncoder on Train ONLY to avoid leakage
    ohe = OneHotEncoder(sparse_output=False, handle_unknown="ignore")
    ohe.fit(X_train_raw[cat_cols])
    encoded_cat_names = ohe.get_feature_names_out(cat_cols).tolist()
    
    def transform_split(split_df):
        num_part = split_df[num_cols].reset_index(drop=True)
        cat_encoded = pd.DataFrame(ohe.transform(split_df[cat_cols]), columns=encoded_cat_names)
        return pd.concat([num_part, cat_encoded], axis=1)
        
    X_train = transform_split(X_train_raw)
    X_val = transform_split(X_val_raw)
    X_test = transform_split(X_test_raw)
    
    # Fit StandardScaler on Train ONLY for linear models (Logistic Regression)
    scaler = StandardScaler()
    scaler.fit(X_train)
    X_train_scaled = pd.DataFrame(scaler.transform(X_train), columns=X_train.columns)
    X_val_scaled = pd.DataFrame(scaler.transform(X_val), columns=X_val.columns)
    X_test_scaled = pd.DataFrame(scaler.transform(X_test), columns=X_test.columns)
    
    splits = {
        "X_train": X_train,
        "X_val": X_val,
        "X_test": X_test,
        "X_train_scaled": X_train_scaled,
        "X_val_scaled": X_val_scaled,
        "X_test_scaled": X_test_scaled,
        "y_train": y_train.reset_index(drop=True),
        "y_val": y_val.reset_index(drop=True),
        "y_test": y_test.reset_index(drop=True),
        "feature_names": X_train.columns.tolist(),
        "cat_cols": cat_cols,
        "num_cols": num_cols
    }
    
    splits_path = os.path.join(PROCESSED_DATA_DIR, "splits.pkl")
    joblib.dump(splits, splits_path)
    
    pipeline_artifacts = {
        "ohe": ohe,
        "scaler": scaler,
        "cat_cols": cat_cols,
        "num_cols": num_cols,
        "feature_names": X_train.columns.tolist(),
        "encoded_cat_names": encoded_cat_names
    }
    pipeline_path = os.path.join(PROCESSED_DATA_DIR, "pipeline.pkl")
    joblib.dump(pipeline_artifacts, pipeline_path)
    
    print(f"[PREPROCESS] Total Dataset: {len(df)} samples")
    print(f"  - Train Set:      {len(X_train)} samples ({len(X_train)/len(df)*100:.1f}%) | High Risk: {y_train.sum()} ({y_train.mean()*100:.1f}%)")
    print(f"  - Validation Set: {len(X_val)} samples ({len(X_val)/len(df)*100:.1f}%) | High Risk: {y_val.sum()} ({y_val.mean()*100:.1f}%)")
    print(f"  - Test Set:       {len(X_test)} samples ({len(X_test)/len(df)*100:.1f}%) | High Risk: {y_test.sum()} ({y_test.mean()*100:.1f}%)")
    print(f"[PREPROCESS] Engineered & Encoded Feature Count: {X_train.shape[1]}")
    print(f"[PREPROCESS] Artifacts saved to {splits_path} and {pipeline_path}")
    return splits

if __name__ == "__main__":
    build_preprocessing_pipeline()

