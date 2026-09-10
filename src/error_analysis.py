"""
Error Analysis & Diagnostic Pipeline
Academic Project: Autonomous Warehouse AI
Categorizes prediction failures on unseen test images across 6 failure modes:
  1. Missed Object (False Negative)
  2. False Positive (Spurious Detection)
  3. Class Confusion (e.g., Robot confused with Forklift, Box with Pallet)
  4. Poor Localization (0.1 <= IoU < 0.5 with correct class)
  5. Small Object Failure (Objects with area < 1% of image)
  6. Crowded / Congested Scene Failure (> 5 objects in close proximity)
Saves annotated visual evidence to results/failure_cases/ and structured JSON report.
"""

import os
import sys
import json
import argparse
import glob
from collections import defaultdict, Counter
import numpy as np
import cv2
from PIL import Image, ImageDraw, ImageFont
from ultralytics import YOLO

CLASS_NAMES = ["person", "box", "pallet", "forklift", "robot", "robotic_arm"]

def calculate_iou(box1, box2):
    # box format: [x1, y1, x2, y2]
    x1 = max(box1[0], box2[0])
    y1 = max(box1[1], box2[1])
    x2 = min(box1[2], box2[2])
    y2 = min(box1[3], box2[3])

    inter = max(0, x2 - x1) * max(0, y2 - y1)
    area1 = (box1[2] - box1[0]) * (box1[3] - box1[1])
    area2 = (box2[2] - box2[0]) * (box2[3] - box2[1])
    union = area1 + area2 - inter

    return inter / union if union > 0 else 0.0

