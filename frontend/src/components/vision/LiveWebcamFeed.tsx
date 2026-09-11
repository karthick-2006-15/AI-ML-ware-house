import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Camera,
  Video,
  Play,
  Pause,
  Eye,
  EyeOff,
  Crosshair,
  Monitor,
  AlertCircle,
  Radio,
  Sparkles,
} from 'lucide-react';
import Card from '../common/Card';
import Badge from '../common/Badge';
import type { VisionDetection, VisionResult } from '../../types';
import { apiService } from '../../services/api';

interface LiveWebcamFeedProps {
  onCaptureSnapshot?: (file: File, result?: VisionResult) => void;
  yoloReady?: boolean;
}

interface CCTVChannel {
  id: string;
  name: string;
  location: string;
  sampleFile: string;
}

const CCTV_CHANNELS: CCTVChannel[] = [
  { id: 'CAM-01', name: 'Inbound Staging Dock', location: 'Bay 01-A', sampleFile: 'forklift_sample.jpg' },
  { id: 'CAM-02', name: 'High-Bay Pallet Rack Aisle', location: 'Aisle 04', sampleFile: 'pallet_sample.jpg' },
  { id: 'CAM-03', name: 'Carton Conveyor Sorter', location: 'Pack Station 3', sampleFile: 'box_sample.jpg' },
  { id: 'CAM-04', name: 'Autonomous Mobile Robot Transit', location: 'Zone B South', sampleFile: 'robot_sample.jpg' },
  { id: 'CAM-05', name: 'Manual Picking & Packing Zone', location: 'Pick Cell 07', sampleFile: 'person_sample.jpg' },
  { id: 'CAM-06', name: 'Robotic Arm Palletizer', location: 'Cell 12-End', sampleFile: 'robotic_arm_sample.jpg' },
];

