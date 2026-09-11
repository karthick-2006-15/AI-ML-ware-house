import React from 'react';
import { 
  TrendingUp, 
  Bot, 
  Play, 
  Pause, 
  RotateCcw, 
  PlusCircle, 
  ArrowRight,
  Clock, 
  Compass, 
  UploadCloud 
} from 'lucide-react';
import Card from '../common/Card';
import Badge from '../common/Badge';
import Button from '../common/Button';
import ProgressBar from '../common/ProgressBar';
import WarehouseCanvas from '../simulation/WarehouseCanvas';
import type { PageId, SimState, SystemStatus } from '../../types';

interface DashboardViewProps {
  onNavigate: (page: PageId) => void;
  systemStatus: SystemStatus;
  simState: SimState | null;
  simRunning: boolean;
  onStartSim: () => void;
  onStopSim: () => void;
  onResetSim?: () => void;
  selectedRobotId: string | null;
  onSelectRobot: (robotId: string | null) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigate,
  systemStatus,
  simState,
  simRunning,
  onStartSim,
  onStopSim,
  onResetSim,
  selectedRobotId,
  onSelectRobot,
}) => {
  return (
    <div className="space-y-6 animate-premium-fade">
      {/* 1. Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 animate-premium-fade stagger-1">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-400 mb-1">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            Autonomous Warehouse Intelligence System
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Warehouse Operations Dashboard
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Perception (YOLOv8s), stockout risk prediction (XGBoost), and zero-collision AMR fleet coordinator.
          </p>
        </div>

        {/* Quick System Readiness Badges */}
        <div className="flex items-center gap-2.5">
          <Badge variant={simRunning ? 'success' : 'neutral'} size="md" dot>
            {simRunning ? 'Fleet Running' : 'Simulation Standby'}
          </Badge>
          <Badge variant={systemStatus.xgboost_ready && systemStatus.yolo_ready ? 'success' : 'warning'} size="md">
            {systemStatus.xgboost_ready && systemStatus.yolo_ready ? 'Models Ready' : 'Degraded'}
          </Badge>
        </div>
      </div>

      {/* 2. Top Row: Three Primary Capability Cards (Equal Height) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 animate-premium-fade stagger-2">
        {/* CARD 1: COMPUTER VISION (YOLOv8) - SEE */}
        <Card
          hoverable
          onClick={() => onNavigate('vision')}
          className="flex flex-col justify-between border-slate-800/80 hover:border-slate-700 transition-colors"
        >
          <div>
            <div className="flex justify-between items-start mb-3">
              <span className="text-xs font-semibold text-blue-400">
                Computer Vision • YOLOv8
              </span>
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                SEE
              </span>
            </div>
            <h3 className="text-lg font-bold text-white mb-1.5">
              Object Detection
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-5">
              Real-time industrial perception across 6 classes: persons, cartons, pallets, forklifts, AMRs, and robotic arms.
            </p>
          </div>

          <div className="space-y-4 pt-4 border-t border-slate-800/80">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 bg-slate-900/60 rounded-lg border border-slate-800/60">
                <span className="block text-[10px] text-slate-400 uppercase font-medium">Status</span>
                <span className="text-xs font-semibold text-emerald-400">Ready</span>
              </div>
              <div className="p-2 bg-slate-900/60 rounded-lg border border-slate-800/60">
                <span className="block text-[10px] text-slate-400 uppercase font-medium">Classes</span>
                <span className="text-xs font-semibold text-white">6 Classes</span>
              </div>
              <div className="p-2 bg-slate-900/60 rounded-lg border border-slate-800/60">
                <span className="block text-[10px] text-slate-400 uppercase font-medium">mAP@50</span>
                <span className="text-xs font-semibold text-blue-400 font-mono">79.0%</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors">
              <span>Open Computer Vision</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </Card>

        {/* CARD 2: PREDICTIVE ANALYTICS (XGBoost) - PREDICT */}
        <Card
          hoverable
          onClick={() => onNavigate('analytics')}
          className="flex flex-col justify-between border-slate-800/80 hover:border-slate-700 transition-colors"
        >
          <div>
            <div className="flex justify-between items-start mb-3">
              <span className="text-xs font-semibold text-purple-400">
                Predictive Analytics • XGBoost
              </span>
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                PREDICT
              </span>
            </div>
            <h3 className="text-lg font-bold text-white mb-1.5">
              Inventory Risk Prediction
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-5">
              Forward-looking stockout classification using 9 operational runout ratios, SHAP explainability, and class reweighting.
            </p>
          </div>

          <div className="space-y-4 pt-4 border-t border-slate-800/80">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 bg-slate-900/60 rounded-lg border border-slate-800/60">
                <span className="block text-[10px] text-slate-400 uppercase font-medium">Status</span>
                <span className="text-xs font-semibold text-emerald-400">Ready</span>
              </div>
              <div className="p-2 bg-slate-900/60 rounded-lg border border-slate-800/60">
                <span className="block text-[10px] text-slate-400 uppercase font-medium">ROC-AUC</span>
                <span className="text-xs font-semibold text-white font-mono">0.9197</span>
              </div>
              <div className="p-2 bg-slate-900/60 rounded-lg border border-slate-800/60">
                <span className="block text-[10px] text-slate-400 uppercase font-medium">Recall</span>
                <span className="text-xs font-semibold text-purple-400 font-mono">86.9%</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs font-semibold text-purple-400 hover:text-purple-300 transition-colors">
              <span>Open Predictive Analytics</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </Card>

        {/* CARD 3: AUTONOMOUS NAVIGATION (A*) - NAVIGATE */}
        <Card
          hoverable
          onClick={() => onNavigate('simulation')}
          className="flex flex-col justify-between border-slate-800/80 hover:border-slate-700 transition-colors"
        >
          <div>
            <div className="flex justify-between items-start mb-3">
              <span className="text-xs font-semibold text-emerald-400">
                Autonomous Navigation • A*
              </span>
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                NAVIGATE
              </span>
            </div>
            <h3 className="text-lg font-bold text-white mb-1.5">
              Robot Path Planning
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-5">
              Multi-agent space-time A* collision avoidance, automated shelf dispatch, and fulfillment route optimization.
            </p>
          </div>

          <div className="space-y-4 pt-4 border-t border-slate-800/80">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 bg-slate-900/60 rounded-lg border border-slate-800/60">
                <span className="block text-[10px] text-slate-400 uppercase font-medium">Status</span>
                <span className="text-xs font-semibold text-emerald-400">Ready</span>
              </div>
              <div className="p-2 bg-slate-900/60 rounded-lg border border-slate-800/60">
                <span className="block text-[10px] text-slate-400 uppercase font-medium">Fleet</span>
                <span className="text-xs font-semibold text-white">5 Robots</span>
              </div>
              <div className="p-2 bg-slate-900/60 rounded-lg border border-slate-800/60">
                <span className="block text-[10px] text-slate-400 uppercase font-medium">Grid</span>
                <span className="text-xs font-semibold text-emerald-400 font-mono">10x10</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors">
              <span>Open 2D Simulation</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </Card>
      </div>

      {/* 3. Second Row: 2D Simulation (Left 8 cols) + Current Task (Right 4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-premium-fade stagger-3">
        {/* Left: 2D Warehouse Simulation Card */}
        <Card className="lg:col-span-8 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white">2D Warehouse Simulation</h3>
                <Badge variant="simulation" size="sm">SIMULATION MODE</Badge>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Digital warehouse environment for A* path planning
              </p>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2">
              {!simRunning ? (
                <Button
                  size="sm"
                  variant="primary"
                  icon={<Play className="w-3.5 h-3.5" />}
                  onClick={onStartSim}
                >
                  Start
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="danger"
                  icon={<Pause className="w-3.5 h-3.5" />}
                  onClick={onStopSim}
                >
                  Pause
                </Button>
              )}
              <Button
                size="sm"
                variant="secondary"
                icon={<RotateCcw className="w-3.5 h-3.5" />}
                onClick={onResetSim ?? onStopSim}
              >
                Reset
              </Button>
              <Button
                size="sm"
                variant="outline"
                icon={<PlusCircle className="w-3.5 h-3.5" />}
                onClick={() => onNavigate('simulation')}
              >
                Full Map
              </Button>
            </div>
          </div>

          {/* Interactive Simulation Canvas */}
          <div className="w-full flex justify-center bg-slate-950/60 rounded-xl p-4 border border-slate-800/80">
            <WarehouseCanvas
              simState={simState}
              selectedRobotId={selectedRobotId}
              onSelectRobot={onSelectRobot}
              width={480}
              height={480}
            />
          </div>

          {/* Live Fleet Ticker */}
          <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap justify-between items-center text-xs text-slate-400">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                Active AMRs: <strong className="text-slate-200">{simState ? simState.robots.length : 5}</strong>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Packing Stations: <strong className="text-slate-200">1</strong>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                Charging Bays: <strong className="text-slate-200">2</strong>
              </span>
            </div>
            <span className="font-mono text-xs text-slate-400">
              Tick: #{simState?.tick ?? 0}
            </span>
          </div>
        </Card>

        {/* Right: Current Task & Fleet Telemetry Card */}
        {(() => {
          const fleet = Array.isArray(simState?.robots) && simState.robots.length > 0 ? simState.robots : [
            { id: 'R0', x: 1, y: 8, state: 'idle', battery: 100 },
            { id: 'R1', x: 3, y: 8, state: 'idle', battery: 100 },
            { id: 'R2', x: 5, y: 8, state: 'idle', battery: 100 },
            { id: 'R3', x: 7, y: 8, state: 'idle', battery: 100 },
            { id: 'R4', x: 9, y: 8, state: 'idle', battery: 100 },
          ];
          const activeRobot = (selectedRobotId ? fleet.find(r => r.id === selectedRobotId) : null)
            || fleet.find(r => r.state !== 'idle')
            || fleet[0];

          const getStatusText = (st?: string) => {
            if (st === 'picking') return 'Picking SKU at Storage Rack';
            if (st === 'moving_to_packing') return 'Transporting to Station P1';
            if (st === 'charging') return 'Docked at Charging Bay';
            return 'Standby at Staging Bay (Row 8)';
          };

          const robotBattery = activeRobot.battery ?? 100;

          return (
            <Card className="lg:col-span-4 flex flex-col justify-between h-full space-y-5">
              <div>
                <div className="flex justify-between items-center pb-3 border-b border-slate-800/80 mb-4">
                  <h3 className="text-sm font-semibold text-white">Fleet Telemetry</h3>
                  <Badge variant={simRunning ? 'success' : 'neutral'} dot size="sm">
                    {simRunning ? 'Active' : 'Standby'}
                  </Badge>
                </div>

                {/* Primary Active Robot Card */}
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[11px] font-mono text-blue-400 font-semibold uppercase">AMR Unit {activeRobot.id}</span>
                      <h4 className="text-sm font-semibold text-white mt-0.5">{getStatusText(activeRobot.state)}</h4>
                    </div>
                    <Badge variant={robotBattery > 50 ? 'success' : robotBattery > 20 ? 'warning' : 'danger'} size="sm">
                      {robotBattery}%
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 text-xs">
                    <div className="p-2 bg-slate-950/60 rounded-lg border border-slate-800/60">
                      <span className="text-[10px] text-slate-400 block font-medium">Grid Position</span>
                      <span className="font-semibold text-slate-200 font-mono">({activeRobot.x}, {activeRobot.y})</span>
                    </div>
                    <div className="p-2 bg-slate-950/60 rounded-lg border border-slate-800/60">
                      <span className="text-[10px] text-slate-400 block font-medium">Target</span>
                      <span className="font-semibold text-slate-200">
                        {activeRobot.state === 'charging' ? 'Bay C1/C2' : 'Packing P1'}
                      </span>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center text-xs mb-1.5">
                      <span className="text-slate-400 font-medium">Battery Level</span>
                      <span className="font-mono font-semibold text-slate-200">{robotBattery}%</span>
                    </div>
                    <ProgressBar
                      value={robotBattery}
                      color={robotBattery > 50 ? 'green' : robotBattery > 20 ? 'amber' : 'red'}
                      height="h-1.5"
                    />
                  </div>

                  <div className="flex justify-between items-center text-[11px] text-slate-400 pt-1 border-t border-slate-800/40">
                    <span>Mode: <strong className="text-slate-300 font-medium">{simRunning ? 'Autonomous Dispatch' : 'Idle Standby'}</strong></span>
                    <span className="flex items-center gap-1 text-slate-400 font-mono">
                      <Clock className="w-3 h-3 text-slate-400" /> #{simState?.tick ?? 0}
                    </span>
                  </div>
                </div>
              </div>

              {/* Remaining Fleet Units */}
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                  Remaining Fleet ({fleet.filter(r => r.id !== activeRobot.id).length} AMRs)
                </span>
                <div className="space-y-1.5 text-xs">
                  {fleet.filter(r => r.id !== activeRobot.id).slice(0, 3).map((r) => (
                    <div
                      key={r.id}
                      onClick={() => onSelectRobot(r.id)}
                      className="p-2 rounded-lg bg-slate-900/40 border border-slate-800/60 hover:border-slate-700 cursor-pointer flex justify-between items-center transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                        <span className="font-medium text-slate-300">AMR {r.id} — Tile ({r.x}, {r.y})</span>
                      </div>
                      <span className="text-[11px] font-mono text-slate-400">{r.battery}%</span>
                    </div>
                  ))}
                </div>
              </div>

              <Button
                variant="secondary"
                size="sm"
                className="w-full"
                icon={<Bot className="w-4 h-4" />}
                onClick={() => onNavigate('simulation')}
              >
                Open Full 2D Navigation Grid
              </Button>
            </Card>
          );
        })()}
      </div>

      {/* 4. Third Row: Inventory Risk Overview (Left 6 cols) + Model Performance (Right 6 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 animate-premium-fade stagger-4">
        {/* INVENTORY RISK OVERVIEW (Donut & Risk breakdown) */}
        <Card className="flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-base font-bold text-white">Inventory Risk Overview</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Stockout risk classification across 3,204 active warehouse SKUs
              </p>
            </div>
            <Badge variant="purple" size="sm">7-Day Horizon</Badge>
          </div>

          {/* Visual Breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center my-2">
            {/* SVG Donut */}
            <div className="flex justify-center items-center relative">
              <svg className="w-36 h-36 transform -rotate-90" viewBox="0 0 100 100">
                {/* Background ring */}
                <circle cx="50" cy="50" r="38" fill="transparent" stroke="#1E293B" strokeWidth="12" />
                {/* Low Risk: 72.8% */}
                <circle
                  cx="50" cy="50" r="38"
                  fill="transparent"
                  stroke="#10B981"
                  strokeWidth="12"
                  strokeDasharray="238.7"
                  strokeDashoffset="65"
                  className="transition-all duration-700"
                />
                {/* High Risk: 27.2% */}
                <circle
                  cx="50" cy="50" r="38"
                  fill="transparent"
                  stroke="#F43F5E"
                  strokeWidth="12"
                  strokeDasharray="238.7"
                  strokeDashoffset="174"
                  className="transition-all duration-700"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-xl font-bold text-white font-mono leading-none">3,204</span>
                <span className="text-[10px] text-slate-400 uppercase font-medium mt-1">Total SKUs</span>
              </div>
            </div>

            {/* Legend Stats */}
            <div className="space-y-2.5">
              <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded bg-emerald-500 flex-shrink-0" />
                  <span className="text-xs font-medium text-slate-200">Safe / Low Risk</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-semibold text-white font-mono">2,334</span>
                  <span className="text-[10px] text-slate-400 ml-1.5">(72.9%)</span>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded bg-rose-500 flex-shrink-0" />
                  <span className="text-xs font-medium text-slate-200">High Stockout Risk</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-semibold text-rose-400 font-mono">870</span>
                  <span className="text-[10px] text-slate-400 ml-1.5">(27.1%)</span>
                </div>
              </div>

              <p className="text-[11px] text-slate-400">
                Rule: Stockout flagged when stock &lt; forecasted 7-day demand.
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800/80 flex justify-between items-center text-xs">
            <span className="text-slate-400">Class Imbalance Ratio: <strong className="text-slate-200">2.68 : 1</strong></span>
            <Button
              variant="outline"
              size="sm"
              icon={<TrendingUp className="w-3.5 h-3.5 text-purple-400" />}
              onClick={() => onNavigate('analytics')}
            >
              Analyze SKUs
            </Button>
          </div>
        </Card>

        {/* MODEL PERFORMANCE COMPARISON */}
        <Card className="flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-base font-bold text-white">Model Performance Benchmark</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Empirical evaluation on 481 test items (ROC-AUC & High-Risk Recall)
              </p>
            </div>
            <Badge variant="primary" size="sm">Test Isolated</Badge>
          </div>

          <div className="space-y-3 my-2">
            {/* Tuned XGBoost */}
            <div className="p-3 bg-blue-500/5 rounded-lg border border-blue-500/30 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white">Tuned XGBoost</span>
                  <span className="px-1.5 py-0.2 rounded text-[10px] bg-blue-500/20 text-blue-300 font-semibold">
                    CHAMPION
                  </span>
                </div>
                <span className="font-mono text-xs text-blue-400 font-semibold">ROC-AUC: 0.9197 | Recall: 86.92%</span>
              </div>
              <ProgressBar value={91.97} color="blue" height="h-1.5" />
            </div>

            {/* Random Forest */}
            <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800/80 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-medium text-slate-300">Random Forest (Balanced)</span>
                <span className="font-mono text-xs text-slate-400">ROC-AUC: 0.9218 | Recall: 76.92%</span>
              </div>
              <ProgressBar value={92.18} color="blue" height="h-1.5" />
            </div>

            {/* Logistic Regression */}
            <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800/80 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-medium text-slate-300">Logistic Regression (C=10.0)</span>
                <span className="font-mono text-xs text-slate-400">ROC-AUC: 0.9221 | Recall: 71.54%</span>
              </div>
              <ProgressBar value={92.21} color="blue" height="h-1.5" />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800/80 flex justify-between items-center text-xs">
            <span className="text-slate-400">Stockouts Caught: <strong className="text-slate-200">113 / 130 (XGBoost)</strong></span>
            <Button
              variant="outline"
              size="sm"
              icon={<ArrowRight className="w-3.5 h-3.5" />}
              onClick={() => onNavigate('experiments')}
            >
              View All 10 Experiments
            </Button>
          </div>
        </Card>
      </div>

      {/* 5. Quick Actions Bar */}
      <Card className="p-4 border-slate-800/80 animate-premium-fade stagger-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600/10 text-blue-400 flex items-center justify-center flex-shrink-0">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">Operational Shortcuts</h4>
              <p className="text-xs text-slate-400">Quickly trigger warehouse intelligence workflows</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            <Button
              size="sm"
              variant="secondary"
              icon={<Play className="w-3.5 h-3.5 text-emerald-400" />}
              onClick={() => {
                onNavigate('simulation');
                onStartSim();
              }}
            >
              Run Simulation
            </Button>

            <Button
              size="sm"
              variant="secondary"
              icon={<UploadCloud className="w-3.5 h-3.5 text-blue-400" />}
              onClick={() => onNavigate('vision')}
            >
              Upload Vision Image
            </Button>

            <Button
              size="sm"
              variant="secondary"
              icon={<TrendingUp className="w-3.5 h-3.5 text-purple-400" />}
              onClick={() => onNavigate('analytics')}
            >
              Predict Inventory Risk
            </Button>

            <Button
              size="sm"
              variant="primary"
              icon={<Compass className="w-3.5 h-3.5" />}
              onClick={() => onNavigate('simulation')}
            >
              View 2D Map
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default DashboardView;
