import os
import joblib
import json
import xgboost as xgb
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score

def train_stockout():
    data_path = os.path.join("data", "processed", "warehouse", "warehouse_dataset.pkl")
    out_dir = os.path.join("models", "xgboost")
    os.makedirs(out_dir, exist_ok=True)
    
    dataset = joblib.load(data_path)
    X_train, X_test = dataset['X_train'], dataset['X_test']
    y_train, y_test = dataset['ys_train'], dataset['ys_test']
    
    print("Training Baselines...")
    lr = LogisticRegression(max_iter=1000)
    lr.fit(X_train, y_train)
    lr_pred = lr.predict(X_test)
    
    rf = RandomForestClassifier(n_estimators=50, random_state=42)
    rf.fit(X_train, y_train)
    rf_pred = rf.predict(X_test)
    
    print("Training XGBoost...")
    model = xgb.XGBClassifier(n_estimators=100, learning_rate=0.1, random_state=42, use_label_encoder=False, eval_metric='logloss')
    model.fit(X_train, y_train)
    xgb_pred = model.predict(X_test)
    xgb_prob = model.predict_proba(X_test)[:, 1]
    
    metrics = {
        "Logistic Regression": {
            "Accuracy": accuracy_score(y_test, lr_pred),
            "F1": f1_score(y_test, lr_pred)
        },
        "Random Forest": {
            "Accuracy": accuracy_score(y_test, rf_pred),
            "F1": f1_score(y_test, rf_pred)
        },
        "XGBoost": {
            "Accuracy": accuracy_score(y_test, xgb_pred),
            "Precision": precision_score(y_test, xgb_pred),
            "Recall": recall_score(y_test, xgb_pred),
            "F1": f1_score(y_test, xgb_pred),
            "ROC-AUC": roc_auc_score(y_test, xgb_prob)
        }
    }
    
    for m, vals in metrics.items():
        print(f"{m}: Accuracy={vals['Accuracy']:.2f}, F1={vals['F1']:.2f}")
        
    model_path = os.path.join(out_dir, "stockout_model.pkl")
    joblib.dump(model, model_path)
    
    metadata = {
        "model_name": "XGBoost Classifier (Stockout Risk)",
        "features": dataset['feature_names'],
        "target": "stockout_binary",
        "metrics": metrics["XGBoost"]
    }
    
    with open(os.path.join(out_dir, "stockout_metadata.json"), "w") as f:
        json.dump(metadata, f, indent=4)
        
    print(f"Saved model to {model_path}")

if __name__ == "__main__":
    train_stockout()
