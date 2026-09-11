import React, { useState, useEffect } from 'react';

interface BiologicalAgePortalProps {
  targetAge?: number;           // default 98
  chronologicalAge?: number;    // default 94
  label?: string;               // default "Fleet Operational\nHealth Index"
  differenceText?: string;      // default "+4.2% Above Baseline"
  subIndicatorText?: string;    // default "ALL 5 AMRS OPTIMAL • ZERO COLLISIONS"
  minLabel?: string;            // default "70% CRIT"
  targetLabel?: string;         // default "98% NOMINAL"
  maxLabel?: string;            // default "100% PEAK"
  onPortalClick?: () => void;
  className?: string;
}

export const BiologicalAgePortal: React.FC<BiologicalAgePortalProps> = ({
  targetAge = 98,
  chronologicalAge = 94,
  label = 'Fleet Operational\nHealth Index',
  differenceText = '+4.2% Peak Efficiency',
  subIndicatorText = 'ALL 5 AMRS OPTIMAL • ZERO COLLISIONS',
  minLabel = '70% CRIT',
  targetLabel = '98% NOMINAL',
  maxLabel = '100% PEAK',
  onPortalClick,
  className = '',
}) => {
  const [displayAge, setDisplayAge] = useState<number>(0);

  // Animate numeric count-up with easing on load and value change
  useEffect(() => {
    let startTimestamp: number | null = null;
    const duration = 1400; // 1.4s smooth easing
    const startVal = displayAge;
    const endVal = targetAge;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // Cubic ease-out
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startVal + (endVal - startVal) * easeOut);
      setDisplayAge(current);

      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };

    const animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, [targetAge]);

  // Compute difference pill text if not explicitly provided
  const diffVal = targetAge - chronologicalAge;
  const computedDiff = differenceText || (diffVal >= 0 ? `+${diffVal}% Above Baseline` : `${diffVal}% Degraded`);

  return (
    <div className={`flex flex-col items-center select-none ${className}`}>
      {/* 1. Large Circular Dark Portal / Halo */}
      <div 
        onClick={onPortalClick}
        className={`relative w-64 h-64 sm:w-72 sm:h-72 rounded-full bg-[#06080E]/95 backdrop-blur-md shadow-2xl flex flex-col items-center justify-center cursor-pointer group transition-transform duration-300 hover:scale-[1.02] ${onPortalClick ? 'cursor-pointer' : ''}`}
      >
        {/* Outer Irregular Glowing Particle Ring & Sparks */}
        <div className="absolute inset-0 rounded-full border border-amber-500/35 portal-ring shadow-[0_0_50px_rgba(245,158,11,0.22)]" />
        
        {/* Secondary Delicate Spinning Dashed Ring */}
        <div 
          className="absolute -inset-2 rounded-full border border-dashed border-amber-400/20 animate-spin"
          style={{ animationDuration: '45s' }}
        />

        {/* Ambient Warm Golden Pulse Glow */}
        <div className="absolute inset-4 rounded-full bg-gradient-to-b from-amber-500/10 via-transparent to-transparent blur-xl pointer-events-none" />

        {/* Core Dark Portal Void */}
        <div className="relative z-10 flex flex-col items-center text-center px-4">
          {/* Two-Line Subtitle Label */}
          <span className="text-[10px] sm:text-[11px] font-medium text-slate-300/90 uppercase tracking-widest leading-relaxed whitespace-pre-line mb-1 opacity-90">
            {label}
          </span>

          {/* Huge Primary Numeric Metric */}
          <div className="flex items-baseline justify-center">
            <span className="text-7xl sm:text-8xl md:text-[92px] font-bold text-white tracking-tighter font-sans leading-none drop-shadow-[0_4px_16px_rgba(0,0,0,0.8)]">
              {displayAge}
            </span>
            <span className="text-2xl sm:text-3xl font-semibold text-amber-400 font-sans ml-1">
              %
            </span>
          </div>

          {/* Secondary Subsystem Indicator */}
          <span className="text-[9px] sm:text-[10px] text-amber-400/80 font-mono tracking-wider mt-1 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-organic-pulse" />
            {subIndicatorText}
          </span>
        </div>
      </div>

      {/* 2. Efficiency Difference Indicator Capsule */}
      <div className="mt-5 relative z-10">
        <div className="px-4 py-1.5 rounded-full bg-slate-900/80 backdrop-blur-md border border-white/15 text-slate-200 text-xs font-semibold shadow-lg shadow-black/40 flex items-center gap-2 transition-all hover:border-amber-400/40">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          <span>{computedDiff}</span>
        </div>
      </div>

      {/* 3. Bottom Timeline / Scale with Low-Opacity Vertical Ticks */}
      <div className="w-72 sm:w-84 mt-3 flex flex-col items-center">
        {/* Horizontal thin line */}
        <div className="w-full h-px bg-gradient-to-r from-transparent via-slate-600/60 to-transparent relative">
          {/* Vertical tick marks */}
          <div className="absolute inset-0 flex justify-between items-center -top-1">
            {Array.from({ length: 17 }).map((_, idx) => (
              <span 
                key={idx} 
                className={`w-px bg-slate-500/50 ${idx % 4 === 0 ? 'h-2.5 bg-amber-400/70' : 'h-1.5'}`} 
              />
            ))}
          </div>
        </div>
        
        {/* Scale Range Annotations */}
        <div className="w-full flex justify-between text-[9px] text-slate-500 font-mono mt-1.5 px-2">
          <span>{minLabel}</span>
          <span className="text-amber-400/90 font-semibold">{targetLabel}</span>
          <span>{maxLabel}</span>
        </div>
      </div>
    </div>
  );
};

export default BiologicalAgePortal;
