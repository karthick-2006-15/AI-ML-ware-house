import React from 'react';

interface LogoProps {
  className?: string;
  subtitle?: string;
}

export const Logo: React.FC<LogoProps> = ({ 
  className = '', 
  subtitle = 'warehouse intelligence' 
}) => {
  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Biological Molecular Symbol */}
      <div className="relative w-7 h-7 flex items-center justify-center">
        {/* Outer glowing biological ring */}
        <div className="absolute inset-0 rounded-full border border-amber-500/40 animate-organic-pulse" />
        <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-amber-600 via-orange-500 to-amber-300 flex items-center justify-center shadow-[0_0_12px_rgba(245,158,11,0.5)]">
          {/* Core biological node */}
          <div className="w-2 h-2 rounded-full bg-white shadow-[0_0_6px_#FFFFFF]" />
        </div>
        {/* Subtle satellite spark */}
        <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-amber-400" />
      </div>

      {/* Brand Wordmark */}
      <div className="flex flex-col">
        <div className="flex items-center gap-1.5 leading-none">
          <span className="text-white text-base sm:text-lg font-bold tracking-tight lowercase font-sans">
            artery
          </span>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 font-mono uppercase tracking-wider font-semibold">
            AI
          </span>
        </div>
        {subtitle && (
          <span className="text-[9px] text-slate-400 font-mono tracking-wider uppercase mt-0.5 opacity-80">
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
};

export default Logo;
