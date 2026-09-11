import React, { useState } from 'react';
import { ArrowRight, Maximize2, Radio, Sparkles } from 'lucide-react';

interface DashboardVisionCardProps {
  onOpenModal: () => void;
  onNavigateVision: () => void;
  className?: string;
  detectedCount?: number;
  latencyMs?: number;
}

const DASH_CHANNELS = [
  { id: 'CAM-01', name: 'Inbound Dock', file: 'forklift_sample.jpg', tag: 'FORKLIFT 94%' },
  { id: 'CAM-02', name: 'High-Bay Rack', file: 'pallet_sample.jpg', tag: 'PALLET 91%' },
  { id: 'CAM-03', name: 'Conveyor Sorter', file: 'box_sample.jpg', tag: 'BOX 85%' },
  { id: 'CAM-04', name: 'AMR Transit', file: 'robot_sample.jpg', tag: 'ROBOT 88%' },
];

export const DashboardVisionCard: React.FC<DashboardVisionCardProps> = ({
  onOpenModal,
  onNavigateVision,
  className = '',
  detectedCount = 102,
  latencyMs = 9.9,
}) => {
  const [selectedChannel, setSelectedChannel] = useState(DASH_CHANNELS[0]);

  return (
    <div
      className={`glass-card-warm rounded-2xl p-3 sm:p-3.5 border border-amber-500/30 select-none relative overflow-hidden transition-all duration-300 shadow-xl ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-white/[0.08] mb-2">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-amber-400">
            Computer Vision Perception
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-semibold">
            {latencyMs}ms Inference
          </span>
          <button
            onClick={onOpenModal}
            className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Expand Full Perception Modal"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Video Viewport with HUD Bounding Boxes */}
      <div 
        onClick={onOpenModal}
        className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950 h-32 sm:h-36 w-full flex items-center justify-center cursor-pointer group shadow-lg"
      >
        <img
          src={`/samples/${selectedChannel.file}`}
          alt={selectedChannel.name}
          className="w-full h-full object-cover brightness-95 group-hover:scale-105 transition-transform duration-500 select-none"
        />

        {/* Scanning Laser Line Effect */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-amber-400/20 to-transparent animate-pulse pointer-events-none" />

        {/* Top-Left OSD Tag */}
        <div className="absolute top-1.5 left-1.5 flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-xs text-[10px] font-mono text-white border border-white/10">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
          <span>{selectedChannel.id} // {selectedChannel.name}</span>
        </div>

        {/* Top-Right Detections Count */}
        <div className="absolute top-1.5 right-1.5 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-xs text-[10px] font-mono text-amber-400 font-bold border border-white/10">
          {detectedCount} TARGETS
        </div>

        {/* HUD Targeting Box Overlays */}
        <div className="absolute inset-3 border border-amber-400/60 rounded pointer-events-none">
          <div className="absolute -top-2.5 left-2 bg-slate-950 px-1.5 py-0.2 text-[9px] font-mono font-bold text-amber-300 border border-amber-400/60 rounded">
            {selectedChannel.tag}
          </div>
          {/* Corner Brackets */}
          <div className="absolute top-0 left-0 w-2.5 h-2.5 border-t-2 border-l-2 border-amber-400" />
          <div className="absolute top-0 right-0 w-2.5 h-2.5 border-t-2 border-r-2 border-amber-400" />
          <div className="absolute bottom-0 left-0 w-2.5 h-2.5 border-b-2 border-l-2 border-amber-400" />
          <div className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b-2 border-r-2 border-amber-400" />
        </div>

        {/* Click to expand overlay on hover */}
        <div className="absolute inset-0 bg-black/40 backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <span className="px-2.5 py-1 rounded-lg bg-amber-500 text-slate-950 text-[11px] font-bold flex items-center gap-1.5 shadow-lg">
            <Radio className="w-3 h-3 animate-pulse" />
            <span>Open Live Optical Stream</span>
          </span>
        </div>
      </div>

      {/* Optical Channel Buttons */}
      <div className="grid grid-cols-4 gap-1.5 mt-2">
        {DASH_CHANNELS.map((ch) => (
          <button
            key={ch.id}
            type="button"
            onClick={() => setSelectedChannel(ch)}
            className={`py-1 px-1.5 rounded-lg border text-center text-[10px] font-mono font-medium transition-all cursor-pointer truncate ${
              selectedChannel.id === ch.id
                ? 'bg-amber-500/20 border-amber-500/60 text-amber-300 font-bold'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {ch.id}
          </button>
        ))}
      </div>

      {/* Footer Navigation Link */}
      <div className="flex items-center justify-between pt-2 mt-2 border-t border-white/[0.08]">
        <div className="flex items-center gap-1.5 text-[11px] text-slate-300 font-medium">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>YOLOv8s Dual-Layer Engine</span>
        </div>

        <button
          onClick={onNavigateVision}
          className="text-[11px] font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors cursor-pointer"
        >
          <span>Vision Studio</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

export default DashboardVisionCard;
