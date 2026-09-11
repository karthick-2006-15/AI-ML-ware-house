import React, { useState } from 'react';
import { 
  Scan, 
  UploadCloud, 
  AlertTriangle, 
  Image as ImageIcon,
  Sparkles,
  X,
  Target,
  Video
} from 'lucide-react';
import Card from '../common/Card';
import Badge from '../common/Badge';
import Button from '../common/Button';
import { LiveWebcamFeed } from './LiveWebcamFeed';
import type { SystemStatus, VisionResult } from '../../types';

interface VisionViewProps {
  systemStatus: SystemStatus;
  visionImage: File | null;
  visionPreview: string | null;
  visionResults: VisionResult | null;
  isVisionLoading: boolean;
  visionError: string | null;
  onImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSelectSample?: (file: File) => void;
  onVisionUpload: () => void;
  onClearImage: () => void;
}

export const VisionView: React.FC<VisionViewProps> = ({
  systemStatus,
  visionImage,
  visionPreview,
  visionResults,
  isVisionLoading,
  visionError,
  onImageChange,
  onSelectSample,
  onVisionUpload,
  onClearImage,
}) => {
  const [visionMode, setVisionMode] = useState<'live' | 'static'>('live');

  const handleLiveSnapshot = (file: File) => {
    if (onSelectSample) {
      onSelectSample(file);
    }
  };

  const handleSampleClick = async (filename: string) => {
    try {
      const res = await fetch(`/samples/${filename}`);
      const blob = await res.blob();
      const file = new File([blob], filename, { type: 'image/jpeg' });
      if (onSelectSample) {
        onSelectSample(file);
      }
    } catch (e) {
      console.error('Failed to load sample:', e);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-400 mb-1">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            Computer Vision Perception System
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Computer Vision
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Warehouse object detection powered by fine-tuned YOLOv8s.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant="success" size="md" dot>
            {systemStatus.yolo_ready ? 'YOLOv8 Runtime Active' : 'Neural Vision Active'}
          </Badge>
          <span className="text-xs text-slate-400 font-mono hidden sm:inline-block">
            Inference: ~9.9ms / frame
          </span>
        </div>
      </div>

      {/* 2. Model Cards & YOLO Performance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        {/* Model Card 1: Warehouse Detector */}
        <Card className="md:col-span-3 p-4 flex flex-col justify-between border-slate-800/80">
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] uppercase font-semibold text-amber-400">Fine-Tuned Model</span>
              <Badge variant="success" size="sm">Loaded</Badge>
            </div>
            <h3 className="text-sm font-semibold text-white">Warehouse Detector</h3>
            <span className="text-xs text-slate-400 font-mono">YOLOv8s Custom Weights</span>
            <div className="mt-3 flex flex-wrap gap-1">
              {['person', 'box', 'pallet', 'forklift', 'robot', 'robotic_arm'].map((cls) => (
                <span key={cls} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900/80 text-slate-300 border border-slate-800">
                  {cls}
                </span>
              ))}
            </div>
          </div>
          <span className="text-[10px] text-slate-400 mt-3 pt-2 border-t border-slate-800/80">
            Trained on 10,691 warehouse frames
          </span>
        </Card>

        {/* Model Card 2: General Detector */}
        <Card className="md:col-span-3 p-4 flex flex-col justify-between border-slate-800/80">
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] uppercase font-semibold text-slate-400">Backbone Model</span>
              <Badge variant="neutral" size="sm">Loaded</Badge>
            </div>
            <h3 className="text-sm font-semibold text-white">General Detector</h3>
            <span className="text-xs text-slate-400 font-mono">COCO Pretrained</span>
            <p className="text-xs text-slate-400 mt-2">
              80 general object classes for baseline contextual cross-referencing.
            </p>
          </div>
          <span className="text-[10px] text-slate-400 mt-3 pt-2 border-t border-slate-800/80">
            Zero-shot dual inference arbitration
          </span>
        </Card>

        {/* 4 YOLO Performance Metrics */}
        <div className="md:col-span-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="p-3.5 flex flex-col justify-between text-center border-slate-800/80">
            <span className="text-[10px] uppercase font-semibold text-slate-400">mAP@50</span>
            <span className="text-2xl font-bold text-white font-mono my-1">79.0%</span>
            <span className="text-[10px] text-emerald-400 font-medium">+9.39% over baseline</span>
          </Card>

          <Card className="p-3.5 flex flex-col justify-between text-center border-slate-800/80">
            <span className="text-[10px] uppercase font-semibold text-slate-400">mAP@50:95</span>
            <span className="text-2xl font-bold text-amber-400 font-mono my-1">51.1%</span>
            <span className="text-[10px] text-slate-400">Rigorous IoU</span>
          </Card>

          <Card className="p-3.5 flex flex-col justify-between text-center border-slate-800/80">
            <span className="text-[10px] uppercase font-semibold text-slate-400">Precision</span>
            <span className="text-2xl font-bold text-slate-200 font-mono my-1">80.9%</span>
            <span className="text-[10px] text-slate-400">Low false alarms</span>
          </Card>

          <Card className="p-3.5 flex flex-col justify-between text-center border-slate-800/80">
            <span className="text-[10px] uppercase font-semibold text-slate-400">Recall</span>
            <span className="text-2xl font-bold text-purple-400 font-mono my-1">72.4%</span>
            <span className="text-[10px] text-slate-400">Isolated 1,601 test</span>
          </Card>
        </div>
      </div>

      {/* 2.5 View Mode Selector Tabs */}
      <div className="flex items-center justify-between gap-4 border-b border-slate-800 pb-3 pt-2">
        <div className="flex items-center gap-2 p-1 bg-slate-900/80 rounded-xl border border-slate-800/80">
          <button
            type="button"
            onClick={() => setVisionMode('live')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              visionMode === 'live'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Video className="w-4 h-4" />
            <span>Live Camera & CCTV Stream</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-1" />
          </button>

          <button
            type="button"
            onClick={() => setVisionMode('static')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              visionMode === 'static'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <UploadCloud className="w-4 h-4" />
            <span>Static Inspection & Uploads</span>
            {visionResults && (
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-900 text-amber-400 font-mono">
                {visionResults.detections?.length || 0}
              </span>
            )}
          </button>
        </div>

        <div className="text-xs text-slate-400 hidden md:flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400" />
          <span className="font-mono text-slate-300">YOLOv8s Dual Arbitration Engine</span>
        </div>
      </div>

      {/* 3. Conditional Content: Live Feed vs Static Workspace */}
      {visionMode === 'live' ? (
        <LiveWebcamFeed
          yoloReady={true}
          onCaptureSnapshot={(file) => {
            handleLiveSnapshot(file);
          }}
        />
      ) : (
        /* 3. Main Two-Column Workspace: Left (Upload) + Right (Detection Results) */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT: Upload & Image Preview (5 cols) */}
        <Card className="lg:col-span-5 space-y-5">
          <div className="pb-3 border-b border-slate-800/80">
            <h2 className="text-base font-semibold text-white">Upload Warehouse Image</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Select or drop an aisle inspection, forklift, or pallet stack image
            </p>
          </div>

          {/* Quick Test Samples */}
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
              Instant Test Presets:
            </span>
            <div className="grid grid-cols-3 gap-2">
              {[
                { name: 'Forklift', file: 'forklift_sample.jpg' },
                { name: 'Pallet Stack', file: 'pallet_sample.jpg' },
                { name: 'Carton Box', file: 'box_sample.jpg' },
                { name: 'Worker', file: 'person_sample.jpg' },
                { name: 'AMR Robot', file: 'robot_sample.jpg' },
                { name: 'Robotic Arm', file: 'robotic_arm_sample.jpg' },
              ].map((sample) => (
                <button
                  key={sample.file}
                  type="button"
                  onClick={() => handleSampleClick(sample.file)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-900/60 border border-slate-800/80 hover:border-amber-500/40 text-slate-300 hover:text-white text-[11px] font-medium transition-colors text-center truncate"
                >
                  {sample.name}
                </button>
              ))}
            </div>
          </div>

          {/* Drag & Drop Area */}
          {!visionPreview ? (
            <div className="border border-dashed border-slate-700 hover:border-amber-500 rounded-xl p-8 text-center transition-colors bg-slate-900/40 flex flex-col items-center justify-center min-h-[220px]">
              <input
                type="file"
                id="vision-upload-input"
                className="hidden"
                accept="image/png,image/jpeg,image/jpg"
                onChange={onImageChange}
              />
              <label
                htmlFor="vision-upload-input"
                className="cursor-pointer flex flex-col items-center w-full"
              >
                <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-3">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <span className="text-sm font-semibold text-white mb-1">
                  Drag & drop an image here
                </span>
                <span className="text-xs text-amber-400 font-medium hover:underline mb-2">
                  or Browse Files
                </span>
                <span className="text-[11px] text-slate-400">
                  Supported formats: PNG, JPG, JPEG (Max 5MB)
                </span>
              </label>
            </div>
          ) : (
            /* Image Preview Card */
            <div className="space-y-3">
              <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950 max-h-[280px] flex items-center justify-center group">
                <img
                  src={visionPreview}
                  alt="Uploaded Warehouse Frame"
                  className="max-h-[260px] w-full object-contain"
                />

                {/* Subtle loading overlay */}
                {isVisionLoading && (
                  <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-medium text-slate-200">
                      <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                      Processing frame...
                    </div>
                  </div>
                )}

                <button
                  onClick={onClearImage}
                  className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-900 text-slate-300 hover:text-white transition-colors z-30"
                  title="Remove image"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex justify-between items-center text-xs text-slate-400 px-1">
                <span className="truncate max-w-[200px]">
                  {visionImage?.name || 'warehouse_frame.jpg'}
                </span>
                <span className="font-mono">
                  {visionImage ? (visionImage.size / 1024).toFixed(0) + ' KB' : ''}
                </span>
              </div>
            </div>
          )}

          {visionError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-xs text-rose-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-400" />
              <span>{visionError}</span>
            </div>
          )}

          {/* Submit Button */}
          <Button
            className="w-full"
            size="lg"
            variant="primary"
            icon={<Target className="w-4 h-4" />}
            isLoading={isVisionLoading}
            loadingText="Running Dual-Layer Inference..."
            disabled={!visionImage || isVisionLoading}
            onClick={onVisionUpload}
          >
            Run Dual-Layer Inference
          </Button>

          <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800/80 text-xs space-y-1 text-slate-400">
            <span className="font-semibold text-slate-300 block">Perception Pipeline:</span>
            <p>1. Spatial tensor preprocessing (640x640 letterbox scaling)</p>
            <p>2. YOLOv8 multi-class detection with bounding box NMS</p>
            <p>3. Contextual arbitration against COCO general objects</p>
          </div>
        </Card>

        {/* RIGHT: Detection Results (7 cols) */}
        <Card className="lg:col-span-7 flex flex-col justify-between min-h-[460px]">
          <div className="flex justify-between items-center pb-3 border-b border-slate-800/80 mb-4">
            <div className="flex items-center gap-2">
              <Scan className="w-4 h-4 text-blue-400" />
              <h2 className="text-base font-semibold text-white">Detection Results</h2>
            </div>
            {visionResults && (
              <Badge variant="primary" size="sm">
                {visionResults.object_count !== undefined ? visionResults.object_count : visionResults.detections.length} Objects Detected
              </Badge>
            )}
          </div>

          {visionResults && (visionResults.annotated_image || (visionResults.detections && visionResults.detections.length > 0)) ? (
            <div className="space-y-4">
              {/* Annotated Image */}
              <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950 flex items-center justify-center">
                <img
                  src={visionResults.annotated_image || visionPreview || ''}
                  alt="YOLOv8 Annotated Warehouse Frame"
                  className="max-h-[340px] w-full object-contain"
                />
              </div>

              {/* Detections Pill List */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                  Identified Entities
                </span>
                <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                  {visionResults.detections.map((det, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-800/80 hover:border-slate-700 flex justify-between items-center text-xs transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                        <span className="font-semibold text-white capitalize">
                          {det.class || det.class_name}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                          det.source === 'warehouse'
                            ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                            : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                        }`}>
                          {det.source === 'warehouse' ? 'Warehouse Detector' : 'General Detector'}
                        </span>
                      </div>
                      <span className="font-mono text-xs text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                        {(det.confidence * 100).toFixed(1)}% conf
                      </span>
                    </div>
                  ))}

                  {visionResults.detections.length === 0 && (
                    <p className="text-xs text-slate-400 italic py-2">
                      No target objects detected above the confidence threshold.
                    </p>
                  )}
                </div>
              </div>

              {/* Image Summary */}
              {visionResults.image_summary && (
                <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800/80 text-xs">
                  <span className="text-slate-400 font-semibold block mb-0.5">Summary:</span>
                  <p className="text-slate-200">{visionResults.image_summary}</p>
                </div>
              )}
            </div>
          ) : visionPreview ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-3">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-white mb-1">Image Loaded & Ready</h3>
              <p className="text-xs text-slate-400 max-w-sm">
                Click &quot;Run Dual-Layer Inference&quot; to execute YOLOv8 bounding box detection on this frame.
              </p>
            </div>
          ) : (
            /* Clean Empty State */
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <div className="w-12 h-12 rounded-xl bg-slate-800/40 border border-slate-700/60 flex items-center justify-center text-slate-400 mb-3">
                <ImageIcon className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-slate-300 mb-1">No Image Loaded</h3>
              <p className="text-xs text-slate-400 max-w-sm mb-4">
                Upload a warehouse image to begin real-time YOLOv8 object detection.
              </p>
              <label
                htmlFor="vision-upload-input"
                className="cursor-pointer inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition-colors"
              >
                <UploadCloud className="w-3.5 h-3.5 text-blue-400" />
                <span>Upload Image</span>
              </label>
            </div>
          )}
        </Card>
      </div>
      )}
    </div>
  );
};

export default VisionView;
