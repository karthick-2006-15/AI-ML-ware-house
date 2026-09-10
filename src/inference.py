"""
Warehouse AI Real-Time Inference Demonstration System
Academic Project: Autonomous Warehouse AI
Accepts:
  - Single Image
  - Directory / Batch of Images
  - Video Stream (.mp4, .avi)
  - Live Webcam Feed (source=0)
Outputs bounding boxes, standardized 6-class labels, and confidence scores.
"""

import os
import sys
import argparse
import glob
import time
import cv2
import numpy as np
from PIL import Image
from ultralytics import YOLO

CLASS_NAMES = ["person", "box", "pallet", "forklift", "robot", "robotic_arm"]

# Aesthetic BGR color palette for visualization
CLASS_COLORS = {
    0: (0, 220, 0),     # person: Bright Green
    1: (0, 165, 255),   # box: Orange
    2: (42, 42, 165),   # pallet: Brown / Wood
    3: (200, 0, 200),   # forklift: Magenta
    4: (255, 128, 0),   # robot: Cyan-blue
    5: (60, 60, 240)    # robotic_arm: Crimson Red
}

class WarehouseDetector:
    def __init__(self, model_path: str = None, conf: float = 0.25, device: str = "cpu"):
        if model_path is None:
            # Look for best candidate in models/
            candidates = [
                "models/final/weights/best.pt",
                "models/experiments/exp3_augmented/weights/best.pt",
                "models/experiments/exp2_balanced/weights/best.pt",
                "models/baseline/weights/best.pt",
                "runs/detect/models/yolo/warehouse_vision_v2/weights/best.pt",
                "yolov8n.pt"
            ]
            for c in candidates:
                if os.path.exists(c):
                    model_path = c
                    break
        
        self.model_path = model_path
        self.conf = conf
        self.device = device
        print(f"[INIT] Loading WarehouseDetector with weights: {self.model_path} on {device}")
        self.model = YOLO(self.model_path)
        self.names = self.model.names

    def predict_image(self, img_path: str, save_path: str = None):
        if not os.path.exists(img_path):
            raise FileNotFoundError(f"Image not found: {img_path}")

        img = cv2.imread(img_path)
        if img is None:
            raise ValueError(f"Unable to read image: {img_path}")

        start_t = time.time()
        results = self.model(img, conf=self.conf, device=self.device, verbose=False)
        infer_time_ms = (time.time() - start_t) * 1000

        detections = []
        for r in results:
            for b in r.boxes:
                x1, y1, x2, y2 = [int(v) for v in b.xyxy[0].tolist()]
                conf = float(b.conf[0])
                cls_id = int(b.cls[0])
                cname = CLASS_NAMES[cls_id] if cls_id < len(CLASS_NAMES) else str(cls_id)
                color = CLASS_COLORS.get(cls_id, (255, 255, 255))

                detections.append({
                    "class": cname,
                    "class_id": cls_id,
                    "confidence": round(conf, 4),
                    "bbox": [x1, y1, x2, y2]
                })

                # Draw bounding box and label
                cv2.rectangle(img, (x1, y1), (x2, y2), color, 2)
                label_text = f"{cname} {conf:.2f}"
                (lw, lh), _ = cv2.getTextSize(label_text, cv2.FONT_HERSHEY_SIMPLEX, 0.55, 2)
                cv2.rectangle(img, (x1, max(0, y1 - lh - 6)), (x1 + lw + 6, y1), color, -1)
                cv2.putText(img, label_text, (x1 + 3, y1 - 4), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 2)

        if save_path:
            os.makedirs(os.path.dirname(os.path.abspath(save_path)), exist_ok=True)
            cv2.imwrite(save_path, img)

        return {
            "image_path": img_path,
            "inference_time_ms": round(infer_time_ms, 2),
            "object_count": len(detections),
            "detections": detections,
            "annotated_image": img
        }

    def predict_directory(self, input_dir: str, output_dir: str):
        os.makedirs(output_dir, exist_ok=True)
        img_files = glob.glob(os.path.join(input_dir, "*.*"))
        img_files = [f for f in img_files if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
        print(f"[DIR] Processing {len(img_files)} images from {input_dir}...")

        all_results = []
        for img_p in img_files:
            bname = os.path.basename(img_p)
            save_p = os.path.join(output_dir, f"pred_{bname}")
            res = self.predict_image(img_p, save_path=save_p)
            print(f"  {bname}: {res['object_count']} objects detected ({res['inference_time_ms']}ms)")
            for d in res["detections"]:
                print(f"    - {d['class']} ({d['confidence']:.2f}) at {d['bbox']}")
            all_results.append(res)
        return all_results

    def predict_video(self, video_source, output_video_path: str = None):
        # video_source can be a video file path or int (0 for webcam)
        is_webcam = str(video_source).isdigit()
        cap = cv2.VideoCapture(int(video_source) if is_webcam else video_source)

        if not cap.isOpened():
            print(f"ERROR: Cannot open video source: {video_source}")
            return

        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        fps = cap.get(cv2.CAP_PROP_FPS) or 30.0

        writer = None
        if output_video_path:
            os.makedirs(os.path.dirname(os.path.abspath(output_video_path)), exist_ok=True)
            fourcc = cv2.VideoWriter_fourcc(*'mp4v')
            writer = cv2.VideoWriter(output_video_path, fourcc, fps, (width, height))

        print(f"[VIDEO] Processing stream ({width}x{height} @ {fps:.1f} FPS)... Press 'q' to stop.")
        frame_idx = 0
        try:
            while cap.isOpened():
                ret, frame = cap.read()
                if not ret:
                    break

                results = self.model(frame, conf=self.conf, device=self.device, verbose=False)
                for r in results:
                    for b in r.boxes:
                        x1, y1, x2, y2 = [int(v) for v in b.xyxy[0].tolist()]
                        conf = float(b.conf[0])
                        cls_id = int(b.cls[0])
                        cname = CLASS_NAMES[cls_id] if cls_id < len(CLASS_NAMES) else str(cls_id)
                        color = CLASS_COLORS.get(cls_id, (255, 255, 255))

                        cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
                        label_text = f"{cname} {conf:.2f}"
                        (lw, lh), _ = cv2.getTextSize(label_text, cv2.FONT_HERSHEY_SIMPLEX, 0.55, 2)
                        cv2.rectangle(frame, (x1, max(0, y1 - lh - 6)), (x1 + lw + 6, y1), color, -1)
                        cv2.putText(frame, label_text, (x1 + 3, y1 - 4), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 2)

                if writer:
                    writer.write(frame)

                frame_idx += 1
                if frame_idx % 30 == 0:
                    print(f"Processed {frame_idx} frames...")
        finally:
            cap.release()
            if writer:
                writer.release()
                print(f"[VIDEO] Annotated video saved to: {output_video_path}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Warehouse Object Detection Inference Engine")
    parser.add_argument("--source", type=str, default="data/processed/warehouse_yolo/images/test", help="Image path, dir, video path, or '0' for webcam")
    parser.add_argument("--model", type=str, default=None, help="Weights file (default: best available)")
    parser.add_argument("--conf", type=float, default=0.25, help="Confidence threshold")
    parser.add_argument("--output", type=str, default="results/predictions", help="Output directory")

    args = parser.parse_args()
    detector = WarehouseDetector(model_path=args.model, conf=args.conf)

    if os.path.isdir(args.source):
        detector.predict_directory(args.source, args.output)
    elif args.source.isdigit() or args.source.lower().endswith(('.mp4', '.avi', '.mov')):
        out_vid = os.path.join(args.output, "annotated_stream.mp4")
        detector.predict_video(args.source, output_video_path=out_vid)
    elif os.path.isfile(args.source):
        save_p = os.path.join(args.output, "pred_" + os.path.basename(args.source))
        res = detector.predict_image(args.source, save_path=save_p)
        print(f"\nResults for {args.source}:")
        print(f"Inference Time: {res['inference_time_ms']} ms")
        print(f"Objects Detected ({res['object_count']}):")
        for d in res["detections"]:
            print(f"  {d['class']} {d['confidence']:.2f} (BBox: {d['bbox']})")
        print(f"Annotated image saved to: {save_p}")
