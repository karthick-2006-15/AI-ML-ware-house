"""
Comprehensive Model Evaluation & Test Benchmarking Engine
Academic Project: Autonomous Warehouse AI - Predictive Analytics
Evaluates all trained models on the untouched 15% Test Set (481 samples):
  - Logistic Regression Baseline
  - Random Forest Ensemble
  - XGBoost Baseline
  - Tuned XGBoost
Generates publication-quality figures:
  - ROC Curves Comparison
  - Precision-Recall Curves Comparison
  - Confusion Matrices Heatmap Comparison
  - Comprehensive Metrics Bar Chart
Saves structured benchmark report to results/metrics/test_evaluation_report.json
"""

import os
import json
import joblib
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, average_precision_score, confusion_matrix,
    roc_curve, precision_recall_curve
)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SPLITS_PATH = os.path.join(BASE_DIR, "data", "processed", "splits.pkl")
FIG_DIR = os.path.join(BASE_DIR, "results", "figures")
METRIC_DIR = os.path.join(BASE_DIR, "results", "metrics")

plt.style.use("seaborn-v0_8-whitegrid" if "seaborn-v0_8-whitegrid" in plt.style.available else "default")

def evaluate_all_models_on_test():
    os.makedirs(FIG_DIR, exist_ok=True)
    os.makedirs(METRIC_DIR, exist_ok=True)
    
    splits = joblib.load(SPLITS_PATH)
    X_test = splits["X_test"]
    X_test_scaled = splits["X_test_scaled"]
    y_test = splits["y_test"]
    
    print("==================================================")
    print("        TEST SET EVALUATION & BENCHMARKING        ")
    print("==================================================")
    print(f"Untouched Test Samples: {len(y_test)} (Low Risk: {(y_test==0).sum()}, High Risk: {(y_test==1).sum()})")
    
    # Load Models
    lr_model = joblib.load(os.path.join(BASE_DIR, "models", "logistic_regression", "logistic_regression_model.pkl"))
    rf_model = joblib.load(os.path.join(BASE_DIR, "models", "random_forest", "random_forest_model.pkl"))
    xgb_model = joblib.load(os.path.join(BASE_DIR, "models", "xgboost", "best_xgboost_model.pkl"))
    
    models = {
        "Logistic Regression": {"model": lr_model, "X": X_test_scaled, "color": "#457b9d"},
        "Random Forest": {"model": rf_model, "X": X_test, "color": "#2a9d8f"},
        "Tuned XGBoost": {"model": xgb_model, "X": X_test, "color": "#e76f51"}
    }
    
    results = {}
    curves_data = {}
    
    for name, m_dict in models.items():
        clf = m_dict["model"]
        X = m_dict["X"]
        
        preds = clf.predict(X)
        probs = clf.predict_proba(X)[:, 1]
        
        acc = float(accuracy_score(y_test, preds))
        prec = float(precision_score(y_test, preds, zero_division=0))
        rec = float(recall_score(y_test, preds, zero_division=0))
        f1 = float(f1_score(y_test, preds, zero_division=0))
        auc = float(roc_auc_score(y_test, probs))
        pr_auc = float(average_precision_score(y_test, probs))
        
        cm = confusion_matrix(y_test, preds)
        tn, fp, fn, tp = [int(v) for v in cm.ravel()]
        specificity = round(tn / (tn + fp), 4) if (tn + fp) > 0 else 0.0
        
        fpr, tpr, _ = roc_curve(y_test, probs)
        p_curve, r_curve, _ = precision_recall_curve(y_test, probs)
        
        results[name] = {
            "accuracy": round(acc, 4),
            "precision": round(prec, 4),
            "recall": round(rec, 4),
            "f1": round(f1, 4),
            "roc_auc": round(auc, 4),
            "pr_auc": round(pr_auc, 4),
            "specificity": specificity,
            "confusion_matrix": {"TP": tp, "FP": fp, "TN": tn, "FN": fn}
        }
        
        curves_data[name] = {
            "fpr": fpr, "tpr": tpr, "p_curve": p_curve, "r_curve": r_curve,
            "cm": cm, "color": m_dict["color"], "auc": auc, "pr_auc": pr_auc
        }
        
    # Save JSON Report
    report_path = os.path.join(METRIC_DIR, "test_evaluation_report.json")
    with open(report_path, "w") as f:
        json.dump(results, f, indent=2)
    print(f"[EVAL] Test report saved to {report_path}")
    
    # 1. Publication Figure: ROC Curves
    fig, ax = plt.subplots(figsize=(7, 6))
    for name, c in curves_data.items():
        ax.plot(c["fpr"], c["tpr"], color=c["color"], linewidth=2.2, label=f"{name} (AUC = {c['auc']:.4f})")
    ax.plot([0, 1], [0, 1], "k--", alpha=0.5, label="Random Guess (AUC = 0.5000)")
    ax.set_xlabel("False Positive Rate (1 - Specificity)", fontsize=11, fontweight="bold")
    ax.set_ylabel("True Positive Rate (Sensitivity / Recall)", fontsize=11, fontweight="bold")
    ax.set_title("ROC Curves Comparison on Untouched Test Split", fontsize=13, fontweight="bold")
    ax.legend(loc="lower right", frameon=True, fontsize=10)
    plt.tight_layout()
    fig_path = os.path.join(FIG_DIR, "roc_curves_comparison.png")
    plt.savefig(fig_path, dpi=300)
    plt.close()
    print(f"[FIG] Saved: {fig_path}")
    
    # 2. Publication Figure: Precision-Recall Curves
    fig, ax = plt.subplots(figsize=(7, 6))
    for name, c in curves_data.items():
        ax.plot(c["r_curve"], c["p_curve"], color=c["color"], linewidth=2.2, label=f"{name} (PR-AUC = {c['pr_auc']:.4f})")
    baseline_pr = float(y_test.mean())
    ax.axhline(y=baseline_pr, color="gray", linestyle="--", alpha=0.6, label=f"No-Skill Rate ({baseline_pr:.2f})")
    ax.set_xlabel("Recall (High Risk)", fontsize=11, fontweight="bold")
    ax.set_ylabel("Precision (High Risk)", fontsize=11, fontweight="bold")
    ax.set_title("Precision-Recall Curves for High-Risk Stockout Detection", fontsize=13, fontweight="bold")
    ax.legend(loc="lower left", frameon=True, fontsize=10)
    plt.tight_layout()
    fig_path = os.path.join(FIG_DIR, "pr_curves_comparison.png")
    plt.savefig(fig_path, dpi=300)
    plt.close()
    print(f"[FIG] Saved: {fig_path}")
    
    # 3. Publication Figure: Confusion Matrices Side-by-Side
    fig, axes = plt.subplots(1, 3, figsize=(15, 4.5))
    for idx, (name, c) in enumerate(curves_data.items()):
        ax = axes[idx]
        sns.heatmap(c["cm"], annot=True, fmt="d", cmap="Blues", cbar=False, ax=ax, annot_kws={"size": 13, "weight": "bold"})
        ax.set_xticklabels(["Pred Low", "Pred High"], fontweight="bold")
        ax.set_yticklabels(["True Low", "True High"], fontweight="bold")
        ax.set_xlabel("Predicted Label", fontweight="bold")
        ax.set_ylabel("True Label", fontweight="bold")
        rec = results[name]["recall"]
        ax.set_title(f"{name}\n(Recall: {rec*100:.1f}%)", fontsize=12, fontweight="bold")
    plt.tight_layout()
    fig_path = os.path.join(FIG_DIR, "confusion_matrices_comparison.png")
    plt.savefig(fig_path, dpi=300)
    plt.close()
    print(f"[FIG] Saved: {fig_path}")
    
    # 4. Publication Figure: Metrics Comparison Bar Chart
    fig, ax = plt.subplots(figsize=(10, 5.5))
    metrics_names = ["Accuracy", "Precision", "Recall", "F1", "ROC-AUC"]
    x = np.arange(len(metrics_names))
    width = 0.25
    
    for idx, (name, c) in enumerate(curves_data.items()):
        vals = [
            results[name]["accuracy"] * 100,
            results[name]["precision"] * 100,
            results[name]["recall"] * 100,
            results[name]["f1"] * 100,
            results[name]["roc_auc"] * 100
        ]
        offset = (idx - 1) * width
        bars = ax.bar(x + offset, vals, width, label=name, color=c["color"], edgecolor="black")
        for bar in bars:
            h = bar.get_height()
            ax.text(bar.get_x() + bar.get_width()/2., h + 1.2, f"{h:.1f}%", ha="center", va="bottom", fontsize=8, fontweight="bold")
            
    ax.set_ylabel("Score (%)", fontsize=11, fontweight="bold")
    ax.set_title("Comparative Model Performance Benchmark on Untouched Test Set", fontsize=13, fontweight="bold")
    ax.set_xticks(x)
    ax.set_xticklabels(metrics_names, fontsize=11, fontweight="bold")
    ax.set_ylim(0, 110)
    ax.legend(loc="upper right", frameon=True)
    plt.tight_layout()
    fig_path = os.path.join(FIG_DIR, "model_metrics_barchart.png")
    plt.savefig(fig_path, dpi=300)
    plt.close()
    print(f"[FIG] Saved: {fig_path}")
    
    # Print Markdown Table to Terminal
    print("\n=========================================================================================")
    print(f"{'Model':<22} | {'Accuracy':<9} | {'Precision':<9} | {'Recall':<9} | {'F1-Score':<9} | {'ROC-AUC':<9} | {'PR-AUC':<9}")
    print("-----------------------------------------------------------------------------------------")
    for name, m in results.items():
        print(f"{name:<22} | {m['accuracy']:<9.4f} | {m['precision']:<9.4f} | {m['recall']:<9.4f} | {m['f1']:<9.4f} | {m['roc_auc']:<9.4f} | {m['pr_auc']:<9.4f}")
    print("=========================================================================================\n")
    
    return results

if __name__ == "__main__":
    evaluate_all_models_on_test()
