"""
Logistic Regression Baseline Training Module
Academic Project: Autonomous Warehouse AI - Predictive Analytics
Trains linear classification baseline with L2 regularization tuning on scaled features.
Logs experiment to results/experiment_log.csv.
Saves model and metadata to models/logistic_regression/.
"""

import os
import time
import json
import joblib
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SPLITS_PATH = os.path.join(BASE_DIR, "data", "processed", "splits.pkl")
MODEL_DIR = os.path.join(BASE_DIR, "models", "logistic_regression")
LOG_PATH = os.path.join(BASE_DIR, "results", "experiment_log.csv")

def init_experiment_log():
    os.makedirs(os.path.dirname(LOG_PATH), exist_ok=True)
    if not os.path.exists(LOG_PATH):
        cols = [
            "experiment_id", "date", "model_family", "model_name", "dataset_version",
            "hyperparameters", "training_time_sec", "val_accuracy", "val_precision",
            "val_recall", "val_f1", "val_roc_auc", "notes"
        ]
        pd.DataFrame(columns=cols).to_csv(LOG_PATH, index=False)

def log_experiment_entry(entry: dict):
    init_experiment_log()
    df = pd.read_csv(LOG_PATH)
    if entry["experiment_id"] in df["experiment_id"].values:
        df = df[df["experiment_id"] != entry["experiment_id"]]
    df = pd.concat([df, pd.DataFrame([entry])], ignore_index=True)
    df.to_csv(LOG_PATH, index=False)
    eid = entry["experiment_id"]
    print(f"[LOG] {eid} recorded in {LOG_PATH}")

def train_logistic_regression():
    os.makedirs(MODEL_DIR, exist_ok=True)
    splits = joblib.load(SPLITS_PATH)
    
    X_train = splits["X_train_scaled"]
    y_train = splits["y_train"]
    X_val = splits["X_val_scaled"]
    y_val = splits["y_val"]
    
    print("==================================================")
    print("      MODEL 1: LOGISTIC REGRESSION BASELINE       ")
    print("==================================================")
    
    c_candidates = [0.01, 0.1, 1.0, 10.0]
    best_c = 1.0
    best_f1 = -1.0
    best_model = None
    best_metrics = {}
    best_time = 0.0
    
    for c in c_candidates:
        t0 = time.time()
        lr = LogisticRegression(C=c, max_iter=1000, random_state=42, solver="lbfgs")
        lr.fit(X_train, y_train)
        elapsed = round(time.time() - t0, 4)
        
        val_preds = lr.predict(X_val)
        val_probs = lr.predict_proba(X_val)[:, 1]
        
        acc = accuracy_score(y_val, val_preds)
        prec = precision_score(y_val, val_preds, zero_division=0)
        rec = recall_score(y_val, val_preds, zero_division=0)
        f1 = f1_score(y_val, val_preds, zero_division=0)
        auc = roc_auc_score(y_val, val_probs)
        
        print(f"C={c:<5} | Acc: {acc:.4f} | Prec: {prec:.4f} | Recall: {rec:.4f} | F1: {f1:.4f} | ROC-AUC: {auc:.4f} | Time: {elapsed:.3f}s")
        
        if f1 > best_f1:
            best_f1 = f1
            best_c = c
            best_model = lr
            best_time = elapsed
            best_metrics = {
                "accuracy": round(acc, 4),
                "precision": round(prec, 4),
                "recall": round(rec, 4),
                "f1": round(f1, 4),
                "roc_auc": round(auc, 4)
            }
            
    # Save best model
    model_save_path = os.path.join(MODEL_DIR, "logistic_regression_model.pkl")
    joblib.dump(best_model, model_save_path)
    
    metadata = {
        "model_name": "LogisticRegression_Baseline",
        "best_hyperparameters": {"C": best_c, "max_iter": 1000, "solver": "lbfgs", "random_state": 42},
        "validation_metrics": best_metrics,
        "features": splits["feature_names"],
        "training_time_sec": best_time
    }
    with open(os.path.join(MODEL_DIR, "metadata.json"), "w") as f:
        json.dump(metadata, f, indent=2)
        
    # Log to experiment_log.csv
    import datetime
    log_entry = {
        "experiment_id": "EXP-LR-01",
        "date": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "model_family": "Logistic Regression",
        "model_name": f"LogisticRegression(C={best_c})",
        "dataset_version": "Cleaned_Warehouse_Engineered",
        "hyperparameters": f"C={best_c}, solver=lbfgs, max_iter=1000",
        "training_time_sec": best_time,
        "val_accuracy": best_metrics["accuracy"],
        "val_precision": best_metrics["precision"],
        "val_recall": best_metrics["recall"],
        "val_f1": best_metrics["f1"],
        "val_roc_auc": best_metrics["roc_auc"],
        "notes": "Baseline linear classifier on standardized features with L2 penalty"
    }
    log_experiment_entry(log_entry)
    print(f"\n[LR] Best Model Saved to {model_save_path} (Best C={best_c}, Val F1={best_f1:.4f})")
    return best_model, best_metrics

if __name__ == "__main__":
    train_logistic_regression()

