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
          <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400 tracking-wider uppercase mb-1">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            End-to-End System Design
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            System & Architecture
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Unified multi-layer intelligence framework: See, Predict, and Navigate.
          </p>
        </div>

        <Badge variant="simulation" size="md">
          Autonomous AI Operations Stack
        </Badge>
      </div>

      {/* 2. Three Primary Architectural Pillars Flow */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
        {/* Layer 1: Perception */}
        <Card className="flex flex-col justify-between border-blue-500/30 p-6 space-y-4 hover:border-blue-400 hover:shadow-[0_0_30px_rgba(22,131,255,0.25)] transition-all duration-300">
          <div>
            <div className="flex justify-between items-center mb-3">
              <span className="text-[10px] uppercase font-bold text-blue-400 font-mono flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                Perception Layer
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-xs font-black border border-blue-500/40 shadow-[0_0_10px_rgba(22,131,255,0.3)]">
                SEE
              </span>
            </div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-[#1683FF] shadow-[0_0_15px_rgba(22,131,255,0.2)]">
                <Scan className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white neon-text-cyan">YOLOv8 Vision System</h3>
                <span className="text-xs text-slate-400">Object Detection & Spatial Mapping</span>
              </div>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Detects warehouse workers, cartons, pallets, forklifts, AMRs, and robotic arms at 100+ FPS, providing spatial bounding box feeds for safety interlocks.
            </p>
          </div>

          <div className="space-y-2 pt-3 border-t border-[#1A2D4A] text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Input:</span> <span className="font-mono text-slate-200">CCTV & Camera Stream (640x640)</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Latency:</span> <span className="font-mono text-emerald-400 font-bold">9.9ms / frame</span>
            </div>
          </div>
        </Card>

        {/* Layer 2: Intelligence */}
        <Card className="flex flex-col justify-between border-purple-500/30 p-6 space-y-4 hover:border-purple-400 hover:shadow-[0_0_30px_rgba(124,58,237,0.25)] transition-all duration-300">
          <div>
            <div className="flex justify-between items-center mb-3">
              <span className="text-[10px] uppercase font-bold text-purple-400 font-mono flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
                Cognitive Layer
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-xs font-black border border-purple-500/40 shadow-[0_0_10px_rgba(124,58,237,0.3)]">
                PREDICT
              </span>
            </div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-[#7C3AED] shadow-[0_0_15px_rgba(124,58,237,0.2)]">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white neon-text-purple">XGBoost Risk AI</h3>
                <span className="text-xs text-slate-400">Stockout Risk & Demand Forecast</span>
              </div>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Computes 9 operational velocity ratios, forecasting whether physical stock will satisfy demand over the 7-day replenishment window (0.9197 ROC-AUC).
            </p>
          </div>

          <div className="space-y-2 pt-3 border-t border-[#1A2D4A] text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Input:</span> <span className="font-mono text-slate-200">38 Logistical Runout Features</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Recall:</span> <span className="font-mono text-cyan-300 font-bold">86.92% (scale_pos_weight=2.68)</span>
            </div>
          </div>
        </Card>

        {/* Layer 3: Actuation */}
        <Card className="flex flex-col justify-between border-emerald-500/30 p-6 space-y-4 hover:border-emerald-400 hover:shadow-[0_0_30px_rgba(16,185,129,0.25)] transition-all duration-300">
          <div>
            <div className="flex justify-between items-center mb-3">
              <span className="text-[10px] uppercase font-bold text-emerald-400 font-mono flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Control Layer
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-black border border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                NAVIGATE
              </span>
            </div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-[#10B981] shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white neon-text-green">A* Path Planning</h3>
                <span className="text-xs text-slate-400">Autonomous Fleet Navigation</span>
              </div>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Dispatches AMRs to retrieve high-priority inventory from storage shelves to packing stations using dynamic A* obstacle avoidance.
            </p>
          </div>

          <div className="space-y-2 pt-3 border-t border-[#1A2D4A] text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Grid:</span> <span className="font-mono text-slate-200">10x10 Discrete Topology</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Fleet:</span> <span className="font-mono text-emerald-400 font-bold">5 Synchronized AMRs</span>
            </div>
          </div>
        </Card>
      </div>

      {/* 3. Detailed Data Flow & Integration Matrix */}
      <Card className="space-y-6">
        <div className="pb-3 border-b border-[#1A2D4A] flex justify-between items-center">
          <div>
            <h2 className="text-base font-bold text-white">Closed-Loop Operational Workflow</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              How Vision, Predictive AI, and Robotics orchestrate warehouse inventory flow
            </p>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[11px] font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            Continuous Feedback Loop
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-[#08182A] border border-[#1A2D4A] hover:border-cyan-500/40 hover:shadow-[0_0_20px_rgba(0,217,255,0.15)] transition-all space-y-2 relative group">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-cyan-400 uppercase font-mono">Step 1: Perception</span>
              <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center justify-center font-bold text-[10px]">1</span>
            </div>
            <h4 className="font-bold text-white group-hover:text-cyan-300 transition-colors">Floor & Shelf Monitoring</h4>
            <p className="text-slate-400 leading-relaxed">
              CCTV cameras stream frames to YOLOv8. Pallet levels, worker locations, and robot positions are parsed into geometric coordinates.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#08182A] border border-[#1A2D4A] hover:border-purple-500/40 hover:shadow-[0_0_20px_rgba(124,58,237,0.15)] transition-all space-y-2 relative group">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-purple-400 uppercase font-mono">Step 2: Analytics</span>
              <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center justify-center font-bold text-[10px]">2</span>
            </div>
            <h4 className="font-bold text-white group-hover:text-purple-300 transition-colors">Inventory Risk Engine</h4>
            <p className="text-slate-400 leading-relaxed">
              XGBoost continuously audits stock levels against demand forecasts. When an item breaches safety buffer thresholds, an emergency order is triggered.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#08182A] border border-[#1A2D4A] hover:border-emerald-500/40 hover:shadow-[0_0_20px_rgba(16,185,129,0.15)] transition-all space-y-2 relative group">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-emerald-400 uppercase font-mono">Step 3: Dispatch</span>
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center justify-center font-bold text-[10px]">3</span>
            </div>
            <h4 className="font-bold text-white group-hover:text-emerald-300 transition-colors">A* Automated Routing</h4>
            <p className="text-slate-400 leading-relaxed">
              The order manager dispatches the nearest available AMR. A* computes collision-free trajectories avoiding static shelves and dynamic obstacles.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#08182A] border border-[#1A2D4A] hover:border-blue-500/40 hover:shadow-[0_0_20px_rgba(22,131,255,0.15)] transition-all space-y-2 relative group">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-blue-400 uppercase font-mono">Step 4: Fulfillment</span>
              <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40 flex items-center justify-center font-bold text-[10px]">4</span>
            </div>
            <h4 className="font-bold text-white group-hover:text-blue-300 transition-colors">Packing & Verification</h4>
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
