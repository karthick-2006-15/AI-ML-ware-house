import os
from ultralytics import YOLO

model_path = os.path.join("runs", "detect", "models", "yolo", "warehouse_vision", "weights", "best.pt")
print(f"Loading model from: {model_path}")
if not os.path.exists(model_path):
    print("MODEL DOES NOT EXIST!")
    exit(1)

model = YOLO(model_path)
print(f"Model classes: {model.names}")

# Let's test on the user's uploaded image
test_image = r"C:\Users\karth\.gemini\antigravity\brain\30a7e3ac-8229-4698-861c-8be24ae85db1\.user_uploaded\media_1787288524361.png"
if not os.path.exists(test_image):
    print(f"Test image not found: {test_image}")
else:
    print(f"\nRunning inference on {test_image} at conf=0.25 (default)")
    results = model(test_image)
    for r in results:
        print(f"Boxes detected: {len(r.boxes)}")
        for box in r.boxes:
            print(f"Class: {model.names[int(box.cls[0])]}, Conf: {float(box.conf[0]):.4f}, BBox: {box.xyxy[0].tolist()}")
            
    print(f"\nRunning inference on {test_image} at conf=0.05")
    results = model(test_image, conf=0.05)
    for r in results:
        print(f"Boxes detected: {len(r.boxes)}")
        for box in r.boxes:
            print(f"Class: {model.names[int(box.cls[0])]}, Conf: {float(box.conf[0]):.4f}")

