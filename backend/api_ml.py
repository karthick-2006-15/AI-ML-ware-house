from fastapi import APIRouter, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import sys
import os
import shutil
import tempfile

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from ml.warehouse.inference import WarehouseInference
from ml.vision.inference import VisionInference

ml_router = APIRouter(prefix="/api/ml", tags=["Machine Learning"])

# Initialize models
try:
    warehouse_infer = WarehouseInference()
    vision_infer = VisionInference()
except Exception as e:
    print(f"WARNING: ML Models not fully loaded. Error: {e}")
    warehouse_infer = None
    vision_infer = None

class WarehousePredictRequest(BaseModel):
    stock_level: float
    reorder_point: float
    reorder_frequency_days: float
    lead_time_days: float
    daily_demand: float
    demand_std_dev: float
    item_popularity_score: float
    picking_time_seconds: float
    handling_cost_per_unit: float
    unit_price: float
    holding_cost_per_unit_day: float
    order_fulfillment_rate: float
    total_orders_last_month: float
    turnover_ratio: float
    layout_efficiency_score: float
    category: str = "Electronics"
    zone: str = "A"

@ml_router.get("/status")
def get_status():
    """
    Returns the real-time status and metadata of the loaded ML models
    """
    wh_loaded = vision_infer is not None and getattr(vision_infer, 'warehouse_model', None) is not None
    wh_classes = list(vision_infer.warehouse_model.names.values()) if wh_loaded else []
    
    return JSONResponse({
        "warehouse_detector": "YOLOv8",
        "warehouse_model_loaded": wh_loaded,
        "warehouse_model_path": getattr(vision_infer, 'model_path', "None"),
        "warehouse_classes": wh_classes,
        "general_detector": {
            "loaded": vision_infer is not None and vision_infer.general_model is not None,
            "classes_count": len(vision_infer.general_model.names) if (vision_infer and vision_infer.general_model) else 0
        },
        "xgboost": {
            "loaded": warehouse_infer is not None
        },
        "xgboost_ready": warehouse_infer is not None,
        "yolo_ready": wh_loaded
    })

import json
import cv2
import numpy as np
import base64
from typing import Optional

class FrameDetectRequest(BaseModel):
    image: str
    confidence: Optional[float] = 0.25
    render_annotated: Optional[bool] = False

@ml_router.post("/detect")
async def detect_objects(file: UploadFile = File(...)):
    if not vision_infer:
        raise HTTPException(status_code=503, detail="Vision model not loaded.")
        
    if not file.filename.endswith(('.png', '.jpg', '.jpeg')):
        raise HTTPException(status_code=400, detail="Invalid image file.")
        
    try:
        # Create a temp file
        temp_dir = tempfile.mkdtemp()
        temp_path = os.path.join(temp_dir, file.filename)
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Run inference
        result = vision_infer.predict_image(temp_path)
        
        # Clean up
        os.remove(temp_path)
        os.rmdir(temp_dir)
        
        return JSONResponse(content=result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference error: {str(e)}")

@ml_router.post("/detect_frame")
async def detect_frame(request: FrameDetectRequest):
    if not vision_infer:
        raise HTTPException(status_code=503, detail="Vision model not loaded.")
    try:
        data_str = request.image
        if "," in data_str:
            data_str = data_str.split(",", 1)[1]
        img_bytes = base64.b64decode(data_str)
        nparr = np.frombuffer(img_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError("Could not decode frame image.")
            
        result = vision_infer.predict_frame(
            img, 
            conf_threshold=request.confidence if request.confidence is not None else 0.25, 
            render_annotated=bool(request.render_annotated)
        )
        return JSONResponse(content=result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Frame inference error: {str(e)}")

@ml_router.post("/predict")
def predict_warehouse(request: WarehousePredictRequest):
    if not warehouse_infer:
        raise HTTPException(status_code=503, detail="Warehouse analytics model not loaded.")
        
    try:
        data = request.dict()
        result = warehouse_infer.predict(data)
        return JSONResponse(content=result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")
