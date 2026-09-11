import React, { useEffect } from 'react';
import { X, ShieldCheck, ArrowRight } from 'lucide-react';
import type { SimState } from '../../types';

interface InsightsModalProps {
  isOpen: boolean;
  onClose: () => void;
  simState?: SimState | null;
  onNavigateAnalytics?: () => void;
}

export const InsightsModal: React.FC<InsightsModalProps> = ({
  isOpen,
  onClose,
  simState,
  onNavigateAnalytics,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const insightsList = [
    {
      id: 'ins-1',
      title: 'Zone B High Stockout Hazard',
      category: 'XGBoost Risk Model',
      severity: 'HIGH',
      description: '3 high-velocity pharmaceutical SKUs exhibit runout ratios under 1.8 days with 86.9% stockout probability.',
      recommendation: 'Trigger expedited supplier replenishment and prioritize warehouse shelf transfer to front racks.',
    },
    {
      id: 'ins-2',
      title: 'Charging Bay C1/C2 Congestion Bottleneck',
      category: 'Resource Contention',
      severity: 'MEDIUM',
      description: 'AMR Units R0 and R3 projected to request inductive top-off within 45 ticks, exceeding concurrent dock capacity.',
      recommendation: 'Autonomous staggered charging dispatched to balance fleet energy reserves.',
    },
    {
      id: 'ins-3',
      title: 'Aisle 2 Narrow Corridor Traffic Peak',
      category: 'A* Pathfinding',
      severity: 'LOW',
      description: 'Head-on swap encounter avoided between Unit R2 and Unit R4. Right-of-way space-time reservation engaged.',
      recommendation: 'Corridor reservation window extended by 4 ticks to sustain zero-collision flow.',
    },
    {
      id: 'ins-4',
      title: 'Packaging Dock P1 Conveyor Throughput',
      category: 'Fulfillment Rate',
      severity: 'OPTIMAL',
      description: 'Current order fulfillment cycle averaging 16.0 ticks per order. Baseline collision elimination at 100%.',
      recommendation: 'Maintain optimal batching profile across automated dispatches.',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Dark Backdrop with Heavy Blur */}
      <div 
        onClick={onClose}
        className="absolute inset-0 bg-black/75 backdrop-blur-xl transition-opacity animate-in fade-in duration-200"
      />

      {/* Modal Container */}
      <div 
        className="relative z-10 w-full max-w-lg bg-[#0C121E] border border-slate-700/80 rounded-[28px] shadow-2xl p-6 overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <span className="text-[11px] font-semibold text-orange-400 uppercase tracking-wider">
              Predictive Intelligence • XGBoost
            </span>
            <h2 className="text-xl font-bold text-white tracking-tight mt-0.5">
              Detected Insights & Risk Factors
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* List of Insights */}
        <div className="space-y-3 mt-4 max-h-[420px] overflow-y-auto pr-1">
          {insightsList.map((ins) => (
            <div
              key={ins.id}
              className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-orange-500/30 transition-all space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 font-mono uppercase">
                    {ins.category}
                  </span>
                  <h3 className="text-sm font-semibold text-white">
                    {ins.title}
                  </h3>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-medium border ${
                  ins.severity === 'HIGH' 
                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                    : ins.severity === 'MEDIUM'
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                    : ins.severity === 'LOW'
                    ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                }`}>
                  {ins.severity}
                </span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                {ins.description}
              </p>

              <div className="p-2 rounded-lg bg-black/30 border border-slate-800/60 text-[11px] text-amber-200/90 flex items-start gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                <span><strong>Recommendation:</strong> {ins.recommendation}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-slate-800 flex justify-between items-center text-xs">
          <span className="text-slate-400 font-mono text-[11px]">
            8 Total Risks Monitored • Tick #{simState?.tick ?? 0}
          </span>
          {onNavigateAnalytics && (
            <button
              onClick={() => {
                onClose();
                onNavigateAnalytics();
              }}
              className="px-3 py-1.5 rounded-lg bg-orange-500/15 hover:bg-orange-500/25 text-orange-300 font-semibold text-xs flex items-center gap-1.5 border border-orange-500/30 transition-colors"
            >
              <span>Explore Predictive Analytics</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default InsightsModal;
