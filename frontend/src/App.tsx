import React, { useState, useEffect } from 'react';
import CinematicAppShell from './components/cinematic/CinematicAppShell';
import CinematicDashboardView from './components/cinematic/CinematicDashboardView';
import SimulationView from './components/simulation/SimulationView';
import VisionView from './components/vision/VisionView';
import AnalyticsView from './components/analytics/AnalyticsView';
import DatasetExperimentsView from './components/experiments/DatasetExperimentsView';
import SystemArchitectureView from './components/architecture/SystemArchitectureView';
import SettingsModal from './components/common/SettingsModal';
import HelpAboutModal from './components/common/HelpAboutModal';

import type { 
  PageId, 
  SystemStatus, 
  SimState, 
  VisionResult, 
  PredictInput, 
  PredictResult 
} from './types';

const validPages: PageId[] = ['dashboard', 'simulation', 'vision', 'analytics', 'experiments', 'architecture'];

const getPageFromHash = (): PageId => {
  const hash = window.location.hash.replace('#/', '').replace('#', '').toLowerCase();
  if (['blood', 'activities', 'insights', 'actionplan', 'plan'].some(m => hash.includes(m))) {
    return 'dashboard';
  }
  return validPages.includes(hash as PageId) ? (hash as PageId) : 'dashboard';
};

