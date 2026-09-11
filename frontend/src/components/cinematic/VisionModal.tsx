import React, { useEffect, useState, useRef, useCallback } from 'react';
import { 
  X, 
  ChevronLeft, 
  Video, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  Radio 
} from 'lucide-react';
import Badge from '../common/Badge';
import type { VisionDetection, VisionResult } from '../../types';

interface VisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateVision?: () => void;
}

interface CCTVChannel {
  id: string;
  name: string;
  location: string;
  sampleFile: string;
}

const MODAL_CCTV_CHANNELS: CCTVChannel[] = [
  { id: 'CAM-01', name: 'Inbound Staging Dock', location: 'Bay 01-A', sampleFile: 'forklift_sample.jpg' },
  { id: 'CAM-02', name: 'High-Bay Pallet Rack', location: 'Aisle 04', sampleFile: 'pallet_sample.jpg' },
  { id: 'CAM-03', name: 'Carton Conveyor Sorter', location: 'Pack Station 3', sampleFile: 'box_sample.jpg' },
  { id: 'CAM-04', name: 'AMR Transit Line', location: 'Zone B South', sampleFile: 'robot_sample.jpg' },
  { id: 'CAM-05', name: 'Worker Pick & Pack', location: 'Cell 07', sampleFile: 'person_sample.jpg' },
  { id: 'CAM-06', name: 'Robotic Arm Cell', location: 'Cell 12-End', sampleFile: 'robotic_arm_sample.jpg' },
];

