import os
import glob
from collections import defaultdict
from PIL import Image

def audit_dataset(dataset_dir):
    raw_classes = ['box', 'cart', 'forklift', 'pallets', 'person', 'robot', 'white_roll']
    
    splits = ['train', 'valid', 'test']
    stats = {}
    
    total_images_all = 0
    total_annotations_all = 0
    class_annotations_all = defaultdict(int)
    class_images_all = defaultdict(set)
    
    corrupt_images = []
    missing_labels = []
    invalid_bboxes = []
    invalid_lines = []
    
    for split in splits:
        img_dir = os.path.join(dataset_dir, split, 'images')
        lbl_dir = os.path.join(dataset_dir, split, 'labels')
        
        img_files = glob.glob(os.path.join(img_dir, '*.*'))
        # Filter for image extensions
        img_files = [f for f in img_files if f.lower().endswith(('.jpg', '.jpeg', '.png', '.bmp'))]
        lbl_files = glob.glob(os.path.join(lbl_dir, '*.txt'))
        
        img_basenames = {os.path.splitext(os.path.basename(f))[0]: f for f in img_files}
        lbl_basenames = {os.path.splitext(os.path.basename(f))[0]: f for f in lbl_files}
        
        # Check missing labels
        for bname, ipath in img_basenames.items():
            if bname not in lbl_basenames:
                missing_labels.append(ipath)
                
        # Check corrupt images and verify bounding boxes
        split_ann_count = 0
        split_class_counts = defaultdict(int)
        
        for bname, lpath in lbl_basenames.items():
            ipath = img_basenames.get(bname)
            if not ipath or not os.path.exists(ipath):
                continue
                
            try:
                with Image.open(ipath) as img:
                    img.verify()
            except Exception as e:
                corrupt_images.append((ipath, str(e)))
                
            with open(lpath, 'r') as f:
                lines = f.readlines()
                
            for line_idx, line in enumerate(lines):
                line = line.strip()
                if not line:
                    continue
                parts = line.split()
                if len(parts) != 5:
                    invalid_lines.append((lpath, line_idx, line))
                    continue
                    
                cls_id = int(parts[0])
                xc, yc, w, h = float(parts[1]), float(parts[2]), float(parts[3]), float(parts[4])
                
                # Check coordinates
                if not (0 <= xc <= 1 and 0 <= yc <= 1 and 0 < w <= 1 and 0 < h <= 1):
                    invalid_bboxes.append((lpath, line_idx, line))
                    
                split_ann_count += 1
                total_annotations_all += 1
                class_annotations_all[cls_id] += 1
                class_images_all[cls_id].add(bname)
                split_class_counts[cls_id] += 1
                
        total_images_all += len(img_files)
        stats[split] = {
            'images': len(img_files),
            'labels': len(lbl_files),
            'annotations': split_ann_count,
            'class_counts': {raw_classes[k] if k < len(raw_classes) else str(k): v for k, v in split_class_counts.items()}
        }
        
    print("=== DATASET AUDIT RESULTS ===")
    print(f"Total Images: {total_images_all}")
    for split in splits:
        print(f"  {split.upper()}: {stats[split]['images']} images, {stats[split]['annotations']} annotations")
        print(f"    Class Breakdown: {stats[split]['class_counts']}")
        
    print("\n--- OVERALL CLASS ANNOTATIONS ---")
    for cls_id in sorted(class_annotations_all.keys()):
        cname = raw_classes[cls_id] if cls_id < len(raw_classes) else f"Unknown({cls_id})"
        print(f"  Class {cls_id} ({cname}): {class_annotations_all[cls_id]} annotations across {len(class_images_all[cls_id])} images")
        
    print(f"\nMissing label files: {len(missing_labels)}")
    print(f"Corrupted images: {len(corrupt_images)}")
    print(f"Invalid label lines (not 5 parts): {len(invalid_lines)}")
    print(f"Invalid bounding boxes (out of 0-1 bounds): {len(invalid_bboxes)}")

if __name__ == '__main__':
    audit_dataset('data/warehouse_robot_raw')
