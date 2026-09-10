import os
import sys

try:
    import fiftyone as fo
    import fiftyone.zoo as foz
except ImportError:
    print("ERROR: fiftyone not found. Please run 'pip install fiftyone'")
    sys.exit(1)

def download_vision_dataset():
    output_dir = os.path.join("data", "raw", "vision")
    os.makedirs(output_dir, exist_ok=True)
    
    print("Downloading Warehouse Objects (Box, Person, Human) from Open Images V7...")
    try:
        # Load 150 validation images containing our target classes
        dataset = foz.load_zoo_dataset(
            "open-images-v7",
            split="validation",
            label_types=["detections"],
            classes=["Box"],
            max_samples=150,
            dataset_name="warehouse_vision"
        )
        
        # Export to YOLO format
        print(f"Exporting dataset to YOLO format at {output_dir}")
        dataset.export(
            export_dir=output_dir,
            dataset_type=fo.types.YOLOv5Dataset,
            split="val"  # YOLO expects train/val
        )
        print("Successfully downloaded and extracted to data/raw/vision")
    except Exception as e:
        print("ERROR: Vision dataset download failed.")
        print(e)
        sys.exit(1)

if __name__ == "__main__":
    download_vision_dataset()
