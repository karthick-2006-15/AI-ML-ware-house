"""
High-Speed YOLO Dataset Preparation & Splitting Script
Academic Project: Autonomous Warehouse AI
Creates standardized train/val/test splits (70/15/15) with zero data leakage,
generates data.yaml configs for standard and balanced experiments,
and ensures reproducible dataset partitioning.
"""

import os
import glob
import shutil
import random
import yaml
from collections import defaultdict, Counter

def fast_copy(src, dst):
    try:
        os.link(src, dst)
    except Exception:
        shutil.copy2(src, dst)

def prepare_yolo_splits(
    cleaned_dir="data/processed/warehouse_cleaned",
    output_standard="data/processed/warehouse_yolo",
    output_balanced="data/processed/warehouse_yolo_balanced",
    seed=42
):
    random.seed(seed)
    print("==================================================")
    print("      PREPARING STANDARDIZED YOLO SPLITS          ")
    print("==================================================")

    img_dir = os.path.join(cleaned_dir, "all_images")
    lbl_dir = os.path.join(cleaned_dir, "all_labels")

    # Fast O(1) directory map
    print("Indexing cleaned image and label directories...")
    all_img_files = os.listdir(img_dir)
    img_dict = {
        os.path.splitext(f)[0]: os.path.join(img_dir, f)
        for f in all_img_files
        if f.lower().endswith(('.jpg', '.jpeg', '.png'))
    }
    print(f"Indexed {len(img_dict):,} valid cleaned images.")

    lbl_files = glob.glob(os.path.join(lbl_dir, "*.txt"))
    print(f"Total label files found: {len(lbl_files):,}")

    image_metadata = {}
    class_to_images = defaultdict(list)

    for lf in lbl_files:
        bname = os.path.splitext(os.path.basename(lf))[0]
        if bname not in img_dict:
            continue
        img_path = img_dict[bname]

        classes_present = set()
        annotations = []
        with open(lf, 'r') as f:
            for line in f:
                parts = line.strip().split()
                if parts:
                    cls_id = int(parts[0])
                    classes_present.add(cls_id)
                    annotations.append(line.strip())

        image_metadata[bname] = {
            "img_path": img_path,
            "lbl_path": lf,
            "classes": classes_present,
            "annotations": annotations
        }
        for c in classes_present:
            class_to_images[c].append(bname)

    print("\nCleaned Pool Summary:")
    class_names = ['person', 'box', 'pallet', 'forklift', 'robot', 'robotic_arm']
    for cid in range(6):
        print(f"  Class {cid} ({class_names[cid]}): {len(class_to_images[cid]):,} images")

    # Stratified Split (70% Train, 15% Val, 15% Test)
    test_set = set()
    val_set = set()
    train_set = set()

    # Sort classes by priority: robot (4) > forklift (3) > robotic_arm (5) > person (0) > pallet (2) > box (1)
    for c in [4, 3, 5, 0, 2, 1]:
        candidates = [b for b in class_to_images[c] if b not in test_set and b not in val_set and b not in train_set]
        random.shuffle(candidates)
        n = len(candidates)
        n_test = max(1, int(n * 0.15))
        n_val = max(1, int(n * 0.15))

        test_set.update(candidates[:n_test])
        val_set.update(candidates[n_test:n_test + n_val])
        train_set.update(candidates[n_test + n_val:])

    assert len(test_set.intersection(val_set)) == 0, "Leak between test and val!"
    assert len(test_set.intersection(train_set)) == 0, "Leak between test and train!"
    assert len(val_set.intersection(train_set)) == 0, "Leak between val and train!"

    total_imgs = len(image_metadata)
    print(f"\nPartition Complete (Standard):")
    print(f"  Train: {len(train_set):,} images ({len(train_set)/total_imgs*100:.1f}%)")
    print(f"  Val:   {len(val_set):,} images ({len(val_set)/total_imgs*100:.1f}%)")
    print(f"  Test:  {len(test_set):,} images ({len(test_set)/total_imgs*100:.1f}%)")

    # Build Standard Dataset Structure
    build_yolo_directory(output_standard, train_set, val_set, test_set, image_metadata)
    generate_data_yaml(output_standard, "configs/data.yaml")

    # Build Balanced Curated Dataset for Experiment 2, 3, 4
    # All robot, forklift, robotic arm, person images preserved. Box/pallet only images subsampled.
    train_balanced = set()
    val_balanced = set()

    for bname in train_set:
        classes = image_metadata[bname]["classes"]
        if any(c in classes for c in [0, 3, 4, 5]):
            train_balanced.add(bname)
        elif random.random() < 0.20:
            train_balanced.add(bname)

    for bname in val_set:
        classes = image_metadata[bname]["classes"]
        if any(c in classes for c in [0, 3, 4, 5]):
            val_balanced.add(bname)
        elif random.random() < 0.20:
            val_balanced.add(bname)

    print(f"\nBalanced Dataset Partition:")
    print(f"  Train: {len(train_balanced):,} images")
    print(f"  Val:   {len(val_balanced):,} images")
    print(f"  Test:  {len(test_set):,} images (Identical isolated benchmark test set)")

    build_yolo_directory(output_balanced, train_balanced, val_balanced, test_set, image_metadata)
    generate_data_yaml(output_balanced, "configs/data_balanced.yaml")

    print("\n==================================================")
    print("      YOLO DATASETS READY FOR EXPERIMENTATION     ")
    print("==================================================\n")

