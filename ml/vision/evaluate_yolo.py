import os
import json
from ultralytics import YOLO

def evaluate_yolo():
    model_path = os.path.join("runs", "detect", "models", "yolo", "warehouse_vision", "weights", "best.pt")
    if not os.path.exists(model_path):
        print(f"ERROR: Model not found at {model_path}")
        return
        
    data_yaml = os.path.abspath(os.path.join("data", "raw", "vision", "dataset.yaml"))
    
    print("Loading trained YOLO model for evaluation...")
    model = YOLO(model_path)
    
    # Evaluate model
    metrics = model.val(data=data_yaml)
    
    # Save metrics metadata
    metadata = {
        "model_name": "YOLOv8n",
        "dataset": "Open Images V7 (Box, Person)",
        "metrics": {
            "mAP50": metrics.box.map50,
            "mAP50-95": metrics.box.map,
            "precision": metrics.box.p.mean() if len(metrics.box.p) else 0,
            "recall": metrics.box.r.mean() if len(metrics.box.r) else 0
        }
    }
    
    os.makedirs(os.path.join("models", "yolo"), exist_ok=True)
    with open(os.path.join("models", "yolo", "yolo_metadata.json"), "w") as f:
        json.dump(metadata, f, indent=4)
        
    print(f"Evaluation complete. Metrics saved.")
    print(f"mAP50: {metadata['metrics']['mAP50']:.4f}")

if __name__ == "__main__":
    evaluate_yolo()