const App: React.FC = () => {
  // Navigation
  const [activePage, setActivePage] = useState<PageId>(getPageFromHash);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);

  useEffect(() => {
    const onHashChange = () => {
      setActivePage(getPageFromHash());
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const handleSelectPage = (page: PageId) => {
    setActivePage(page);
    window.location.hash = `/${page}`;
  };

  // System Status
  const [sysStatus, setSysStatus] = useState<SystemStatus>({
    yolo_ready: false,
    xgboost_ready: false,
  });

  // Simulation State
  const [simRunning, setSimRunning] = useState(false);
  const [simState, setSimState] = useState<SimState | null>(null);
  const [selectedRobotId, setSelectedRobotId] = useState<string | null>(null);

  // Vision State
  const [visionImage, setVisionImage] = useState<File | null>(null);
  const [visionPreview, setVisionPreview] = useState<string | null>(null);
  const [visionResults, setVisionResults] = useState<VisionResult | null>(null);
  const [isVisionLoading, setIsVisionLoading] = useState(false);
  const [visionError, setVisionError] = useState<string | null>(null);

  // ML State (Default preset: Critical SKU)
  const [mlInput, setMlInput] = useState<PredictInput>({
    stock_level: 25,
    reorder_point: 60,
    reorder_frequency_days: 14,
    lead_time_days: 5,
    daily_demand: 12,
    demand_std_dev: 2.5,
    item_popularity_score: 80.0,
    picking_time_seconds: 45.0,
    handling_cost_per_unit: 1.8,
    unit_price: 65.0,
    holding_cost_per_unit_day: 0.2,
    order_fulfillment_rate: 0.94,
    total_orders_last_month: 200,
    turnover_ratio: 5.5,
    layout_efficiency_score: 82.0,
    category: 'Electronics',
    zone: 'A',
  });
  const [mlResults, setMlResults] = useState<PredictResult | null>(null);
  const [isMlLoading, setIsMlLoading] = useState(false);
  const [mlError, setMlError] = useState<string | null>(null);

  // 1. Poll System Status
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch('/api/ml/status');
        if (res.ok) {
          const data = await res.json();
          setSysStatus(data);
        }
      } catch (e) {
        // fallback to direct backend if proxy is not yet ready
        try {
          const apiUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
          const res = await fetch(`${apiUrl}/api/ml/status`);
          if (res.ok) {
            const data = await res.json();
            setSysStatus(data);
          }
        } catch {
          // ignore
        }
      }
    };
    checkStatus();
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  // 2. Fetch Initial Simulation State & Connect WebSocket for Live Telemetry
  useEffect(() => {
    // Immediate initial state fetch
    const fetchInitState = async () => {
      try {
        const res = await fetch('/simulation/state');
        if (res.ok) {
          const data: SimState = await res.json();
          setSimState(data);
          if (data.running !== undefined) setSimRunning(data.running);
        }
      } catch (e) {
        try {
          const apiUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
          const res = await fetch(`${apiUrl}/simulation/state`);
          if (res.ok) {
            const data: SimState = await res.json();
            setSimState(data);
            if (data.running !== undefined) setSimRunning(data.running);
          }
        } catch {
          // ignore
        }
      }
    };
    fetchInitState();

    let ws: WebSocket | null = null;
    let retryTimer: any = null;

    const connectWs = () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
        const wsBaseUrl = apiUrl.replace('http://', 'ws://').replace('https://', 'wss://');
        const wsUrl = `${wsBaseUrl}/ws/state`;
        ws = new WebSocket(wsUrl);
        ws.onmessage = (event) => {
          try {
            const state: SimState = JSON.parse(event.data);
            setSimState(state);
            if (state.running !== undefined) {
              setSimRunning(state.running);
            }
          } catch (e) {
            console.error('Failed to parse sim state WebSocket message:', e);
          }
        };
        ws.onclose = () => {
          retryTimer = setTimeout(connectWs, 3000);
        };
        ws.onerror = () => {
          if (ws) ws.close();
        };
      } catch (e) {
        retryTimer = setTimeout(connectWs, 3000);
      }
    };

    connectWs();
    return () => {
      if (ws) ws.close();
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, []);

  // 3. Simulation Handlers
  const startSim = async () => {
    try {
      await fetch('/simulation/start', { method: 'POST' });
      setSimRunning(true);
    } catch (e) {
      console.error('Failed to start simulation:', e);
    }
  };

  const stopSim = async () => {
    try {
      await fetch('/simulation/stop', { method: 'POST' });
      setSimRunning(false);
    } catch (e) {
      console.error('Failed to stop simulation:', e);
    }
  };

  const resetSim = async () => {
    try {
      await fetch('/simulation/reset', { method: 'POST' });
      setSimRunning(false);
    } catch (e) {
      console.error('Failed to reset simulation:', e);
    }
  };

  // 4. Vision Handlers
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

  const handleSelectSample = (file: File) => {
    setVisionImage(file);
    setVisionPreview(URL.createObjectURL(file));
    setVisionError(null);
    setVisionResults(null);
  };

  const handleClearImage = () => {
    setVisionImage(null);
    setVisionPreview(null);
    setVisionResults(null);
    setVisionError(null);
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
      const res = await fetch('/api/ml/detect', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        throw new Error(`Inference failed with status ${res.status}`);
      }
      const data: VisionResult = await res.json();
      setVisionResults(data);
    } catch (e: any) {
      setVisionError(e.message || 'Vision inference failed.');
    } finally {
      setIsVisionLoading(false);
    }
  };

  // 5. ML Predict Handler
  const handleMlPredict = async () => {
    setIsMlLoading(true);
    setMlError(null);
    try {
      const res = await fetch('/api/ml/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mlInput),
      });
      if (!res.ok) throw new Error(await res.text());
      const data: PredictResult = await res.json();
      setMlResults(data);
    } catch (e: any) {
      setMlError(`Prediction Failed: ${e.message || 'Server error'}`);
    } finally {
      setIsMlLoading(false);
    }
  };

  return (
    <CinematicAppShell
      activePage={activePage}
      onSelectPage={handleSelectPage}
      systemStatus={sysStatus}
      onOpenHelpModal={() => setIsAboutOpen(true)}
    >
      {/* 1. Cinematic Bio-AI Dashboard (Reference Specification) */}
      {activePage === 'dashboard' && (
        <CinematicDashboardView
          onNavigate={handleSelectPage}
          systemStatus={sysStatus}
          simState={simState}
          simRunning={simRunning}
          onStartSim={startSim}
          onStopSim={stopSim}
        />
      )}

      {/* 2. 2D Fleet Simulation View */}
      {activePage === 'simulation' && (
        <div className="w-full px-6 sm:px-10 py-6 animate-premium-fade">
          <SimulationView
            simState={simState}
            simRunning={simRunning}
            onStartSim={startSim}
            onStopSim={stopSim}
            onResetSim={resetSim}
            selectedRobotId={selectedRobotId}
            onSelectRobot={setSelectedRobotId}
          />
        </div>
      )}

      {/* 3. Computer Vision View */}
      {activePage === 'vision' && (
        <div className="w-full px-6 sm:px-10 py-6 animate-premium-fade">
          <VisionView
            systemStatus={sysStatus}
            visionImage={visionImage}
            visionPreview={visionPreview}
            visionResults={visionResults}
            isVisionLoading={isVisionLoading}
            visionError={visionError}
            onImageChange={handleImageChange}
            onSelectSample={handleSelectSample}
            onVisionUpload={handleVisionUpload}
            onClearImage={handleClearImage}
          />
        </div>
      )}

      {/* 4. Predictive Analytics View */}
      {activePage === 'analytics' && (
        <div className="w-full px-6 sm:px-10 py-6 animate-premium-fade">
          <AnalyticsView
            systemStatus={sysStatus}
            mlInput={mlInput}
            setMlInput={setMlInput}
            mlResults={mlResults}
            isMlLoading={isMlLoading}
            mlError={mlError}
            onMlPredict={handleMlPredict}
            onNavigate={handleSelectPage}
          />
        </div>
      )}

      {/* 5. Dataset & Experiments View */}
      {activePage === 'experiments' && (
        <div className="w-full px-6 sm:px-10 py-6 animate-premium-fade">
          <DatasetExperimentsView />
        </div>
      )}

      {/* 6. System Architecture View */}
      {activePage === 'architecture' && (
        <div className="w-full px-6 sm:px-10 py-6 animate-premium-fade">
          <SystemArchitectureView />
        </div>
      )}

      {/* Modals */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
      <HelpAboutModal
        isOpen={isAboutOpen}
        onClose={() => setIsAboutOpen(false)}
      />
    </CinematicAppShell>
  );
};

export default App;