export const LiveWebcamFeed: React.FC<LiveWebcamFeedProps> = ({
  onCaptureSnapshot,
  yoloReady = true,
}) => {
  const [sourceMode, setSourceMode] = useState<'webcam' | 'cctv'>('cctv');
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [selectedChannel, setSelectedChannel] = useState<CCTVChannel>(CCTV_CHANNELS[0]);
  const [autoCycle, setAutoCycle] = useState<boolean>(false);

  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [cameraError, setCameraError] = useState<string | null>(null);

  const [confThreshold, setConfThreshold] = useState<number>(0.30);
  const [targetFps, setTargetFps] = useState<number>(3);
  const [showOverlays, setShowOverlays] = useState<boolean>(true);
  const [showHud, setShowHud] = useState<boolean>(true);

  const [latencyMs, setLatencyMs] = useState<number>(0);
  const [actualFps, setActualFps] = useState<number>(0);
  const [detections, setDetections] = useState<VisionDetection[]>([]);
  const [lastSummary, setLastSummary] = useState<string>('');
  const [snapshotToast, setSnapshotToast] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const cctvImageRef = useRef<HTMLImageElement | null>(null);
  const processingRef = useRef<boolean>(false);
  const frameCountRef = useRef<number>(0);
  const fpsTimerRef = useRef<number>(Date.now());
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const getDevices = async () => {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoInputs = devices.filter(d => d.kind === 'videoinput');
          setVideoDevices(videoInputs);
          if (videoInputs.length > 0 && !selectedDeviceId) {
            setSelectedDeviceId(videoInputs[0].deviceId);
          }
        }
      } catch (err) {
        console.warn('Could not enumerate video devices:', err);
      }
    };
    getDevices();
  }, [selectedDeviceId]);

  const startWebcam = useCallback(async (deviceId?: string) => {
    setCameraError(null);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      const constraints: MediaStreamConstraints = {
        video: deviceId ? { deviceId: { exact: deviceId } } : { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err: any) {
      console.warn('Webcam access failed:', err);
      setCameraError(err.message || 'Camera permission denied or camera not found.');
      setSourceMode('cctv');
    }
  }, []);

  const stopWebcam = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  useEffect(() => {
    if (sourceMode === 'webcam' && isRunning) {
      startWebcam(selectedDeviceId);
    } else {
      stopWebcam();
    }
    return () => {
      stopWebcam();
    };
  }, [sourceMode, isRunning, selectedDeviceId, startWebcam, stopWebcam]);

  useEffect(() => {
    if (sourceMode !== 'cctv' || !autoCycle || !isRunning) return;
    const interval = setInterval(() => {
      setSelectedChannel(prev => {
        const idx = CCTV_CHANNELS.findIndex(c => c.id === prev.id);
        const nextIdx = (idx + 1) % CCTV_CHANNELS.length;
        return CCTV_CHANNELS[nextIdx];
      });
    }, 6000);
    return () => clearInterval(interval);
  }, [sourceMode, autoCycle, isRunning]);

  const drawHudAndBoxes = useCallback((
    canvas: HTMLCanvasElement,
    displayWidth: number,
    displayHeight: number,
    sourceWidth: number,
    sourceHeight: number,
    currentDetections: VisionDetection[],
    currentLatency: number
  ) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
      canvas.width = displayWidth;
      canvas.height = displayHeight;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const scaleX = displayWidth / sourceWidth;
    const scaleY = displayHeight / sourceHeight;

    if (showOverlays && currentDetections.length > 0) {
      currentDetections.forEach((det) => {
        if (!det.bbox || det.bbox.length < 4) return;
        const [x1, y1, x2, y2] = det.bbox;
        const bx = x1 * scaleX;
        const by = y1 * scaleY;
        const bw = (x2 - x1) * scaleX;
        const bh = (y2 - y1) * scaleY;

        const isWarehouse = det.source === 'warehouse' || ['box', 'pallet', 'forklift', 'robot', 'robotic_arm'].includes(det.class.toLowerCase());
        const primaryColor = isWarehouse ? '#f59e0b' : '#38bdf8';
        const bgColor = isWarehouse ? 'rgba(245, 158, 11, 0.12)' : 'rgba(56, 189, 248, 0.12)';

        ctx.fillStyle = bgColor;
        ctx.fillRect(bx, by, bw, bh);

        ctx.strokeStyle = primaryColor;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(bx, by, bw, bh);

        const bracketLen = Math.min(16, bw / 3, bh / 3);
        ctx.lineWidth = 3;
        ctx.strokeStyle = primaryColor;

        ctx.beginPath();
        ctx.moveTo(bx, by + bracketLen); ctx.lineTo(bx, by); ctx.lineTo(bx + bracketLen, by);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(bx + bw - bracketLen, by); ctx.lineTo(bx + bw, by); ctx.lineTo(bx + bw, by + bracketLen);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(bx, by + bh - bracketLen); ctx.lineTo(bx, by + bh); ctx.lineTo(bx + bracketLen, by + bh);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(bx + bw - bracketLen, by + bh); ctx.lineTo(bx + bw, by + bh); ctx.lineTo(bx + bw, by + bh - bracketLen);
        ctx.stroke();

        const cx = bx + bw / 2;
        const cy = by + bh / 2;
        ctx.lineWidth = 1;
        ctx.strokeStyle = `${primaryColor}aa`;
        ctx.beginPath();
        ctx.moveTo(cx - 5, cy); ctx.lineTo(cx + 5, cy);
        ctx.moveTo(cx, cy - 5); ctx.lineTo(cx, cy + 5);
        ctx.stroke();

        const labelText = `${det.class.toUpperCase()} ${(det.confidence * 100).toFixed(0)}%`;
        ctx.font = 'bold 11px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
        const textMetrics = ctx.measureText(labelText);
        const tagHeight = 18;
        const tagWidth = textMetrics.width + 12;
        const tagY = Math.max(0, by - tagHeight - 2);

        ctx.fillStyle = '#0f172a';
        ctx.fillRect(bx, tagY, tagWidth, tagHeight);
        ctx.strokeStyle = primaryColor;
        ctx.lineWidth = 1;
        ctx.strokeRect(bx, tagY, tagWidth, tagHeight);

        ctx.fillStyle = primaryColor;
        ctx.beginPath();
        ctx.arc(bx + 6, tagY + tagHeight / 2, 2.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.fillText(labelText, bx + 12, tagY + 13);
      });
    }

    if (showHud) {
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
      ctx.lineWidth = 2;
      const cornerSize = 24;

      ctx.beginPath();
      ctx.moveTo(12, 12 + cornerSize); ctx.lineTo(12, 12); ctx.lineTo(12 + cornerSize, 12); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(displayWidth - 12 - cornerSize, 12); ctx.lineTo(displayWidth - 12, 12); ctx.lineTo(displayWidth - 12, 12 + cornerSize); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(12, displayHeight - 12 - cornerSize); ctx.lineTo(12, displayHeight - 12); ctx.lineTo(12 + cornerSize, displayHeight - 12); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(displayWidth - 12 - cornerSize, displayHeight - 12); ctx.lineTo(displayWidth - 12, displayHeight - 12); ctx.lineTo(displayWidth - 12, displayHeight - 12 - cornerSize); ctx.stroke();

      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.2)';
      ctx.lineWidth = 1;
      ctx.fillRect(20, 18, 380, 26);
      ctx.strokeRect(20, 18, 380, 26);

      const isBlink = Math.floor(Date.now() / 600) % 2 === 0;
      ctx.fillStyle = isBlink ? '#ef4444' : 'rgba(239, 68, 68, 0.3)';
      ctx.beginPath();
      ctx.arc(32, 31, 4.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = 'bold 11px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
      ctx.fillStyle = '#ffffff';
      const chText = sourceMode === 'webcam' ? 'LIVE-CAM // 01 PRIMARY' : `${selectedChannel.id} // ${selectedChannel.location}`;
      ctx.fillText(chText, 44, 35);

      const now = new Date();
      const timeStr = now.toISOString().replace('T', ' ').substring(0, 19);
      ctx.font = '10px ui-monospace, monospace';
      ctx.fillStyle = 'rgba(148, 163, 184, 0.9)';
      ctx.fillText(timeStr, 250, 35);

      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(20, displayHeight - 44, 440, 26);
      ctx.strokeRect(20, displayHeight - 44, 440, 26);

      ctx.fillStyle = '#38bdf8';
      ctx.font = '10px ui-monospace, monospace';
      ctx.fillText(`AI INFER: ${currentLatency}ms`, 30, displayHeight - 27);

      ctx.fillStyle = '#f59e0b';
      ctx.fillText(`DETECTIONS: ${currentDetections.length}`, 150, displayHeight - 27);

      ctx.fillStyle = '#10b981';
      ctx.fillText(`MODE: ${sourceMode.toUpperCase()}`, 270, displayHeight - 27);

      ctx.fillStyle = '#94a3b8';
      ctx.fillText(`CONF: ≥${Math.round(confThreshold * 100)}%`, 380, displayHeight - 27);
    }
  }, [confThreshold, selectedChannel, showHud, showOverlays, sourceMode]);

  useEffect(() => {
    if (!isRunning || !yoloReady) return;

    let isSubscribed = true;
    const intervalMs = Math.max(100, Math.floor(1000 / targetFps));

    const runInferenceIteration = async () => {
      if (processingRef.current || !isSubscribed) return;

      let sourceCanvas: HTMLCanvasElement | null = null;
      let srcW = 640;
      let srcH = 480;

      if (sourceMode === 'webcam') {
        const video = videoRef.current;
        if (!video || video.readyState < 2 || video.videoWidth === 0) return;
        srcW = video.videoWidth;
        srcH = video.videoHeight;

        sourceCanvas = document.createElement('canvas');
        const maxDim = 640;
        const scale = Math.min(1, maxDim / Math.max(srcW, srcH));
        sourceCanvas.width = Math.round(srcW * scale);
        sourceCanvas.height = Math.round(srcH * scale);
        const ctx = sourceCanvas.getContext('2d');
        if (ctx) ctx.drawImage(video, 0, 0, sourceCanvas.width, sourceCanvas.height);
      } else {
        const img = cctvImageRef.current;
        if (!img || !img.complete || img.naturalWidth === 0) return;
        srcW = img.naturalWidth;
        srcH = img.naturalHeight;

        sourceCanvas = document.createElement('canvas');
        const maxDim = 640;
        const scale = Math.min(1, maxDim / Math.max(srcW, srcH));
        sourceCanvas.width = Math.round(srcW * scale);
        sourceCanvas.height = Math.round(srcH * scale);
        const ctx = sourceCanvas.getContext('2d');
        if (ctx) ctx.drawImage(img, 0, 0, sourceCanvas.width, sourceCanvas.height);
      }

      if (!sourceCanvas) return;

      processingRef.current = true;
      const startTime = performance.now();

      try {
        const base64Data = sourceCanvas.toDataURL('image/jpeg', 0.6);
        const data: VisionResult = await apiService.detectFrame(base64Data, confThreshold);

        if (isSubscribed) {
          const latency = Math.round(performance.now() - startTime);
          setLatencyMs(latency);
          setDetections(data.detections || []);
          if (data.image_summary) setLastSummary(data.image_summary);

          frameCountRef.current += 1;
          const now = Date.now();
          if (now - fpsTimerRef.current >= 1000) {
            setActualFps(Math.round((frameCountRef.current * 1000) / (now - fpsTimerRef.current)));
            frameCountRef.current = 0;
            fpsTimerRef.current = now;
          }

          const overlayCanvas = overlayCanvasRef.current;
          if (overlayCanvas) {
            const displayW = overlayCanvas.clientWidth;
            const displayH = overlayCanvas.clientHeight;
            drawHudAndBoxes(
              overlayCanvas,
              displayW,
              displayH,
              sourceCanvas.width,
              sourceCanvas.height,
              data.detections || [],
              latency
            );
          }
        }
      } catch (e) {
        console.warn('Live detection error:', e);
      } finally {
        processingRef.current = false;
      }
    };

    const intervalId = setInterval(runInferenceIteration, intervalMs);
    return () => {
      isSubscribed = false;
      clearInterval(intervalId);
    };
  }, [isRunning, yoloReady, targetFps, sourceMode, confThreshold, drawHudAndBoxes, selectedChannel]);

  const handleCapture = async () => {
    let canvas: HTMLCanvasElement | null = null;
    let filename = `cctv_snapshot_${Date.now()}.jpg`;

    if (sourceMode === 'webcam' && videoRef.current) {
      const video = videoRef.current;
      if (video.videoWidth > 0) {
        canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.drawImage(video, 0, 0);
        filename = `webcam_snapshot_${Date.now()}.jpg`;
      }
    } else if (cctvImageRef.current) {
      const img = cctvImageRef.current;
      if (img.naturalWidth > 0) {
        canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.drawImage(img, 0, 0);
        filename = `${selectedChannel.id}_snapshot_${Date.now()}.jpg`;
      }
    }

    if (!canvas) return;

    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], filename, { type: 'image/jpeg' });
      setSnapshotToast(`Snapshot captured: ${filename}`);
      setTimeout(() => setSnapshotToast(null), 3000);

      if (onCaptureSnapshot) {
        onCaptureSnapshot(file, {
          object_count: detections.length,
          detections: detections,
          annotated_image: canvas ? canvas.toDataURL('image/jpeg', 0.85) : '',
          image_summary: lastSummary,
          inference_time_ms: latencyMs,
        });
      }
    }, 'image/jpeg', 0.9);
  };

  const classBreakdown = detections.reduce((acc, det) => {
    const cls = det.class.toLowerCase();
    acc[cls] = (acc[cls] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* 1. Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-slate-900/80 border border-slate-800/80 rounded-xl backdrop-blur-md">
        <div className="flex items-center gap-1.5 p-1 bg-slate-950/80 rounded-lg border border-slate-800">
          <button
            type="button"
            onClick={() => setSourceMode('cctv')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              sourceMode === 'cctv'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>Warehouse CCTV Stream</span>
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          </button>

          <button
            type="button"
            onClick={() => setSourceMode('webcam')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              sourceMode === 'webcam'
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            <span>Physical Web Camera</span>
            {videoDevices.length > 0 && (
              <span className="text-[10px] px-1 rounded bg-blue-500/30 text-blue-200 font-mono">
                {videoDevices.length}
              </span>
            )}
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setIsRunning(!isRunning)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              isRunning
                ? 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700'
                : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30'
            }`}
          >
            {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isRunning ? 'Pause Detection' : 'Resume'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowOverlays(!showOverlays)}
            title="Toggle Bounding Boxes"
            className={`p-1.5 rounded-lg border text-xs transition-colors ${
              showOverlays
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                : 'bg-slate-800/80 border-slate-700 text-slate-400'
            }`}
          >
            {showOverlays ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={() => setShowHud(!showHud)}
            title="Toggle OSD Telemetry HUD"
            className={`p-1.5 rounded-lg border text-xs transition-colors ${
              showHud
                ? 'bg-sky-500/10 border-sky-500/30 text-sky-300'
                : 'bg-slate-800/80 border-slate-700 text-slate-400'
            }`}
          >
            <Radio className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleCapture}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors shadow-sm cursor-pointer"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Capture Snapshot</span>
          </button>
        </div>
      </div>

      {snapshotToast && (
        <div className="p-2.5 bg-amber-500/20 border border-amber-500/40 text-amber-300 rounded-lg text-xs flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>{snapshotToast}</span>
          </div>
          <span className="text-[10px] font-mono text-amber-400/80">Transferred to Inspection Mode</span>
        </div>
      )}

      {cameraError && sourceMode === 'webcam' && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>{cameraError} Switched to Warehouse CCTV Network stream.</span>
          </div>
          <button
            type="button"
            onClick={() => startWebcam(selectedDeviceId)}
            className="px-2.5 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-white font-medium text-[11px]"
          >
            Retry Camera
          </button>
        </div>
      )}

      {/* 2. Main Live Perception Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT: Video Viewport */}
        <div className="lg:col-span-8 space-y-3">
          <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 aspect-video flex items-center justify-center shadow-2xl group">
            {sourceMode === 'webcam' && (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            )}

            {sourceMode === 'cctv' && (
              <img
                ref={cctvImageRef}
                src={`/samples/${selectedChannel.sampleFile}`}
                alt={selectedChannel.name}
                className="w-full h-full object-cover select-none"
              />
            )}

            <canvas
              ref={overlayCanvasRef}
              className="absolute inset-0 w-full h-full pointer-events-none z-20"
            />

            {!isRunning && (
              <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-30">
                <div className="px-4 py-2 rounded-xl bg-slate-900/90 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 shadow-lg">
                  <Pause className="w-4 h-4 text-amber-400" />
                  <span>PERCEPTION STREAM PAUSED</span>
                </div>
              </div>
            )}
          </div>

          {/* CCTV Channel Selector Bar */}
          {sourceMode === 'cctv' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                <span className="font-semibold text-slate-300 uppercase tracking-wider text-[11px]">
                  Warehouse Optical Nodes:
                </span>
                <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-amber-400 hover:text-amber-300">
                  <input
                    type="checkbox"
                    checked={autoCycle}
                    onChange={(e) => setAutoCycle(e.target.checked)}
                    className="rounded border-slate-700 text-amber-500 focus:ring-amber-500 bg-slate-900"
                  />
                  <span>Auto-Cycle Feeds (6s)</span>
                </label>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                {CCTV_CHANNELS.map((ch) => (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => setSelectedChannel(ch)}
                    className={`p-2 rounded-lg border text-left transition-all ${
                      selectedChannel.id === ch.id
                        ? 'bg-amber-500/15 border-amber-500/50 text-white shadow-sm'
                        : 'bg-slate-900/50 border-slate-800/80 hover:border-slate-700 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-mono text-[10px] font-bold text-amber-400">{ch.id}</span>
                      {selectedChannel.id === ch.id && (
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                      )}
                    </div>
                    <p className="text-[11px] font-medium truncate">{ch.name}</p>
                    <span className="text-[9px] text-slate-400 block truncate">{ch.location}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Webcam Device Selector */}
          {sourceMode === 'webcam' && videoDevices.length > 1 && (
            <div className="flex items-center gap-2 p-2 bg-slate-900/50 border border-slate-800 rounded-lg text-xs">
              <span className="text-slate-400 whitespace-nowrap">Input Device:</span>
              <select
                value={selectedDeviceId}
                onChange={(e) => {
                  setSelectedDeviceId(e.target.value);
                  startWebcam(e.target.value);
                }}
                className="bg-slate-950 border border-slate-700 text-white rounded px-2 py-1 text-xs w-full focus:outline-none focus:border-amber-500"
              >
                {videoDevices.map((d, i) => (
                  <option key={d.deviceId || i} value={d.deviceId}>
                    {d.label || `Camera ${i + 1}`}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* RIGHT: Live Telemetry & Model Diagnostics */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="p-4 border-slate-800/80 space-y-3.5">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
                  Real-Time Perception HUD
                </h3>
              </div>
              <Badge variant={isRunning ? 'success' : 'neutral'} size="sm" dot>
                {isRunning ? 'Streaming' : 'Idle'}
              </Badge>
            </div>

            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800/80">
                <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                  Objects Detected
                </span>
                <span className="text-2xl font-bold text-white font-mono">
                  {detections.length}
                </span>
                <span className="text-[10px] text-amber-400">YOLOv8 Active</span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800/80">
                <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                  Inference Latency
                </span>
                <span className="text-2xl font-bold text-sky-400 font-mono">
                  {latencyMs}
                  <span className="text-xs text-slate-400 ml-0.5">ms</span>
                </span>
                <span className="text-[10px] text-emerald-400">{actualFps} FPS loop</span>
              </div>
            </div>

            {/* Detected Classes Breakdown */}
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                Class Breakdown:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(classBreakdown).map(([cls, count]) => (
                  <span
                    key={cls}
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-medium capitalize"
                  >
                    <span>{cls}</span>
                    <span className="font-mono text-[10px] bg-amber-500/30 px-1 rounded text-amber-200">
                      {count}
                    </span>
                  </span>
                ))}
                {Object.keys(classBreakdown).length === 0 && (
                  <span className="text-xs text-slate-400 italic">No targets in frame</span>
                )}
              </div>
            </div>

            {/* Real-time Detections List */}
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                Target Entities:
              </span>
              <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-1">
                {detections.map((det, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded-lg bg-slate-900/50 border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <Crosshair className="w-3 h-3 text-amber-400 flex-shrink-0" />
                      <span className="font-medium text-slate-200 capitalize truncate">
                        {det.class}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <div className="w-12 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-amber-400"
                          style={{ width: `${Math.round(det.confidence * 100)}%` }}
                        />
                      </div>
                      <span className="font-mono text-[11px] text-amber-300">
                        {Math.round(det.confidence * 100)}%
                      </span>
                    </div>
                  </div>
                ))}
                {detections.length === 0 && (
                  <div className="p-3 text-center border border-dashed border-slate-800 rounded-lg text-xs text-slate-400">
                    Scanning visual field...
                  </div>
                )}
              </div>
            </div>

            {/* Stream Settings */}
            <div className="pt-2 border-t border-slate-800/80 space-y-3">
              <div>
                <div className="flex justify-between items-center text-xs mb-1">
                  <span className="text-slate-400">Confidence Threshold:</span>
                  <span className="font-mono text-amber-400 font-semibold">
                    {Math.round(confThreshold * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.10"
                  max="0.85"
                  step="0.05"
                  value={confThreshold}
                  onChange={(e) => setConfThreshold(parseFloat(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between items-center text-xs mb-1">
                  <span className="text-slate-400">Sampling Rate:</span>
                  <span className="font-mono text-slate-300 font-semibold">{targetFps} FPS</span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {[1, 2, 5, 8].map((fps) => (
                    <button
                      key={fps}
                      type="button"
                      onClick={() => setTargetFps(fps)}
                      className={`py-1 rounded text-xs font-mono font-medium transition-colors ${
                        targetFps === fps
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                      }`}
                    >
                      {fps} FPS
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default LiveWebcamFeed;
