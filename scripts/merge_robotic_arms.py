import os
import glob
import shutil
import random

def merge_robotic_arms(arm_root, target_root, seed=42):
    random.seed(seed)
    
    splits = {
        'train': 150,
        'valid': 30,
        'test': 20
    }
    
    print("Merging robotic arm images into warehouse dataset...")
    
    for split, count in splits.items():
        src_lbl_dir = os.path.join(arm_root, split, 'labels')
        src_img_dir = os.path.join(arm_root, split, 'images')
        
        dst_lbl_dir = os.path.join(target_root, split, 'labels')
        dst_img_dir = os.path.join(target_root, split, 'images')
        
        lbl_files = glob.glob(os.path.join(src_lbl_dir, '*.txt'))
        selected_lbls = random.sample(lbl_files, min(len(lbl_files), count))
        
        added = 0
        for lf in selected_lbls:
            bname = os.path.splitext(os.path.basename(lf))[0]
            img_candidates = glob.glob(os.path.join(src_img_dir, bname + '.*'))
            if not img_candidates:
                continue
            src_img = img_candidates[0]
            ext = os.path.splitext(src_img)[1]
            
            # Destination filenames
            dst_bname = "arm_" + bname
            dst_lbl = os.path.join(dst_lbl_dir, dst_bname + '.txt')
            dst_img = os.path.join(dst_img_dir, dst_bname + ext)
            
            # Remap class 0 (Robotic-arm) -> 2 (Robot)
            new_lines = []
            with open(lf, 'r') as f:
                for line in f:
                    parts = line.strip().split()
                    if parts and len(parts) == 5:
                        xc, yc, w, h = parts[1:5]
                        new_lines.append(f"2 {xc} {yc} {w} {h}\n")
                        
            if new_lines:
                with open(dst_lbl, 'w') as f:
                    f.writelines(new_lines)
                shutil.copy2(src_img, dst_img)
                added += 1
                
        print(f"Added {added} robotic arm images to {split} split.")

if __name__ == '__main__':
    merge_robotic_arms('data/robotic_arm_raw', 'data/warehouse_robot_remapped')
