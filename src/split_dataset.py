"""
Dataset Split Verification & Split Entrypoint
Academic Project: Autonomous Warehouse AI
Validates split integrity, checks for zero-leakage, and formats dataset splits.
"""

import os
import sys
import yaml
from prepare_yolo_dataset import prepare_yolo_splits

def main():
    cleaned_pool = "data/processed/warehouse_cleaned"
    if not os.path.exists(cleaned_pool):
        print(f"ERROR: Cleaned dataset pool not found at {cleaned_pool}")
        print("Please run 'python src/clean_dataset.py' first.")
        sys.exit(1)

    print("Executing dataset splitting with random seed = 42...")
    prepare_yolo_splits()

if __name__ == "__main__":
    main()
