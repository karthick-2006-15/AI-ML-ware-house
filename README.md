# Autonomous Warehouse AI — YOLO Object Detection & Simulation Pipeline

[![Python 3.10](https://img.shields.io/badge/python-3.10-blue.svg)](https://www.python.org/downloads/release/python-31011/)
[![Ultralytics YOLOv8](https://img.shields.io/badge/YOLO-v8.4-red.svg)](https://github.com/ultralytics/ultralytics)
[![PyTorch](https://img.shields.io/badge/PyTorch-2.x-orange.svg)](https://pytorch.org/)
[![License: CC BY 4.0](https://img.shields.io/badge/License-CC%20BY%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by/4.0/)

An academic-grade, end-to-end Computer Vision system for autonomous warehouse operations. This repository contains the complete ML lifecycle alongside a highly interactive simulation dashboard and predictive analytics engine.

---

## 1. Problem Statement
Modern warehouses and logistics centers face significant challenges in tracking dynamic inventory, ensuring worker safety, and optimizing the routing of Autonomous Mobile Robots (AMRs) and forklifts. Manual monitoring is error-prone, unscalable, and often leads to traffic bottlenecks or safety hazards. 

**The Goal**: Develop a real-time, highly accurate object detection pipeline integrated with a live digital-twin simulation and predictive analytics dashboard. This system must track workers, products, and robots simultaneously, predict zone congestion, and dynamically coordinate fleet logistics to maximize operational efficiency and safety.

---

## 2. Core Features
- 🎯 **Real-Time Object Detection**: High-accuracy detection of 6 critical warehouse entities (Person, Box, Pallet, Forklift, AMR Robot, Robotic Arm) using YOLOv8.
- 📊 **Interactive Cinematic Dashboard**: A React-based web UI with live metrics, system health snapshots, and interactive data visualization.
- 🤖 **Warehouse Simulation Engine**: Integrated Multi-Agent Pathfinding (A* algorithm) and robot coordination simulating a live warehouse environment.
- 🧠 **Predictive Analytics**: XGBoost integration to forecast demand, predict zone congestion, and evaluate robotic performance.
- ☁️ **Cloud-Ready Deployment**: Configured for 1-click deployment on Render (FastAPI Backend) and Vercel (React Frontend) via environment variables and `render.yaml`.
- 📹 **Live Vision Feed**: Process webcams, CCTV streams, and local videos in real-time straight through the frontend dashboard.
- 📈 **Extensive ML Pipelines**: Automated data cleaning, bounding-box aspect ratio auditing, class balancing, multi-experiment training, and isolated testing.

---

## 3. Dataset Description & Standardized Class Taxonomy

The model is trained on a highly curated, unified dataset designed for robust performance in industrial environments.

### Dataset Overview
- **Raw Data Scale**: 11,304 total raw images from industrial settings.
- **Bounding Boxes**: Over 309,000 raw bounding box annotations.
- **Data Quality Actions**: Removed 330 exact duplicates, converted 267 polygon segmentation annotations to bounding boxes, purged irrelevant classes (`cart`, `white_roll`), and harmonized taxonomy.
- **Standardized Splits**: Seeded at `42` with 0% data leakage across **Train (70%), Validation (15%), and Test (15%)**.

### Class Taxonomy

| Class ID | Class Name | Definition & Warehouse Scope |
|---|---|---|
| **0** | `person` | Warehouse workers, forklift drivers, safety personnel, and pedestrians |
| **1** | `box` | Cardboard cartons, shipping packages, containers on shelves or conveyors |
| **2** | `pallet` | Standard wooden or plastic pallets (empty or loaded) |
| **3** | `forklift` | Industrial forklifts, reach trucks, and order pickers |
| **4** | `robot` | Autonomous mobile robots (AMRs), Automated Guided Vehicles (AGVs) |
| **5** | `robotic_arm` | Stationary and articulated robotic arms/manipulators |

*(Datasets sourced from Roboflow Universe under CC BY 4.0 licenses).*

---

## 4. Project Directory Architecture

```
Autonomous-Warehouse-AI/
│
├── frontend/                # React/Vite/Tailwind Cinematic Web Dashboard
├── backend/                 # FastAPI REST & WebSocket Backend Server
├── ml_engine/               # Multi-robot A* Pathfinding and Coordinators
├── simulation/              # Digital-Twin 2D Warehouse Environment
├── predictive_analytics/    # XGBoost Demand Forecasting and Zone Intelligence
│
├── data/
│   ├── raw/                 # Pristine raw image datasets
│   └── processed/           # Cleaned, unified, and balanced YOLO datasets
│
├── notebooks/               # Jupyter notebooks for Data Audit, Training, & Evaluation
│
├── src/                     # Core ML scripts for cleaning, auditing, training, & testing
├── configs/                 # YAML configurations for YOLO and hyperparameters
├── models/                  # Saved weights (Baseline, Experiments, Final)
├── results/                 # Publication figures, matrices, JSON metrics, and failure cases
│
├── start_system.bat         # 1-Click Windows Launcher (Starts all services)
├── run.py                   # Cross-Platform Python Launcher
├── render.yaml              # Render Cloud Deployment configuration
├── requirements.txt         # Environment dependencies
└── README.md                # Project documentation
```

---

## 5. Quick Start — Run Full Application Locally

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

## 6. Step-by-Step Reproduction Guide

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

### Step 3: Clean and Harmonize Annotations
Deduplicates exact images, converts polygon segmentation annotations to bounding boxes, removes non-target classes, and normalizes coordinates:
```bash
python src/clean_dataset.py
```

### Step 4: Generate YOLO Train/Val/Test Splits
Partitions data into **70% Train, 15% Validation, and 15% Test** using random seed 42 with zero data leakage:
```bash
python src/prepare_yolo_dataset.py
```

### Step 5: Reproduce the 4 Controlled Experiments
Run the training matrix programmatically via `src/train.py`:
```bash
python src/train.py --experiment 1 --epochs 15 --batch 16 --imgsz 640
python src/train.py --experiment 2 --epochs 15 --batch 16 --imgsz 640
python src/train.py --experiment 3 --epochs 15 --batch 16 --imgsz 640
python src/train.py --experiment 4 --epochs 15 --batch 16 --imgsz 640
```
All training parameters and validation results are automatically recorded in `experiment_log.csv`.

### Step 6: Evaluate on Isolated Test Set
Benchmark any trained model against the untouched 1,601 test images:
```bash
python src/evaluate.py --model models/final/weights/best.pt --data configs/data.yaml --split test
```

### Step 7: Perform Error Analysis
Diagnose model failure modes across 6 categories:
```bash
python src/error_analysis.py --model models/final/weights/best.pt
```

### Step 8: Multi-Input Live Demonstration
Run real-time inference on an image, directory, video, or webcam:
```bash
python src/inference.py --source 0  # Live webcam
```

---

## 7. Cloud Deployment (Vercel & Render)
This application is configured for standard cloud deployment. 
1. **Backend**: Connect your GitHub repository to [Render](https://render.com) using the provided `render.yaml` as a Blueprint.
2. **Frontend**: Connect to [Vercel](https://vercel.com), set the root directory to `frontend`, and provide the `VITE_API_URL` environment variable pointing to your Render backend.

---

## 8. Academic Integrity & Reproducibility Statement
All metrics, graphs, bounding box statistics, and error logs presented in this project are generated strictly from empirical training and validation on genuine warehouse image data. No synthetic metrics, mock statistics, or pretrained COCO mock evaluations were used as substitute for real model fine-tuning.
