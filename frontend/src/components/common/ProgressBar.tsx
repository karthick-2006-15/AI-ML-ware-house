import React from 'react';

interface ProgressBarProps {
  value: number; // 0 to 100
  color?: 'blue' | 'cyan' | 'green' | 'amber' | 'red' | 'purple';
  height?: string;
  showLabel?: boolean;
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  color = 'blue',
  height = 'h-2',
  showLabel = false,
  className = '',
}) => {
  const clamped = Math.min(100, Math.max(0, value));

  const colorStyles = {
    blue: 'bg-gradient-to-r from-blue-600 to-cyan-500',
    cyan: 'bg-gradient-to-r from-cyan-500 to-teal-400',
    green: 'bg-gradient-to-r from-emerald-500 to-green-400',
    amber: 'bg-gradient-to-r from-amber-500 to-yellow-400',
    red: 'bg-gradient-to-r from-rose-600 to-red-500',
    purple: 'bg-gradient-to-r from-purple-600 to-indigo-500',
  };

  return (
    <div className={`w-full flex flex-col gap-1 ${className}`}>
      <div className={`w-full bg-[#08182A] border border-[#1A2D4A] rounded-full overflow-hidden ${height}`}>
        <div
          className={`${height} rounded-full transition-all duration-500 ease-out ${colorStyles[color]}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-[11px] text-right font-mono text-slate-400">
          {clamped.toFixed(1)}%
        </span>
      )}
    </div>
  );
};

export default ProgressBar;
