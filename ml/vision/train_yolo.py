import os
from ultralytics import YOLO

def train_yolo():
    data_yaml = os.path.abspath(os.path.join("data", "raw", "vision", "dataset.yaml"))
    
    # Check if dataset yaml exists
    if not os.path.exists(data_yaml):
        print(f"ERROR: Cannot find {data_yaml}")
        return
        
    print(f"Loading YOLOv8n and training on {data_yaml}...")
    
    # Load a pretrained model (YOLOv8 nano for speed)
    model = YOLO("yolov8n.pt")
    
    # Train the model (small epochs and batch size for demonstration constraints)
    model.train(
        data=data_yaml,
        epochs=30,           # Train enough to learn the box class

        imgsz=320,          # Small image size
        batch=8,
        project=os.path.join("models", "yolo"),
        name="warehouse_vision",
        exist_ok=True
    )
    
    print("YOLO Training complete. Model saved in models/yolo/warehouse_vision/weights/best.pt")

if __name__ == "__main__":
    train_yolo()
