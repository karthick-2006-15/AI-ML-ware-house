"""
Warehouse Vision Inference Engine with 6-Class Warehouse Support
Academic Project: Autonomous Warehouse AI
Seamlessly integrates with FastAPI backend (backend/api_ml.py) and React Dashboard.
Detects: person, box, pallet, forklift, robot, robotic_arm
"""

import os
import cv2
import base64
import numpy as np
import gc

def calculate_iou(box1, box2):
    x1_1, y1_1, x2_1, y2_1 = box1
    x1_2, y1_2, x2_2, y2_2 = box2
    
    xi1 = max(x1_1, x1_2)
    yi1 = max(y1_1, y1_2)
    xi2 = min(x1_2, x2_2)
    yi2 = min(y1_2, y2_2)
    
    inter_area = max(0, xi2 - xi1) * max(0, yi2 - yi1)
    box1_area = (x2_1 - x1_1) * (y2_1 - y1_1)
    box2_area = (x2_2 - x1_2) * (y2_2 - y1_2)
    
    union_area = box1_area + box2_area - inter_area
    if union_area <= 0:
        return 0.0
    return inter_area / union_area

ALLOWED_GENERAL_CLASSES = {
    "person", "car", "truck", "bus", "motorcycle", "bicycle",
    "chair", "couch", "bottle", "cup", "laptop", "cell phone",
    "dog", "cat", "traffic light", "fire hydrant", "stop sign"
}

CLASS_PALETTE = {
    "person": (0, 220, 0),       # Green
    "box": (0, 165, 255),        # Orange
    "pallet": (42, 42, 165),      # Brown
    "forklift": (200, 0, 200),    # Magenta
    "robot": (255, 128, 0),      # Blue
    "robotic_arm": (60, 60, 240)  # Red
}

class VisionInference:
    def __init__(self):
        # Restrict CPU threads and reduce memory footprint for cloud containers
        os.environ["OMP_NUM_THREADS"] = "1"
        os.environ["MKL_NUM_THREADS"] = "1"
        os.environ["YOLO_VERBOSE"] = "False"
        
        try:
            import torch
            torch.set_num_threads(1)
        except Exception:
            pass

        from ultralytics import YOLO

        repo_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        model_candidates = [
            os.path.join(repo_root, "models", "final", "weights", "best.pt"),
            os.path.join(repo_root, "models", "experiments", "exp3_augmented", "weights", "best.pt"),
            os.path.join(repo_root, "models", "baseline", "weights", "best.pt"),
            os.path.join("models", "final", "weights", "best.pt"),
        ]
        
        self.warehouse_model = None
        self.general_model = None
        self.model_path = None
        
        # 1. Primary: Custom trained 6-class Warehouse YOLOv8 model
        for cand in model_candidates:
            if os.path.exists(cand):
                try:
                    self.warehouse_model = YOLO(cand)
                    self.model_path = cand
                    print(f"[VISION] Loaded Warehouse Model from: {cand}")
                    break
                except Exception as e:
                    print(f"[VISION] Failed to load candidate {cand}: {e}")

        # 2. Fallback: Only if custom weights are missing, use yolov8n.pt
        if self.warehouse_model is None:
            try:
                print("[VISION] Custom warehouse model not found. Falling back to yolov8n.pt")
                self.general_model = YOLO("yolov8n.pt")
                self.model_path = "yolov8n.pt"
            except Exception as e:
                print(f"[VISION] Failed to load yolov8n.pt: {e}")

    def predict_frame(self, img: np.ndarray, conf_threshold: float = 0.25, render_annotated: bool = True):
        if img is None or img.size == 0:
            raise ValueError("Empty or invalid image frame provided.")
            
        final_detections = []
        active_model = self.warehouse_model if self.warehouse_model else self.general_model
        
        if active_model:
            results = active_model(img, conf=conf_threshold, verbose=False)
            for result in results:
                for box in result.boxes:
                    x1, y1, x2, y2 = box.xyxy[0].tolist()
                    conf = float(box.conf[0])
                    cls_id = int(box.cls[0])
                    class_name = active_model.names[cls_id]
                    
                    # If using fallback general detector, filter to allowed facility classes
                    if self.warehouse_model is None and class_name.lower() not in ALLOWED_GENERAL_CLASSES:
                        continue
                        
                    final_detections.append({
                        "class": class_name,
                        "class_name": class_name,
                        "confidence": round(conf, 4),
                        "bbox": [round(x1, 2), round(y1, 2), round(x2, 2), round(y2, 2)],
                        "source": "warehouse" if self.warehouse_model else "general"
                    })

        # Render annotated image if requested
        annotated_b64 = None
        if render_annotated and img is not None:
            display_img = img.copy()
            for det in final_detections:
                x1, y1, x2, y2 = [int(v) for v in det["bbox"]]
                cname = det["class"]
                conf = det["confidence"]
                label = f"{cname} {conf:.2f}"
                
                color = CLASS_PALETTE.get(cname.lower(), (200, 200, 0))
                cv2.rectangle(display_img, (x1, y1), (x2, y2), color, 2)
                
                (lw, lh), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.55, 2)
                cv2.rectangle(display_img, (x1, max(0, y1 - lh - 6)), (x1 + lw + 6, y1), color, -1)
                cv2.putText(display_img, label, (x1 + 3, y1 - 4), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 2)
                
            _, buffer = cv2.imencode('.jpg', display_img)
            annotated_b64 = base64.b64encode(buffer).decode('utf-8')
            
        unique_classes = sorted(list(set(d["class"] for d in final_detections)))
        summary_text = unique_classes if unique_classes else ["Unknown / Unsupported"]
        
        return {
            "detections": final_detections,
            "object_count": len(final_detections),
            "summary": summary_text,
            "image_summary": f"This image contains: {', '.join(unique_classes)}" if unique_classes else "No supported objects were confidently detected.",
            "annotated_image": f"data:image/jpeg;base64,{annotated_b64}" if annotated_b64 else None
        }

    def predict_image(self, image_path: str, conf_threshold: float = 0.25):
        if not os.path.exists(image_path):
            raise FileNotFoundError(f"Image {image_path} not found.")
        img = cv2.imread(image_path)
        if img is None:
            raise ValueError(f"Could not read image from {image_path}")
        return self.predict_frame(img, conf_threshold=conf_threshold, render_annotated=True)

_vision_infer_instance = None

def get_vision_inference() -> "VisionInference":
    global _vision_infer_instance
    if _vision_infer_instance is None:
        _vision_infer_instance = VisionInference()
    return _vision_infer_instance

def get_vision_metadata() -> dict:
    repo_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    best_path = os.path.join(repo_root, "models", "final", "weights", "best.pt")
    exists = os.path.exists(best_path) or os.path.exists("models/final/weights/best.pt")
    return {
        "warehouse_detector": "YOLOv8",
        "warehouse_model_loaded": exists,
        "warehouse_model_path": best_path if exists else "None",
        "warehouse_classes": ["person", "box", "pallet", "forklift", "robot", "robotic_arm"],
        "general_detector": {
            "loaded": True,
            "classes_count": 80
        },
        "yolo_ready": exists
    }

if __name__ == "__main__":
    import sys, pprint
    if len(sys.argv) > 1:
        infer = get_vision_inference()
        res = infer.predict_image(sys.argv[1])
        res["annotated_image"] = res["annotated_image"][:30] + "..." if res["annotated_image"] else None
        pprint.pprint(res)
