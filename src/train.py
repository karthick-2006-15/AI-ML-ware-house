"""
Modular Training & Fine-Tuning Pipeline
Academic Project: Autonomous Warehouse AI
Implements reproducible multi-experiment training matrix across 4 experiments:
  - Experiment 1: Baseline YOLOv8n on Standard Cleaned Warehouse Dataset
  - Experiment 2: YOLOv8n on Curated Class-Balanced Dataset
  - Experiment 3: YOLOv8n with Warehouse Domain Augmentations
  - Experiment 4: YOLOv8s Model Scaling Comparison
Logs all experimental runs to experiment_log.csv and archives weights.
"""

import os
import sys
import time
import argparse
import datetime
import pandas as pd
import torch
import yaml
from ultralytics import YOLO

EXPERIMENT_LOG_PATH = "experiment_log.csv"

LOG_COLUMNS = [
    "experiment_id",
    "date",
    "dataset_version",
    "model",
    "image_size",
    "batch_size",
    "epochs",
    "learning_rate",
    "augmentation",
    "precision",
    "recall",
    "map50",
    "map50_95",
    "training_time_sec",
    "device",
    "parameters",
    "weights_path",
    "notes"
]

def init_experiment_log():
    if not os.path.exists(EXPERIMENT_LOG_PATH):
        df = pd.DataFrame(columns=LOG_COLUMNS)
        df.to_csv(EXPERIMENT_LOG_PATH, index=False)

def log_experiment(record: dict):
    init_experiment_log()
    df = pd.read_csv(EXPERIMENT_LOG_PATH)
    # Check if record with experiment_id already exists; update or append
    if record["experiment_id"] in df["experiment_id"].values:
        df = df[df["experiment_id"] != record["experiment_id"]]
    df = pd.concat([df, pd.DataFrame([record])], ignore_index=True)
    df.to_csv(EXPERIMENT_LOG_PATH, index=False)
    print(f"[LOG] Experiment {record['experiment_id']} successfully recorded in {EXPERIMENT_LOG_PATH}")

