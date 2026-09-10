import React from 'react';
import { X, Info, Layers, CheckCircle2 } from 'lucide-react';
import Button from './Button';

interface HelpAboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpAboutModal: React.FC<HelpAboutModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-[#0D1B2E] border border-[#1E3A5F] rounded-2xl w-full max-w-lg shadow-2xl p-6 relative">
        <div className="flex justify-between items-center pb-4 border-b border-[#1A2D4A]">
          <div className="flex items-center gap-2.5">
            <Info className="w-5 h-5 text-[#00D9FF]" />
            <h2 className="text-base font-bold text-white">About AI Warehouse Manager</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-5 space-y-4 text-sm">
          <div className="flex items-center gap-3 p-3.5 bg-gradient-to-r from-blue-900/20 to-cyan-900/20 rounded-xl border border-blue-500/30">
            <div className="w-10 h-10 rounded-xl bg-[#1683FF] flex items-center justify-center text-white flex-shrink-0">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Autonomous Warehouse AI</h3>
              <p className="text-xs text-cyan-300">See. Predict. Navigate.</p>
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            An academic, commercial-grade AI logistics management platform combining real-time computer vision perception, predictive inventory stockout risk intelligence, and dynamic multi-agent A* fleet routing.
          </p>

          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Subsystems</h4>
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-blue-400 flex-shrink-0" />
                <span><strong>SEE:</strong> Fine-tuned YOLOv8 for 6 industrial classes (79.0% mAP@50).</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-purple-400 flex-shrink-0" />
                <span><strong>PREDICT:</strong> Tuned XGBoost with scale_pos_weight (0.9197 ROC-AUC, 86.9% Recall).</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span><strong>NAVIGATE:</strong> Multi-robot dynamic A* pathfinding on 10x10 fulfillment grid.</span>
              </div>
            </div>
          </div>

          <div className="p-3 bg-[#08182A] rounded-xl border border-[#1A2D4A] space-y-1 text-xs text-slate-400">
            <p><strong>Stack:</strong> React 19, TypeScript, Tailwind CSS, FastAPI, PyTorch, Scikit-Learn, XGBoost, SHAP.</p>
            <p><strong>Academic Integrity:</strong> Zero mock/synthetic evaluation metrics. All data empirically validated.</p>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-[#1A2D4A]">
          <Button variant="primary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

export default HelpAboutModal;
