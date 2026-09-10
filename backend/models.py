from sqlalchemy import Column, Integer, String, Float, DateTime
from datetime import datetime
from .database import Base

class SimulationRun(Base):
    __tablename__ = "simulation_runs"
    
    id = Column(Integer, primary_key=True, index=True)
    started_at = Column(DateTime, default=datetime.utcnow)
    ended_at = Column(DateTime, nullable=True)
    total_ticks = Column(Integer, default=0)
    config = Column(String) # JSON string of configuration

class MetricLog(Base):
    __tablename__ = "metric_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    run_id = Column(Integer)
    tick = Column(Integer)
    completed_orders = Column(Integer)
    average_battery = Column(Float)
    congestion_events = Column(Integer)
    
class OrderHistory(Base):
    __tablename__ = "order_history"
    
    id = Column(Integer, primary_key=True, index=True)
    run_id = Column(Integer)
    order_id = Column(String)
    product_id = Column(String)
    created_tick = Column(Integer)
    completed_tick = Column(Integer, nullable=True)
