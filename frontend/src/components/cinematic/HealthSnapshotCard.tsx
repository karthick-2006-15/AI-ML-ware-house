import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Activity, ArrowRight } from 'lucide-react';

interface HealthSnapshotCardProps {
  biologicalAge?: number;
  onOpenBloodReport?: () => void;
  className?: string;
  defaultExpanded?: boolean;
}

export const HealthSnapshotCard: React.FC<HealthSnapshotCardProps> = ({
  biologicalAge = 28,
  onOpenBloodReport,
  className = '',
  defaultExpanded = true,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(defaultExpanded);

  return (
    <div
      className={`relative select-none transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        isExpanded
          ? 'w-full max-w-md glass-card-warm rounded-2xl p-3.5 sm:p-4 border border-amber-500/30 shadow-2xl backdrop-blur-xl'
          : 'w-full max-w-[260px] glass-card-dark rounded-xl p-3 cursor-pointer shadow-lg border border-slate-800'
      } ${className}`}
    >
      {/* Header Section */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-bold tracking-tight leading-snug text-white text-sm sm:text-base">
            Autonomous AI Fleet Directives
          </h3>
          <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider block mt-0.5 text-amber-400">
            YOLOv8 Vision & XGBoost Active
          </span>
        </div>

        {/* Circular Arrow Toggle Control */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center transition-all duration-250 flex-shrink-0 bg-white/10 hover:bg-white/20 text-white cursor-pointer"
          title={isExpanded ? 'Collapse Directives' : 'Expand Directives'}
        >
          {isExpanded ? (
            <ChevronDown className="w-3.5 h-3.5 transition-transform duration-300" />
          ) : (
            <ChevronUp className="w-3.5 h-3.5 transition-transform duration-300" />
          )}
        </button>
      </div>

      {/* Expanded State Narrative & Biometrics Action */}
      <div
        className={`overflow-hidden transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isExpanded ? 'max-h-64 opacity-100 mt-2.5 pt-2.5 border-t border-white/[0.08]' : 'max-h-0 opacity-0 mt-0 pt-0'
        }`}
      >
        <p className="text-xs text-slate-300 leading-relaxed font-normal">
          Operating at <strong className="text-amber-400 font-semibold">{biologicalAge}% Fleet Health Index</strong> with dual-engine AI arbitration. Live YOLOv8 computer vision actively monitors optical nodes with ~9.9ms latency, space-time A* pathfinding guarantees zero collisions across all 5 AMRs, and predictive XGBoost preempts stockouts with 0.92 ROC-AUC.
        </p>

        {/* Trigger Button for Detailed Telemetry & Diagnostics Modal */}
        {onOpenBloodReport && (
          <div className="mt-2.5 pt-2 border-t border-white/[0.08] flex items-center justify-between">
            <button
              onClick={onOpenBloodReport}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-bold text-[11px] flex items-center gap-1.5 shadow-md shadow-amber-500/25 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Fleet Telemetry & Diagnostics</span>
              <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
            </button>
            <span className="text-[10px] text-slate-400 font-mono">SYS DIAG V/N 98.4</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default HealthSnapshotCard;
