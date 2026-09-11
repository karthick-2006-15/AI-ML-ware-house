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
from ultralytics import YOLO

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
        # LAYER 1: General Object Detector (COCO - filtered to allowed facility classes)
        self.general_model = YOLO("yolov8n.pt")
        
        # LAYER 2: Warehouse Specific 6-Class Detector
        model_candidates = [
            os.path.join("models", "final", "weights", "best.pt"),
            os.path.join("models", "experiments", "exp3_augmented", "weights", "best.pt"),
            os.path.join("models", "experiments", "exp2_balanced", "weights", "best.pt"),
            os.path.join("models", "baseline", "weights", "best.pt"),
            os.path.join("runs", "detect", "models", "yolo", "warehouse_vision_v3", "weights", "best.pt"),
            os.path.join("runs", "detect", "models", "yolo", "warehouse_vision_v2", "weights", "best.pt"),
            os.path.join("runs", "detect", "models", "yolo", "warehouse_vision", "weights", "best.pt")
        ]
        
        self.warehouse_model = None
        self.model_path = None
        for cand in model_candidates:
            if os.path.exists(cand):
                try:
                    self.warehouse_model = YOLO(cand)
                    self.model_path = cand
                    print(f"[VISION] Loaded Warehouse Model from: {cand}")
                    break
                except Exception as e:
                    print(f"[VISION] Failed to load candidate {cand}: {e}")

    def predict_frame(self, img: np.ndarray, conf_threshold: float = 0.25, render_annotated: bool = True):
        if img is None or img.size == 0:
            raise ValueError("Empty or invalid image frame provided.")
            
        gen_detections = []
        wh_detections = []
        
        # 1. Run General Detector (COCO) with Class Filtering
        gen_results = self.general_model(img, conf=conf_threshold, verbose=False)
        for result in gen_results:
            for box in result.boxes:
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                conf = float(box.conf[0])
                cls_id = int(box.cls[0])
                class_name = self.general_model.names[cls_id]
                
                if class_name.lower() in ALLOWED_GENERAL_CLASSES:
                    gen_detections.append({
                        "class": class_name,
                        "class_name": class_name,
                        "confidence": round(conf, 4),
                        "bbox": [round(x1, 2), round(y1, 2), round(x2, 2), round(y2, 2)],
                        "source": "general"
                    })
                
        # 2. Run Warehouse Detector (6 Standardized Classes)
        if self.warehouse_model:
            wh_results = self.warehouse_model(img, conf=conf_threshold, verbose=False)
            for result in wh_results:
                for box in result.boxes:
                    x1, y1, x2, y2 = box.xyxy[0].tolist()
                    conf = float(box.conf[0])
                    cls_id = int(box.cls[0])
                    class_name = self.warehouse_model.names[cls_id]
                    wh_detections.append({
                        "class": class_name,
                        "class_name": class_name,
                        "confidence": round(conf, 4),
                        "bbox": [round(x1, 2), round(y1, 2), round(x2, 2), round(y2, 2)],
                        "source": "warehouse"
                    })
                    
        # 3. Intelligent Fusion & Deduplication
        final_detections = []
        
        # Add high-priority warehouse detections first
        for det in wh_detections:
            if not any(calculate_iou(det["bbox"], ex["bbox"]) > 0.65 and det["class"] == ex["class"] for ex in final_detections):
                final_detections.append(det)

        # Merge complementary general detections (e.g. Person, vehicle)
        for g in gen_detections:
            g_cls = g["class"].lower()
            is_dup = False
            for ex in list(final_detections):
                iou = calculate_iou(g["bbox"], ex["bbox"])
                if iou > 0.4:
                    is_dup = True
                    if g_cls == "person" and ex["class"].lower() == "person":
                        if g["confidence"] > ex["confidence"]:
                            ex["confidence"] = g["confidence"]
                    break
            if not is_dup:
                final_detections.append(g)

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

if __name__ == "__main__":
    import sys, pprint
    if len(sys.argv) > 1:
        infer = VisionInference()
        res = infer.predict_image(sys.argv[1])
        res["annotated_image"] = res["annotated_image"][:30] + "..." if res["annotated_image"] else None
        pprint.pprint(res)
