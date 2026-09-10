import os
import glob
import shutil
import random
from collections import defaultdict

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

def remap_dataset(src_root, dst_root, seed=42):
    random.seed(seed)
    
    # Class mapping:
    # 0 (box) -> 0 (Box)
    # 4 (person) -> 1 (Person)
    # 5 (robot) -> 2 (Robot)
    class_map = {
        '0': 0,
        '4': 1,
        '5': 2
    }
    
    splits = ['train', 'valid', 'test']
    
    for split in splits:
        os.makedirs(os.path.join(dst_root, split, 'images'), exist_ok=True)
        os.makedirs(os.path.join(dst_root, split, 'labels'), exist_ok=True)
        
    stats = {}
    
    for split in splits:
        src_lbl_dir = os.path.join(src_root, split, 'labels')
        src_img_dir = os.path.join(src_root, split, 'images')
        
        lbl_files = glob.glob(os.path.join(src_lbl_dir, '*.txt'))
        
        # Categorize images by contained classes
        robot_candidates = []
        person_candidates = []
        box_candidates = []
        other_candidates = []
        
        for lf in lbl_files:
            classes_in_file = set()
            with open(lf, 'r') as f:
                for line in f:
                    parts = line.strip().split()
                    if parts:
                        classes_in_file.add(parts[0])
                        
            if '5' in classes_in_file:
                robot_candidates.append(lf)
            elif '4' in classes_in_file:
                person_candidates.append(lf)
            elif '0' in classes_in_file:
                box_candidates.append(lf)
            else:
                other_candidates.append(lf)
                
        # Balancing strategy:
        # In train: keep ALL robot (150), sample 200 person, sample 200 box
        # In valid: keep ALL robot (30), sample 70 person, sample 70 box
        # In test: keep ALL robot (10), all person (65), all box up to 100 for evaluation
        if split == 'train':
            selected = set(robot_candidates)
            selected.update(random.sample(person_candidates, min(len(person_candidates), 200)))
            selected.update(random.sample(box_candidates, min(len(box_candidates), 200)))
        elif split == 'valid':
            selected = set(robot_candidates)
            selected.update(random.sample(person_candidates, min(len(person_candidates), 70)))
            selected.update(random.sample(box_candidates, min(len(box_candidates), 70)))
        else: # test
            selected = set(robot_candidates)
            selected.update(person_candidates)
            selected.update(random.sample(box_candidates, min(len(box_candidates), 100)))
            
        print(f"Processing {split}: selected {len(selected)} images...")
        
        copied_images = 0
        remapped_annotations = defaultdict(int)
        
        for lf in selected:
            bname = os.path.splitext(os.path.basename(lf))[0]
            # Find matching image
            img_candidates = glob.glob(os.path.join(src_img_dir, bname + '.*'))
            if not img_candidates:
                continue
            src_img = img_candidates[0]
            ext = os.path.splitext(src_img)[1]
            
            dst_img = os.path.join(dst_root, split, 'images', bname + ext)
            dst_lbl = os.path.join(dst_root, split, 'labels', bname + '.txt')
            
            new_lines = []
            with open(lf, 'r') as f:
                for line in f:
                    parts = line.strip().split()
                    if not parts:
                        continue
                    orig_cls = parts[0]
                    if orig_cls in class_map:
                        new_cls = class_map[orig_cls]
                        if len(parts) == 5:
                            xc, yc, w, h = [float(x) for x in parts[1:5]]
                        else:
                            # Polygon conversion
                            coords = [float(x) for x in parts[1:]]
                            xc, yc, w, h = polygon_to_bbox(coords)
                            
                        # Clamp bounds
                        xc = max(0.0, min(1.0, xc))
                        yc = max(0.0, min(1.0, yc))
                        w = max(0.001, min(1.0, w))
                        h = max(0.001, min(1.0, h))
                        
                        new_lines.append(f"{new_cls} {xc:.6f} {yc:.6f} {w:.6f} {h:.6f}\n")
                        remapped_annotations[new_cls] += 1
                        
            # Write new label file and copy image
            if new_lines:
                with open(dst_lbl, 'w') as f:
                    f.writelines(new_lines)
                shutil.copy2(src_img, dst_img)
                copied_images += 1
                
        stats[split] = {
            'images': copied_images,
            'box': remapped_annotations[0],
            'person': remapped_annotations[1],
            'robot': remapped_annotations[2],
            'total_ann': sum(remapped_annotations.values())
        }
        
    # Write dataset.yaml
    yaml_content = f"""path: {os.path.abspath(dst_root)}
train: train/images
val: valid/images
test: test/images

nc: 3
names:
  0: Box
  1: Person
  2: Robot
"""
    with open(os.path.join(dst_root, 'dataset.yaml'), 'w') as f:
        f.write(yaml_content)
        
    print("\n=== REMAPPED DATASET SUMMARY ===")
    print(f"Destination: {os.path.abspath(dst_root)}")
    print(f"{'Split':<10} | {'Images':<8} | {'Box (0)':<8} | {'Person (1)':<10} | {'Robot (2)':<10} | {'Total Ann':<10}")
    print("-" * 65)
    for split in splits:
        s = stats[split]
        print(f"{split:<10} | {s['images']:<8} | {s['box']:<8} | {s['person']:<10} | {s['robot']:<10} | {s['total_ann']:<10}")

if __name__ == '__main__':
    remap_dataset('data/warehouse_robot_raw', 'data/warehouse_robot_remapped')
