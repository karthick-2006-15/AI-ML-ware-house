import React from 'react';
import { ArrowRight } from 'lucide-react';

interface VisionPerceptionCardProps {
  onClick: () => void;
  className?: string;
  detectedCount?: number;
  latencyMs?: number;
}

export const VisionPerceptionCard: React.FC<VisionPerceptionCardProps> = ({
  onClick,
  className = '',
  detectedCount = 102,
  latencyMs = 9.9,
}) => {
  return (
    <div
      onClick={onClick}
      className={`glass-card-warm rounded-2xl p-4 sm:p-5 cursor-pointer group select-none relative overflow-hidden transition-all duration-300 hover:border-amber-500/50 hover:shadow-lg hover:shadow-amber-500/10 ${className}`}
    >
      <div className="flex items-center justify-between gap-4">
        {/* Left: Title, Live Indicator & Detections */}
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-semibold">
              Live Optical Node // CAM-01
            </span>
          </div>
          <span className="text-sm sm:text-base font-bold text-white tracking-tight leading-snug">
            Vision YOLO<br />Perception
          </span>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs font-semibold text-white tracking-tight flex items-center gap-1 group-hover:text-amber-300 transition-colors">
              {detectedCount} Entities
              <ArrowRight className="w-3.5 h-3.5 transition-transform duration-250 group-hover:translate-x-1 text-amber-400" />
            </span>
            <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
              (~{latencyMs}ms)
            </span>
          </div>
        </div>

        {/* Right: Mini Live Camera Viewport with HUD Bounding Boxes */}
        <div className="relative w-24 h-16 sm:w-28 sm:h-18 rounded-xl overflow-hidden border border-amber-500/30 bg-slate-950 flex-shrink-0 shadow-md group-hover:border-amber-400/60 transition-colors">
          <img
            src="/samples/forklift_sample.jpg"
            alt="Optical Node CAM-01"
            className="w-full h-full object-cover select-none brightness-90 group-hover:scale-105 transition-transform duration-500"
          />

          {/* Glowing Animated Scanline */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-amber-400/20 to-transparent animate-pulse pointer-events-none" />

          {/* Micro HUD Bounding Box Simulation */}
          <div className="absolute inset-1.5 border border-amber-400/70 rounded pointer-events-none">
            {/* Top-left chip */}
            <div className="absolute top-0 left-0 bg-slate-950/90 px-1 py-0.2 text-[8px] font-mono font-bold text-amber-400 rounded-br">
              FORKLIFT 94%
            </div>
            {/* Corner crosshair */}
            <div className="absolute bottom-0.5 right-0.5 w-2 h-2 border-b border-r border-amber-400" />
          </div>

          {/* Blinking REC indicator */}
          <div className="absolute top-1 right-1 flex items-center gap-1 px-1 py-0.2 rounded bg-black/70 backdrop-blur-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
            <span className="text-[7px] font-mono text-white font-bold">REC</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VisionPerceptionCard;
