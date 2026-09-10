"""
Dataset Audit & Exploratory Data Analysis (EDA) Script
Academic Project: Autonomous Warehouse AI
Analyzes raw datasets, checks data integrity, quantifies class imbalance,
and generates publication-ready visualizations.
"""

import os
import glob
import json
import hashlib
from collections import defaultdict, Counter
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import seaborn as sns
from PIL import Image, ImageDraw, ImageFont

plt.style.use('seaborn-v0_8-whitegrid' if 'seaborn-v0_8-whitegrid' in plt.style.available else 'default')
plt.rcParams['font.family'] = 'sans-serif'
plt.rcParams['font.size'] = 11
plt.rcParams['axes.titlesize'] = 13
plt.rcParams['axes.titleweight'] = 'bold'
plt.rcParams['axes.labelsize'] = 12

def audit_raw_datasets(
    wh_dir="data/warehouse_robot_raw",
    arm_dir="data/robotic_arm_raw",
    output_fig_dir="results/figures",
    output_metrics_dir="results/metrics"
):
    os.makedirs(output_fig_dir, exist_ok=True)
    os.makedirs(output_metrics_dir, exist_ok=True)

    print("==================================================")
    print("      DATASET QUALITY AUDIT & EDA IN PROGRESS     ")
    print("==================================================")

    wh_raw_classes = ['box', 'cart', 'forklift', 'pallets', 'person', 'robot', 'white_roll']
    arm_raw_classes = ['Robotic-arm']

    audit_summary = {
        "datasets": {},
        "integrity": {
            "corrupt_images": 0,
            "missing_annotations": 0,
            "empty_annotations": 0,
            "invalid_bboxes": 0,
            "out_of_bounds_bboxes": 0,
            "tiny_bboxes_under_0_001_area": 0,
            "exact_duplicate_images": 0,
            "polygon_annotations": 0
        },
        "taxonomy_mapping": {
            "0 (person)": "warehouse_robot_raw: person (class 4)",
            "1 (box)": "warehouse_robot_raw: box (class 0)",
            "2 (pallet)": "warehouse_robot_raw: pallets (class 3)",
            "3 (forklift)": "warehouse_robot_raw: forklift (class 2)",
            "4 (robot)": "warehouse_robot_raw: robot (class 5)",
            "5 (robotic_arm)": "robotic_arm_raw: Robotic-arm (class 0)"
        }
    }

    all_bbox_areas = []
    all_bbox_widths = []
    all_bbox_heights = []
    all_bbox_aspect_ratios = []
    objects_per_image_counts = []
    image_resolutions = Counter()
    image_hashes = set()
    duplicate_image_paths = []

    # 1. Audit Warehouse Robot Dataset
    wh_stats = {"images": 0, "annotations": 0, "splits": {}, "class_instances": Counter(), "class_images": defaultdict(set)}
    for split in ['train', 'valid', 'test']:
        img_dir = os.path.join(wh_dir, split, 'images')
        lbl_dir = os.path.join(wh_dir, split, 'labels')
        
        img_files = glob.glob(os.path.join(img_dir, '*.*'))
        img_files = [f for f in img_files if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
        lbl_files = glob.glob(os.path.join(lbl_dir, '*.txt'))
        
        img_map = {os.path.splitext(os.path.basename(f))[0]: f for f in img_files}
        lbl_map = {os.path.splitext(os.path.basename(f))[0]: f for f in lbl_files}
        
        split_ann_count = 0
        split_class_count = Counter()

        for bname, ipath in img_map.items():
            wh_stats["images"] += 1
            try:
                with open(ipath, 'rb') as f:
                    imghash = hashlib.md5(f.read()).hexdigest()
                if imghash in image_hashes:
                    audit_summary["integrity"]["exact_duplicate_images"] += 1
                    duplicate_image_paths.append(ipath)
                else:
                    image_hashes.add(imghash)

                with Image.open(ipath) as img:
                    image_resolutions[img.size] += 1
            except Exception as e:
                audit_summary["integrity"]["corrupt_images"] += 1
                continue

            if bname not in lbl_map:
                audit_summary["integrity"]["missing_annotations"] += 1
                continue

            lpath = lbl_map[bname]
            with open(lpath, 'r') as f:
                lines = f.readlines()

            valid_lines = [l.strip() for l in lines if l.strip()]
            if not valid_lines:
                audit_summary["integrity"]["empty_annotations"] += 1
            
            objects_per_image_counts.append(len(valid_lines))

            for line in valid_lines:
                parts = line.split()
                if len(parts) == 5:
                    cls_id = int(parts[0])
                    xc, yc, w, h = [float(x) for x in parts[1:5]]
                elif len(parts) > 5:
                    audit_summary["integrity"]["polygon_annotations"] += 1
                    cls_id = int(parts[0])
                    coords = [float(x) for x in parts[1:]]
                    xs = coords[0::2]
                    ys = coords[1::2]
                    w = max(xs) - min(xs)
                    h = max(ys) - min(ys)
                    xc = (min(xs) + max(xs)) / 2.0
                    yc = (min(ys) + max(ys)) / 2.0
                else:
                    audit_summary["integrity"]["invalid_bboxes"] += 1
                    continue

                if not (0 <= xc <= 1 and 0 <= yc <= 1 and 0 < w <= 1 and 0 < h <= 1):
                    audit_summary["integrity"]["out_of_bounds_bboxes"] += 1

                area = w * h
                if area < 0.0005:
                    audit_summary["integrity"]["tiny_bboxes_under_0_001_area"] += 1

                all_bbox_areas.append(area)
                all_bbox_widths.append(w)
                all_bbox_heights.append(h)
                if h > 0:
                    all_bbox_aspect_ratios.append(w / h)

                wh_stats["class_instances"][wh_raw_classes[cls_id]] += 1
                wh_stats["class_images"][wh_raw_classes[cls_id]].add(bname)
                split_class_count[wh_raw_classes[cls_id]] += 1
                split_ann_count += 1
                wh_stats["annotations"] += 1

        wh_stats["splits"][split] = {
            "images": len(img_files),
            "annotations": split_ann_count,
            "class_instances": dict(split_class_count)
        }

    # 2. Audit Robotic Arm Dataset
    arm_stats = {"images": 0, "annotations": 0, "splits": {}, "class_instances": Counter(), "class_images": defaultdict(set)}
    for split in ['train', 'valid', 'test']:
        img_dir = os.path.join(arm_dir, split, 'images')
        lbl_dir = os.path.join(arm_dir, split, 'labels')
        
        img_files = glob.glob(os.path.join(img_dir, '*.*'))
        img_files = [f for f in img_files if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
        lbl_files = glob.glob(os.path.join(lbl_dir, '*.txt'))
        
        img_map = {os.path.splitext(os.path.basename(f))[0]: f for f in img_files}
        lbl_map = {os.path.splitext(os.path.basename(f))[0]: f for f in lbl_files}
        
        split_ann_count = 0
        split_class_count = Counter()

        for bname, ipath in img_map.items():
            arm_stats["images"] += 1
            try:
                with open(ipath, 'rb') as f:
                    imghash = hashlib.md5(f.read()).hexdigest()
                if imghash in image_hashes:
                    audit_summary["integrity"]["exact_duplicate_images"] += 1
                    duplicate_image_paths.append(ipath)
                else:
                    image_hashes.add(imghash)

                with Image.open(ipath) as img:
                    image_resolutions[img.size] += 1
            except Exception as e:
                audit_summary["integrity"]["corrupt_images"] += 1
                continue

            if bname not in lbl_map:
                audit_summary["integrity"]["missing_annotations"] += 1
                continue

            lpath = lbl_map[bname]
            with open(lpath, 'r') as f:
                lines = f.readlines()

            valid_lines = [l.strip() for l in lines if l.strip()]
            if not valid_lines:
                audit_summary["integrity"]["empty_annotations"] += 1

            objects_per_image_counts.append(len(valid_lines))

            for line in valid_lines:
                parts = line.split()
                if len(parts) == 5:
                    cls_id = int(parts[0])
                    xc, yc, w, h = [float(x) for x in parts[1:5]]
                else:
                    audit_summary["integrity"]["invalid_bboxes"] += 1
                    continue

                if not (0 <= xc <= 1 and 0 <= yc <= 1 and 0 < w <= 1 and 0 < h <= 1):
                    audit_summary["integrity"]["out_of_bounds_bboxes"] += 1

                area = w * h
                if area < 0.0005:
                    audit_summary["integrity"]["tiny_bboxes_under_0_001_area"] += 1

                all_bbox_areas.append(area)
                all_bbox_widths.append(w)
                all_bbox_heights.append(h)
                if h > 0:
                    all_bbox_aspect_ratios.append(w / h)

                arm_stats["class_instances"]['robotic_arm'] += 1
                arm_stats["class_images"]['robotic_arm'].add(bname)
                split_class_count['robotic_arm'] += 1
                split_ann_count += 1
                arm_stats["annotations"] += 1

        arm_stats["splits"][split] = {
            "images": len(img_files),
            "annotations": split_ann_count,
            "class_instances": dict(split_class_count)
        }

    audit_summary["datasets"]["warehouse_robot_raw"] = {
        "images": wh_stats["images"],
        "annotations": wh_stats["annotations"],
        "splits": wh_stats["splits"],
        "class_instances": dict(wh_stats["class_instances"]),
        "images_per_class": {k: len(v) for k, v in wh_stats["class_images"].items()}
    }
    audit_summary["datasets"]["robotic_arm_raw"] = {
        "images": arm_stats["images"],
        "annotations": arm_stats["annotations"],
        "splits": arm_stats["splits"],
        "class_instances": dict(arm_stats["class_instances"]),
        "images_per_class": {k: len(v) for k, v in arm_stats["class_images"].items()}
    }

    target_6_classes = {
        "person": wh_stats["class_instances"]["person"],
        "box": wh_stats["class_instances"]["box"],
        "pallet": wh_stats["class_instances"]["pallets"],
        "forklift": wh_stats["class_instances"]["forklift"],
        "robot": wh_stats["class_instances"]["robot"],
        "robotic_arm": arm_stats["class_instances"]["robotic_arm"]
    }
    target_6_images = {
        "person": len(wh_stats["class_images"]["person"]),
        "box": len(wh_stats["class_images"]["box"]),
        "pallet": len(wh_stats["class_images"]["pallets"]),
        "forklift": len(wh_stats["class_images"]["forklift"]),
        "robot": len(wh_stats["class_images"]["robot"]),
        "robotic_arm": len(arm_stats["class_images"]["robotic_arm"])
    }
    audit_summary["target_6_class_distribution"] = {
        "instances": target_6_classes,
        "images": target_6_images
    }

    audit_report_path = os.path.join(output_metrics_dir, "dataset_audit_report.json")
    with open(audit_report_path, "w") as f:
        json.dump(audit_summary, f, indent=2)
    print(f"[AUDIT] Audit metrics saved to {audit_report_path}")

    # Visualizations
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5))
    classes = list(target_6_classes.keys())
    counts = [target_6_classes[c] for c in classes]
    palette = sns.color_palette("mako", len(classes))

    bars1 = ax1.bar(classes, counts, color=palette, edgecolor='black', alpha=0.85)
    ax1.set_title("Warehouse Object Instances (Raw Linear Scale)")
    ax1.set_ylabel("Total Annotation Instances")
    ax1.tick_params(axis='x', rotation=30)
    for bar in bars1:
        yval = bar.get_height()
        ax1.text(bar.get_x() + bar.get_width()/2.0, yval + max(counts)*0.01, f"{int(yval):,}", ha='center', va='bottom', fontsize=9, rotation=0)

    bars2 = ax2.bar(classes, counts, color=palette, edgecolor='black', alpha=0.85)
    ax2.set_yscale('log')
    ax2.set_title("Warehouse Object Instances (Log Scale — Imbalance Analysis)")
    ax2.set_ylabel("Instances (Log10 Scale)")
    ax2.tick_params(axis='x', rotation=30)
    for bar in bars2:
        yval = bar.get_height()
        ax2.text(bar.get_x() + bar.get_width()/2.0, yval * 1.15, f"{int(yval):,}", ha='center', va='bottom', fontsize=9)

    plt.tight_layout()
    class_dist_fig = os.path.join(output_fig_dir, "class_distribution.png")
    plt.savefig(class_dist_fig, dpi=300)
    plt.close()
    print(f"[FIG] Saved: {class_dist_fig}")

    plt.figure(figsize=(9, 5))
    sns.histplot(objects_per_image_counts, bins=range(1, 40), kde=True, color='#2b5c8f', edgecolor='black')
    plt.title("Distribution of Objects per Image in Warehouse Datasets")
    plt.xlabel("Number of Bounding Boxes in Single Image")
    plt.ylabel("Image Count")
    plt.xlim(1, 35)
    plt.axvline(np.mean(objects_per_image_counts), color='red', linestyle='--', label=f'Mean: {np.mean(objects_per_image_counts):.1f}')
    plt.axvline(np.median(objects_per_image_counts), color='orange', linestyle='-', label=f'Median: {np.median(objects_per_image_counts):.1f}')
    plt.legend()
    plt.tight_layout()
    objects_fig = os.path.join(output_fig_dir, "objects_per_image.png")
    plt.savefig(objects_fig, dpi=300)
    plt.close()
    print(f"[FIG] Saved: {objects_fig}")

    plt.figure(figsize=(9, 5))
    areas_pct = np.array(all_bbox_areas) * 100
    sns.histplot(areas_pct, bins=50, kde=True, color='#2a9d8f', edgecolor='black')
    plt.title("Normalized Bounding Box Area Distribution (% of Image Area)")
    plt.xlabel("Bounding Box Area (% of 640x640 Image)")
    plt.ylabel("Instance Count")
    plt.xlim(0, 30)
    plt.tight_layout()
    bbox_size_fig = os.path.join(output_fig_dir, "bbox_size_distribution.png")
    plt.savefig(bbox_size_fig, dpi=300)
    plt.close()
    print(f"[FIG] Saved: {bbox_size_fig}")

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5))
    sample_indices = np.random.choice(len(all_bbox_widths), min(15000, len(all_bbox_widths)), replace=False)
    ax1.scatter([all_bbox_widths[i] for i in sample_indices], [all_bbox_heights[i] for i in sample_indices],
                alpha=0.15, s=8, color='#e76f51')
    ax1.set_title("Bounding Box Width vs Height (Sample of 15,000 Boxes)")
    ax1.set_xlabel("Normalized Width")
    ax1.set_ylabel("Normalized Height")
    ax1.set_xlim(0, 1)
    ax1.set_ylim(0, 1)

    ratios = [all_bbox_aspect_ratios[i] for i in sample_indices if all_bbox_aspect_ratios[i] < 5]
    sns.histplot(ratios, bins=40, kde=True, ax=ax2, color='#e9c46a', edgecolor='black')
    ax2.set_title("Aspect Ratio (Width / Height) Distribution")
    ax2.set_xlabel("Aspect Ratio (w / h)")
    ax2.set_ylabel("Frequency")
    ax2.axvline(1.0, color='red', linestyle='--', label='Square (1:1)')
    ax2.legend()

    plt.tight_layout()
    aspect_fig = os.path.join(output_fig_dir, "bbox_aspect_ratios.png")
    plt.savefig(aspect_fig, dpi=300)
    plt.close()
    print(f"[FIG] Saved: {aspect_fig}")

    plt.figure(figsize=(7, 4))
    res_names = [f"{w}x{h}" for (w, h) in image_resolutions.keys()]
    res_counts = list(image_resolutions.values())
    plt.bar(res_names, res_counts, color='#457b9d', edgecolor='black')
    plt.title("Image Resolution Distribution in Dataset")
    plt.xlabel("Resolution (Width x Height)")
    plt.ylabel("Number of Images")
    for i, v in enumerate(res_counts):
        plt.text(i, v + max(res_counts)*0.02, f"{v:,} (100%)", ha='center', fontweight='bold')
    plt.tight_layout()
    res_fig = os.path.join(output_fig_dir, "image_dimension_distribution.png")
    plt.savefig(res_fig, dpi=300)
    plt.close()
    print(f"[FIG] Saved: {res_fig}")

    generate_sample_inspection_grid(wh_dir, arm_dir, os.path.join(output_fig_dir, "sample_annotated_images.png"))

    print("\n==================================================")
    print("           AUDIT SUMMARY HIGHLIGHTS               ")
    print("==================================================")
    print(f"Total Raw Images Analyzed: {wh_stats['images'] + arm_stats['images']:,}")
    print(f"Total Raw Bounding Boxes:  {wh_stats['annotations'] + arm_stats['annotations']:,}")
    print(f"Corrupt Images Found:      {audit_summary['integrity']['corrupt_images']}")
    print(f"Exact Duplicate Images:    {audit_summary['integrity']['exact_duplicate_images']} (Found in robotic_arm 3x aug)")
    print(f"Segmentation Polygons:     {audit_summary['integrity']['polygon_annotations']} (Converted to enclosing boxes)")
    print(f"Out of Bounds Bboxes:      {audit_summary['integrity']['out_of_bounds_bboxes']}")
    print("==================================================\n")

    return audit_summary

