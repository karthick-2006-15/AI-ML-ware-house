import React, { useEffect } from 'react';
import { X, ChevronLeft, CheckCircle2 } from 'lucide-react';

interface BloodModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BloodModal: React.FC<BloodModalProps> = ({ isOpen, onClose }) => {

  // Escape key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      {/* 22. Dark Backdrop with Heavy Blur and Reduced Brightness */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/75 backdrop-blur-2xl transition-opacity animate-in fade-in duration-250"
      />

      {/* Diagnostics Modal Container in Dark Neo-Glassmorphism */}
      <div
        className="relative z-10 w-full max-w-[500px] glass-card-warm bg-slate-950/95 rounded-[26px] p-5 sm:p-6 overflow-hidden animate-in zoom-in-95 duration-250 border border-amber-500/30 shadow-2xl select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Diagnostics Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Back"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Fleet Diagnostics
            </h2>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* System Description */}
        <p className="text-xs text-slate-400 mt-2 leading-relaxed font-normal">
          Continuous space-time multi-agent telemetry, hardware calibration, and predictive safety benchmarks.
        </p>

        {/* Fleet Health Index Section */}
        <div className="mt-4 pt-1">
          <div className="flex items-baseline justify-between">
            <span className="text-xs font-semibold text-slate-400 tracking-wide uppercase">
              AMR Fleet Health Index
            </span>
            <span className="text-[11px] font-mono font-medium text-amber-400">
              V/N: 90.0% – 100.0%
            </span>
          </div>

          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-3xl sm:text-4xl font-bold text-white font-sans tracking-tight">
              98.4
            </span>
            <span className="text-sm font-medium text-emerald-400 font-mono">
              % OPTIMAL
            </span>
          </div>
        </div>

        {/* Segmented Operational Reference Range Bar */}
        <div className="mt-3 space-y-1.5">
          <div className="relative w-full h-3 rounded-full overflow-hidden flex gap-0.5 bg-slate-900 p-0.5 border border-slate-800">
            {/* Low / Critical */}
            <div className="h-full w-[20%] bg-rose-500/80 rounded-l-full" title="Critical (<75%)" />
            {/* Degraded */}
            <div className="h-full w-[25%] bg-amber-400/80 rounded-sm" title="Degraded (75% - 85%)" />
            {/* Nominal */}
            <div className="h-full w-[25%] bg-blue-400/70 rounded-sm" title="Nominal (85% - 95%)" />
            {/* Optimal zone */}
            <div className="h-full w-[30%] bg-emerald-500 rounded-r-full relative" title="Optimal (95% - 100%)">
              {/* Value Indicator Marker Pin (at ~98.4%) */}
              <div 
                className="absolute top-1/2 -translate-y-1/2 left-[78%] -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-white border-2 border-slate-950 shadow-md animate-pulse"
                title="Current: 98.4%"
              />
            </div>
          </div>

          {/* Range Labels */}
          <div className="flex justify-between text-[10px] font-mono text-slate-400 px-1">
            <span>CRITICAL</span>
            <span>DEGRADED</span>
            <span>NOMINAL</span>
            <span className="text-emerald-400 font-semibold">OPTIMAL</span>
          </div>
        </div>

        {/* Subsystem Telemetry Breakdown */}
        <div className="mt-4 p-3 rounded-2xl bg-slate-900/80 border border-slate-800">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-2 font-mono">
            Subsystem Telemetry Breakdown
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
              <span className="text-slate-400">A* Path Efficacy</span>
              <span className="font-mono font-bold text-white ml-auto">99.4%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
              <span className="text-slate-400">Collision Margin</span>
              <span className="font-mono font-bold text-white ml-auto">100%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
              <span className="text-slate-400">Battery Health</span>
              <span className="font-mono font-bold text-white ml-auto">96.8%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-500 flex-shrink-0" />
              <span className="text-slate-400">Sync Latency</span>
              <span className="font-mono font-bold text-white ml-auto">8.4ms</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-500 flex-shrink-0" />
              <span className="text-slate-400">Motor Steer</span>
              <span className="font-mono font-bold text-white ml-auto">99.1%</span>
            </div>
          </div>
        </div>

        {/* Status Banner */}
        <div className="mt-3.5 px-3.5 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>All 5 AMR Subsystems Nominal</span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
            CONFIRMED
          </span>
        </div>

        {/* Space-Time Reservations Card */}
        <div className="mt-3.5 p-3 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-semibold text-slate-400 font-mono uppercase block">
              Space-Time Reservations
            </span>
            <span className="text-lg font-bold text-white font-sans">
              4,820
            </span>
            <span className="text-xs text-slate-400 font-mono ml-1">Cells Booked</span>
          </div>
          <span className="text-xs font-mono text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-1 rounded-lg">
            V/N: 0 Deadlocks
          </span>
        </div>

        {/* Technical Explanation */}
        <div className="mt-3.5 pt-2 border-t border-white/[0.08] text-[11px] text-slate-400 leading-relaxed">
          <p>
            Continuous space-time reservation grid verifies zero physical collisions across active AMRs. Inductive charging threshold maintained above 20% safety floor, with predictive XGBoost actively mitigating inventory bottlenecks.
          </p>
        </div>
      </div>
    </div>
  );
};

export default BloodModal;