def build_yolo_directory(target_dir, train_set, val_set, test_set, image_metadata):
    splits = {"train": train_set, "val": val_set, "test": test_set}
    class_names = ['person', 'box', 'pallet', 'forklift', 'robot', 'robotic_arm']

    for split, bnames in splits.items():
        s_img_dir = os.path.join(target_dir, "images", split)
        s_lbl_dir = os.path.join(target_dir, "labels", split)
        os.makedirs(s_img_dir, exist_ok=True)
        os.makedirs(s_lbl_dir, exist_ok=True)

        class_counts = Counter()
        for bname in bnames:
            info = image_metadata[bname]
            dst_img = os.path.join(s_img_dir, os.path.basename(info["img_path"]))
            dst_lbl = os.path.join(s_lbl_dir, bname + ".txt")

            if not os.path.exists(dst_img):
                fast_copy(info["img_path"], dst_img)
            if not os.path.exists(dst_lbl):
                fast_copy(info["lbl_path"], dst_lbl)

            for line in info["annotations"]:
                cid = int(line.split()[0])
                class_counts[cid] += 1

        print(f"[{os.path.basename(target_dir)}] {split.upper():<5}: {len(bnames):>5,} images, {sum(class_counts.values()):>6,} annotations")
        counts_str = ", ".join([f"{class_names[cid]}:{class_counts[cid]}" for cid in range(6)])
        print(f"       Breakdown: {counts_str}")

def generate_data_yaml(dataset_dir, config_copy_path):
    abs_path = os.path.abspath(dataset_dir).replace("\\", "/")
    yaml_content = {
        "path": abs_path,
        "train": "images/train",
        "val": "images/val",
        "test": "images/test",
        "nc": 6,
        "names": {
            0: "person",
            1: "box",
            2: "pallet",
            3: "forklift",
            4: "robot",
            5: "robotic_arm"
        }
    }

    yaml_file = os.path.join(dataset_dir, "data.yaml")
    with open(yaml_file, "w") as f:
        yaml.dump(yaml_content, f, sort_keys=False)

    os.makedirs(os.path.dirname(config_copy_path), exist_ok=True)
    with open(config_copy_path, "w") as f:
        yaml.dump(yaml_content, f, sort_keys=False)

    print(f"Generated YAML at: {yaml_file} and copied to {config_copy_path}")

if __name__ == "__main__":
    prepare_yolo_splits()
