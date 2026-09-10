"""
Random Forest Classifier Training Module
Academic Project: Autonomous Warehouse AI - Predictive Analytics
Trains non-linear ensemble with hyperparameter tuning across tree count, depth, and class weighting.
Logs experiments to results/experiment_log.csv.
Saves best model and metadata to models/random_forest/.
"""

import os
import time
import json
import joblib
import datetime
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score

from train_baseline import log_experiment_entry

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SPLITS_PATH = os.path.join(BASE_DIR, "data", "processed", "splits.pkl")
MODEL_DIR = os.path.join(BASE_DIR, "models", "random_forest")

def train_random_forest():
    os.makedirs(MODEL_DIR, exist_ok=True)
    splits = joblib.load(SPLITS_PATH)
    
    X_train = splits["X_train"]
    y_train = splits["y_train"]
    X_val = splits["X_val"]
    y_val = splits["y_val"]
    
    print("==================================================")
    print("      MODEL 2: RANDOM FOREST ENSEMBLE             ")
    print("==================================================")
    
    rf_configs = [
        {"n_estimators": 50, "max_depth": 5, "min_samples_split": 2, "class_weight": None, "id": "EXP-RF-01"},
        {"n_estimators": 100, "max_depth": 10, "min_samples_split": 2, "class_weight": None, "id": "EXP-RF-02"},
        {"n_estimators": 200, "max_depth": 15, "min_samples_split": 5, "class_weight": None, "id": "EXP-RF-03"},
        {"n_estimators": 100, "max_depth": 10, "min_samples_split": 2, "class_weight": "balanced", "id": "EXP-RF-04"}
    ]
    
    best_model = None
    best_f1 = -1.0
    best_cfg = None
    best_metrics = {}
    best_time = 0.0
    
    for cfg in rf_configs:
        t0 = time.time()
        rf = RandomForestClassifier(
            n_estimators=cfg["n_estimators"],
            max_depth=cfg["max_depth"],
            min_samples_split=cfg["min_samples_split"],
            class_weight=cfg["class_weight"],
            random_state=42,
            n_jobs=-1
        )
        rf.fit(X_train, y_train)
        elapsed = round(time.time() - t0, 4)
        
        val_preds = rf.predict(X_val)
        val_probs = rf.predict_proba(X_val)[:, 1]
        
        acc = accuracy_score(y_val, val_preds)
        prec = precision_score(y_val, val_preds, zero_division=0)
        rec = recall_score(y_val, val_preds, zero_division=0)
        f1 = f1_score(y_val, val_preds, zero_division=0)
        auc = roc_auc_score(y_val, val_probs)
        
        print(f"[{cfg['id']}] n_est={cfg['n_estimators']}, depth={cfg['max_depth']}, weight={cfg['class_weight']} | "
              f"Acc: {acc:.4f} | Prec: {prec:.4f} | Rec: {rec:.4f} | F1: {f1:.4f} | AUC: {auc:.4f} | Time: {elapsed:.2f}s")
              
        log_entry = {
            "experiment_id": cfg["id"],
            "date": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "model_family": "Random Forest",
            "model_name": f"RandomForest(n={cfg['n_estimators']},d={cfg['max_depth']})",
            "dataset_version": "Cleaned_Warehouse_Engineered",
            "hyperparameters": f"n_est={cfg['n_estimators']}, max_depth={cfg['max_depth']}, split={cfg['min_samples_split']}, weight={cfg['class_weight']}",
            "training_time_sec": elapsed,
            "val_accuracy": round(acc, 4),
            "val_precision": round(prec, 4),
            "val_recall": round(rec, 4),
            "val_f1": round(f1, 4),
            "val_roc_auc": round(auc, 4),
            "notes": f"Random forest hyperparameter experiment with {cfg['class_weight']} weighting"
        }
        log_experiment_entry(log_entry)
        
        if f1 > best_f1:
            best_f1 = f1
            best_model = rf
            best_cfg = cfg
            best_time = elapsed
            best_metrics = {
                "accuracy": round(acc, 4),
                "precision": round(prec, 4),
                "recall": round(rec, 4),
                "f1": round(f1, 4),
                "roc_auc": round(auc, 4)
            }
            
    # Save best model
    model_save_path = os.path.join(MODEL_DIR, "random_forest_model.pkl")
    joblib.dump(best_model, model_save_path)
    
    metadata = {
        "model_name": "RandomForest_Best",
        "best_experiment_id": best_cfg["id"],
        "best_hyperparameters": best_cfg,
        "validation_metrics": best_metrics,
        "features": splits["feature_names"],
        "training_time_sec": best_time
    }
    with open(os.path.join(MODEL_DIR, "metadata.json"), "w") as f:
        json.dump(metadata, f, indent=2)
        
    print(f"\n[RF] Best Model Saved to {model_save_path} ({best_cfg['id']}, Val F1={best_f1:.4f}, Val AUC={best_metrics['roc_auc']:.4f})")
    return best_model, best_metrics

if __name__ == "__main__":
    train_random_forest()
