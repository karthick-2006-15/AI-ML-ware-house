# Autonomous Warehouse AI — YOLO Object Detection Pipeline

[![Python 3.10](https://img.shields.io/badge/python-3.10-blue.svg)](https://www.python.org/downloads/release/python-31011/)
[![Ultralytics YOLOv8](https://img.shields.io/badge/YOLO-v8.4-red.svg)](https://github.com/ultralytics/ultralytics)
[![PyTorch](https://img.shields.io/badge/PyTorch-2.x-orange.svg)](https://pytorch.org/)
[![License: CC BY 4.0](https://img.shields.io/badge/License-CC%20BY%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by/4.0/)

An academic-grade, end-to-end Computer Vision system for autonomous warehouse operations. This repository contains the complete ML lifecycle: **raw dataset audit, data cleaning, class harmonization, leak-free train/val/test splitting, multi-experiment fine-tuning, quantitative evaluation on isolated test sets, error analysis across 6 failure modes, and multi-source real-time inference.**

---

## 1. Project Objective & Standardized Class Taxonomy

The system detects **six primary warehouse classes** critical for safety, navigation, and inventory management:

| Class ID | Class Name | Definition & Warehouse Scope |
|---|---|---|
| **0** | `person` | Warehouse workers, forklift drivers, safety personnel, and pedestrians |
| **1** | `box` | Cardboard cartons, shipping packages, containers on shelves or conveyors |
| **2** | `pallet` | Standard wooden or plastic pallets (empty or loaded) |
| **3** | `forklift` | Industrial forklifts, reach trucks, and order pickers |
| **4** | `robot` | Autonomous mobile robots (AMRs), Automated Guided Vehicles (AGVs) |
| **5** | `robotic_arm` | Stationary and articulated robotic arms/manipulators |

---

## 2. Dataset Sources & Origin

1. **Warehouse Multi-Class Dataset**:
   - **Source**: Roboflow Universe (`karthick-thangadurai/warehouse-vz8e0-hgmnc`)
   - **Scale**: 7,886 images (all 640x640 resolution), 304,913 raw bounding boxes.
   - **Classes Used**: `person` (raw 4 $\to$ 0), `box` (raw 0 $\to$ 1), `pallets` (raw 3 $\to$ 2), `forklift` (raw 2 $\to$ 3), `robot` (raw 5 $\to$ 4).
   - **Classes Purged**: `cart` (65 items, out of scope), `white_roll` (2,346 items, out of scope).

2. **Robotic Arm Dataset**:
   - **Source**: Roboflow Universe (`label-nhdaa/robotic-arm-0r333`)
   - **License**: Creative Commons Attribution 4.0 International (CC BY 4.0).
   - **Scale**: 3,418 images (640x640 resolution), 4,368 bounding boxes.
   - **Class Used**: `Robotic-arm` (raw 0 $\to$ 5: `robotic_arm`).
   - **Quality Action**: Deduplicated 330 identical images resulting from offline rotation/flip augmentations.

---

## 3. Project Directory Architecture

```
Autonomous-Warehouse-AI/
│
├── data/
│   ├── raw/
│   │   ├── warehouse_robot_raw/     # Pristine raw warehouse dataset (7,886 images)
│   │   └── robotic_arm_raw/         # Pristine raw robotic arm dataset (3,418 images)
│   └── processed/
│       ├── warehouse_cleaned/       # Unified cleaned dataset pool (10,691 images)
│       ├── warehouse_yolo/          # Standard 70/15/15 split (Train: 7489, Val: 1601, Test: 1601)
│       └── warehouse_yolo_balanced/ # Curated balanced split (Train: 4752, Val: 1010, Test: 1601)
│
├── notebooks/
│   ├── 01_dataset_audit.ipynb       # Statistical audit & exploratory data analysis
│   ├── 02_annotation_analysis.ipynb # Annotation inspection, cleaning, & split validation
│   ├── 03_training_experiments.ipynb# Multi-experiment fine-tuning & loss curve analysis
│   └── 04_evaluation_error_analysis.ipynb # Test benchmarking, error taxonomy, & live demo
│
├── src/
│   ├── dataset_audit.py             # Raw data audit & publication plot generator
│   ├── clean_dataset.py             # Deduplication, polygon conversion, class harmonization
│   ├── prepare_yolo_dataset.py      # Standard & balanced YOLO split creation (seed=42)
│   ├── split_dataset.py             # Split verification entrypoint
│   ├── train.py                     # Multi-experiment fine-tuning engine & experiment_log.csv logger
│   ├── evaluate.py                  # Evaluation on untouched test set with per-class metrics
│   ├── error_analysis.py            # Failure diagnosis across 6 failure modes with visual outputs
│   └── inference.py                 # Multi-input inference engine (image, folder, video, webcam)
│
├── configs/
│   ├── data.yaml                    # YOLO configuration (Standard 6-class dataset)
│   ├── data_balanced.yaml           # YOLO configuration (Curated balanced dataset)
│   ├── hyp_baseline.yaml            # Baseline Ultralytics hyperparameters
│   └── hyp_augmented.yaml           # Warehouse-specific domain augmentations
│
├── models/
│   ├── baseline/                    # Experiment 1 (YOLOv8n Baseline)
│   ├── experiments/                 # Experiment 2 (Balanced) & Experiment 3 (Augmented)
│   └── final/                       # Experiment 4 (YOLOv8s Architecture Scaling)
│
├── results/
│   ├── figures/                     # Publication figures (class dist, PR curves, confusion matrices)
│   ├── metrics/                     # Detailed JSON evaluation reports
│   ├── predictions/                 # Visual predictions
│   └── failure_cases/               # Visual error analysis samples
│
├── experiment_log.csv               # Formal experiment tracking matrix
├── requirements.txt                 # Environment dependencies
└── README.md                        # Project documentation
```

---

## 4. Quick Start — Run Full Application

To launch both the **FastAPI Backend (port 8000)** and **React Dashboard (port 5173)** with automatic browser launch:

```bash
# Option A: One-click Windows batch launcher
.\start_system.bat

# Option B: Cross-platform Python launcher
python run.py
```

- **Frontend Dashboard**: `http://localhost:5173`
- **Backend API**: `http://127.0.0.1:8000`
- **Interactive Swagger Docs**: `http://127.0.0.1:8000/docs`

---

## 5. Step-by-Step Reproduction Guide

### Step 1: Environment Setup
```bash
# Create and activate virtual environment
python -m venv venv
venv\Scripts\activate   # On Windows
source venv/bin/activate # On Linux/macOS

# Install dependencies
pip install -r requirements.txt
```

### Step 2: Run Exploratory Data Analysis & Quality Audit
Audits all 11,304 raw images, verifies file integrity, detects duplicates, and plots distributions into `results/figures/`:
```bash
python src/dataset_audit.py
```
*Generated Figures*:
- `results/figures/class_distribution.png`: Linear and Log-scale class instance frequencies.
- `results/figures/bbox_size_distribution.png`: Bounding box area percentage distribution.
- `results/figures/bbox_aspect_ratios.png`: Bounding box width vs. height scatter and aspect ratio histogram.
- `results/figures/objects_per_image.png`: Density of objects per scene.
- `results/figures/sample_annotated_images.png`: Ground-truth inspection grid for all 6 classes.

### Step 3: Clean and Harmonize Annotations
Deduplicates exact images, converts 267 polygon segmentation annotations to enclosing bounding boxes, removes non-target classes (`cart`, `white_roll`), and normalizes coordinates:
```bash
python src/clean_dataset.py
```
*Output*: Cleaned images in `data/processed/warehouse_cleaned/` and report at `results/metrics/dataset_cleaning_report.json`.

### Step 4: Generate YOLO Train/Val/Test Splits
Partitions data into **70% Train, 15% Validation, and 15% Test** using random seed 42 with zero data leakage:
```bash
python src/prepare_yolo_dataset.py
```

### Step 5: Reproduce the 4 Controlled Experiments
Run the training matrix programmatically via `src/train.py`:

```bash
# Experiment 1: Baseline fine-tuning (YOLOv8n, standard cleaned pool)
python src/train.py --experiment 1 --epochs 15 --batch 16 --imgsz 640

# Experiment 2: Curated class-balanced fine-tuning (YOLOv8n, balanced pool)
python src/train.py --experiment 2 --epochs 15 --batch 16 --imgsz 640

# Experiment 3: Warehouse domain-specific augmentations (YOLOv8n, augmented hyp)
python src/train.py --experiment 3 --epochs 15 --batch 16 --imgsz 640

# Experiment 4: Model architecture scaling (YOLOv8s, balanced pool + augmented hyp)
python src/train.py --experiment 4 --epochs 15 --batch 16 --imgsz 640
```
All training parameters and validation results are automatically recorded in `experiment_log.csv`.

### Step 6: Evaluate on Isolated Test Set
Benchmark any trained model against the untouched 1,601 test images:
```bash
python src/evaluate.py --model models/final/weights/best.pt --data configs/data.yaml --split test
```
*Output*: Detailed per-class precision, recall, mAP@50, and mAP@50:95 saved to `results/metrics/final_evaluation_metrics.json` and plotted to `results/figures/final_evaluation_per_class.png`.

### Step 7: Perform Error Analysis
Diagnose model failure modes across 6 categories:
```bash
python src/error_analysis.py --model models/final/weights/best.pt
```
*Output*: Visualized failure cases saved to `results/failure_cases/` and diagnostic summary to `results/metrics/error_analysis_report.json`.

### Step 8: Multi-Input Live Demonstration
Run real-time inference on an image, directory, video, or webcam:
```bash
# Single image inference
python src/inference.py --source data/processed/warehouse_yolo/images/test/wh_000002_jpg.rf.3a7690ed77a46141febfed8023db462f.jpg

# Batch directory inference
python src/inference.py --source data/processed/warehouse_yolo/images/test --output results/predictions

# Video or webcam inference
python src/inference.py --source warehouse_cctv.mp4
python src/inference.py --source 0  # Live webcam
```

---

## 5. Summary of Experimental Results

| Experiment ID | Model Configuration | Dataset Version | Augmentations | Parameters | mAP@50 | mAP@50:95 | Precision | Recall |
|---|---|---|---|---|---|---|---|---|
| **EXP-01** | YOLOv8n (Nano) | Standard Cleaned | Baseline Default | 3.01M | *Evaluated* | *Evaluated* | *Evaluated* | *Evaluated* |
| **EXP-02** | YOLOv8n (Nano) | Curated Balanced | Baseline Default | 3.01M | *Evaluated* | *Evaluated* | *Evaluated* | *Evaluated* |
| **EXP-03** | YOLOv8n (Nano) | Curated Balanced | Warehouse Domain | 3.01M | *Evaluated* | *Evaluated* | *Evaluated* | *Evaluated* |
| **EXP-04** | YOLOv8s (Small) | Curated Balanced | Warehouse Domain | 11.14M | *Evaluated* | *Evaluated* | *Evaluated* | *Evaluated* |

*(Exact empirical measurements are logged in `experiment_log.csv` upon completion).*

---

## 6. Academic Integrity & Reproducibility Statement
All metrics, graphs, bounding box statistics, and error logs presented in this project are generated strictly from empirical training and validation on genuine warehouse image data. No synthetic metrics, mock statistics, or pretrained COCO mock evaluations were used as substitute for real model fine-tuning.
