import React, { useEffect } from 'react';
import { X, ArrowRight } from 'lucide-react';
import ProgressBar from '../common/ProgressBar';

interface ActionPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateSimulation?: () => void;
}

interface PlanItem {
  id: string;
  recommendation: string;
  priority: 'CRITICAL' | 'HIGH' | 'NORMAL';
  reason: string;
  suggestedAction: string;
  progress: number;
  status: string;
}

const DEFAULT_PLANS: PlanItem[] = [
  {
    id: 'plan-1',
    recommendation: 'Re-balance Zone A & Zone B Pick Loads',
    priority: 'HIGH',
    reason: 'Zone A currently servicing 68% of total order fulfillment traffic while Zone B operates at 32%.',
    suggestedAction: 'Route 4 impending pharmaceutical SKU orders to Zone B replenishment racks.',
    progress: 75,
    status: 'In Progress (3/4 dispatched)',
  },
  {
    id: 'plan-2',
    recommendation: 'Preemptive Inductive Docking for Unit R3',
    priority: 'NORMAL',
    reason: 'Battery level at 34% with high-priority order queued.',
    suggestedAction: 'Dock at Charging Bay C1 upon completion of current delivery to Packing Dock P1.',
    progress: 40,
    status: 'Routing to Dock P1',
  },
  {
    id: 'plan-3',
    recommendation: 'Aisle 3 Space-Time Corridor Reservation Lock',
    priority: 'HIGH',
    reason: 'Temporary dynamic obstacle placed at tile (4, 5).',
    suggestedAction: 'Reroute active AMRs R0 and R2 through outer perimeter lane 1.',
    progress: 100,
    status: 'Completed (Reroute Active)',
  },
  {
    id: 'plan-4',
    recommendation: 'XGBoost Anti-Starvation Dispatch Activation',
    priority: 'NORMAL',
    reason: '2 LOW-priority orders approaching 45 ticks wait counter.',
    suggestedAction: 'Promote order priority to prevent aging threshold expiration.',
    progress: 60,
    status: 'Evaluating Next Tick',
  },
];

export const ActionPlanModal: React.FC<ActionPlanModalProps> = ({
  isOpen,
  onClose,
  onNavigateSimulation,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

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
            <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">
              Fleet Optimization Protocol
            </span>
            <h2 className="text-xl font-bold text-white tracking-tight mt-0.5">
              Autonomous Action Plan
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Plans List */}
        <div className="space-y-3.5 mt-4 max-h-[420px] overflow-y-auto pr-1">
          {DEFAULT_PLANS.map((plan) => (
            <div
              key={plan.id}
              className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-amber-500/30 transition-all space-y-2.5"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-semibold text-white">
                  {plan.recommendation}
                </h3>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-medium border ${
                  plan.priority === 'CRITICAL' 
                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                    : plan.priority === 'HIGH'
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                    : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                }`}>
                  {plan.priority}
                </span>
              </div>

              <div className="text-xs text-slate-300 space-y-1">
                <p><span className="text-slate-400 font-medium">Reason:</span> {plan.reason}</p>
                <p><span className="text-amber-400/90 font-medium">Action:</span> {plan.suggestedAction}</p>
              </div>

              {/* Progress Bar & Status */}
              <div className="pt-2 border-t border-slate-800/60 space-y-1.5">
                <div className="flex justify-between text-[11px] font-mono">
                  <span className="text-slate-400">{plan.status}</span>
                  <span className="text-amber-300 font-semibold">{plan.progress}%</span>
                </div>
                <ProgressBar
                  value={plan.progress}
                  color={plan.progress === 100 ? 'green' : 'amber'}
                  height="h-1.5"
                />
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-slate-800 flex justify-between items-center text-xs">
          <span className="text-slate-400 font-mono text-[11px]">4 Coordinated Directives Active</span>
          {onNavigateSimulation && (
            <button
              onClick={() => {
                onClose();
                onNavigateSimulation();
              }}
              className="px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 font-semibold text-xs flex items-center gap-1.5 border border-amber-500/30 transition-colors"
            >
              <span>View in 2D Simulation</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ActionPlanModal;
