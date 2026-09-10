"""
Comprehensive Model Evaluation Script
Academic Project: Autonomous Warehouse AI
Evaluates trained YOLO models on the isolated test set.
Reports overall and per-class metrics:
  - Precision (P)
  - Recall (R)
  - mAP@50
  - mAP@50:95
Generates publication-quality figures:
  - Confusion matrix
  - Precision-Recall curves
  - Per-class performance comparison
Saves structured metric reports to results/metrics/.
"""

import os
import sys
import json
import argparse
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import seaborn as sns
from ultralytics import YOLO

plt.style.use('seaborn-v0_8-whitegrid' if 'seaborn-v0_8-whitegrid' in plt.style.available else 'default')

CLASS_NAMES = ["person", "box", "pallet", "forklift", "robot", "robotic_arm"]

def evaluate_model(
    model_path: str,
    data_yaml: str = "configs/data.yaml",
    split: str = "test",
    imgsz: int = 640,
    device: str = "cpu",
    output_prefix: str = "final_evaluation"
):
    print("==================================================")
    print("         MODEL EVALUATION ON TEST SET             ")
    print("==================================================")
    print(f"Model Path:      {model_path}")
    print(f"Data YAML:       {data_yaml}")
    print(f"Split:           {split}")
    print(f"Device:          {device}")

    if not os.path.exists(model_path):
        raise FileNotFoundError(f"Model weights not found at: {model_path}")

    model = YOLO(model_path)

    # Run official ultralytics validation on test split
    metrics = model.val(
        data=data_yaml,
        split=split,
        imgsz=imgsz,
        device=device,
        plots=True,
        save_json=True,
        verbose=True
    )

    # Extract overall metrics
    overall_p = float(metrics.box.p.mean()) if hasattr(metrics.box, 'p') and len(metrics.box.p) else 0.0
    overall_r = float(metrics.box.r.mean()) if hasattr(metrics.box, 'r') and len(metrics.box.r) else 0.0
    overall_map50 = float(metrics.box.map50)
    overall_map50_95 = float(metrics.box.map)

    # Extract per-class metrics
    per_class_results = {}
    class_indices = metrics.box.ap_class_index if hasattr(metrics.box, 'ap_class_index') else range(len(CLASS_NAMES))

    for idx, cls_idx in enumerate(class_indices):
        cname = CLASS_NAMES[cls_idx] if cls_idx < len(CLASS_NAMES) else f"class_{cls_idx}"
        p = float(metrics.box.p[idx]) if idx < len(metrics.box.p) else 0.0
        r = float(metrics.box.r[idx]) if idx < len(metrics.box.r) else 0.0
        map50 = float(metrics.box.all_ap[idx, 0]) if hasattr(metrics.box, 'all_ap') and metrics.box.all_ap.shape[1] > 0 else 0.0
        map50_95 = float(metrics.box.all_ap[idx].mean()) if hasattr(metrics.box, 'all_ap') else 0.0

        per_class_results[cname] = {
            "class_id": int(cls_idx),
            "precision": round(p, 4),
            "recall": round(r, 4),
            "map50": round(map50, 4),
            "map50_95": round(map50_95, 4)
        }

    # Ensure all 6 classes are present in dictionary even if some had 0 instances
    for idx, cname in enumerate(CLASS_NAMES):
        if cname not in per_class_results:
            per_class_results[cname] = {
                "class_id": idx,
                "precision": 0.0,
                "recall": 0.0,
                "map50": 0.0,
                "map50_95": 0.0
            }

    evaluation_report = {
        "model_path": model_path,
        "split": split,
        "overall": {
            "precision": round(overall_p, 4),
            "recall": round(overall_r, 4),
            "map50": round(overall_map50, 4),
            "map50_95": round(overall_map50_95, 4),
            "speed_ms": metrics.speed if hasattr(metrics, 'speed') else {}
        },
        "per_class": per_class_results
    }

    # Save to results/metrics/
    os.makedirs("results/metrics", exist_ok=True)
    report_file = os.path.join("results/metrics", f"{output_prefix}_metrics.json")
    with open(report_file, "w") as f:
        json.dump(evaluation_report, f, indent=2)
    print(f"[EVAL] Metrics saved to {report_file}")

    # Generate Publication-Quality Per-Class Bar Chart
    generate_per_class_barchart(per_class_results, output_prefix)

    # Print Summary Table
    print("\n==========================================================================")
    print(f"{'Class':<14} | {'Precision':<10} | {'Recall':<10} | {'mAP@50':<10} | {'mAP@50:95':<10}")
    print("--------------------------------------------------------------------------")
    for cname in CLASS_NAMES:
        m = per_class_results[cname]
        print(f"{cname:<14} | {m['precision']:<10.4f} | {m['recall']:<10.4f} | {m['map50']:<10.4f} | {m['map50_95']:<10.4f}")
    print("--------------------------------------------------------------------------")
    print(f"{'OVERALL':<14} | {overall_p:<10.4f} | {overall_r:<10.4f} | {overall_map50:<10.4f} | {overall_map50_95:<10.4f}")
    print("==========================================================================\n")

    return evaluation_report