def run_experiment(
    exp_id: int,
    epochs: int = 15,
    batch_size: int = 16,
    imgsz: int = 640,
    device: str = None
):
    init_experiment_log()

    # Determine hardware device
    if device is None:
        device = "0" if torch.cuda.is_available() else "cpu"
    print(f"Using Compute Device: {device} (PyTorch {torch.__version__}, CUDA available: {torch.cuda.is_available()})")

    # Define Experiment Configurations
    configs = {
        1: {
            "name": "Exp1_Baseline_YOLOv8n",
            "model_cfg": "yolov8n.pt",
            "data_yaml": os.path.abspath("configs/data.yaml"),
            "dataset_version": "Standard_Cleaned_Pool",
            "output_dir": "models/baseline",
            "hyp_yaml": "configs/hyp_baseline.yaml",
            "aug_name": "Standard Default",
            "notes": "Baseline fine-tuning of YOLOv8n on raw proportional cleaned warehouse dataset"
        },
        2: {
            "name": "Exp2_Balanced_YOLOv8n",
            "model_cfg": "yolov8n.pt",
            "data_yaml": os.path.abspath("configs/data_balanced.yaml"),
            "dataset_version": "Curated_Class_Balanced",
            "output_dir": "models/experiments/exp2_balanced",
            "hyp_yaml": "configs/hyp_baseline.yaml",
            "aug_name": "Standard Default",
            "notes": "Fine-tuning on curated balanced dataset addressing 1000:1 carton/pallet imbalance"
        },
        3: {
            "name": "Exp3_Augmented_YOLOv8n",
            "model_cfg": "yolov8n.pt",
            "data_yaml": os.path.abspath("configs/data_balanced.yaml"),
            "dataset_version": "Curated_Class_Balanced",
            "output_dir": "models/experiments/exp3_augmented",
            "hyp_yaml": "configs/hyp_augmented.yaml",
            "aug_name": "Warehouse Domain Augmentations (HSV/Perspective/Mosaic)",
            "notes": "Fine-tuning with warehouse-specific augmentations (lighting, angles, horizontal-only flips)"
        },
        4: {
            "name": "Exp4_Scaled_YOLOv8s",
            "model_cfg": "yolov8s.pt",
            "data_yaml": os.path.abspath("configs/data_balanced.yaml"),
            "dataset_version": "Curated_Class_Balanced",
            "output_dir": "models/final",
            "hyp_yaml": "configs/hyp_augmented.yaml",
            "aug_name": "Warehouse Domain Augmentations",
            "batch_size": 8,
            "notes": "Architecture scale comparison: YOLOv8s (11.2M params) vs YOLOv8n (3.2M params)"
        }
    }

    if exp_id not in configs:
        raise ValueError(f"Invalid experiment ID {exp_id}. Choose 1, 2, 3, or 4.")

    cfg = configs[exp_id]
    print(f"\n==================================================")
    print(f"   STARTING {cfg['name'].upper()}")
    print(f"==================================================")
    print(f"Model:           {cfg['model_cfg']}")
    print(f"Dataset YAML:    {cfg['data_yaml']}")
    print(f"Hyperparameters: {cfg['hyp_yaml']}")
    print(f"Epochs:          {epochs}")
    actual_batch = cfg.get("batch_size", batch_size)
    print(f"Batch Size:      {actual_batch}")
    print(f"Image Size:      {imgsz}")
    print(f"Device:          {device}")

    # Load custom hyperparameters if present
    hyp_dict = {}
    if os.path.exists(cfg["hyp_yaml"]):
        with open(cfg["hyp_yaml"], "r") as f:
            hyp_dict = yaml.safe_load(f) or {}

    # Load Model
    model = YOLO(cfg["model_cfg"])
    param_count = sum(p.numel() for p in model.model.parameters()) if hasattr(model, 'model') and model.model else "3.2M"

    start_time = time.time()

    # Launch Training
    results = model.train(
        data=cfg["data_yaml"],
        epochs=epochs,
        batch=actual_batch,
        imgsz=imgsz,
        device=device,
        project=os.path.abspath(os.path.dirname(cfg["output_dir"])),
        name=os.path.basename(cfg["output_dir"]),
        exist_ok=True,
        save=True,
        val=True,
        plots=True,
        workers=2,
        **hyp_dict
    )

    elapsed_time = round(time.time() - start_time, 2)
    print(f"Training completed in {elapsed_time:.2f} seconds ({elapsed_time/60:.2f} minutes).")

    # Evaluate validation metrics from training results
    candidates = [
        os.path.abspath(os.path.join(cfg["output_dir"], "weights", "best.pt")),
        os.path.join(cfg["output_dir"], "weights", "best.pt"),
        os.path.join("runs", "detect", os.path.basename(cfg["output_dir"]), "weights", "best.pt"),
        os.path.join("runs", "detect", "models", os.path.basename(cfg["output_dir"]), "weights", "best.pt"),
        os.path.join(os.path.dirname(cfg["output_dir"]), os.path.basename(cfg["output_dir"]), "weights", "best.pt")
    ]
    best_weight = None
    for c in candidates:
        if os.path.exists(c):
            best_weight = c
            break

    if best_weight is None:
        raise FileNotFoundError(f"Could not locate best.pt for {cfg['name']}. Checked candidates: {candidates}")

    # Run quick validation on best weight
    print(f"Evaluating validation metrics on best weights: {best_weight}")
    val_model = YOLO(best_weight)
    val_res = val_model.val(data=cfg["data_yaml"], split="val", imgsz=imgsz, device=device, verbose=False)

    p = float(val_res.box.p.mean()) if hasattr(val_res.box, 'p') and len(val_res.box.p) else 0.0
    r = float(val_res.box.r.mean()) if hasattr(val_res.box, 'r') and len(val_res.box.r) else 0.0
    map50 = float(val_res.box.map50)
    map50_95 = float(val_res.box.map)

    log_entry = {
        "experiment_id": f"EXP-{exp_id:02d}",
        "date": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "dataset_version": cfg["dataset_version"],
        "model": cfg["model_cfg"].replace(".pt", ""),
        "image_size": imgsz,
        "batch_size": batch_size,
        "epochs": epochs,
        "learning_rate": hyp_dict.get("lr0", 0.01),
        "augmentation": cfg["aug_name"],
        "precision": round(p, 4),
        "recall": round(r, 4),
        "map50": round(map50, 4),
        "map50_95": round(map50_95, 4),
        "training_time_sec": elapsed_time,
        "device": str(device),
        "parameters": param_count,
        "weights_path": best_weight,
        "notes": cfg["notes"]
    }

    log_experiment(log_entry)
    print(f"Validation mAP@50: {map50:.4f}, mAP@50-95: {map50_95:.4f}, Precision: {p:.4f}, Recall: {r:.4f}")
    return log_entry

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train Warehouse YOLO Detector")
    parser.add_argument("--experiment", type=int, default=1, choices=[1, 2, 3, 4], help="Experiment ID to run")
    parser.add_argument("--epochs", type=int, default=15, help="Number of epochs")
    parser.add_argument("--batch", type=int, default=16, help="Batch size")
    parser.add_argument("--imgsz", type=int, default=640, help="Image size")
    parser.add_argument("--device", type=str, default=None, help="Device (cpu, 0)")

    args = parser.parse_args()
    run_experiment(
        exp_id=args.experiment,
        epochs=args.epochs,
        batch_size=args.batch,
        imgsz=args.imgsz,
        device=args.device
    )
