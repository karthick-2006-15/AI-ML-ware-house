from fastapi import APIRouter, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import sys
import os
import shutil
import tempfile
import json
import cv2
import numpy as np
import base64
from typing import Optional

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from ml.warehouse.inference import get_warehouse_inference
from ml.vision.inference import get_vision_inference, get_vision_metadata

ml_router = APIRouter(prefix="/api/ml", tags=["Machine Learning"])

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
    Returns the real-time status and metadata of the loaded ML models.
    Lightweight and fast: does not trigger high-memory neural net loading.
    """
    vision_meta = get_vision_metadata()
    
    repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    xgb_path = os.path.join(repo_root, "models", "xgboost", "stockout_model.pkl")
    xgb_exists = os.path.exists(xgb_path) or os.path.exists("models/xgboost/stockout_model.pkl")

    return JSONResponse({
        **vision_meta,
        "xgboost": {
            "loaded": xgb_exists
        },
        "xgboost_ready": xgb_exists
    })

class FrameDetectRequest(BaseModel):
    image: str
    confidence: Optional[float] = 0.25
    render_annotated: Optional[bool] = False

@ml_router.post("/detect")
async def detect_objects(file: UploadFile = File(...)):
    try:
        vision_infer = get_vision_inference()
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Vision model initialization failed: {str(e)}")
        
    if not file.filename.endswith(('.png', '.jpg', '.jpeg')):
        raise HTTPException(status_code=400, detail="Invalid image file.")
        
    try:
        temp_dir = tempfile.mkdtemp()
        temp_path = os.path.join(temp_dir, file.filename)
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        result = vision_infer.predict_image(temp_path)
        
        try:
            os.remove(temp_path)
            os.rmdir(temp_dir)
        except Exception:
            pass
            
        return JSONResponse(content=result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference error: {str(e)}")

@ml_router.post("/detect_frame")
async def detect_frame(request: FrameDetectRequest):
    try:
        vision_infer = get_vision_inference()
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Vision model initialization failed: {str(e)}")
        
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
    try:
        warehouse_infer = get_warehouse_inference()
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Warehouse analytics model initialization failed: {str(e)}")
        
    try:
        data = request.dict()
        result = warehouse_infer.predict(data)
        return JSONResponse(content=result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")
