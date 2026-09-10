import os
from ultralytics import YOLO

def main():
    data_yaml = os.path.abspath(os.path.join("data", "warehouse_robot_remapped", "dataset.yaml"))
    print(f"Starting training on {data_yaml}...")
    
    # Load pretrained YOLOv8n
    model = YOLO("yolov8n.pt")
    
    # Train
    results = model.train(
        data=data_yaml,
        epochs=25,
        patience=7,
        imgsz=416,
        batch=16,
        project=os.path.join("runs", "detect", "models", "yolo"),
        name="warehouse_vision_v2",
        exist_ok=True,
        device="cpu",
        workers=2,
        val=True,
        save=True
    )
    
    print("Training finished!")
    best_weight = os.path.join("runs", "detect", "models", "yolo", "warehouse_vision_v2", "weights", "best.pt")
    print(f"Best model weights saved to: {best_weight}")

if __name__ == "__main__":
    main()
