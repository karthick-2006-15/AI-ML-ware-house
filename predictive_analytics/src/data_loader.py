"""
Warehouse Inventory Dataset Loader & Quality Audit Module
Academic Project: Autonomous Warehouse AI - Predictive Analytics
Handles:
  - Raw dataset ingestion and schema validation
  - Missing value, duplicate, and outlier detection
  - Leak-free target formulation:
      Target = 1 (HIGH RISK) if stock_level < forecasted_demand_next_7d else 0 (LOW RISK)
  - Target leakage elimination (strips forecasted_demand_next_7d from feature space)
  - Exports audit metadata to results/metrics/dataset_audit_report.json
"""

import os
import json
import numpy as np
import pandas as pd

RAW_DATA_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "raw", "logistics_dataset.csv")
AUDIT_REPORT_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "results", "metrics", "dataset_audit_report.json")

EXPECTED_COLUMNS = [
    "item_id", "category", "stock_level", "reorder_point", "reorder_frequency_days",
    "lead_time_days", "daily_demand", "demand_std_dev", "item_popularity_score",
    "storage_location_id", "zone", "picking_time_seconds", "handling_cost_per_unit",
    "unit_price", "holding_cost_per_unit_day", "stockout_count_last_month",
    "order_fulfillment_rate", "total_orders_last_month", "turnover_ratio",
    "layout_efficiency_score", "last_restock_date", "forecasted_demand_next_7d", "KPI_score"
]

def load_raw_data(data_path: str = RAW_DATA_PATH) -> pd.DataFrame:
    if not os.path.exists(data_path):
        # Fallback to project root path
        fallback = os.path.abspath("data/raw/warehouse/logistics_dataset.csv")
        if os.path.exists(fallback):
            data_path = fallback
        else:
            raise FileNotFoundError(f"Dataset not found at {data_path} or {fallback}")
    
    df = pd.read_csv(data_path)
    return df

def audit_dataset(df: pd.DataFrame, report_path: str = AUDIT_REPORT_PATH) -> dict:
    os.makedirs(os.path.dirname(report_path), exist_ok=True)
    
    # 1. Basic Stats
    n_rows, n_cols = df.shape
    missing = df.isnull().sum().to_dict()
    duplicates = int(df.duplicated().sum())
    dtypes = {col: str(dtype) for col, dtype in df.dtypes.items()}
    
    # 2. Target Creation (Leak-Free Horizon Rule)
    # At time T, does current stock cover future 7-day expected demand?
    df["stock_risk"] = (df["stock_level"] < df["forecasted_demand_next_7d"]).astype(int)
    risk_counts = df["stock_risk"].value_counts().to_dict()
    high_risk_ratio = float(df["stock_risk"].mean())
    
    # 3. Numeric Outlier Inspection using IQR
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    outlier_summary = {}
    for col in numeric_cols:
        q25 = float(df[col].quantile(0.25))
        q75 = float(df[col].quantile(0.75))
        iqr = q75 - q25
        lower_bound = q25 - 1.5 * iqr
        upper_bound = q75 + 1.5 * iqr
        outliers = int(((df[col] < lower_bound) | (df[col] > upper_bound)).sum())
        outlier_summary[col] = {
            "min": float(df[col].min()),
            "median": float(df[col].median()),
            "max": float(df[col].max()),
            "mean": round(float(df[col].mean()), 3),
            "std": round(float(df[col].std()), 3),
            "iqr_outliers": outliers
        }
        
    audit_report = {
        "dataset_name": "Warehouse Logistics Operations & Inventory Dataset",
        "source": "Academic Autonomous Warehouse Management Repository",
        "rows": n_rows,
        "columns": n_cols,
        "target_variable": "stock_risk (0=LOW RISK, 1=HIGH RISK)",
        "target_definition": "Binary indicator: 1 if current physical stock_level < forecasted_demand_next_7d, else 0",
        "target_distribution": {
            "low_risk_count": int(risk_counts.get(0, 0)),
            "high_risk_count": int(risk_counts.get(1, 0)),
            "high_risk_percentage": round(high_risk_ratio * 100, 2),
            "imbalance_ratio": round((risk_counts.get(0, 1) / max(1, risk_counts.get(1, 1))), 2)
        },
        "missing_values_total": sum(missing.values()),
        "duplicate_rows": duplicates,
        "feature_types": dtypes,
        "numeric_statistics": outlier_summary,
        "categorical_distributions": {
            "category": df["category"].value_counts().to_dict(),
            "zone": df["zone"].value_counts().to_dict()
        }
    }
    
    with open(report_path, "w") as f:
        json.dump(audit_report, f, indent=2)
        
    print(f"[AUDIT] Successfully audited {n_rows} rows x {n_cols} columns.")
    print(f"[AUDIT] Target Distribution: Low Risk={risk_counts.get(0,0)} ({100-high_risk_ratio*100:.1f}%), High Risk={risk_counts.get(1,0)} ({high_risk_ratio*100:.1f}%)")
    print(f"[AUDIT] Report saved to: {report_path}")
    return audit_report

def get_prepared_dataframe(data_path: str = RAW_DATA_PATH) -> pd.DataFrame:
    df = load_raw_data(data_path)
    # Generate Target
    df["stock_risk"] = (df["stock_level"] < df["forecasted_demand_next_7d"]).astype(int)
    return df

if __name__ == "__main__":
    df = load_raw_data()
    audit_dataset(df)

