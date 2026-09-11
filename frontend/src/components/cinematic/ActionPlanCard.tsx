import React from 'react';
import { ArrowRight } from 'lucide-react';

interface ActionPlanCardProps {
  onClick: () => void;
  className?: string;
}

export const ActionPlanCard: React.FC<ActionPlanCardProps> = ({
  onClick,
  className = '',
}) => {
  return (
    <div
      onClick={onClick}
      className={`glass-card-action rounded-2xl p-4 sm:p-5 cursor-pointer group select-none relative overflow-hidden ${className}`}
    >
      <div className="flex items-start justify-between gap-4">
        {/* Title and Details Link */}
        <div className="flex flex-col">
          <span className="text-sm sm:text-base font-bold text-white tracking-tight leading-snug">
            Action<br />Plan
          </span>
          <div className="mt-2 flex items-center gap-1.5">
            <span className="text-xs font-semibold text-white tracking-tight flex items-center gap-1 group-hover:text-amber-200 transition-colors">
              Details
              <ArrowRight className="w-3.5 h-3.5 transition-transform duration-250 group-hover:translate-x-1 text-amber-300" />
            </span>
          </div>
        </div>

        {/* Soft Radial Action Ring */}
        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-amber-400/20 to-orange-500/20 border border-amber-300/30 flex items-center justify-center text-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.25)] flex-shrink-0">
          <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-amber-300 to-orange-400 shadow-[0_0_6px_#F59E0B]" />
        </div>
      </div>
    </div>
  );
};

export default ActionPlanCard;