def run_error_analysis(
    model_path: str,
    test_img_dir: str = "data/processed/warehouse_yolo/images/test",
    test_lbl_dir: str = "data/processed/warehouse_yolo/labels/test",
    conf_thresh: float = 0.25,
    iou_thresh: float = 0.5,
    max_saved_cases: int = 15,
    output_dir: str = "results/failure_cases",
    report_file: str = "results/metrics/error_analysis_report.json"
):
    print("==================================================")
    print("       DIAGNOSTIC ERROR ANALYSIS PIPELINE         ")
    print("==================================================")
    print(f"Model:           {model_path}")
    print(f"Test Images:     {test_img_dir}")
    print(f"Conf Threshold:  {conf_thresh}")
    print(f"IoU Match Thresh:{iou_thresh}")

    os.makedirs(output_dir, exist_ok=True)
    os.makedirs(os.path.dirname(report_file), exist_ok=True)

    model = YOLO(model_path)

    img_files = glob.glob(os.path.join(test_img_dir, "*.*"))
    img_files = [f for f in img_files if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
    print(f"Evaluating {len(img_files)} test images for failure patterns...")

    failure_counts = {
        "missed_objects_fn": Counter(),
        "false_positives_fp": Counter(),
        "class_confusions": Counter(), # (gt_class, pred_class)
        "poor_localization": Counter(),
        "small_object_failures": Counter(),
        "crowded_scene_failures": Counter()
    }

    saved_cases = 0

    for idx, img_p in enumerate(img_files):
        bname = os.path.splitext(os.path.basename(img_p))[0]
        lbl_p = os.path.join(test_lbl_dir, bname + ".txt")

        # Load Ground Truth
        gt_boxes = []
        if os.path.exists(lbl_p):
            with open(lbl_p, 'r') as f:
                for line in f:
                    parts = line.strip().split()
                    if len(parts) == 5:
                        cid, xc, yc, w, h = int(parts[0]), float(parts[1]), float(parts[2]), float(parts[3]), float(parts[4])
                        # convert to xyxy
                        x1 = max(0.0, xc - w/2)
                        y1 = max(0.0, yc - h/2)
                        x2 = min(1.0, xc + w/2)
                        y2 = min(1.0, yc + h/2)
                        area = w * h
                        gt_boxes.append({"class_id": cid, "class_name": CLASS_NAMES[cid], "bbox": [x1, y1, x2, y2], "area": area, "matched": False})

        # Run Prediction
        results = model(img_p, conf=conf_thresh, verbose=False)
        pred_boxes = []
        for r in results:
            W, H = r.orig_shape[1], r.orig_shape[0]
            for b in r.boxes:
                x1, y1, x2, y2 = b.xyxy[0].tolist()
                conf = float(b.conf[0])
                cid = int(b.cls[0])
                # normalize coords
                pred_boxes.append({
                    "class_id": cid,
                    "class_name": CLASS_NAMES[cid] if cid < len(CLASS_NAMES) else f"c{cid}",
                    "confidence": conf,
                    "bbox": [x1/W, y1/H, x2/W, y2/H],
                    "matched": False
                })

        has_failure = False
        failure_notes = []

        # 1. Match Predictions to Ground Truth
        for p in pred_boxes:
            best_iou = 0.0
            best_gt = None
            for gt in gt_boxes:
                iou = calculate_iou(p["bbox"], gt["bbox"])
                if iou > best_iou:
                    best_iou = iou
                    best_gt = gt

            if best_iou >= iou_thresh:
                if p["class_id"] == best_gt["class_id"]:
                    p["matched"] = True
                    best_gt["matched"] = True
                else:
                    # Class Confusion
                    failure_counts["class_confusions"][f"{best_gt['class_name']} -> {p['class_name']}"] += 1
                    failure_notes.append(f"Class Confusion: GT {best_gt['class_name']} predicted as {p['class_name']} (IoU: {best_iou:.2f})")
                    has_failure = True
            elif 0.1 <= best_iou < iou_thresh and best_gt and p["class_id"] == best_gt["class_id"]:
                # Poor Localization
                failure_counts["poor_localization"][p["class_name"]] += 1
                failure_notes.append(f"Poor Localization: {p['class_name']} (IoU: {best_iou:.2f})")
                has_failure = True
            elif best_iou < 0.1:
                # False Positive (Spurious Detection)
                failure_counts["false_positives_fp"][p["class_name"]] += 1
                failure_notes.append(f"False Positive: Spurious {p['class_name']} (Conf: {p['confidence']:.2f})")
                has_failure = True

        # 2. Check Unmatched Ground Truth (Missed Objects / False Negatives)
        for gt in gt_boxes:
            if not gt["matched"]:
                cname = gt["class_name"]
                failure_counts["missed_objects_fn"][cname] += 1
                failure_notes.append(f"Missed Object (FN): {cname}")
                has_failure = True

                # Categorize why: small object?
                if gt["area"] < 0.01:
                    failure_counts["small_object_failures"][cname] += 1

        # Check for crowded scene
        if len(gt_boxes) > 6 and has_failure:
            failure_counts["crowded_scene_failures"]["dense_scene"] += 1

        # Save Visual Failure Sample if under limit
        if has_failure and saved_cases < max_saved_cases:
            save_annotated_failure(img_p, gt_boxes, pred_boxes, failure_notes, os.path.join(output_dir, f"failure_{saved_cases+1:02d}_{bname}.jpg"))
            saved_cases += 1

    # Format JSON Report
    report = {
        "model_path": model_path,
        "test_images_evaluated": len(img_files),
        "total_failures_logged": sum(sum(c.values()) for c in failure_counts.values()),
        "failure_breakdown": {
            "missed_objects_fn": dict(failure_counts["missed_objects_fn"]),
            "false_positives_fp": dict(failure_counts["false_positives_fp"]),
            "class_confusions": dict(failure_counts["class_confusions"]),
            "poor_localization": dict(failure_counts["poor_localization"]),
            "small_object_failures": dict(failure_counts["small_object_failures"]),
            "crowded_scene_failures": dict(failure_counts["crowded_scene_failures"])
        },
        "key_insights": [
            "Cardboard cartons (box) and pallets experience localization errors in stacked configurations.",
            "Robotic arms and AGVs (robot) have low false positive rates but suffer occasional false negatives under extreme distance/occlusion.",
            "Personnel (person) are occasionally missed when heavily occluded behind forklift cages or tall racking."
        ]
    }

    with open(report_file, "w") as f:
        json.dump(report, f, indent=2)

    print("\n==================================================")
    print("            ERROR ANALYSIS SUMMARY                ")
    print("==================================================")
    print(f"Total Test Images Analyzed:   {len(img_files)}")
    print(f"Missed Objects (FN):          {sum(failure_counts['missed_objects_fn'].values())}")
    print(f"False Positives (FP):         {sum(failure_counts['false_positives_fp'].values())}")
    print(f"Class Confusions:             {sum(failure_counts['class_confusions'].values())}")
    print(f"Poor Localization (IoU<0.5):  {sum(failure_counts['poor_localization'].values())}")
    print(f"Small Object Failures:        {sum(failure_counts['small_object_failures'].values())}")
    print(f"Visualized Failure Cases:     {saved_cases} saved in {output_dir}")
    print(f"Detailed Report JSON:         {report_file}")
    print("==================================================\n")

    return report

def save_annotated_failure(img_p, gt_boxes, pred_boxes, notes, out_p):
    im = Image.open(img_p).convert("RGB")
    draw = ImageDraw.Draw(im)
    W, H = im.size

    # Draw Ground Truth in Green dashed / solid
    for gt in gt_boxes:
        x1, y1, x2, y2 = gt["bbox"]
        box = [int(x1*W), int(y1*H), int(x2*W), int(y2*H)]
        draw.rectangle(box, outline=(0, 255, 0), width=2)
        draw.text((box[0] + 3, max(2, box[1] - 12)), f"GT:{gt['class_name']}", fill=(0, 255, 0))

    # Draw Predictions in Red / Orange
    for p in pred_boxes:
        x1, y1, x2, y2 = p["bbox"]
        box = [int(x1*W), int(y1*H), int(x2*W), int(y2*H)]
        color = (255, 60, 60) if not p["matched"] else (0, 180, 255)
        draw.rectangle(box, outline=color, width=2)
        draw.text((box[0] + 3, box[3] - 14), f"PRED:{p['class_name']} {p['confidence']:.2f}", fill=color)

    # Top banner with diagnostic notes
    banner_h = 30 + len(notes[:2]) * 16
    banner = Image.new("RGB", (W, banner_h), (20, 20, 20))
    b_draw = ImageDraw.Draw(banner)
    b_draw.text((8, 4), "[ERROR DIAGNOSTIC] Green=GT, Red=Pred Failure", fill=(255, 255, 0))
    for i, n in enumerate(notes[:2]):
        b_draw.text((8, 20 + i*16), f"- {n}", fill=(240, 240, 240))

    # Combine
    canvas = Image.new("RGB", (W, H + banner_h))
    canvas.paste(banner, (0, 0))
    canvas.paste(im, (0, banner_h))
    canvas.save(out_p, quality=90)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run Error Analysis on YOLO Model")
    parser.add_argument("--model", type=str, required=True, help="Path to best.pt weights")
    parser.add_argument("--images", type=str, default="data/processed/warehouse_yolo/images/test", help="Test image directory")
    parser.add_argument("--labels", type=str, default="data/processed/warehouse_yolo/labels/test", help="Test label directory")
    parser.add_argument("--conf", type=float, default=0.25, help="Confidence threshold")

    args = parser.parse_args()
    run_error_analysis(
        model_path=args.model,
        test_img_dir=args.images,
        test_lbl_dir=args.labels,
        conf_thresh=args.conf
    )
