import React, { useEffect } from 'react';
import { X, Calendar, Clock, ArrowRight } from 'lucide-react';

interface ActivityItem {
  id: string;
  title: string;
  category: string;
  date: string;
  time: string;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'STANDBY';
  description: string;
}

interface ActivitiesModalProps {
  isOpen: boolean;
  onClose: () => void;
  activities?: ActivityItem[];
  onTriggerActivity?: (id: string) => void;
}

const DEFAULT_ACTIVITIES: ActivityItem[] = [
  {
    id: 'act-1',
    title: 'Autonomous Battery Staging & Docking',
    category: 'Power Management',
    date: 'Today, Sept 11',
    time: '10:30 AM',
    status: 'IN_PROGRESS',
    description: 'Units R1 and R4 cycle into Charging Bays C1 and C2 for rapid 48V fast-top off.',
  },
  {
    id: 'act-2',
    title: 'Zone A High-Velocity Order Surge Dispatch',
    category: 'Fulfillment Dispatch',
    date: 'Today, Sept 11',
    time: '11:15 AM',
    status: 'SCHEDULED',
    description: '15 High-Priority pharmaceutical SKUs scheduled for pick-and-pack routing.',
  },
  {
    id: 'act-3',
    title: 'Differential Steer Motor Calibration',
    category: 'Preventative Maintenance',
    date: 'Today, Sept 11',
    time: '02:00 PM',
    status: 'SCHEDULED',
    description: 'Wheel encoder telemetry check and optical sensor calibration for fleet Unit R3.',
  },
  {
    id: 'act-4',
    title: 'Dynamic Obstacle Clearance & Aisle Sweep',
    category: 'Safety Protocol',
    date: 'Tomorrow, Sept 12',
    time: '08:00 AM',
    status: 'STANDBY',
    description: 'Visual safety verification of main corridor aisles and packing dock clearance.',
  },
];

export const ActivitiesModal: React.FC<ActivitiesModalProps> = ({
  isOpen,
  onClose,
  activities = DEFAULT_ACTIVITIES,
  onTriggerActivity,
}) => {
  // Close on Escape key
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
              Operational Schedule
            </span>
            <h2 className="text-xl font-bold text-white tracking-tight mt-0.5">
              Upcoming Activities
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Activity Items List */}
        <div className="space-y-3 mt-4 max-h-[420px] overflow-y-auto pr-1">
          {activities.map((act) => (
            <div
              key={act.id}
              className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-amber-500/30 transition-all space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 font-mono uppercase">
                    {act.category}
                  </span>
                  <h3 className="text-sm font-semibold text-white">
                    {act.title}
                  </h3>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-medium border ${
                  act.status === 'IN_PROGRESS' 
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 animate-pulse'
                    : act.status === 'SCHEDULED'
                    ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}>
                  {act.status.replace('_', ' ')}
                </span>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                {act.description}
              </p>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-xs">
                <div className="flex items-center gap-3 text-slate-400 font-mono text-[11px]">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-amber-400" />
                    {act.date}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    {act.time}
                  </span>
                </div>

                <button
                  onClick={() => onTriggerActivity && onTriggerActivity(act.id)}
                  className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-medium text-[11px] flex items-center gap-1 border border-amber-500/25 transition-colors"
                >
                  <span>Execute Now</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ActivitiesModal;
