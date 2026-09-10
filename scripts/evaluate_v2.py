import os
import glob
from ultralytics import YOLO
import json

def evaluate():
    model_path = os.path.join("runs", "detect", "models", "yolo", "warehouse_vision_v2", "weights", "best.pt")
    if not os.path.exists(model_path):
        print(f"Weights not found yet at {model_path}")
        return
        
    print(f"Evaluating {model_path} on independent test set...")
    model = YOLO(model_path)
    
    data_yaml = os.path.abspath(os.path.join("data", "warehouse_robot_remapped", "dataset.yaml"))
    
    # Run validation on test split
    metrics = model.val(
        data=data_yaml,
        split='test',
        imgsz=416,
        batch=16,
        device="cpu",
        plots=True,
        save_json=True
    )
    
    class_names = model.names
    print("\n=== TEST SET EVALUATION METRICS ===")
    print(f"{'Class':<12} | {'Precision':<10} | {'Recall':<10} | {'mAP50':<10} | {'mAP50-95':<10}")
    print("-" * 60)
    
    results = {}
    
    # Per-class metrics
    for idx, name in class_names.items():
        p = metrics.box.p[idx] if len(metrics.box.p) > idx else 0.0
        r = metrics.box.r[idx] if len(metrics.box.r) > idx else 0.0
        map50 = metrics.box.ap50[idx] if len(metrics.box.ap50) > idx else 0.0
        map50_95 = metrics.box.ap[idx] if len(metrics.box.ap) > idx else 0.0
        print(f"{name:<12} | {p:<10.4f} | {r:<10.4f} | {map50:<10.4f} | {map50_95:<10.4f}")
        results[name] = {
            "precision": float(p),
            "recall": float(r),
            "mAP50": float(map50),
            "mAP50-95": float(map50_95)
        }
        
    all_p = metrics.box.mp
    all_r = metrics.box.mr
    all_map50 = metrics.box.map50
    all_map = metrics.box.map
    print("-" * 60)
    print(f"{'ALL (Mean)':<12} | {all_p:<10.4f} | {all_r:<10.4f} | {all_map50:<10.4f} | {all_map:<10.4f}")
    
    # Save metrics json
    out_json = os.path.join("models", "yolo", "yolo_v2_metrics.json")
    os.makedirs(os.path.dirname(out_json), exist_ok=True)
    with open(out_json, "w") as f:
        json.dump({
            "model": "YOLOv8n-Warehouse-v2",
            "classes": class_names,
            "overall": {
                "precision": float(all_p),
                "recall": float(all_r),
                "mAP50": float(all_map50),
                "mAP50-95": float(all_map)
            },
            "per_class": results
        }, f, indent=2)
    print(f"\nSaved metrics to {out_json}")

if __name__ == "__main__":
    evaluate()
