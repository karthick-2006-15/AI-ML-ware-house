import React, { useState } from 'react';
import { X, Sliders, Shield, Save } from 'lucide-react';
import Button from './Button';
import Input from './Input';
import Select from './Select';
import { apiService } from '../../services/api';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [apiUrl, setApiUrl] = useState(apiService.getBaseUrl() || '');
  const [wsUrl, setWsUrl] = useState(
    (apiService.getBaseUrl() ? apiService.getBaseUrl().replace('http://', 'ws://').replace('https://', 'wss://') : '') + '/ws/state'
  );
  const [simSpeed, setSimSpeed] = useState('1.0x');
  const [confThreshold, setConfThreshold] = useState('0.45');
  const [saved, setSaved] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    apiService.setCustomBackendUrl(apiUrl);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 600);
  };

  const handleUseStandalone = () => {
    setApiUrl('');
    setWsUrl('');
    apiService.setCustomBackendUrl(null);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-[#0D1B2E] border border-[#1E3A5F] rounded-2xl w-full max-w-lg shadow-2xl p-6 relative">
        <div className="flex justify-between items-center pb-4 border-b border-[#1A2D4A]">
          <div className="flex items-center gap-2.5">
            <Sliders className="w-5 h-5 text-[#1683FF]" />
            <h2 className="text-base font-bold text-white">System Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-5 space-y-4 text-sm">
          <Input
            label="FastAPI Backend Endpoint"
            value={apiUrl}
            onChange={(e) => setApiUrl(e.target.value)}
            helperText="REST API for YOLOv8 & XGBoost inferences"
          />

          <Input
            label="WebSocket State Stream"
            value={wsUrl}
            onChange={(e) => setWsUrl(e.target.value)}
            helperText="Real-time A* simulation telemetry feed"
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Simulation Speed"
              value={simSpeed}
              onChange={(e) => setSimSpeed(e.target.value)}
              options={['0.5x', '1.0x', '1.5x', '2.0x']}
            />

            <Input
              label="YOLO Min Confidence"
              type="number"
              step="0.05"
              min="0.1"
              max="0.9"
              value={confThreshold}
              onChange={(e) => setConfThreshold(e.target.value)}
              unit="Threshold"
            />
          </div>

          <div className="p-3.5 rounded-xl bg-[#08182A] border border-[#1A2D4A] flex items-center gap-3">
            <Shield className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <p className="text-xs text-slate-400 leading-relaxed">
              When deployed to Vercel or cloud static hosting without an active FastAPI backend, the system runs automatically in <strong>Autonomous Client Engine Mode</strong> with zero 404 errors. Enter your live Render / FastAPI backend URL to switch to remote live ML execution.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 pt-4 border-t border-[#1A2D4A]">
          <button
            type="button"
            onClick={handleUseStandalone}
            className="text-xs text-amber-400 hover:text-amber-300 underline font-medium cursor-pointer"
          >
            Reset to Standalone Engine
          </button>
          <div className="flex items-center gap-3">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" icon={<Save className="w-4 h-4" />} onClick={handleSave}>
              {saved ? 'Saved!' : 'Save Configuration'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
