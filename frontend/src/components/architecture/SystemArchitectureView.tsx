import React from 'react';
import { Scan, TrendingUp, Bot } from 'lucide-react';
import Card from '../common/Card';
import Badge from '../common/Badge';

export const SystemArchitectureView: React.FC = () => {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-400 mb-1">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            End-to-End System Design
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            System Architecture
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Unified multi-layer intelligence framework: See, Predict, and Navigate.
          </p>
        </div>

        <Badge variant="neutral" size="md">
          Autonomous AI Operations Stack
        </Badge>
      </div>

      {/* 2. Three Primary Architectural Pillars Flow */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 relative">
        {/* Layer 1: Perception */}
        <Card className="flex flex-col justify-between border-slate-800/80 hover:border-slate-700 p-6 space-y-4 transition-colors">
          <div>
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                Perception Layer
              </span>
              <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 text-[11px] font-semibold border border-amber-500/20">
                SEE
              </span>
            </div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Scan className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">YOLOv8 Vision System</h3>
                <span className="text-xs text-slate-400">Object Detection & Spatial Mapping</span>
              </div>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Detects warehouse workers, cartons, pallets, forklifts, AMRs, and robotic arms at 100+ FPS, providing spatial bounding box feeds for safety interlocks.
            </p>
          </div>

          <div className="space-y-2 pt-3 border-t border-slate-800/80 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Input:</span> <span className="font-mono text-slate-200">CCTV & Camera Stream (640x640)</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Latency:</span> <span className="font-mono text-emerald-400 font-semibold">9.9ms / frame</span>
            </div>
          </div>
        </Card>

        {/* Layer 2: Intelligence */}
        <Card className="flex flex-col justify-between border-slate-800/80 hover:border-slate-700 p-6 space-y-4 transition-colors">
          <div>
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-semibold text-orange-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                Cognitive Layer
              </span>
              <span className="px-2 py-0.5 rounded bg-orange-500/10 text-orange-300 text-[11px] font-semibold border border-orange-500/20">
                PREDICT
              </span>
            </div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">XGBoost Risk AI</h3>
                <span className="text-xs text-slate-400">Stockout Risk & Demand Forecast</span>
              </div>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Computes 9 operational velocity ratios, forecasting whether physical stock will satisfy demand over the 7-day replenishment window (0.9197 ROC-AUC).
            </p>
          </div>

          <div className="space-y-2 pt-3 border-t border-slate-800/80 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Input:</span> <span className="font-mono text-slate-200">38 Logistical Runout Features</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Recall:</span> <span className="font-mono text-orange-400 font-semibold">86.92% (scale_pos_weight=2.68)</span>
            </div>
          </div>
        </Card>

        {/* Layer 3: Actuation */}
        <Card className="flex flex-col justify-between border-slate-800/80 hover:border-slate-700 p-6 space-y-4 transition-colors">
          <div>
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Control Layer
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[11px] font-semibold border border-emerald-500/20">
                NAVIGATE
              </span>
            </div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">A* Path Planning</h3>
                <span className="text-xs text-slate-400">Autonomous Fleet Navigation</span>
              </div>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Dispatches AMRs to retrieve high-priority inventory from storage shelves to packing stations using space-time A* obstacle avoidance.
            </p>
          </div>

          <div className="space-y-2 pt-3 border-t border-slate-800/80 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Grid:</span> <span className="font-mono text-slate-200">10x10 Discrete Topology</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Fleet:</span> <span className="font-mono text-emerald-400 font-semibold">5 Synchronized AMRs</span>
            </div>
          </div>
        </Card>
      </div>

      {/* 3. Detailed Data Flow & Integration Matrix */}
      <Card className="space-y-6">
        <div className="pb-3 border-b border-slate-800/80 flex justify-between items-center">
          <div>
            <h2 className="text-base font-semibold text-white">Closed-Loop Operational Workflow</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              How Vision, Predictive AI, and Robotics orchestrate warehouse inventory flow
            </p>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            Continuous Feedback Loop
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-amber-500/30 transition-colors space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-amber-400 uppercase font-mono">Step 1: Perception</span>
              <span className="w-5 h-5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center font-semibold text-[10px]">1</span>
            </div>
            <h4 className="font-semibold text-white">Floor & Shelf Monitoring</h4>
            <p className="text-slate-400 leading-relaxed">
              CCTV cameras stream frames to YOLOv8. Pallet levels, worker locations, and robot positions are parsed into geometric coordinates.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-orange-500/30 transition-colors space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-orange-400 uppercase font-mono">Step 2: Analytics</span>
              <span className="w-5 h-5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20 flex items-center justify-center font-semibold text-[10px]">2</span>
            </div>
            <h4 className="font-semibold text-white">Inventory Risk Engine</h4>
            <p className="text-slate-400 leading-relaxed">
              XGBoost continuously audits stock levels against demand forecasts. When an item breaches safety buffer thresholds, an emergency order is triggered.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-emerald-500/30 transition-colors space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-emerald-400 uppercase font-mono">Step 3: Dispatch</span>
              <span className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center font-semibold text-[10px]">3</span>
            </div>
            <h4 className="font-semibold text-white">A* Automated Routing</h4>
            <p className="text-slate-400 leading-relaxed">
              The order manager dispatches the nearest available AMR. A* computes collision-free trajectories avoiding static shelves and dynamic obstacles.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-cyan-500/30 transition-colors space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-cyan-400 uppercase font-mono">Step 4: Fulfillment</span>
              <span className="w-5 h-5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center font-semibold text-[10px]">4</span>
            </div>
            <h4 className="font-semibold text-white">Packing & Verification</h4>
            <p className="text-slate-400 leading-relaxed">
              AMR deposits inventory at Packing Station P1. Visual sensors verify barcode and package integrity, updating the central warehouse ledger.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default SystemArchitectureView;
