import os
import sys
import shutil

try:
    import kagglehub
except ImportError:
    print("ERROR: kagglehub not found. Please run 'pip install kagglehub'")
    sys.exit(1)

def download_warehouse_dataset():
    output_dir = os.path.join("data", "raw", "warehouse")
    os.makedirs(output_dir, exist_ok=True)
    
    dataset_slug = "ziya07/logistics-warehouse-dataset"
    print(f"Attempting to download Warehouse Dataset: {dataset_slug}")
    
    try:
        # Download using kagglehub
        path = kagglehub.dataset_download(dataset_slug)
        print(f"Dataset downloaded to cache: {path}")
        
        # Move contents to our project directory
        for item in os.listdir(path):
            s = os.path.join(path, item)
            d = os.path.join(output_dir, item)
            if os.path.isfile(s):
                shutil.copy2(s, d)
            elif os.path.isdir(s):
                shutil.copytree(s, d, dirs_exist_ok=True)
                
        print(f"Successfully copied dataset to {output_dir}")
        
    except Exception as e:
        print("ERROR: Dataset download failed.")
        print(e)
        print("Ensure your KAGGLE_API_TOKEN environment variable is set.")
        sys.exit(1)

if __name__ == "__main__":
    download_warehouse_dataset()
