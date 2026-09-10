import os
import joblib
import json
import xgboost as xgb
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, root_mean_squared_error, r2_score

def train_performance():
    data_path = os.path.join("data", "processed", "warehouse", "warehouse_dataset.pkl")
    out_dir = os.path.join("models", "xgboost")
    os.makedirs(out_dir, exist_ok=True)
    
    dataset = joblib.load(data_path)
    X_train, X_test = dataset['X_train'], dataset['X_test']
    y_train, y_test = dataset['yp_train'], dataset['yp_test']
    
    print("Training Baselines...")
    lr = LinearRegression()
    lr.fit(X_train, y_train)
    lr_pred = lr.predict(X_test)
    
    rf = RandomForestRegressor(n_estimators=50, random_state=42)
    rf.fit(X_train, y_train)
    rf_pred = rf.predict(X_test)
    
    print("Training XGBoost...")
    model = xgb.XGBRegressor(n_estimators=100, learning_rate=0.1, random_state=42)
    model.fit(X_train, y_train)
    xgb_pred = model.predict(X_test)
    
    metrics = {
        "Linear Regression": {
            "MAE": mean_absolute_error(y_test, lr_pred),
            "RMSE": root_mean_squared_error(y_test, lr_pred),
            "R2": r2_score(y_test, lr_pred)
        },
        "Random Forest": {
            "MAE": mean_absolute_error(y_test, rf_pred),
            "RMSE": root_mean_squared_error(y_test, rf_pred),
            "R2": r2_score(y_test, rf_pred)
        },
        "XGBoost": {
            "MAE": mean_absolute_error(y_test, xgb_pred),
            "RMSE": root_mean_squared_error(y_test, xgb_pred),
            "R2": r2_score(y_test, xgb_pred)
        }
    }
    
    for m, vals in metrics.items():
        print(f"{m}: MAE={vals['MAE']:.3f}, RMSE={vals['RMSE']:.3f}, R2={vals['R2']:.3f}")
        
    # Save the best model
    model_path = os.path.join(out_dir, "performance_model.pkl")
    joblib.dump(model, model_path)
    
    metadata = {
        "model_name": "XGBoost Regressor (KPI Score)",
        "features": dataset['feature_names'],
        "target": "KPI_score",
        "metrics": metrics["XGBoost"]
    }
    
    with open(os.path.join(out_dir, "performance_metadata.json"), "w") as f:
        json.dump(metadata, f, indent=4)
        
    print(f"Saved model to {model_path}")

if __name__ == "__main__":
    train_performance()