export const VisionModal: React.FC<VisionModalProps> = ({
  isOpen,
  onClose,
  onNavigateVision,
}) => {
  const [selectedChannel, setSelectedChannel] = useState<CCTVChannel>(MODAL_CCTV_CHANNELS[0]);
  const [sourceMode, setSourceMode] = useState<'cctv' | 'webcam'>('cctv');
  const [showOverlays, setShowOverlays] = useState(true);
  const [latencyMs, setLatencyMs] = useState(10);
  const [detections, setDetections] = useState<VisionDetection[]>([]);
  const [objectCount, setObjectCount] = useState(102);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const cctvImgRef = useRef<HTMLImageElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Escape key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Webcam stream start / stop
  const startWebcam = useCallback(async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (e) {
      console.warn('Webcam not available, fallback to CCTV:', e);
      setSourceMode('cctv');
    }
  }, []);

  const stopWebcam = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  useEffect(() => {
    if (isOpen && sourceMode === 'webcam') {
      startWebcam();
    } else {
      stopWebcam();
    }
    return () => stopWebcam();
  }, [isOpen, sourceMode, startWebcam, stopWebcam]);

  // Draw HUD & Bounding Boxes
  const renderCanvasOverlays = useCallback((
    canvas: HTMLCanvasElement,
    dets: VisionDetection[],
    srcW: number,
    srcH: number
  ) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const displayW = canvas.clientWidth;
    const displayH = canvas.clientHeight;
    if (canvas.width !== displayW || canvas.height !== displayH) {
      canvas.width = displayW;
      canvas.height = displayH;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!showOverlays) return;

    const scaleX = displayW / srcW;
    const scaleY = displayH / srcH;

    dets.forEach((d) => {
      if (!d.bbox) return;
      const [x1, y1, x2, y2] = d.bbox;
      const bx = x1 * scaleX;
      const by = y1 * scaleY;
      const bw = (x2 - x1) * scaleX;
      const bh = (y2 - y1) * scaleY;

      const isWh = ['box', 'pallet', 'forklift', 'robot', 'robotic_arm'].includes(d.class.toLowerCase());
      const strokeColor = isWh ? '#f59e0b' : '#38bdf8';

      // Fill
      ctx.fillStyle = isWh ? 'rgba(245, 158, 11, 0.12)' : 'rgba(56, 189, 248, 0.12)';
      ctx.fillRect(bx, by, bw, bh);

      // Border
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(bx, by, bw, bh);

      // Corner Brackets
      const len = Math.min(14, bw / 3, bh / 3);
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(bx, by + len); ctx.lineTo(bx, by); ctx.lineTo(bx + len, by);
      ctx.moveTo(bx + bw - len, by); ctx.lineTo(bx + bw, by); ctx.lineTo(bx + bw, by + len);
      ctx.moveTo(bx, by + bh - len); ctx.lineTo(bx, by + bh); ctx.lineTo(bx + len, by + bh);
      ctx.moveTo(bx + bw - len, by + bh); ctx.lineTo(bx + bw, by + bh); ctx.lineTo(bx + bw, by + bh - len);
      ctx.stroke();

      // Tag Label
      const tagText = `${d.class.toUpperCase()} ${(d.confidence * 100).toFixed(0)}%`;
      ctx.font = 'bold 10px ui-monospace, monospace';
      const m = ctx.measureText(tagText);
      const tagH = 16;
      const tagW = m.width + 10;
      const tagY = Math.max(0, by - tagH - 2);

      ctx.fillStyle = '#090e1a';
      ctx.fillRect(bx, tagY, tagW, tagH);
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 1;
      ctx.strokeRect(bx, tagY, tagW, tagH);

      ctx.fillStyle = strokeColor;
      ctx.beginPath();
      ctx.arc(bx + 5, tagY + tagH / 2, 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.fillText(tagText, bx + 10, tagY + 11.5);
    });
  }, [showOverlays]);

  // Periodic Inference loop
  useEffect(() => {
    if (!isOpen) return;

    let active = true;

    const runDetect = async () => {
      let sourceCanvas: HTMLCanvasElement | null = null;
      let srcW = 640;
      let srcH = 480;

      if (sourceMode === 'webcam') {
        const video = videoRef.current;
        if (!video || video.readyState < 2 || video.videoWidth === 0) return;
        srcW = video.videoWidth;
        srcH = video.videoHeight;
        sourceCanvas = document.createElement('canvas');
        const scale = Math.min(1, 640 / Math.max(srcW, srcH));
        sourceCanvas.width = Math.round(srcW * scale);
        sourceCanvas.height = Math.round(srcH * scale);
        const ctx = sourceCanvas.getContext('2d');
        if (ctx) ctx.drawImage(video, 0, 0, sourceCanvas.width, sourceCanvas.height);
      } else {
        const img = cctvImgRef.current;
        if (!img || !img.complete || img.naturalWidth === 0) return;
        srcW = img.naturalWidth;
        srcH = img.naturalHeight;
        sourceCanvas = document.createElement('canvas');
        const scale = Math.min(1, 640 / Math.max(srcW, srcH));
        sourceCanvas.width = Math.round(srcW * scale);
        sourceCanvas.height = Math.round(srcH * scale);
        const ctx = sourceCanvas.getContext('2d');
        if (ctx) ctx.drawImage(img, 0, 0, sourceCanvas.width, sourceCanvas.height);
      }

      if (!sourceCanvas) return;

      const t0 = performance.now();
      try {
        const b64 = sourceCanvas.toDataURL('image/jpeg', 0.6);
        const res = await fetch('/api/ml/detect_frame', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: b64, confidence: 0.30, render_annotated: false }),
        });
        if (res.ok && active) {
          const data: VisionResult = await res.json();
          const latency = Math.round(performance.now() - t0);
          setLatencyMs(latency);
          setDetections(data.detections || []);
          setObjectCount(data.object_count || (data.detections ? data.detections.length : 0));

          const overlay = overlayCanvasRef.current;
          if (overlay) {
            renderCanvasOverlays(overlay, data.detections || [], sourceCanvas.width, sourceCanvas.height);
          }
        }
      } catch (e) {
        console.warn('Dashboard vision modal error:', e);
      }
    };

    const interval = setInterval(runDetect, 500);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [isOpen, sourceMode, selectedChannel, renderCanvasOverlays]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5">
      {/* Dark Backdrop with Heavy Blur */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-2xl transition-opacity animate-in fade-in duration-200"
      />

      {/* Modal Container */}
      <div
        className="relative z-10 w-full max-w-4xl glass-card-warm rounded-[28px] p-5 sm:p-7 overflow-hidden animate-in zoom-in-95 duration-250 border border-amber-500/30 shadow-2xl select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Back"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                  Warehouse Optical Perception System
                </h2>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                YOLOv8s Perception Stream • {selectedChannel.id} ({selectedChannel.location})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="success" size="sm" dot>
              {latencyMs}ms Inference
            </Badge>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Channel & Camera Mode Toggle Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 my-3.5">
          <div className="flex items-center gap-1.5 p-1 bg-slate-950/80 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setSourceMode('cctv')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                sourceMode === 'cctv'
                  ? 'bg-amber-500 text-slate-950 shadow-sm shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>CCTV Optical Nodes</span>
            </button>
            <button
              type="button"
              onClick={() => setSourceMode('webcam')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                sourceMode === 'webcam'
                  ? 'bg-amber-500 text-slate-950 shadow-sm shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Video className="w-3.5 h-3.5" />
              <span>Live Web Camera</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowOverlays(!showOverlays)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                showOverlays
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                  : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}
            >
              {showOverlays ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span>HUD Overlays</span>
            </button>

            {onNavigateVision && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNavigateVision();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                <span>Full Vision Studio</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Video / CCTV Viewport with Bounding Box Overlay Canvas */}
        <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 aspect-video flex items-center justify-center shadow-xl">
          {sourceMode === 'webcam' ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          ) : (
            <img
              ref={cctvImgRef}
              src={`/samples/${selectedChannel.sampleFile}`}
              alt={selectedChannel.name}
              className="w-full h-full object-cover select-none"
            />
          )}

          <canvas
            ref={overlayCanvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none z-20"
          />

          {/* OSD Top Bar */}
          <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none z-30">
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-950/85 border border-slate-800 text-[10px] font-mono text-white">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              <span className="font-bold">LIVE FEED // {selectedChannel.id}</span>
              <span className="text-slate-400 hidden sm:inline">[{selectedChannel.location}]</span>
            </div>

            <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-950/85 border border-slate-800 text-[10px] font-mono text-amber-400">
              <span>{objectCount} OBJECTS DETECTED</span>
            </div>
          </div>
        </div>

        {/* CCTV Channel Selectors (Shown in CCTV mode) */}
        {sourceMode === 'cctv' && (
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-3.5">
            {MODAL_CCTV_CHANNELS.map((ch) => (
              <button
                key={ch.id}
                type="button"
                onClick={() => setSelectedChannel(ch)}
                className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                  selectedChannel.id === ch.id
                    ? 'bg-amber-500/15 border-amber-500/60 text-white shadow-sm'
                    : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className="font-mono text-[10px] font-bold text-amber-400 block">{ch.id}</span>
                <p className="text-[11px] font-medium truncate text-slate-200">{ch.name}</p>
              </button>
            ))}
          </div>
        )}

        {/* Active Detections Pill List */}
        {detections.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto py-1 mt-3 border-t border-slate-800/80 text-xs">
            <span className="text-[10px] text-slate-400 font-mono uppercase whitespace-nowrap">Detected Classes:</span>
            {Array.from(new Set(detections.map(d => d.class))).map(cls => (
              <span key={cls} className="px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[11px] font-medium capitalize whitespace-nowrap">
                {cls}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default VisionModal;
