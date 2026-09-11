import React from 'react';
import { ArrowRight } from 'lucide-react';

interface InsightsCardProps {
  riskCount?: number;
  onClick: () => void;
  className?: string;
}

export const InsightsCard: React.FC<InsightsCardProps> = ({
  riskCount = 8,
  onClick,
  className = '',
}) => {
  return (
    <div
      onClick={onClick}
      className={`glass-card-warm rounded-2xl p-4 sm:p-5 cursor-pointer group select-none relative overflow-hidden ${className}`}
    >
      <div className="flex items-start justify-between gap-4">
        {/* Title and Risk Capsule */}
        <div className="flex flex-col">
          <span className="text-sm sm:text-base font-bold text-white tracking-tight leading-snug">
            Your<br />Insights
          </span>
          <div className="mt-2 flex items-center gap-1.5">
            <span className="text-xs font-semibold text-white tracking-tight flex items-center gap-1 group-hover:text-amber-300 transition-colors">
              {riskCount} Risks
              <ArrowRight className="w-3.5 h-3.5 transition-transform duration-250 group-hover:translate-x-1 text-amber-400" />
            </span>
          </div>
        </div>

        {/* Soft Radial Accent Dot */}
        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-600/30 border border-amber-400/30 flex items-center justify-center text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.2)] flex-shrink-0">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_6px_#F59E0B]" />
        </div>
      </div>
    </div>
  );
};

export default InsightsCard;
