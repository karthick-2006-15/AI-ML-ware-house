import type { 
  SimState, 
  SystemStatus, 
  PredictInput, 
  PredictResult, 
  VisionResult 
} from '../types';
import { INITIAL_SYSTEM_STATUS, MOCK_SCENARIOS } from './mockData';
import type { ScenarioCatalogItem } from './mockData';
import { clientSimulationEngine } from './simulationEngine';
import { predictWarehouseClient, detectVisionClient } from './mlEngine';

class ApiService {
  private customBackendUrl: string | null = null;
  private isBackendOnline: boolean = false;
  private hasCheckedBackend: boolean = false;
  private ws: WebSocket | null = null;
  private wsListeners: Set<(state: SimState) => void> = new Set();
  private retryWsTimer: any = null;
  private clientSimUnsub: (() => void) | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.customBackendUrl = localStorage.getItem('ai_warehouse_api_url') || null;
    }
  }

  public getBaseUrl(): string {
    if (this.customBackendUrl) {
      return this.customBackendUrl.replace(/\/+$/, '');
    }
    const envUrl = import.meta.env.VITE_API_URL;
    if (envUrl) {
      return envUrl.replace(/\/+$/, '');
    }
    // If running on localhost / 127.0.0.1: default to empty string so Vite dev proxy handles it or direct 8000
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return '';
      }
    }
    // In production without configured backend (e.g. Vercel), return null string
    return '';
  }

  public isStandalone(): boolean {
    if (typeof window === 'undefined') return true;
    const hostname = window.location.hostname;
    const hasConfiguredUrl = !!(this.customBackendUrl || import.meta.env.VITE_API_URL);
    // If on Vercel or remote host without configured backend, always standalone
    if (!hasConfiguredUrl && hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return true;
    }
    return !this.isBackendOnline && this.hasCheckedBackend;
  }

  public setCustomBackendUrl(url: string | null) {
    this.customBackendUrl = url && url.trim() ? url.trim().replace(/\/+$/, '') : null;
    if (typeof window !== 'undefined') {
      if (this.customBackendUrl) {
        localStorage.setItem('ai_warehouse_api_url', this.customBackendUrl);
      } else {
        localStorage.removeItem('ai_warehouse_api_url');
      }
    }
    this.hasCheckedBackend = false;
    this.checkBackendHealth();
  }

  public async checkBackendHealth(): Promise<SystemStatus> {
    const baseUrl = this.getBaseUrl();
    const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
    const isRemoteHosting = hostname && hostname !== 'localhost' && hostname !== '127.0.0.1';

    // If on remote hosting (e.g. Vercel) and no external backend URL provided, stay silently in standalone mode!
    // This prevents any 404 network request from ever being sent to Vercel!
    if (isRemoteHosting && !this.customBackendUrl && !import.meta.env.VITE_API_URL) {
      this.isBackendOnline = false;
      this.hasCheckedBackend = true;
      return INITIAL_SYSTEM_STATUS;
    }

    try {
      const url = `${baseUrl}/api/ml/status`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        this.isBackendOnline = true;
        this.hasCheckedBackend = true;
        return data;
      } else {
        // Response is 404 or other error: fallback gracefully without throwing
        this.isBackendOnline = false;
        this.hasCheckedBackend = true;
        return INITIAL_SYSTEM_STATUS;
      }
    } catch {
      this.isBackendOnline = false;
      this.hasCheckedBackend = true;
      return INITIAL_SYSTEM_STATUS;
    }
  }

  // 1. System Status
  public async getSystemStatus(): Promise<SystemStatus> {
    return this.checkBackendHealth();
  }

  // 2. Simulation State & Live Stream Subscription
  public async getInitialSimState(): Promise<SimState> {
    if (this.isStandalone()) {
      return clientSimulationEngine.getState();
    }

    const baseUrl = this.getBaseUrl();
    try {
      const res = await fetch(`${baseUrl}/simulation/state`);
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // ignore
    }
    return clientSimulationEngine.getState();
  }

  public subscribeToSimulation(callback: (state: SimState) => void): () => void {
    this.wsListeners.add(callback);

    // Initial broadcast
    callback(clientSimulationEngine.getState());

    // If standalone mode or on Vercel without backend, bind directly to the client simulation engine
    if (this.isStandalone()) {
      if (!this.clientSimUnsub) {
        this.clientSimUnsub = clientSimulationEngine.subscribe((state) => {
          this.wsListeners.forEach((fn) => fn(state));
        });
      }
      return () => {
        this.wsListeners.delete(callback);
      };
    }

    // Attempt live WebSocket connection
    const connectWs = () => {
      if (this.isStandalone()) return;
      const baseUrl = this.getBaseUrl();
      const wsBaseUrl = baseUrl
        ? baseUrl.replace('http://', 'ws://').replace('https://', 'wss://')
        : (typeof window !== 'undefined' ? (window.location.protocol === 'https:' ? 'wss://' : 'ws://') + window.location.host : 'ws://localhost:8000');

      try {
        this.ws = new WebSocket(`${wsBaseUrl}/ws/state`);

        this.ws.onmessage = (event) => {
          try {
            const state: SimState = JSON.parse(event.data);
            this.wsListeners.forEach((fn) => fn(state));
          } catch (e) {
            console.error('Failed to parse sim WebSocket:', e);
          }
        };

        this.ws.onerror = () => {
          if (this.ws) this.ws.close();
        };

        this.ws.onclose = () => {
          // If WS disconnects, ensure client simulation delivers frames in the interim
          if (!this.clientSimUnsub) {
            this.clientSimUnsub = clientSimulationEngine.subscribe((state) => {
              this.wsListeners.forEach((fn) => fn(state));
            });
          }
          this.retryWsTimer = setTimeout(connectWs, 5000);
        };
      } catch {
        // Fallback to client simulation
        if (!this.clientSimUnsub) {
          this.clientSimUnsub = clientSimulationEngine.subscribe((state) => {
            this.wsListeners.forEach((fn) => fn(state));
          });
        }
      }
    };

    connectWs();

    return () => {
      this.wsListeners.delete(callback);
      if (this.wsListeners.size === 0) {
        if (this.ws) {
          this.ws.close();
          this.ws = null;
        }
        if (this.retryWsTimer) {
          clearTimeout(this.retryWsTimer);
          this.retryWsTimer = null;
        }
        if (this.clientSimUnsub) {
          this.clientSimUnsub();
          this.clientSimUnsub = null;
        }
      }
    };
  }

  // 3. Simulation Controls
  public async startSimulation(): Promise<void> {
    clientSimulationEngine.start();
    if (!this.isStandalone()) {
      try {
        await fetch(`${this.getBaseUrl()}/simulation/start`, { method: 'POST' });
      } catch {
        // handled by clientSimulationEngine
      }
    }
  }

  public async stopSimulation(): Promise<void> {
    clientSimulationEngine.stop();
    if (!this.isStandalone()) {
      try {
        await fetch(`${this.getBaseUrl()}/simulation/stop`, { method: 'POST' });
      } catch {
        // handled by clientSimulationEngine
      }
    }
  }

  public async resetSimulation(): Promise<void> {
    clientSimulationEngine.reset();
    if (!this.isStandalone()) {
      try {
        await fetch(`${this.getBaseUrl()}/simulation/reset`, { method: 'POST' });
      } catch {
        // handled by clientSimulationEngine
      }
    }
  }

  public async stepSimulation(): Promise<void> {
    clientSimulationEngine.step();
    if (!this.isStandalone()) {
      try {
        await fetch(`${this.getBaseUrl()}/simulation/step`, { method: 'POST' });
      } catch {
        // handled by clientSimulationEngine
      }
    }
  }

  public async setSimulationSpeed(multiplier: number): Promise<void> {
    clientSimulationEngine.setSpeed(multiplier);
    if (!this.isStandalone()) {
      try {
        await fetch(`${this.getBaseUrl()}/simulation/speed`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ speed: multiplier }),
        });
      } catch {
        // handled by clientSimulationEngine
      }
    }
  }

  public async getScenarios(): Promise<ScenarioCatalogItem[]> {
    if (this.isStandalone()) {
      return MOCK_SCENARIOS;
    }
    try {
      const res = await fetch(`${this.getBaseUrl()}/simulation/scenarios`);
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // fallback
    }
    return MOCK_SCENARIOS;
  }

  public async applyScenario(scenarioId: string): Promise<void> {
    clientSimulationEngine.applyScenario(scenarioId);
    if (!this.isStandalone()) {
      try {
        await fetch(`${this.getBaseUrl()}/simulation/scenario`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scenario_id: scenarioId }),
        });
      } catch {
        // handled by clientSimulationEngine
      }
    }
  }

  public async addObstacle(x: number, y: number, duration: number = 60, type: 'barrier' | 'spill' | 'maintenance' = 'spill'): Promise<void> {
    clientSimulationEngine.addObstacle(x, y, duration, type);
    if (!this.isStandalone()) {
      try {
        await fetch(`${this.getBaseUrl()}/simulation/obstacle`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ x, y, duration, obstacle_type: type }),
        });
      } catch {
        // handled by clientSimulationEngine
      }
    }
  }

  public async clearObstacles(): Promise<void> {
    clientSimulationEngine.clearObstacles();
    if (!this.isStandalone()) {
      try {
        await fetch(`${this.getBaseUrl()}/simulation/obstacle`, {
          method: 'DELETE',
        });
      } catch {
        // handled by clientSimulationEngine
      }
    }
  }

  public async failRobot(robotId: string): Promise<void> {
    clientSimulationEngine.failRobot(robotId);
    if (!this.isStandalone()) {
      try {
        await fetch(`${this.getBaseUrl()}/simulation/robot/fail`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ robot_id: robotId }),
        });
      } catch {
        // handled by clientSimulationEngine
      }
    }
  }

  public async recoverRobot(robotId: string): Promise<void> {
    clientSimulationEngine.recoverRobot(robotId);
    if (!this.isStandalone()) {
      try {
        await fetch(`${this.getBaseUrl()}/simulation/robot/recover`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ robot_id: robotId }),
        });
      } catch {
        // handled by clientSimulationEngine
      }
    }
  }

  public async chargeRobot(robotId: string): Promise<void> {
    clientSimulationEngine.chargeRobot(robotId);
    if (!this.isStandalone()) {
      try {
        await fetch(`${this.getBaseUrl()}/simulation/robot/charge`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ robot_id: robotId }),
        });
      } catch {
        // handled by clientSimulationEngine
      }
    }
  }

  public async dispatchTask(sku: string, priority: 'HIGH' | 'NORMAL' | 'LOW' = 'HIGH'): Promise<void> {
    clientSimulationEngine.dispatchOrder(sku, priority);
    if (!this.isStandalone()) {
      try {
        await fetch(`${this.getBaseUrl()}/simulation/task`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sku,
            priority,
            source: 'Shelf S7',
            destination: 'Packing Station P1',
          }),
        });
      } catch {
        // handled by clientSimulationEngine
      }
    }
  }

  // 4. ML & Vision
  public async predictWarehouse(data: PredictInput): Promise<PredictResult> {
    if (!this.isStandalone()) {
      try {
        const res = await fetch(`${this.getBaseUrl()}/api/ml/predict`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (res.ok) {
          return await res.json();
        }
      } catch {
        // fallback to client ML
      }
    }
    return predictWarehouseClient(data);
  }

  public async detectObjects(file: File, previewUrl: string): Promise<VisionResult> {
    if (!this.isStandalone()) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch(`${this.getBaseUrl()}/api/ml/detect`, {
          method: 'POST',
          body: formData,
        });
        if (res.ok) {
          return await res.json();
        }
      } catch {
        // fallback to client vision
      }
    }
    return detectVisionClient(previewUrl);
  }

  public async detectFrame(dataUri: string, confidence: number = 0.35): Promise<VisionResult> {
    if (!this.isStandalone()) {
      try {
        const res = await fetch(`${this.getBaseUrl()}/api/ml/detect_frame`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: dataUri, confidence, render_annotated: false }),
        });
        if (res.ok) {
          return await res.json();
        }
      } catch {
        // fallback to client vision
      }
    }
    return detectVisionClient(dataUri, confidence);
  }
}

export const apiService = new ApiService();
