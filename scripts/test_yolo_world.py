from ultralytics import YOLO

try:
    # Initialize YOLO-World model
    model = YOLO("yolov8s-world.pt")
    
    # Define custom warehouse classes
    custom_classes = [
        "person", 
        "robot", 
        "cardboard box", 
        "wooden pallet", 
        "forklift", 
        "warehouse rack", 
        "cart", 
        "conveyor belt", 
        "barcode", 
        "truck"
    ]
    model.set_classes(custom_classes)
    
    print(f"YOLO-World model loaded successfully with classes: {model.names}")
    
    # Test inference on the box image
    test_image = r"C:\Users\karth\.gemini\antigravity\brain\30a7e3ac-8229-4698-861c-8be24ae85db1\.user_uploaded\media_1787288524361.png"
    results = model(test_image, conf=0.01)
    for r in results:
        print(f"Total detections: {len(r.boxes)}")
        for box in r.boxes:
            print(f"Detected: {model.names[int(box.cls[0])]} - Conf: {float(box.conf[0]):.4f}")
            
except Exception as e:
    print(f"Error: {e}")
