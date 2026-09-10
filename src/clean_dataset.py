"""
Data Cleaning & Harmonization Pipeline
Academic Project: Autonomous Warehouse AI
1. Deduplicates images (eliminating exact matches from offline augmentation).
2. Converts polygon segmentation annotations into standardized enclosing bounding boxes.
3. Clamps bounding boxes to valid [0.0, 1.0] boundaries.
4. Removes non-target classes (cart, white_roll).
5. Maps all remaining annotations to standardized 6-class taxonomy:
   0: person
   1: box
   2: pallet
   3: forklift
   4: robot
   5: robotic_arm
6. Generates a reproducible cleaning report.
"""

import os
import glob
import shutil
import hashlib
import json
from collections import defaultdict, Counter
from PIL import Image

def polygon_to_bbox(coords):
    xs = coords[0::2]
    ys = coords[1::2]
    min_x, max_x = min(xs), max(xs)
    min_y, max_y = min(ys), max(ys)
    xc = (min_x + max_x) / 2.0
    yc = (min_y + max_y) / 2.0
    w = max_x - min_x
    h = max_y - min_y
    return xc, yc, w, h

def clean_and_harmonize(
    wh_dir="data/warehouse_robot_raw",
    arm_dir="data/robotic_arm_raw",
    output_dir="data/processed/warehouse_cleaned",
    report_path="results/metrics/dataset_cleaning_report.json"
):
    os.makedirs(output_dir, exist_ok=True)
    os.makedirs(os.path.dirname(report_path), exist_ok=True)

    print("==================================================")
    print("      DATA CLEANING & HARMONIZATION PIPELINE      ")
    print("==================================================")

    # Standardized Taxonomy
    CLASS_MAPPING_WH = {
        4: 0, # person -> 0
        0: 1, # box -> 1
        3: 2, # pallets -> 2 (pallet)
        2: 3, # forklift -> 3
        5: 4  # robot -> 4
        # 1: cart (excluded)
        # 6: white_roll (excluded)
    }

    CLASS_MAPPING_ARM = {
        0: 5  # Robotic-arm -> 5 (robotic_arm)
    }

    cleaning_stats = {
        "raw_counts": {
            "warehouse_images": 0,
            "warehouse_annotations": 0,
            "robotic_arm_images": 0,
            "robotic_arm_annotations": 0
        },
        "cleaned_counts": {
            "total_images": 0,
            "total_annotations": 0,
            "class_annotations": Counter()
        },
        "cleaning_actions": {
            "duplicates_removed": 0,
            "corrupt_images_removed": 0,
            "images_without_target_classes_removed": 0,
            "polygons_converted_to_bboxes": 0,
            "out_of_bounds_clipped": 0,
            "degenerate_zero_area_boxes_removed": 0,
            "excluded_class_annotations_removed": {
                "cart": 0,
                "white_roll": 0
            }
        },
        "splits": {}
    }

    seen_hashes = set()
    cleaned_images_dir = os.path.join(output_dir, "all_images")
    cleaned_labels_dir = os.path.join(output_dir, "all_labels")
    os.makedirs(cleaned_images_dir, exist_ok=True)
    os.makedirs(cleaned_labels_dir, exist_ok=True)

    # 1. Process Warehouse Dataset
    print("[1/2] Processing Warehouse Robot Dataset...")
    for split in ['train', 'valid', 'test']:
        img_dir = os.path.join(wh_dir, split, 'images')
        lbl_dir = os.path.join(wh_dir, split, 'labels')
        
        img_files = glob.glob(os.path.join(img_dir, '*.*'))
        img_files = [f for f in img_files if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
        lbl_files = glob.glob(os.path.join(lbl_dir, '*.txt'))
        
        lbl_map = {os.path.splitext(os.path.basename(f))[0]: f for f in lbl_files}

        for img_p in img_files:
            cleaning_stats["raw_counts"]["warehouse_images"] += 1
            bname = os.path.splitext(os.path.basename(img_p))[0]

            # Verify image
            try:
                with Image.open(img_p) as img:
                    img.verify()
            except Exception:
                cleaning_stats["cleaning_actions"]["corrupt_images_removed"] += 1
                continue

            # Deduplication
            with open(img_p, 'rb') as f:
                imghash = hashlib.md5(f.read()).hexdigest()
            if imghash in seen_hashes:
                cleaning_stats["cleaning_actions"]["duplicates_removed"] += 1
                continue
            seen_hashes.add(imghash)

            # Check label
            if bname not in lbl_map:
                continue

            lbl_p = lbl_map[bname]
            with open(lbl_p, 'r') as f:
                lines = [l.strip() for l in f if l.strip()]

            cleaning_stats["raw_counts"]["warehouse_annotations"] += len(lines)

            new_lines = []
            for line in lines:
                parts = line.split()
                if not parts:
                    continue
                raw_cls = int(parts[0])

                if raw_cls == 1:
                    cleaning_stats["cleaning_actions"]["excluded_class_annotations_removed"]["cart"] += 1
                    continue
                elif raw_cls == 6:
                    cleaning_stats["cleaning_actions"]["excluded_class_annotations_removed"]["white_roll"] += 1
                    continue
                elif raw_cls not in CLASS_MAPPING_WH:
                    continue

                target_cls = CLASS_MAPPING_WH[raw_cls]

                if len(parts) == 5:
                    xc, yc, w, h = [float(x) for x in parts[1:5]]
                elif len(parts) > 5:
                    cleaning_stats["cleaning_actions"]["polygons_converted_to_bboxes"] += 1
                    coords = [float(x) for x in parts[1:]]
                    xc, yc, w, h = polygon_to_bbox(coords)
                else:
                    continue

                # Check and clip boundaries
                if xc < 0 or xc > 1 or yc < 0 or yc > 1 or w > 1 or h > 1:
                    cleaning_stats["cleaning_actions"]["out_of_bounds_clipped"] += 1
                
                xc = max(0.0, min(1.0, xc))
                yc = max(0.0, min(1.0, yc))
                w = max(0.001, min(1.0, w))
                h = max(0.001, min(1.0, h))

                if w <= 0.001 or h <= 0.001:
                    cleaning_stats["cleaning_actions"]["degenerate_zero_area_boxes_removed"] += 1
                    continue

                new_lines.append(f"{target_cls} {xc:.6f} {yc:.6f} {w:.6f} {h:.6f}\n")
                cleaning_stats["cleaned_counts"]["class_annotations"][target_cls] += 1
                cleaning_stats["cleaned_counts"]["total_annotations"] += 1

            if new_lines:
                ext = os.path.splitext(img_p)[1]
                dst_img = os.path.join(cleaned_images_dir, f"wh_{bname}{ext}")
                dst_lbl = os.path.join(cleaned_labels_dir, f"wh_{bname}.txt")
                shutil.copy2(img_p, dst_img)
                with open(dst_lbl, 'w') as f:
                    f.writelines(new_lines)
                cleaning_stats["cleaned_counts"]["total_images"] += 1
            else:
                cleaning_stats["cleaning_actions"]["images_without_target_classes_removed"] += 1

    # 2. Process Robotic Arm Dataset
    print("[2/2] Processing Robotic Arm Dataset...")
    for split in ['train', 'valid', 'test']:
        img_dir = os.path.join(arm_dir, split, 'images')
        lbl_dir = os.path.join(arm_dir, split, 'labels')
        
        img_files = glob.glob(os.path.join(img_dir, '*.*'))
        img_files = [f for f in img_files if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
        lbl_files = glob.glob(os.path.join(lbl_dir, '*.txt'))
        
        lbl_map = {os.path.splitext(os.path.basename(f))[0]: f for f in lbl_files}

        for img_p in img_files:
            cleaning_stats["raw_counts"]["robotic_arm_images"] += 1
            bname = os.path.splitext(os.path.basename(img_p))[0]

            try:
                with Image.open(img_p) as img:
                    img.verify()
            except Exception:
                cleaning_stats["cleaning_actions"]["corrupt_images_removed"] += 1
                continue

            with open(img_p, 'rb') as f:
                imghash = hashlib.md5(f.read()).hexdigest()
            if imghash in seen_hashes:
                cleaning_stats["cleaning_actions"]["duplicates_removed"] += 1
                continue
            seen_hashes.add(imghash)

            if bname not in lbl_map:
                continue

            lbl_p = lbl_map[bname]
            with open(lbl_p, 'r') as f:
                lines = [l.strip() for l in f if l.strip()]

            cleaning_stats["raw_counts"]["robotic_arm_annotations"] += len(lines)

            new_lines = []
            for line in lines:
                parts = line.split()
                if len(parts) != 5:
                    continue
                raw_cls = int(parts[0])
                if raw_cls != 0:
                    continue

                target_cls = CLASS_MAPPING_ARM[raw_cls] # 5 (robotic_arm)
                xc, yc, w, h = [float(x) for x in parts[1:5]]

                xc = max(0.0, min(1.0, xc))
                yc = max(0.0, min(1.0, yc))
                w = max(0.001, min(1.0, w))
                h = max(0.001, min(1.0, h))

                new_lines.append(f"{target_cls} {xc:.6f} {yc:.6f} {w:.6f} {h:.6f}\n")
                cleaning_stats["cleaned_counts"]["class_annotations"][target_cls] += 1
                cleaning_stats["cleaned_counts"]["total_annotations"] += 1

            if new_lines:
                ext = os.path.splitext(img_p)[1]
                dst_img = os.path.join(cleaned_images_dir, f"arm_{bname}{ext}")
                dst_lbl = os.path.join(cleaned_labels_dir, f"arm_{bname}.txt")
                shutil.copy2(img_p, dst_img)
                with open(dst_lbl, 'w') as f:
                    f.writelines(new_lines)
                cleaning_stats["cleaned_counts"]["total_images"] += 1
            else:
                cleaning_stats["cleaning_actions"]["images_without_target_classes_removed"] += 1

    # Convert counter for serialization
    cleaning_stats["cleaned_counts"]["class_annotations"] = {
        k: cleaning_stats["cleaned_counts"]["class_annotations"][k] for k in sorted(cleaning_stats["cleaned_counts"]["class_annotations"])
    }

    with open(report_path, 'w') as f:
        json.dump(cleaning_stats, f, indent=2)

    print("\n==================================================")
    print("           DATA CLEANING REPORT SUMMARY           ")
    print("==================================================")
    print(f"Raw Images Ingested:        {cleaning_stats['raw_counts']['warehouse_images'] + cleaning_stats['raw_counts']['robotic_arm_images']:,}")
    print(f"Raw Annotations Ingested:   {cleaning_stats['raw_counts']['warehouse_annotations'] + cleaning_stats['raw_counts']['robotic_arm_annotations']:,}")
    print(f"Duplicate Images Removed:   {cleaning_stats['cleaning_actions']['duplicates_removed']:,}")
    print(f"Cart/Roll Annotations Purged: {sum(cleaning_stats['cleaning_actions']['excluded_class_annotations_removed'].values()):,}")
    print(f"Polygons Converted to Bbox: {cleaning_stats['cleaning_actions']['polygons_converted_to_bboxes']}")
    print(f"Cleaned Images Saved:       {cleaning_stats['cleaned_counts']['total_images']:,}")
    print(f"Cleaned Annotations Saved:  {cleaning_stats['cleaned_counts']['total_annotations']:,}")
    print("Cleaned Class Instance Breakdown:")
    class_names = ['person', 'box', 'pallet', 'forklift', 'robot', 'robotic_arm']
    for cid, count in cleaning_stats["cleaned_counts"]["class_annotations"].items():
        print(f"  Class {cid} ({class_names[cid]}): {count:>7,} annotations")
    print(f"Cleaning report saved to: {report_path}")
    print("==================================================\n")

    return cleaning_stats

if __name__ == "__main__":
    clean_and_harmonize()
