import React from 'react';
import { ArrowUpRight } from 'lucide-react';

interface UpcomingActivitiesCardProps {
  count?: number;
  onClick: () => void;
  className?: string;
}

export const UpcomingActivitiesCard: React.FC<UpcomingActivitiesCardProps> = ({
  count = 4,
  onClick,
  className = '',
}) => {
  return (
    <div
      onClick={onClick}
      className={`glass-card-dark rounded-2xl p-4 sm:p-5 cursor-pointer group select-none relative overflow-hidden ${className}`}
    >
      <div className="flex items-start justify-between gap-4">
        {/* Title and Events Count */}
        <div className="flex flex-col">
          <span className="text-sm sm:text-base font-bold text-white tracking-tight leading-snug">
            Upcoming<br />Activities
          </span>
          <span className="text-xs text-slate-400 font-mono mt-2">
            {count} events
          </span>
        </div>

        {/* Circular Arrow Control Button */}
        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-300 group-hover:text-white group-hover:bg-amber-500/20 group-hover:border-amber-500/40 transition-all duration-250 flex-shrink-0">
          <ArrowUpRight className="w-4 h-4 transition-transform duration-250 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </div>
      </div>
    </div>
  );
};

export default UpcomingActivitiesCard;
