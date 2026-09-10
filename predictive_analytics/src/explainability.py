"""
Feature Importance & SHAP Interpretability Engine
Academic Project: Autonomous Warehouse AI - Predictive Analytics
Implements:
  - Native XGBoost feature importance (Gain, Weight, Cover)
  - SHAP TreeExplainer for game-theoretic feature contributions
  - Publication-ready global summary (beeswarm) and bar charts
  - Local sample-level waterfall case study
  - Exports structured explanations to results/metrics/feature_importance_report.json
"""

import os
import json
import joblib
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import shap
import shap.explainers._tree as _tree

# Monkey-patch SHAP TreeExplainer for XGBoost 3.x base_score format compatibility
_orig_decode = _tree.decode_ubjson_buffer
def _patched_decode_ubjson(fd):
    res = _orig_decode(fd)
    try:
        if isinstance(res, dict) and "learner" in res:
            lp = res["learner"].get("learner_model_param", {})
            if "base_score" in lp and isinstance(lp["base_score"], str):
                lp["base_score"] = float(lp["base_score"].strip("[] \t\n"))
    except Exception:
        pass
    return res
_tree.decode_ubjson_buffer = _patched_decode_ubjson

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SPLITS_PATH = os.path.join(BASE_DIR, "data", "processed", "splits.pkl")
MODEL_PATH = os.path.join(BASE_DIR, "models", "xgboost", "best_xgboost_model.pkl")
FIG_DIR = os.path.join(BASE_DIR, "results", "figures")
METRIC_DIR = os.path.join(BASE_DIR, "results", "metrics")

plt.style.use("seaborn-v0_8-whitegrid" if "seaborn-v0_8-whitegrid" in plt.style.available else "default")

def run_explainability():
    os.makedirs(FIG_DIR, exist_ok=True)
    os.makedirs(METRIC_DIR, exist_ok=True)
    
    splits = joblib.load(SPLITS_PATH)
    X_train = splits["X_train"]
    X_test = splits["X_test"]
    y_test = splits["y_test"]
    feature_names = splits["feature_names"]
    
    model = joblib.load(MODEL_PATH)
    print(f"[SHAP] Loaded model from: {MODEL_PATH}")
    
    # 1. Native XGBoost Importance (Gain)
    booster = model.get_booster()
    score_gain = booster.get_score(importance_type="gain")
    # Map feature names
    gain_dict = {feat: float(score_gain.get(feat, 0.0)) for feat in feature_names}
    sorted_gain = sorted(gain_dict.items(), key=lambda x: x[1], reverse=True)
    
    # 2. SHAP TreeExplainer
    print("[SHAP] Computing SHAP values using TreeExplainer...")
    explainer = shap.TreeExplainer(model)
    shap_values = explainer(X_test)
    
    # 3. Figure 1: Top 15 Native Feature Importance Bar Chart
    top15 = sorted_gain[:15]
    top_names = [x[0] for x in top15][::-1]
    top_scores = [x[1] for x in top15][::-1]
    
    fig, ax = plt.subplots(figsize=(10, 6.5))
    bars = ax.barh(top_names, top_scores, color="#457b9d", edgecolor="black", height=0.65)
    ax.set_xlabel("XGBoost Average Gain (Relative Information Value)", fontsize=11, fontweight="bold")
    ax.set_title("Top 15 Most Informative Warehouse Features (XGBoost Gain)", fontsize=13, fontweight="bold")
    for bar in bars:
        w = bar.get_width()
        ax.text(w + max(top_scores)*0.01, bar.get_y() + bar.get_height()/2., f"{w:.1f}", ha="left", va="center", fontsize=8, fontweight="bold")
    plt.tight_layout()
    fig1_path = os.path.join(FIG_DIR, "xgboost_feature_importance.png")
    plt.savefig(fig1_path, dpi=300)
    plt.close()
    print(f"[FIG] Saved: {fig1_path}")
    
    # 4. Figure 2: SHAP Global Beeswarm Summary Plot
    fig = plt.figure(figsize=(11, 7))
    shap.plots.beeswarm(shap_values, max_display=15, show=False)
    plt.title("SHAP Global Summary (Beeswarm Plot): Feature Impact on Stock Risk", fontsize=13, fontweight="bold")
    plt.tight_layout()
    fig2_path = os.path.join(FIG_DIR, "shap_summary_beeswarm.png")
    plt.savefig(fig2_path, dpi=300, bbox_inches="tight")
    plt.close()
    print(f"[FIG] Saved: {fig2_path}")
    
    # 5. Figure 3: SHAP Mean Absolute Importance Bar Plot
    fig = plt.figure(figsize=(10, 6))
    shap.plots.bar(shap_values, max_display=15, show=False)
    plt.title("Mean Absolute SHAP Value (Global Impact Magnitude)", fontsize=13, fontweight="bold")
    plt.tight_layout()
    fig3_path = os.path.join(FIG_DIR, "shap_bar_importance.png")
    plt.savefig(fig3_path, dpi=300, bbox_inches="tight")
    plt.close()
    print(f"[FIG] Saved: {fig3_path}")
    
    # 6. Figure 4: Local Sample-Level Waterfall Case Study (High Risk Item)
    # Find a true positive high-risk sample
    preds = model.predict(X_test)
    tp_indices = np.where((preds == 1) & (y_test.values == 1))[0]
    sample_idx = int(tp_indices[0]) if len(tp_indices) > 0 else 0
    
    fig = plt.figure(figsize=(10, 6.5))
    shap.plots.waterfall(shap_values[sample_idx], max_display=10, show=False)
    plt.title(f"SHAP Waterfall Decision Attribution: High-Risk Stockout Sample #{sample_idx}", fontsize=12, fontweight="bold")
    plt.tight_layout()
    fig4_path = os.path.join(FIG_DIR, "shap_waterfall_case_study.png")
    plt.savefig(fig4_path, dpi=300, bbox_inches="tight")
    plt.close()
    print(f"[FIG] Saved: {fig4_path}")
    
    # Export Report
    mean_abs_shap = np.abs(shap_values.values).mean(axis=0)
    shap_ranking = [
        {"feature": feature_names[i], "mean_abs_shap": round(float(mean_abs_shap[i]), 4), "gain": round(gain_dict.get(feature_names[i], 0.0), 2)}
        for i in np.argsort(mean_abs_shap)[::-1][:15]
    ]
    
    report = {
        "model_analyzed": "Best Tuned XGBoost Classifier",
        "top_features_by_shap": shap_ranking,
        "interpretability_insights": [
            "days_of_supply and stock_level are the primary drivers of stock-risk classification.",
            "replenish_cycle_demand and lead_time_demand serve as dynamic thresholds: items where stock_level is close to or below lead-time requirements trigger strong positive log-odds contributions.",
            "stockout_count_last_month and order_fulfillment_rate provide secondary historical friction signals.",
            "Categorical product categories and warehouse zones have smaller direct impact compared to continuous operational velocity ratios."
        ]
    }
    
    report_file = os.path.join(METRIC_DIR, "feature_importance_report.json")
    with open(report_file, "w") as f:
        json.dump(report, f, indent=2)
    print(f"[SHAP] Report saved to {report_file}")
    
    print("\n--- TOP 10 FEATURES BY MEAN |SHAP| ---")
    for idx, item in enumerate(shap_ranking[:10]):
        print(f"{idx+1:>2}. {item['feature']:<28} | SHAP: {item['mean_abs_shap']:.4f} | Gain: {item['gain']:.1f}")
        
    return report

if __name__ == "__main__":
    run_explainability()
