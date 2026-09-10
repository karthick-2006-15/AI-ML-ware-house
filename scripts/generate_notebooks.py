"""
Notebook Generator Script
Generates the 4 academic Jupyter notebooks:
  - 01_dataset_audit.ipynb
  - 02_annotation_analysis.ipynb
  - 03_training_experiments.ipynb
  - 04_evaluation_error_analysis.ipynb
"""

import os
import json

def make_nb(cells):
    return {
        "cells": cells,
        "metadata": {
            "kernelspec": {
                "display_name": "Python 3",
                "language": "python",
                "name": "python3"
            },
            "language_info": {
                "name": "python",
                "version": "3.10.11"
            }
        },
        "nbformat": 4,
        "nbformat_minor": 5
    }

def md_cell(text):
    return {
        "cell_type": "markdown",
        "metadata": {},
        "source": [line + "\n" for line in text.strip().split("\n")]
    }

def code_cell(code):
    return {
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": [line + "\n" for line in code.strip().split("\n")]
    }

def generate_all():
    os.makedirs("notebooks", exist_ok=True)

    # Notebook 1: Dataset Audit
    nb1_cells = [
        md_cell("""# 01 — Dataset Audit and Exploratory Data Analysis (EDA)
### Project: Autonomous Warehouse AI
**Objective**: Statistically audit raw warehouse image datasets, identify structural class imbalances, analyze bounding box distributions, and verify annotation integrity before data cleaning.

#### Target Classes:
- `0: person` (Warehouse worker / pedestrian)
- `1: box` (Carton / container)
- `2: pallet` (Wooden / storage pallet)
- `3: forklift` (Industrial forklift)
- `4: robot` (Autonomous mobile robot / AGV / AMR)
- `5: robotic_arm` (Articulated robotic manipulator)"""),
        code_cell("""import os
import sys
import json
import glob
from collections import Counter
import matplotlib.pyplot as plt
import seaborn as sns
from PIL import Image

# Import project audit module
sys.path.append('../src')
from dataset_audit import audit_raw_datasets"""),
        md_cell("""## 1. Execute Dataset Audit Across Raw Data Sources
We evaluate:
1. `data/warehouse_robot_raw` (7,886 images covering person, box, pallet, forklift, robot)
2. `data/robotic_arm_raw` (3,418 images covering robotic arm)"""),
        code_cell("""# Run audit and export metrics
audit_results = audit_raw_datasets(
    wh_dir="../data/warehouse_robot_raw",
    arm_dir="../data/robotic_arm_raw",
    output_fig_dir="../results/figures",
    output_metrics_dir="../results/metrics"
)"""),
        md_cell("""## 2. Analyze Class Imbalance
The linear vs log scale analysis shows extreme imbalance: cartons and pallets exceed 300,000 instances, while robots have ~200 instances."""),
        code_cell("""# Display generated class distribution figure
from IPython.display import Image, display
display(Image(filename="../results/figures/class_distribution.png"))"""),
        md_cell("""## 3. Bounding Box Geometry and Aspect Ratios
Understanding bounding box size helps tune YOLO anchor priors and multi-scale feature pyramids."""),
        code_cell("""display(Image(filename="../results/figures/bbox_size_distribution.png"))
display(Image(filename="../results/figures/bbox_aspect_ratios.png"))"""),
        md_cell("""## 4. Key Findings from Audit:
1. **Zero corrupt images** across all 11,304 raw files.
2. **330 exact duplicate images** discovered in the robotic arm dataset caused by offline augmentation; these will be deduplicated to avoid train/test data leakage.
3. **267 polygon segmentation annotations** in warehouse data need conversion to bounding boxes.
4. **Class imbalance ratio** is over 1000:1 between boxes and robots, requiring stratified sampling during dataset preparation.""")
    ]
    with open("notebooks/01_dataset_audit.ipynb", "w") as f:
        json.dump(make_nb(nb1_cells), f, indent=2)

    # Notebook 2: Annotation Analysis
    nb2_cells = [
        md_cell("""# 02 — Annotation Analysis and Cleaning Verification
### Project: Autonomous Warehouse AI
**Objective**: Visually verify ground-truth annotations across all 6 warehouse classes, execute data cleaning, convert polygon annotations, eliminate duplicate images, and verify train/val/test splitting."""),
        code_cell("""import os
import sys
import json
import glob
from PIL import Image
from IPython.display import Image as IPImage, display

sys.path.append('../src')
from clean_dataset import clean_and_harmonize
from prepare_yolo_dataset import prepare_yolo_splits"""),
        md_cell("""## 1. Ground Truth Visual Inspection
Verify bounding box placement on real warehouse images for each standardized class."""),
        code_cell("""display(IPImage(filename="../results/figures/sample_annotated_images.png"))"""),
        md_cell("""## 2. Execute Data Cleaning Pipeline
- Purge non-target classes (`cart`, `white_roll`).
- Deduplicate identical image files.
- Convert 267 polygon annotations into enclosing bounding boxes.
- Clamp coordinates strictly to `[0.0, 1.0]`."""),
        code_cell("""# Run cleaning pipeline
cleaning_stats = clean_and_harmonize(
    wh_dir="../data/warehouse_robot_raw",
    arm_dir="../data/robotic_arm_raw",
    output_dir="../data/processed/warehouse_cleaned",
    report_path="../results/metrics/dataset_cleaning_report.json"
)"""),
        md_cell("""## 3. Review Cleaning Report
Compare raw ingested counts vs final cleaned annotations."""),
        code_cell("""with open("../results/metrics/dataset_cleaning_report.json") as f:
    report = json.load(f)

print("Duplicates Removed:", report["cleaning_actions"]["duplicates_removed"])
print("Polygons Converted:", report["cleaning_actions"]["polygons_converted_to_bboxes"])
print("Cleaned Total Images:", report["cleaned_counts"]["total_images"])
print("Cleaned Total Annotations:", report["cleaned_counts"]["total_annotations"])
print("Cleaned Class Breakdown:", json.dumps(report["cleaned_counts"]["class_annotations"], indent=2))"""),
        md_cell("""## 4. Leak-Free Train / Val / Test Split
Create isolated 70% train, 15% val, and 15% test splits with fixed random seed (42)."""),
        code_cell("""prepare_yolo_splits(
    cleaned_dir="../data/processed/warehouse_cleaned",
    output_standard="../data/processed/warehouse_yolo",
    output_balanced="../data/processed/warehouse_yolo_balanced"
)""")
    ]
    with open("notebooks/02_annotation_analysis.ipynb", "w") as f:
        json.dump(make_nb(nb2_cells), f, indent=2)

    # Notebook 3: Training Experiments
    nb3_cells = [
        md_cell("""# 03 — YOLO Training & Controlled Experiments
### Project: Autonomous Warehouse AI
**Objective**: Implement and log 4 controlled experiments evaluating dataset curation, domain-specific augmentations, and model architecture scaling.

### Experimental Matrix:
1. **Experiment 1 (Baseline)**: YOLOv8n fine-tuned on standard cleaned warehouse pool.
2. **Experiment 2 (Class-Balanced)**: YOLOv8n fine-tuned on curated balanced dataset.
3. **Experiment 3 (Augmented)**: YOLOv8n fine-tuned with warehouse lighting & angle augmentations.
4. **Experiment 4 (Model Scaling)**: YOLOv8s compared against YOLOv8n."""),
        code_cell("""import os
import sys
import pandas as pd
from ultralytics import YOLO

sys.path.append('../src')
from train import run_experiment, EXPERIMENT_LOG_PATH"""),
        md_cell("""## 1. Inspect Experiment Log
Review all completed training experiments, hyperparameters, and validation metrics."""),
        code_cell("""if os.path.exists("../" + EXPERIMENT_LOG_PATH):
    df_exp = pd.read_csv("../" + EXPERIMENT_LOG_PATH)
    display(df_exp[["experiment_id", "model", "dataset_version", "augmentation", "map50", "map50_95", "precision", "recall", "training_time_sec"]])
else:
    print("No experiment log found yet.")"""),
        md_cell("""## 2. Launching Experiment Runs
Example commands to execute individual experiments programmatically:
```python
# Run Experiment 1: Baseline
run_experiment(exp_id=1, epochs=15, batch_size=16, imgsz=640)

# Run Experiment 2: Balanced
run_experiment(exp_id=2, epochs=15, batch_size=16, imgsz=640)

# Run Experiment 3: Augmented
run_experiment(exp_id=3, epochs=15, batch_size=16, imgsz=640)

# Run Experiment 4: Scaled Model (YOLOv8s)
run_experiment(exp_id=4, epochs=15, batch_size=16, imgsz=640)
```"""),
        md_cell("""## 3. Training Loss and Validation Progression
Inspect the Ultralytics training curves (box loss, class loss, dfl loss, mAP progression)."""),
        code_cell("""# Display training plots from the final model run
from IPython.display import Image as IPImage, display
results_png = "../models/final/results.png"
if os.path.exists(results_png):
    display(IPImage(filename=results_png))
else:
    print("Training plot will appear once training completes.")""")
    ]
    with open("notebooks/03_training_experiments.ipynb", "w") as f:
        json.dump(make_nb(nb3_cells), f, indent=2)

    # Notebook 4: Evaluation and Error Analysis
    nb4_cells = [
        md_cell("""# 04 — Evaluation, Error Analysis & Real-Time Demo
### Project: Autonomous Warehouse AI
**Objective**: Rigorously benchmark the final model on the isolated test set, categorize failures across 6 diagnostic error modes, and demonstrate multi-source inference."""),
        code_cell("""import os
import sys
import json
import pandas as pd
from IPython.display import Image as IPImage, display

sys.path.append('../src')
from evaluate import evaluate_model
from error_analysis import run_error_analysis
from inference import WarehouseDetector"""),
        md_cell("""## 1. Formal Test Set Evaluation
Benchmark overall and per-class Precision, Recall, mAP@50, and mAP@50:95."""),
        code_cell("""eval_report = evaluate_model(
    model_path="../models/final/weights/best.pt",
    data_yaml="../configs/data.yaml",
    split="test",
    imgsz=640,
    output_prefix="notebook_eval"
)"""),
        md_cell("""## 2. Per-Class Benchmark Visualization"""),
        code_cell("""display(IPImage(filename="../results/figures/notebook_eval_per_class.png"))"""),
        md_cell("""## 3. In-Depth Error Analysis
Investigate False Positives, Missed Objects, Class Confusions, and Small Object Failures."""),
        code_cell("""err_report = run_error_analysis(
    model_path="../models/final/weights/best.pt",
    test_img_dir="../data/processed/warehouse_yolo/images/test",
    test_lbl_dir="../data/processed/warehouse_yolo/labels/test",
    conf_thresh=0.25,
    output_dir="../results/failure_cases"
)"""),
        md_cell("""## 4. Visualized Failure Cases
Inspect representative false negatives and localization errors in warehouse contexts."""),
        code_cell("""import glob
failure_images = glob.glob("../results/failure_cases/*.jpg")
for img_p in failure_images[:4]:
    display(IPImage(filename=img_p))"""),
        md_cell("""## 5. Live Inference Demonstration
Run the multi-source inference engine on a test image."""),
        code_cell("""detector = WarehouseDetector(model_path="../models/final/weights/best.pt", conf=0.25)
test_sample = glob.glob("../data/processed/warehouse_yolo/images/test/*.jpg")[0]
res = detector.predict_image(test_sample, save_path="../results/predictions/demo_pred.jpg")
print("Detected Objects:", res["object_count"])
for d in res["detections"]:
    print(f"  - {d['class']} ({d['confidence']:.2f})")
display(IPImage(filename="../results/predictions/demo_pred.jpg"))""")
    ]
    with open("notebooks/04_evaluation_error_analysis.ipynb", "w") as f:
        json.dump(make_nb(nb4_cells), f, indent=2)

    print("[NOTEBOOKS] Generated all 4 academic notebooks successfully.")

if __name__ == "__main__":
    generate_all()
