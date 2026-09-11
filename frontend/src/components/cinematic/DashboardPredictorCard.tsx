import React, { useState } from 'react';
import { ArrowRight, Zap, Activity } from 'lucide-react';
import ProgressBar from '../common/ProgressBar';

interface DashboardPredictorCardProps {
  onNavigateAnalytics: () => void;
  className?: string;
}

const DASH_SKUS = [
  {
    id: 'sku-lidar',
    sku: 'SKU-7729',
    name: 'LiDAR Sensor Core',
    riskLevel: 'HIGH',
    riskProb: 91.9,
    runwayDays: 2.1,
    demandForecast: 174.8,
    stock: 25,
    reorder: 60,
    statusText: 'Imminent Stockout Risk',
    statusColor: 'danger',
  },
  {
    id: 'sku-hydraulic',
    sku: 'SKU-3410',
    name: 'Hydraulic Manifold',
    riskLevel: 'MEDIUM',
    riskProb: 64.5,
    runwayDays: 5.8,
    demandForecast: 95.0,
    stock: 52,
    reorder: 75,
    statusText: 'Lead Time Exposure',
    statusColor: 'warning',
  },
  {
    id: 'sku-wrap',
    sku: 'SKU-1084',
    name: 'Pallet Shrink Film',
    riskLevel: 'LOW',
    riskProb: 12.4,
    runwayDays: 43.8,
    demandForecast: 32.0,
    stock: 350,
    reorder: 40,
    statusText: 'Safe Stock Buffer',
    statusColor: 'success',
  },
];

export const DashboardPredictorCard: React.FC<DashboardPredictorCardProps> = ({
  onNavigateAnalytics,
  className = '',
}) => {
  const [selectedSku, setSelectedSku] = useState(DASH_SKUS[0]);

  return (
    <div
      className={`glass-card-warm rounded-2xl p-3 sm:p-3.5 border border-amber-500/30 select-none relative overflow-hidden transition-all duration-300 shadow-xl ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-white/[0.08] mb-2">
        <div className="flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-amber-400">
            XGBoost Predictive Intelligence
          </span>
        </div>

        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 font-semibold">
          0.9197 ROC-AUC
        </span>
      </div>

      {/* SKU Quick-Selector Pills */}
      <div className="flex items-center gap-1.5 mb-2 overflow-x-auto pb-0.5">
        {DASH_SKUS.map((sku) => (
          <button
            key={sku.id}
            type="button"
            onClick={() => setSelectedSku(sku)}
            className={`px-2 py-0.5 rounded-lg text-[10px] font-mono transition-all cursor-pointer whitespace-nowrap ${
              selectedSku.id === sku.id
                ? 'bg-amber-500 text-slate-950 font-bold shadow-sm shadow-amber-500/20'
                : 'bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {sku.sku}
          </button>
        ))}
      </div>

      {/* Risk Assessment Box */}
      <div className={`p-2.5 sm:p-3 rounded-xl border transition-all ${
        selectedSku.riskLevel === 'HIGH'
          ? 'bg-rose-500/10 border-rose-500/30'
          : selectedSku.riskLevel === 'MEDIUM'
          ? 'bg-amber-500/10 border-amber-500/30'
          : 'bg-emerald-500/10 border-emerald-500/30'
      }`}>
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider block">
              {selectedSku.name}
            </span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className={`text-xl font-bold font-mono ${
                selectedSku.riskLevel === 'HIGH' ? 'text-rose-400' : selectedSku.riskLevel === 'LOW' ? 'text-emerald-400' : 'text-amber-400'
              }`}>
                {selectedSku.riskProb}%
              </span>
              <span className="text-[10px] font-bold uppercase text-white">
                {selectedSku.riskLevel} RISK
              </span>
            </div>
          </div>

          {/* Radial Ring Mini Indicator */}
          <div className="relative w-9 h-9 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-slate-800"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className={selectedSku.riskLevel === 'HIGH' ? 'text-rose-500' : selectedSku.riskLevel === 'MEDIUM' ? 'text-amber-500' : 'text-emerald-500'}
                strokeDasharray={`${Math.round(selectedSku.riskProb)}, 100`}
                strokeWidth="3.5"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <span className="absolute text-[8.5px] font-mono font-bold text-white">
              {Math.round(selectedSku.riskProb)}%
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="my-1.5">
          <ProgressBar
            value={selectedSku.riskProb}
            color={selectedSku.riskLevel === 'HIGH' ? 'red' : selectedSku.riskLevel === 'MEDIUM' ? 'amber' : 'green'}
            height="h-1.5"
          />
        </div>

        {/* Telemetry Micro Grid */}
        <div className="grid grid-cols-3 gap-1.5 text-center pt-1.5 border-t border-white/[0.06]">
          <div>
            <span className="text-[8.5px] text-slate-400 uppercase block">Runway</span>
            <span className="text-xs font-mono font-bold text-white">{selectedSku.runwayDays}d</span>
          </div>
          <div>
            <span className="text-[8.5px] text-slate-400 uppercase block">On-Hand</span>
            <span className="text-xs font-mono font-bold text-amber-300">{selectedSku.stock}</span>
          </div>
          <div>
            <span className="text-[8.5px] text-slate-400 uppercase block">7D Forecast</span>
            <span className="text-xs font-mono font-bold text-sky-400">{selectedSku.demandForecast}</span>
          </div>
        </div>
      </div>

      {/* Footer Navigation Link */}
      <div className="flex items-center justify-between pt-2 mt-2 border-t border-white/[0.08]">
        <div className="flex items-center gap-1.5 text-[11px] text-slate-300 font-medium">
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <span>SHAP Game-Theoretic Engine</span>
        </div>

        <button
          onClick={onNavigateAnalytics}
          className="text-[11px] font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors cursor-pointer"
        >
          <span>Predictive Studio</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

export default DashboardPredictorCard;
