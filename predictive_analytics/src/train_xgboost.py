"""
XGBoost Classifier Training & Controlled Hyperparameter Tuning Matrix
Academic Project: Autonomous Warehouse AI - Predictive Analytics
Implements:
  - Baseline XGBoost model configuration
  - Controlled tuning across tree depth, learning rate, subsample, regularization, and scale_pos_weight
  - Evaluation on isolated validation split
  - Formal logging to results/experiment_log.csv
  - Serializes best model, parameters, and metadata to models/xgboost/
"""

import os
import time
import json
import joblib
import datetime
import pandas as pd
import xgboost as xgb
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score

from train_baseline import log_experiment_entry

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SPLITS_PATH = os.path.join(BASE_DIR, "data", "processed", "splits.pkl")
MODEL_DIR = os.path.join(BASE_DIR, "models", "xgboost")

def train_xgboost_experiments():
    os.makedirs(MODEL_DIR, exist_ok=True)
    splits = joblib.load(SPLITS_PATH)
    
    X_train = splits["X_train"]
    y_train = splits["y_train"]
    X_val = splits["X_val"]
    y_val = splits["y_val"]
    
    # Calculate negative to positive ratio for scale_pos_weight
    neg_count = (y_train == 0).sum()
    pos_count = (y_train == 1).sum()
    spw_ratio = round(neg_count / pos_count, 2)
    
    print("==================================================")
    print("      MODEL 3 & 4: XGBOOST HYPERPARAMETER MATRIX   ")
    print("==================================================")
    print(f"XGBoost Version: {xgb.__version__}")
    print(f"Class Distribution: Low={neg_count}, High={pos_count} (scale_pos_weight={spw_ratio})")
    
    experiments = [
        {
            "id": "EXP-XGB-01",
            "name": "XGBoost_Default_Baseline",
            "params": {
                "n_estimators": 100, "learning_rate": 0.1, "max_depth": 3,
                "subsample": 1.0, "colsample_bytree": 1.0, "gamma": 0.0,
                "reg_lambda": 1.0, "scale_pos_weight": 1.0, "random_state": 42,
                "eval_metric": "logloss"
            },
            "notes": "Standard default XGBoost configuration without imbalance adjustment"
        },
        {
            "id": "EXP-XGB-02",
            "name": "XGBoost_Deep_Trees",
            "params": {
                "n_estimators": 150, "learning_rate": 0.05, "max_depth": 6,
                "subsample": 1.0, "colsample_bytree": 1.0, "gamma": 0.0,
                "reg_lambda": 1.0, "scale_pos_weight": 1.0, "random_state": 42,
                "eval_metric": "logloss"
            },
            "notes": "Testing deeper decision trees (depth=6) with reduced learning rate"
        },
        {
            "id": "EXP-XGB-03",
            "name": "XGBoost_Imbalance_Weighted",
            "params": {
                "n_estimators": 150, "learning_rate": 0.05, "max_depth": 4,
                "subsample": 1.0, "colsample_bytree": 1.0, "gamma": 0.0,
                "reg_lambda": 1.0, "scale_pos_weight": spw_ratio, "random_state": 42,
                "eval_metric": "logloss"
            },
            "notes": f"Addressing 2.68:1 class ratio using scale_pos_weight={spw_ratio}"
        },
        {
            "id": "EXP-XGB-04",
            "name": "XGBoost_Regularized_Subsampled",
            "params": {
                "n_estimators": 200, "learning_rate": 0.03, "max_depth": 4,
                "subsample": 0.8, "colsample_bytree": 0.8, "gamma": 1.0,
                "reg_lambda": 2.0, "scale_pos_weight": spw_ratio, "random_state": 42,
                "eval_metric": "logloss"
            },
            "notes": "Regularized tree boosting with column/row subsampling and gamma penalty"
        },
        {
            "id": "EXP-XGB-05",
            "name": "XGBoost_Balanced_Optimum",
            "params": {
                "n_estimators": 150, "learning_rate": 0.04, "max_depth": 4,
                "subsample": 0.85, "colsample_bytree": 0.85, "gamma": 0.5,
                "reg_lambda": 1.5, "scale_pos_weight": 2.0, "random_state": 42,
                "eval_metric": "logloss"
            },
            "notes": "Calibrated balance between high recall and precision preservation"
        }
    ]
    
    best_model = None
    best_f1 = -1.0
    best_exp = None
    best_metrics = {}
    best_time = 0.0
    
    for exp in experiments:
        t0 = time.time()
        clf = xgb.XGBClassifier(**exp["params"])
        clf.fit(X_train, y_train)
        elapsed = round(time.time() - t0, 4)
        
        val_preds = clf.predict(X_val)
        val_probs = clf.predict_proba(X_val)[:, 1]
        
        acc = accuracy_score(y_val, val_preds)
        prec = precision_score(y_val, val_preds, zero_division=0)
        rec = recall_score(y_val, val_preds, zero_division=0)
        f1 = f1_score(y_val, val_preds, zero_division=0)
        auc = roc_auc_score(y_val, val_probs)
        
        p = exp["params"]
        print(f"[{exp['id']}] lr={p['learning_rate']}, d={p['max_depth']}, spw={p['scale_pos_weight']}, sub={p['subsample']} | "
              f"Acc: {acc:.4f} | Prec: {prec:.4f} | Rec: {rec:.4f} | F1: {f1:.4f} | AUC: {auc:.4f} | Time: {elapsed:.2f}s")
              
        param_str = f"n={p['n_estimators']}, lr={p['learning_rate']}, d={p['max_depth']}, spw={p['scale_pos_weight']}, sub={p['subsample']}, col={p['colsample_bytree']}"
        log_entry = {
            "experiment_id": exp["id"],
            "date": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "model_family": "XGBoost",
            "model_name": exp["name"],
            "dataset_version": "Cleaned_Warehouse_Engineered",
            "hyperparameters": param_str,
            "training_time_sec": elapsed,
            "val_accuracy": round(acc, 4),
            "val_precision": round(prec, 4),
            "val_recall": round(rec, 4),
            "val_f1": round(f1, 4),
            "val_roc_auc": round(auc, 4),
            "notes": exp["notes"]
        }
        log_experiment_entry(log_entry)
        
        # In warehouse safety, we seek the model that maximizes F1 while keeping ROC-AUC high
        if f1 > best_f1:
            best_f1 = f1
            best_model = clf
            best_exp = exp
            best_time = elapsed
            best_metrics = {
                "accuracy": round(acc, 4),
                "precision": round(prec, 4),
                "recall": round(rec, 4),
                "f1": round(f1, 4),
                "roc_auc": round(auc, 4)
            }
            
    # Save Best XGBoost Model
    best_model_path = os.path.join(MODEL_DIR, "best_xgboost_model.pkl")
    joblib.dump(best_model, best_model_path)
    
    metadata = {
        "model_name": "XGBoost_Best_Stock_Risk",
        "best_experiment_id": best_exp["id"],
        "xgboost_version": xgb.__version__,
        "hyperparameters": best_exp["params"],
        "validation_metrics": best_metrics,
        "features": splits["feature_names"],
        "training_time_sec": best_time
    }
    with open(os.path.join(MODEL_DIR, "metadata.json"), "w") as f:
        json.dump(metadata, f, indent=2)
        
    print(f"\n[XGB] Best Model Saved to {best_model_path} ({best_exp['id']}, Val F1={best_f1:.4f}, Val AUC={best_metrics['roc_auc']:.4f})")
    return best_model, best_metrics

if __name__ == "__main__":
    train_xgboost_experiments()
