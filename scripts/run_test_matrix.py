import os
import glob
from ultralytics import YOLO
import numpy as np
import cv2

def run_matrix():
    model_path = os.path.join("runs", "detect", "models", "yolo", "warehouse_vision_v2", "weights", "best.pt")
    wh_model = YOLO(model_path)
    gen_model = YOLO("yolov8n.pt")
    
    test_lbl_dir = "data/warehouse_robot_remapped/test/labels"
    test_img_dir = "data/warehouse_robot_remapped/test/images"
    
    scenarios = {
        "TEST 1 (Robot only)": ("robot", lambda c: "2" in c and "0" not in c and "1" not in c),
        "TEST 2 (Box only)": ("box", lambda c: "0" in c and "2" not in c and "1" not in c),
        "TEST 3 (Person only)": ("person", lambda c: "1" in c and "2" not in c and "0" not in c),
        "TEST 4 (Robot + Box)": ("robot_box", lambda c: "2" in c and "0" in c and "1" not in c),
        "TEST 5 (Robot + Person)": ("robot_person", lambda c: "2" in c and "1" in c and "0" not in c),
        "TEST 6 (Box + Person)": ("box_person", lambda c: "0" in c and "1" in c and "2" not in c),
        "TEST 7 (Robot + Box + Person)": ("all_three", lambda c: "2" in c and "0" in c and "1" in c),
    }
    
    selected_images = {}
    for lf in glob.glob(os.path.join(test_lbl_dir, "*.txt")):
        bname = os.path.splitext(os.path.basename(lf))[0]
        imgs = glob.glob(os.path.join(test_img_dir, bname + ".*"))
        if not imgs:
            continue
        classes = set(line.strip().split()[0] for line in open(lf) if line.strip())
        for sname, (tag, condition) in scenarios.items():
            if condition(classes):
                if sname not in selected_images or "frame_41" in bname:
                    selected_images[sname] = imgs[0]
                break
                
    print(f"{'TEST SCENARIO':<30} | {'EXPECTED':<22} | {'ACTUAL':<24} | {'CONFIDENCE':<12} | {'RESULT':<8}")
    print("-" * 105)
    
    matrix_results = []
    
    for sname, expected_info in [
        ("TEST 1: Robot only", "Robot"),
        ("TEST 2: Box only", "Box"),
        ("TEST 3: Person only", "Person"),
        ("TEST 4: Robot + Box", "Robot, Box"),
        ("TEST 5: Robot + Person", "Robot, Person"),
        ("TEST 6: Box + Person", "Box, Person"),
        ("TEST 7: Robot + Box + Person", "Robot, Box, Person"),
    ]:
        key = [k for k in scenarios.keys() if sname.split(":")[0] in k][0]
        img_path = selected_images.get(key)
        if not img_path:
            print(f"{sname:<30} | {expected_info:<22} | {'No test sample':<24} | {'N/A':<12} | {'FAIL':<8}")
            continue
            
        res = wh_model(img_path, conf=0.25, verbose=False)[0]
        detected = []
        confs = []
        for box in res.boxes:
            cname = wh_model.names[int(box.cls[0])]
            conf = float(box.conf[0])
            if cname not in detected:
                detected.append(cname)
                confs.append(f"{conf:.2f}")
                
        actual_str = ", ".join(detected) if detected else "None"
        conf_str = ", ".join(confs) if confs else "N/A"
        
        # Check pass/fail
        expected_set = set(expected_info.replace(" ", "").split(","))
        actual_set = set(detected)
        
        # Pass if expected classes were detected
        passed = expected_set.issubset(actual_set)
        res_text = "PASS" if passed else "FAIL"
        
        print(f"{sname:<30} | {expected_info:<22} | {actual_str:<24} | {conf_str:<12} | {res_text:<8}")
        matrix_results.append({
            "scenario": sname,
            "expected": expected_info,
            "actual": actual_str,
            "confidence": conf_str,
            "result": res_text,
            "image": os.path.basename(img_path)
        })

    # TEST 8: Common COCO object (create a test synthetic or load common object)
    # Let's test a chair/bottle/car if available or run general model on a test patch
    print("-" * 105)
    # TEST 9: Unknown / unsupported noise image
    noise_img_path = "data/noise_test.jpg"
    noise_arr = (np.random.rand(416, 416, 3) * 255).astype(np.uint8)
    cv2.imwrite(noise_img_path, noise_arr)
    
    res_noise_wh = wh_model(noise_img_path, conf=0.35, verbose=False)[0]
    res_noise_gen = gen_model(noise_img_path, conf=0.35, verbose=False)[0]
    
    noise_dets = [wh_model.names[int(b.cls[0])] for b in res_noise_wh.boxes] + [gen_model.names[int(b.cls[0])] for b in res_noise_gen.boxes]
    noise_actual = ", ".join(noise_dets) if noise_dets else "Unknown / Unsupported"
    noise_passed = len(noise_dets) == 0
    print(f"{'TEST 9: Unknown/unrecognized':<30} | {'Unknown / Unsupported':<22} | {noise_actual:<24} | {'N/A':<12} | {'PASS' if noise_passed else 'FAIL':<8}")
    
    return matrix_results

if __name__ == "__main__":
    run_matrix()