def generate_per_class_barchart(per_class_results, output_prefix):
    os.makedirs("results/figures", exist_ok=True)
    classes = CLASS_NAMES
    map50_vals = [per_class_results[c]["map50"] * 100 for c in classes]
    map50_95_vals = [per_class_results[c]["map50_95"] * 100 for c in classes]
    prec_vals = [per_class_results[c]["precision"] * 100 for c in classes]
    rec_vals = [per_class_results[c]["recall"] * 100 for c in classes]

    x = np.arange(len(classes))
    width = 0.2

    fig, ax = plt.subplots(figsize=(12, 6))
    r1 = ax.bar(x - 1.5*width, prec_vals, width, label='Precision (%)', color='#457b9d', edgecolor='black')
    r2 = ax.bar(x - 0.5*width, rec_vals, width, label='Recall (%)', color='#e76f51', edgecolor='black')
    r3 = ax.bar(x + 0.5*width, map50_vals, width, label='mAP@50 (%)', color='#2a9d8f', edgecolor='black')
    r4 = ax.bar(x + 1.5*width, map50_95_vals, width, label='mAP@50:95 (%)', color='#e9c46a', edgecolor='black')

    ax.set_ylabel('Score (%)', fontsize=12, fontweight='bold')
    ax.set_title('Per-Class Object Detection Benchmark on Untouched Warehouse Test Set', fontsize=14, fontweight='bold')
    ax.set_xticks(x)
    ax.set_xticklabels([c.upper() for c in classes], fontsize=11, fontweight='bold')
    ax.set_ylim(0, 105)
    ax.legend(loc='upper right', frameon=True, fontsize=10)

    for r in [r3]: # Label mAP@50 on top of bars
        for bar in r:
            h = bar.get_height()
            ax.text(bar.get_x() + bar.get_width()/2., h + 1.5, f"{h:.1f}%", ha='center', va='bottom', fontsize=8, fontweight='bold')

    plt.tight_layout()
    fig_path = os.path.join("results/figures", f"{output_prefix}_per_class.png")
    plt.savefig(fig_path, dpi=300)
    plt.close()
    print(f"[FIG] Saved: {fig_path}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Evaluate Warehouse YOLO Model")
    parser.add_argument("--model", type=str, required=True, help="Path to best.pt weights")
    parser.add_argument("--data", type=str, default="configs/data.yaml", help="Path to data.yaml")
    parser.add_argument("--split", type=str, default="test", help="Split to evaluate (test/val)")
    parser.add_argument("--imgsz", type=int, default=640, help="Image size")
    parser.add_argument("--device", type=str, default="cpu", help="Device (cpu, 0)")
    parser.add_argument("--prefix", type=str, default="final_evaluation", help="Output prefix name")

    args = parser.parse_args()
    evaluate_model(
        model_path=args.model,
        data_yaml=args.data,
        split=args.split,
        imgsz=args.imgsz,
        device=args.device,
        output_prefix=args.prefix
    )
