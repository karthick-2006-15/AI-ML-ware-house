import os
import glob
import json
from ultralytics import YOLO

def find_test_images():
    test_lbl_dir = "data/warehouse_robot_remapped/test/labels"
    test_img_dir = "data/warehouse_robot_remapped/test/images"
    
    lbl_files = glob.glob(os.path.join(test_lbl_dir, "*.txt"))
    
    categories = {
        "robot_only": [],
        "box_only": [],
        "person_only": [],
        "robot_box": [],
        "robot_person": [],
        "box_person": [],
        "robot_box_person": []
    }
    
    for lf in lbl_files:
        bname = os.path.splitext(os.path.basename(lf))[0]
        img_candidates = glob.glob(os.path.join(test_img_dir, bname + ".*"))
        if not img_candidates:
            continue
        img_path = img_candidates[0]
        
        classes = set()
        with open(lf, "r") as f:
            for line in f:
                parts = line.strip().split()
                if parts:
                    classes.add(parts[0])
                    
        has_box = "0" in classes
        has_person = "1" in classes
        has_robot = "2" in classes
        
        if has_robot and not has_box and not has_person:
            categories["robot_only"].append((img_path, lf))
        elif has_box and not has_robot and not has_person:
            categories["box_only"].append((img_path, lf))
        elif has_person and not has_robot and not has_box:
            categories["person_only"].append((img_path, lf))
        elif has_robot and has_box and not has_person:
            categories["robot_box"].append((img_path, lf))
        elif has_robot and has_person and not has_box:
            categories["robot_person"].append((img_path, lf))
        elif has_box and has_person and not has_robot:
            categories["box_person"].append((img_path, lf))
        elif has_robot and has_box and has_person:
            categories["robot_box_person"].append((img_path, lf))
            
    print("Found test images per scenario:")
    for k, v in categories.items():
        print(f"  {k}: {len(v)} images")
    return categories

if __name__ == "__main__":
    find_test_images()
