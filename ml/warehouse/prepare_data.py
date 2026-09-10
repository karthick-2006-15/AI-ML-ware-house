import os
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
import joblib

def prepare_warehouse_data():
    raw_path = os.path.join("data", "raw", "warehouse", "logistics_dataset.csv")
    out_dir = os.path.join("data", "processed", "warehouse")
    os.makedirs(out_dir, exist_ok=True)
    
    print("Loading Logistics Dataset...")
    df = pd.read_csv(raw_path)
    
    # Preprocessing
    df = df.drop_duplicates()
    df = df.fillna(df.mean(numeric_only=True))
    
    # Categorical encoding
    le_cat = LabelEncoder()
    df['category_encoded'] = le_cat.fit_transform(df['category'])
    
    le_zone = LabelEncoder()
    df['zone_encoded'] = le_zone.fit_transform(df['zone'])
    
    # Feature Engineering for specific tasks
    
    # Task 1: Demand Target
    df['target_demand'] = df['forecasted_demand_next_7d']
    
    # Task 2: Stockout Risk Target (1 if stockout occurred or stock < reorder)
    df['target_stockout'] = ((df['stockout_count_last_month'] > 0) | (df['stock_level'] < df['reorder_point'])).astype(int)
    
    # Task 3: Performance Target
    df['target_performance'] = df['KPI_score']
    
    # Select features (remove targets, IDs, and dates to prevent leakage)
    drop_cols = ['item_id', 'category', 'zone', 'storage_location_id', 'last_restock_date', 
                 'forecasted_demand_next_7d', 'KPI_score', 'stockout_count_last_month',
                 'target_demand', 'target_stockout', 'target_performance']
                 
    X = df.drop(columns=drop_cols)
    
    y_demand = df['target_demand']
    y_stockout = df['target_stockout']
    y_performance = df['target_performance']
    
    print(f"Features: {X.columns.tolist()}")
    
    # Save preprocessing artifacts
    joblib.dump(le_cat, os.path.join(out_dir, "le_category.pkl"))
    joblib.dump(le_zone, os.path.join(out_dir, "le_zone.pkl"))
    
    # Split and save
    X_train, X_test, yd_train, yd_test, ys_train, ys_test, yp_train, yp_test = train_test_split(
        X, y_demand, y_stockout, y_performance, test_size=0.2, random_state=42
    )
    
    dataset = {
        "X_train": X_train, "X_test": X_test,
        "yd_train": yd_train, "yd_test": yd_test,
        "ys_train": ys_train, "ys_test": ys_test,
        "yp_train": yp_train, "yp_test": yp_test,
        "feature_names": X.columns.tolist()
    }
    
    joblib.dump(dataset, os.path.join(out_dir, "warehouse_dataset.pkl"))
    print("Warehouse data preprocessed and saved to data/processed/warehouse/warehouse_dataset.pkl")

if __name__ == "__main__":
    prepare_warehouse_data()