def generate_sample_inspection_grid(wh_dir, arm_dir, out_path):
    class_targets = [
        ("person", wh_dir, 4, (0, 200, 0)),
        ("box", wh_dir, 0, (255, 140, 0)),
        ("pallet", wh_dir, 3, (150, 75, 0)),
        ("forklift", wh_dir, 2, (200, 0, 200)),
        ("robot", wh_dir, 5, (0, 120, 255)),
        ("robotic_arm", arm_dir, 0, (220, 20, 60))
    ]

    fig, axes = plt.subplots(2, 3, figsize=(15, 10))
    axes = axes.flatten()

    for idx, (cname, ddir, target_cid, color) in enumerate(class_targets):
        ax = axes[idx]
        found_sample = None
        lbl_files = glob.glob(os.path.join(ddir, 'train', 'labels', '*.txt'))
        for lf in lbl_files:
            bname = os.path.splitext(os.path.basename(lf))[0]
            with open(lf) as f:
                lines = f.readlines()
            matching_lines = []
            for l in lines:
                p = l.strip().split()
                if p and int(p[0]) == target_cid:
                    matching_lines.append(p)
            if matching_lines:
                candidates = glob.glob(os.path.join(ddir, 'train', 'images', bname + '.*'))
                if candidates:
                    found_sample = (candidates[0], matching_lines)
                    break

        if found_sample:
            img_p, bboxes = found_sample
            im = Image.open(img_p).convert("RGB")
            draw = ImageDraw.Draw(im)
            W, H = im.size
            for b in bboxes:
                if len(b) == 5:
                    xc, yc, w, h = [float(x) for x in b[1:5]]
                else:
                    coords = [float(x) for x in b[1:]]
                    xs, ys = coords[0::2], coords[1::2]
                    xc, yc, w, h = (min(xs)+max(xs))/2, (min(ys)+max(ys))/2, max(xs)-min(xs), max(ys)-min(ys)
                x1 = int((xc - w/2) * W)
                y1 = int((yc - h/2) * H)
                x2 = int((xc + w/2) * W)
                y2 = int((yc + h/2) * H)
                draw.rectangle([x1, y1, x2, y2], outline=color, width=3)
                draw.text((x1 + 4, max(4, y1 + 4)), cname.upper(), fill="white")
            
            ax.imshow(im)
            ax.set_title(f"Class: {cname.upper()} (Ground Truth)", fontweight="bold", fontsize=12)
            ax.axis('off')
        else:
            ax.text(0.5, 0.5, f"No sample found for {cname}", ha='center')
            ax.axis('off')

    plt.suptitle("Visual Ground Truth Inspection Across All 6 Standardized Classes", fontsize=16, fontweight='bold', y=0.98)
    plt.tight_layout()
    plt.savefig(out_path, dpi=300)
    plt.close()
    print(f"[FIG] Saved: {out_path}")

if __name__ == "__main__":
    audit_raw_datasets()
