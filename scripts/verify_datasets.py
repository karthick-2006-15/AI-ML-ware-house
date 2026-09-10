import os
import sys

def verify_vision_dataset():
    vision_dir = os.path.join("data", "raw", "vision")
    if not os.path.exists(vision_dir) or not os.listdir(vision_dir):
        print("❌ Vision dataset is missing or empty.")
        return False
        
    print(f"✅ Vision dataset found in {vision_dir}")
    print(f"   Files/Folders present: {os.listdir(vision_dir)}")
    return True

def verify_warehouse_dataset():
    warehouse_dir = os.path.join("data", "raw", "warehouse")
    if not os.path.exists(warehouse_dir) or not os.listdir(warehouse_dir):
        print("❌ Warehouse dataset is missing or empty.")
        return False
        
    print(f"✅ Warehouse dataset found in {warehouse_dir}")
    print(f"   Files/Folders present: {os.listdir(warehouse_dir)}")
    
    # Check for CSV
    csvs = [f for f in os.listdir(warehouse_dir) if f.endswith('.csv')]
    if not csvs:
        print("❌ No CSV files found in warehouse dataset directory.")
        return False
        
    return True

if __name__ == "__main__":
    print("--- Verifying Datasets ---")
    vision_ok = verify_vision_dataset()
    warehouse_ok = verify_warehouse_dataset()
    
    if not (vision_ok and warehouse_ok):
        print("\n⚠️ Verification failed. Please run the download scripts first.")
        sys.exit(1)
    
    print("\n✅ All datasets verified successfully.")
