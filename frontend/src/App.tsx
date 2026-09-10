import React, { useState, useEffect } from 'react';
import { 
  Activity, BarChart2, AlertTriangle, 
  ShieldCheck, Database, Layers, LayoutDashboard, Play, Square, Image as ImageIcon, Camera
} from 'lucide-react';
import WarehouseGrid from './components/WarehouseGrid';

const App: React.FC = () => {
  const [metrics, setMetrics] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'sim' | 'cv' | 'ml'>('overview');
  
  // Status state
  const [sysStatus, setSysStatus] = useState({ yolo_ready: false, xgboost_ready: false });
  const [simRunning, setSimRunning] = useState(false);

  // Vision State
  const [visionImage, setVisionImage] = useState<File | null>(null);
  const [visionPreview, setVisionPreview] = useState<string | null>(null);
  const [visionResults, setVisionResults] = useState<any>(null);
  const [isVisionLoading, setIsVisionLoading] = useState(false);
  const [visionError, setVisionError] = useState<string | null>(null);
  
  // ML State
  const [mlInput, setMlInput] = useState({
    stock_level: 50, reorder_point: 60, reorder_frequency_days: 10,
    lead_time_days: 5, daily_demand: 20, demand_std_dev: 2,
    item_popularity_score: 0.8, picking_time_seconds: 45,
    handling_cost_per_unit: 1.5, unit_price: 50,
    holding_cost_per_unit_day: 0.5, order_fulfillment_rate: 0.95,
    total_orders_last_month: 300, turnover_ratio: 5.0,
    layout_efficiency_score: 0.9, category: 'Electronics', zone: 'A'
  });
  const [mlResults, setMlResults] = useState<any>(null);
  const [isMlLoading, setIsMlLoading] = useState(false);
  const [mlError, setMlError] = useState<string | null>(null);

  useEffect(() => {
    // Poll system status
    const checkStatus = async () => {
      try {
        const res = await fetch('http://localhost:8000/api/ml/status');
        if (res.ok) {
          const data = await res.json();
          setSysStatus(data);
        }
      } catch (e) {
        setSysStatus({ yolo_ready: false, xgboost_ready: false });
      }
    };
    checkStatus();
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const startSim = async () => {
    try { 
      await fetch('http://localhost:8000/simulation/start', { method: 'POST' }); 
      setSimRunning(true);
    } catch (e) { console.error(e); }
  };

  const stopSim = async () => {
    try { 
      await fetch('http://localhost:8000/simulation/stop', { method: 'POST' }); 
      setSimRunning(false);
    } catch (e) { console.error(e); }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setVisionError('Please upload a valid image file (JPG, PNG).');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setVisionError('Image size must be less than 5MB.');
        return;
      }
      setVisionImage(file);
      setVisionPreview(URL.createObjectURL(file));
      setVisionError(null);
      setVisionResults(null);
    }
  };

  const handleVisionUpload = async () => {
    if (!visionImage) {
      setVisionError('Please select an image first.');
      return;
    }
    setIsVisionLoading(true);
    setVisionError(null);
    const formData = new FormData();
    formData.append('file', visionImage);
    
    try {
      const res = await fetch('http://localhost:8000/api/ml/detect', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setVisionResults(data);
    } catch (e: any) { 
      setVisionError(`Inference Failed: ${e.message}`); 
    } finally {
      setIsVisionLoading(false);
    }
  };

  const handleMlPredict = async () => {
    setIsMlLoading(true);
    setMlError(null);
    try {
      const res = await fetch('http://localhost:8000/api/ml/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mlInput),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setMlResults(data);
    } catch (e: any) { 
      setMlError(`Prediction Failed: ${e.message}`); 
    } finally {
      setIsMlLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      {/* HEADER */}
      <header className="bg-slate-900 text-white shadow-lg border-b border-slate-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Layers className="h-6 w-6 text-blue-400" />
            <h1 className="text-xl font-bold tracking-tight">AI WAREHOUSE MANAGER</h1>
          </div>
          <div className="flex items-center space-x-6 text-sm font-medium text-slate-300">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${sysStatus.yolo_ready ? 'bg-green-400' : 'bg-red-500 animate-pulse'}`} />
              <span>YOLOv8</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${sysStatus.xgboost_ready ? 'bg-green-400' : 'bg-red-500 animate-pulse'}`} />
              <span>XGBoost</span>
            </div>
          </div>
        </div>
      </header>

      {/* NAVIGATION */}
      <div className="bg-white border-b shadow-sm sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-6 flex space-x-8">
          {[
            { id: 'overview', label: 'Dashboard Overview', icon: LayoutDashboard },
            { id: 'sim', label: '2D Simulation', icon: Activity },
            { id: 'cv', label: 'Computer Vision', icon: Camera },
            { id: 'ml', label: 'Predictive Analytics', icon: BarChart2 }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 py-4 px-1 border-b-2 transition-colors ${
                activeTab === tab.id 
                  ? 'border-blue-600 text-blue-700 font-semibold' 
                  : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* MAIN CONTENT */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <div className="col-span-2 bg-white rounded-xl shadow-sm border p-6 flex flex-col justify-between">
                <div>
                  <h2 className="text-xl font-bold flex items-center mb-2"><ShieldCheck className="w-5 h-5 mr-2 text-green-600"/> System Status</h2>
                  <p className="text-gray-500 mb-6">All machine learning models and the simulation engine are successfully communicating with the FastAPI backend.</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-lg border">
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Computer Vision (YOLOv8)</p>
                    <p className={`text-lg font-bold ${sysStatus.yolo_ready ? 'text-green-600' : 'text-red-600'}`}>
                      {sysStatus.yolo_ready ? '● LOADED' : '● UNAVAILABLE'}
                    </p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-lg border">
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Predictive AI (XGBoost)</p>
                    <p className={`text-lg font-bold ${sysStatus.xgboost_ready ? 'text-green-600' : 'text-red-600'}`}>
                      {sysStatus.xgboost_ready ? '● LOADED' : '● UNAVAILABLE'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h2 className="text-lg font-bold mb-4">Simulation Metrics</h2>
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-gray-600">Completed Orders</span>
                    <span className="font-bold">{metrics?.completed_orders ?? 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-gray-600">Total Distance</span>
                    <span className="font-bold">{metrics?.total_distance ?? 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-gray-600">Congestion Events</span>
                    <span className="font-bold text-red-600">{metrics?.collisions ?? 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-gray-600">Active Robots</span>
                    <span className="font-bold">{metrics ? 5 : 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-600">Fleet Battery</span>
                    <span className="font-bold text-green-600">{metrics?.average_battery ?? '100'}%</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* SIMULATION TAB */}
        {activeTab === 'sim' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3">
              <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-xl font-bold flex items-center"><Activity className="w-5 h-5 mr-2 text-blue-600"/> Live A* Pathfinding Simulation</h2>
                    <p className="text-gray-500 text-sm mt-1">Robots dynamically route to fulfillment targets avoiding shelves and dynamic obstacles.</p>
                  </div>
                  <div className="flex space-x-3">
                    {!simRunning ? (
                      <button onClick={startSim} className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition shadow-sm">
                        <Play className="w-4 h-4 mr-2" /> Start Simulation
                      </button>
                    ) : (
                      <button onClick={stopSim} className="flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition shadow-sm">
                        <Square className="w-4 h-4 mr-2" /> Stop Simulation
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex justify-center border bg-slate-50 p-4 rounded-xl">
                  <WarehouseGrid onStateUpdate={(state) => setMetrics(state.metrics)} />
                </div>
              </div>
            </div>
            
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Legend</h3>
                <div className="space-y-3">
                  <div className="flex items-center text-sm"><div className="w-4 h-4 bg-gray-700 mr-3 rounded-sm"></div> Shelves / Obstacles</div>
                  <div className="flex items-center text-sm"><div className="w-4 h-4 bg-green-500 mr-3 rounded-sm"></div> Packing Station (P)</div>
                  <div className="flex items-center text-sm"><div className="w-4 h-4 bg-orange-500 mr-3 rounded-sm"></div> Charging Station (C)</div>
                  <div className="flex items-center text-sm"><div className="w-4 h-4 bg-blue-500 mr-3 rounded-full border border-white shadow-sm"></div> Idle Robot</div>
                  <div className="flex items-center text-sm"><div className="w-4 h-4 bg-red-500 mr-3 rounded-full border border-white shadow-sm"></div> Picking Robot</div>
                  <div className="flex items-center text-sm"><div className="w-4 h-4 bg-amber-500 mr-3 rounded-full border border-white shadow-sm"></div> Delivering Robot</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* COMPUTER VISION TAB */}
        {activeTab === 'cv' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold flex items-center"><Camera className="w-5 h-5 mr-2 text-indigo-600"/> Dual-Layer Computer Vision System</h2>
                  <p className="text-gray-500 text-sm mt-1">General Object Detector (COCO) + Fine-Tuned Warehouse Detector (YOLOv8)</p>
                </div>
                {!sysStatus.yolo_ready && (
                  <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full flex items-center">
                    <AlertTriangle className="w-3 h-3 mr-1" /> MODEL UNAVAILABLE
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Upload Section */}
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-indigo-500 transition-colors">
                    <input
                      type="file"
                      id="vision-upload"
                      className="hidden"
                      accept="image/*"
                      onChange={handleImageChange}
                    />
                    <label htmlFor="vision-upload" className="cursor-pointer flex flex-col items-center">
                      <ImageIcon className="w-12 h-12 text-gray-400 mb-3" />
                      <span className="text-sm font-medium text-gray-700 mb-1">Click to upload an image</span>
                      <span className="text-xs text-gray-500">Supports PNG, JPG, JPEG</span>
                    </label>
                  </div>
                  
                  {visionError && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200">{visionError}</div>}
                  
                  <button 
                    onClick={handleVisionUpload}
                    disabled={!visionImage || isVisionLoading || !sysStatus.yolo_ready}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-lg font-bold shadow-sm transition flex justify-center items-center"
                  >
                    {isVisionLoading ? 'Analyzing Image...' : 'Run Dual-Layer Inference'}
                  </button>
                  
                  <div className="mt-4 p-4 bg-slate-50 border rounded-lg">
                    <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">Model Information</h3>
                    <ul className="text-sm space-y-2 text-gray-700">
                      <li><span className="font-medium bg-orange-100 text-orange-800 px-1 rounded">Warehouse Detector:</span> YOLOv8 (Box, Person, Robot)</li>
                      <li><span className="font-medium bg-green-100 text-green-800 px-1 rounded">General Detector:</span> COCO Pretrained (80 Classes)</li>
                    </ul>
                  </div>
                </div>

                {/* Results Section */}
                <div className="bg-slate-50 border rounded-xl p-4 min-h-[400px] flex flex-col">
                  {visionResults?.annotated_image ? (
                    <div className="space-y-4">
                      <div className="relative rounded-lg overflow-hidden border shadow-sm bg-black">
                        <img src={visionResults.annotated_image} alt="YOLO Annotated" className="w-full object-contain max-h-[350px]" />
                      </div>
                      
                      <div className="bg-white border rounded-lg p-4 shadow-sm">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="font-bold text-sm text-gray-800">DETECTED OBJECTS</h4>
                          <span className="bg-indigo-100 text-indigo-800 text-xs font-bold px-2 py-1 rounded">
                            Object Count: {visionResults.object_count !== undefined ? visionResults.object_count : visionResults.detections.length}
                          </span>
                        </div>
                        
                        <div className="space-y-2 max-h-[180px] overflow-y-auto pr-2">
                          {visionResults.detections.map((det: any, idx: number) => (
                            <div key={idx} className="p-2.5 bg-gray-50 rounded border text-sm space-y-1">
                              <div className="flex justify-between items-center">
                                <span className="font-bold text-gray-800 capitalize flex items-center">
                                  {det.class || det.class_name}
                                  <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded font-medium text-white ${det.source === 'warehouse' ? 'bg-orange-500' : 'bg-green-600'}`}>
                                    {det.source === 'warehouse' ? 'Warehouse Detector' : 'General Detector'}
                                  </span>
                                </span>
                                <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                                  {(det.confidence * 100).toFixed(1)}% conf
                                </span>
                              </div>
                              {det.bbox && (
                                <div className="text-[11px] text-gray-500 font-mono">
                                  BBox: [{det.bbox.join(', ')}]
                                </div>
                              )}
                            </div>
                          ))}
                          {visionResults.detections.length === 0 && (
                            <p className="text-gray-500 text-sm italic">No supported objects were confidently detected.</p>
                          )}
                        </div>
                        
                        <div className="mt-4 pt-3 border-t">
                          <p className="text-xs font-bold text-gray-500 uppercase mb-1">Image Summary</p>
                          <p className="text-sm text-gray-800 font-medium">
                            {visionResults.image_summary || (visionResults.detections.length > 0 ? (
                              `This image contains: ${visionResults.detections.map((d: any) => d.class || d.class_name).join(', ')}`
                            ) : (
                              "No supported objects were confidently detected."
                            ))}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : visionPreview ? (
                     <div className="flex-1 flex flex-col items-center justify-center text-center">
                        <img src={visionPreview} alt="Preview" className="max-h-[300px] object-contain rounded-lg border shadow-sm mb-4 opacity-50" />
                        <p className="text-gray-500 text-sm">Image ready for analysis.</p>
                     </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                      <ImageIcon className="w-16 h-16 mb-4 opacity-50" />
                      <p>Detection results will appear here.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PREDICTIVE ANALYTICS TAB */}
        {activeTab === 'ml' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold flex items-center"><BarChart2 className="w-5 h-5 mr-2 text-teal-600"/> Predictive Analytics (XGBoost)</h2>
                  <p className="text-gray-500 text-sm mt-1">Estimate stockout risks and KPI performance based on current logistical state.</p>
                </div>
                {!sysStatus.xgboost_ready && (
                  <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full flex items-center">
                    <AlertTriangle className="w-3 h-3 mr-1" /> MODEL UNAVAILABLE
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* FORM */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.keys(mlInput).map((key) => {
                      const label = key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                      const isNumber = typeof (mlInput as any)[key] === 'number';
                      return (
                        <div key={key} className="flex flex-col">
                          <label className="text-xs font-bold text-gray-600 mb-1 tracking-wide">{label}</label>
                          {key === 'category' ? (
                            <select 
                              className="border-gray-300 rounded-md shadow-sm text-sm border p-2 focus:ring-teal-500 focus:border-teal-500"
                              value={(mlInput as any)[key]}
                              onChange={(e) => setMlInput({...mlInput, [key]: e.target.value})}
                            >
                              <option>Electronics</option><option>Apparel</option><option>Groceries</option>
                            </select>
                          ) : key === 'zone' ? (
                            <select 
                              className="border-gray-300 rounded-md shadow-sm text-sm border p-2 focus:ring-teal-500 focus:border-teal-500"
                              value={(mlInput as any)[key]}
                              onChange={(e) => setMlInput({...mlInput, [key]: e.target.value})}
                            >
                              <option>A</option><option>B</option><option>C</option><option>D</option>
                            </select>
                          ) : (
                            <input 
                              type={isNumber ? 'number' : 'text'}
                              step={isNumber && label.includes('Score') || label.includes('Rate') || label.includes('Cost') || label.includes('Ratio') ? "0.01" : "1"}
                              className="border-gray-300 rounded-md shadow-sm text-sm border p-2 focus:ring-teal-500 focus:border-teal-500"
                              value={(mlInput as any)[key]}
                              onChange={(e) => setMlInput({...mlInput, [key]: isNumber ? Number(e.target.value) : e.target.value})}
                            />
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {mlError && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200">{mlError}</div>}

                  <button 
                    onClick={handleMlPredict}
                    disabled={isMlLoading || !sysStatus.xgboost_ready}
                    className="w-full py-3 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-300 text-white rounded-lg font-bold shadow-sm transition flex justify-center items-center"
                  >
                    {isMlLoading ? 'Analyzing Warehouse Data...' : 'Run Warehouse Intelligence'}
                  </button>
                </div>

                {/* RESULTS */}
                <div className="bg-slate-50 border rounded-xl p-5 flex flex-col space-y-4 min-h-[400px]">
                  <h3 className="font-bold text-gray-800 border-b pb-2">Intelligence Results</h3>
                  
                  {mlResults ? (
                    <div className="space-y-4 flex-1">
                      {/* Risk Card */}
                      <div className={`p-4 rounded-xl border shadow-sm ${mlResults.risk_level === 'HIGH' ? 'bg-red-50 border-red-200' : mlResults.risk_level === 'MEDIUM' ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'}`}>
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="text-sm font-bold uppercase tracking-wider opacity-80">Stockout Risk</h4>
                          <span className="font-bold text-lg">{mlResults.risk_level}</span>
                        </div>
                        <div className="w-full bg-white/50 rounded-full h-2.5 mb-1 border border-black/10 overflow-hidden">
                          <div className={`h-2.5 rounded-full ${mlResults.risk_level === 'HIGH' ? 'bg-red-500' : mlResults.risk_level === 'MEDIUM' ? 'bg-amber-500' : 'bg-green-500'}`} style={{ width: `${Math.min(100, mlResults.stockout_probability * 100)}%` }}></div>
                        </div>
                        <p className="text-right text-xs font-medium opacity-80">Probability: {(mlResults.stockout_probability * 100).toFixed(1)}%</p>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white border rounded-xl p-3 shadow-sm text-center">
                          <h4 className="text-xs font-bold text-gray-500 uppercase mb-1">Demand Prediction</h4>
                          <p className="text-xl font-bold text-slate-800">{mlResults.demand_forecast} <span className="text-sm text-gray-500 font-normal">units</span></p>
                        </div>
                        <div className="bg-white border rounded-xl p-3 shadow-sm text-center">
                          <h4 className="text-xs font-bold text-gray-500 uppercase mb-1">KPI Projection</h4>
                          <p className="text-xl font-bold text-indigo-600">{mlResults.performance_kpi}</p>
                        </div>
                      </div>

                      {/* SHAP EXPLANATION */}
                      {mlResults.explanations?.stockout_risk && (
                         <div className="bg-white border rounded-xl p-4 shadow-sm flex-1 mt-4">
                           <h4 className="text-xs font-bold text-gray-700 uppercase mb-3 border-b pb-2">Model Feature Contributions</h4>
                           <div className="space-y-3">
                             {mlResults.explanations.stockout_risk.slice(0, 4).map((f: any, i: number) => (
                               <div key={i}>
                                 <div className="flex justify-between text-xs mb-1">
                                   <span className="font-medium text-gray-600 capitalize">{f.feature.replace(/_/g, ' ')}</span>
                                   <span className="text-gray-400">{(f.importance * 100).toFixed(1)}%</span>
                                 </div>
                                 <div className="w-full bg-gray-100 rounded-full h-1.5">
                                   <div className="bg-teal-400 h-1.5 rounded-full" style={{ width: `${Math.min(100, f.importance * 300)}%` }}></div>
                                 </div>
                               </div>
                             ))}
                           </div>
                           <p className="text-[10px] text-gray-400 mt-3 text-center italic">Derived from XGBoost Feature Importance</p>
                         </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400 text-center px-4">
                      <Database className="w-12 h-12 mb-3 opacity-50" />
                      <p className="text-sm">Enter warehouse metrics and run intelligence to view ML predictions and risk factors.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        
      </main>
    </div>
  );
};

export default App;
