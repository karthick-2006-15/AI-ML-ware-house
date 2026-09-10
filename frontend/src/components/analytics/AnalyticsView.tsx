import React, { useState } from 'react';
import { 
  AlertTriangle, 
  Database, 
  Zap 
} from 'lucide-react';
import Card from '../common/Card';
import Badge from '../common/Badge';
import Button from '../common/Button';
import Input from '../common/Input';
import Select from '../common/Select';
import ProgressBar from '../common/ProgressBar';
import type { PredictInput, PredictResult, SystemStatus } from '../../types';

interface AnalyticsViewProps {
  systemStatus: SystemStatus;
  mlInput: PredictInput;
  setMlInput: React.Dispatch<React.SetStateAction<PredictInput>>;
  mlResults: PredictResult | null;
  isMlLoading: boolean;
  mlError: string | null;
  onMlPredict: () => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  systemStatus,
  mlInput,
  setMlInput,
  mlResults,
  isMlLoading,
  mlError,
  onMlPredict,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'predict' | 'comparison' | 'importance' | 'evaluation'>('predict');

  // Preset loaders for examiner / user convenience
  const loadHighRiskPreset = () => {
    setMlInput({
      stock_level: 25,
      reorder_point: 60,
      reorder_frequency_days: 14,
      lead_time_days: 5,
      daily_demand: 12,
      demand_std_dev: 2.5,
      item_popularity_score: 80.0,
      picking_time_seconds: 45.0,
      handling_cost_per_unit: 1.8,
      unit_price: 65.0,
      holding_cost_per_unit_day: 0.2,
      order_fulfillment_rate: 0.94,
      total_orders_last_month: 200,
      turnover_ratio: 5.5,
      layout_efficiency_score: 82.0,
      category: 'Electronics',
      zone: 'A',
    });
  };

  const loadSafePreset = () => {
    setMlInput({
      stock_level: 350,
      reorder_point: 40,
      reorder_frequency_days: 14,
      lead_time_days: 3,
      daily_demand: 8,
      demand_std_dev: 1.5,
      item_popularity_score: 55.0,
      picking_time_seconds: 30.0,
      handling_cost_per_unit: 1.2,
      unit_price: 40.0,
      holding_cost_per_unit_day: 0.1,
      order_fulfillment_rate: 0.98,
      total_orders_last_month: 100,
      turnover_ratio: 3.5,
      layout_efficiency_score: 90.0,
      category: 'Apparel',
      zone: 'B',
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* 1. Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-purple-400 tracking-wider uppercase mb-1">
            <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
            Predictive Analytics & Inventory Intelligence
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Predictive Analytics
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Estimate inventory stock-out risk using warehouse data.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant={systemStatus.xgboost_ready ? 'success' : 'danger'} size="md" dot>
            {systemStatus.xgboost_ready ? 'XGBOOST INFERENCE ACTIVE' : 'MODEL UNAVAILABLE'}
          </Badge>
          <span className="text-xs text-slate-400 font-mono hidden sm:inline-block">
            0.9197 ROC-AUC Champion
          </span>
        </div>
      </div>

      {/* 2. Sub-Tabs Navigation */}
      <div className="flex border-b border-[#1A2D4A] space-x-1 sm:space-x-4 overflow-x-auto pb-px">
        {[
          { id: 'predict', label: 'Risk Prediction' },
          { id: 'comparison', label: 'Model Comparison' },
          { id: 'importance', label: 'Feature Importance' },
          { id: 'evaluation', label: 'Evaluation Metrics' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id as any)}
            className={`px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
              activeSubTab === tab.id
                ? 'border-[#1683FF] text-[#00D9FF] bg-blue-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: PREDICTION (Form + Intelligence Results) */}
      {activeSubTab === 'predict' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT: 2-Column Responsive Input Form (7 cols) */}
          <Card className="lg:col-span-7 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-[#1A2D4A]">
              <div>
                <h2 className="text-base font-bold text-white">Warehouse Input Parameters</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Configure real-time SKU inventory and supplier parameters
                </p>
              </div>

              {/* Quick Presets */}
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="hover:border-rose-500/60 hover:text-rose-300 hover:shadow-[0_0_15px_rgba(239,68,68,0.3)] transition-all duration-200"
                  onClick={loadHighRiskPreset}
                >
                  <span className="w-2 h-2 rounded-full bg-rose-500 mr-1.5 animate-pulse" />
                  High-Risk Preset
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="hover:border-emerald-500/60 hover:text-emerald-300 hover:shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all duration-200"
                  onClick={loadSafePreset}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
                  Safe Preset
                </Button>
              </div>
            </div>

            {/* 2-Column Responsive Grid Form */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Stock Level"
                type="number"
                unit="Units"
                value={mlInput.stock_level}
                onChange={(e) => setMlInput({ ...mlInput, stock_level: Number(e.target.value) })}
              />

              <Input
                label="Reorder Point"
                type="number"
                unit="Units"
                value={mlInput.reorder_point}
                onChange={(e) => setMlInput({ ...mlInput, reorder_point: Number(e.target.value) })}
              />

              <Input
                label="Reorder Frequency"
                type="number"
                unit="Days"
                value={mlInput.reorder_frequency_days}
                onChange={(e) => setMlInput({ ...mlInput, reorder_frequency_days: Number(e.target.value) })}
              />

              <Input
                label="Lead Time"
                type="number"
                unit="Days"
                value={mlInput.lead_time_days}
                onChange={(e) => setMlInput({ ...mlInput, lead_time_days: Number(e.target.value) })}
              />

              <Input
                label="Daily Demand"
                type="number"
                unit="Units/day"
                value={mlInput.daily_demand}
                onChange={(e) => setMlInput({ ...mlInput, daily_demand: Number(e.target.value) })}
              />

              <Input
                label="Demand Std Dev"
                type="number"
                step="0.1"
                unit="Sigma"
                value={mlInput.demand_std_dev}
                onChange={(e) => setMlInput({ ...mlInput, demand_std_dev: Number(e.target.value) })}
              />

              <Input
                label="Item Popularity Score"
                type="number"
                step="1"
                unit="Index"
                value={mlInput.item_popularity_score}
                onChange={(e) => setMlInput({ ...mlInput, item_popularity_score: Number(e.target.value) })}
              />

              <Input
                label="Picking Time"
                type="number"
                unit="Seconds"
                value={mlInput.picking_time_seconds}
                onChange={(e) => setMlInput({ ...mlInput, picking_time_seconds: Number(e.target.value) })}
              />

              <Input
                label="Handling Cost"
                type="number"
                step="0.1"
                unit="$ / unit"
                value={mlInput.handling_cost_per_unit}
                onChange={(e) => setMlInput({ ...mlInput, handling_cost_per_unit: Number(e.target.value) })}
              />

              <Input
                label="Unit Price"
                type="number"
                step="1"
                unit="$ / SKU"
                value={mlInput.unit_price}
                onChange={(e) => setMlInput({ ...mlInput, unit_price: Number(e.target.value) })}
              />

              <Input
                label="Holding Cost"
                type="number"
                step="0.05"
                unit="$ / day"
                value={mlInput.holding_cost_per_unit_day}
                onChange={(e) => setMlInput({ ...mlInput, holding_cost_per_unit_day: Number(e.target.value) })}
              />

              <Input
                label="Fulfillment Rate"
                type="number"
                step="0.01"
                unit="0.0 - 1.0"
                value={mlInput.order_fulfillment_rate}
                onChange={(e) => setMlInput({ ...mlInput, order_fulfillment_rate: Number(e.target.value) })}
              />

              <Input
                label="Total Orders Last Month"
                type="number"
                unit="Orders"
                value={mlInput.total_orders_last_month}
                onChange={(e) => setMlInput({ ...mlInput, total_orders_last_month: Number(e.target.value) })}
              />

              <Input
                label="Turnover Ratio"
                type="number"
                step="0.1"
                unit="Velocity"
                value={mlInput.turnover_ratio}
                onChange={(e) => setMlInput({ ...mlInput, turnover_ratio: Number(e.target.value) })}
              />

              <Select
                label="Category"
                value={mlInput.category}
                onChange={(e) => setMlInput({ ...mlInput, category: e.target.value })}
                options={[
                  { value: 'Electronics', label: 'Electronics & Hardware' },
                  { value: 'Apparel', label: 'Apparel & Workwear' },
                  { value: 'Automotive', label: 'Automotive & Industrial' },
                  { value: 'Groceries', label: 'Groceries & Consumables' },
                  { value: 'Pharma', label: 'Pharmaceuticals & Health' },
                ]}
              />

              <Select
                label="Storage Zone"
                value={mlInput.zone}
                onChange={(e) => setMlInput({ ...mlInput, zone: e.target.value })}
                options={[
                  { value: 'A', label: 'Zone A — High Velocity (Fast Pick)' },
                  { value: 'B', label: 'Zone B — Medium Velocity (Standard)' },
                  { value: 'C', label: 'Zone C — Bulk Storage (Pallets)' },
                  { value: 'D', label: 'Zone D — Cold & Secure Vault' },
                ]}
              />
            </div>

            {mlError && (
              <div className="p-3 bg-rose-950/40 border border-rose-500/40 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-400" />
                <span>{mlError}</span>
              </div>
            )}

            {/* Run Button */}
            <Button
              className="w-full btn-neon-glow shadow-[0_0_20px_rgba(22,131,255,0.35)] hover:shadow-[0_0_30px_rgba(0,217,255,0.5)] transition-all duration-300"
              size="lg"
              variant="primary"
              icon={<Zap className="w-4 h-4 text-cyan-300 animate-pulse" />}
              isLoading={isMlLoading}
              loadingText="Analyzing Warehouse Data..."
              disabled={!systemStatus.xgboost_ready}
              onClick={onMlPredict}
            >
              Run Warehouse Intelligence
            </Button>
          </Card>

          {/* RIGHT: Intelligence Results Card (5 cols) */}
          <Card className="lg:col-span-5 flex flex-col justify-between min-h-[460px] space-y-6">
            <div className="pb-3 border-b border-[#1A2D4A] flex justify-between items-center">
              <h2 className="text-base font-bold text-white">Intelligence Results</h2>
              {mlResults && (
                <Badge
                  variant={mlResults.risk_level === 'HIGH' ? 'danger' : mlResults.risk_level === 'MEDIUM' ? 'warning' : 'success'}
                  size="sm"
                  dot
                >
                  {mlResults.risk_level} RISK
                </Badge>
              )}
            </div>

            {mlResults ? (
              <div className="space-y-5">
                {/* Risk Overview Banner */}
                <div
                  className={`p-5 rounded-2xl border transition-all duration-300 ${
                    mlResults.risk_level === 'HIGH'
                      ? 'bg-rose-950/30 border-rose-500/60 neon-border-red shadow-[0_0_25px_rgba(244,63,94,0.25)] animate-pulse-glow text-rose-200'
                      : mlResults.risk_level === 'MEDIUM'
                      ? 'bg-amber-950/30 border-amber-500/60 shadow-[0_0_20px_rgba(245,158,11,0.2)] text-amber-200'
                      : 'bg-emerald-950/30 border-emerald-500/60 neon-border-green shadow-[0_0_25px_rgba(16,185,129,0.2)] text-emerald-200'
                  }`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Stockout Risk Classification
                    </span>
                    <span className={`text-xl font-extrabold font-mono ${
                      mlResults.risk_level === 'HIGH' ? 'neon-text-red' : mlResults.risk_level === 'LOW' ? 'neon-text-green' : 'text-amber-400'
                    }`}>
                      {mlResults.risk_level}
                    </span>
                  </div>

                  <div className="space-y-1.5 my-3">
                    <ProgressBar
                      value={mlResults.stockout_probability * 100}
                      color={mlResults.risk_level === 'HIGH' ? 'red' : mlResults.risk_level === 'MEDIUM' ? 'amber' : 'green'}
                      height="h-3"
                    />
                    <div className="flex justify-between text-xs font-mono text-slate-300">
                      <span>Depletion Probability</span>
                      <span className="font-bold text-white">{(mlResults.stockout_probability * 100).toFixed(1)}%</span>
                    </div>
                  </div>

                  <p className="text-xs leading-relaxed mt-2 text-slate-300">
                    {mlResults.risk_level === 'HIGH'
                      ? 'Imminent stockout projected within 7 days. On-hand inventory is below projected demand buffer.'
                      : 'Inventory level is sufficient to sustain customer order throughput across replenishment cycle.'}
                  </p>
                </div>

                {/* Secondary Metrics: Demand Forecast & KPI */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3.5 bg-[#08182A] rounded-xl border border-[#1A2D4A] text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                      7-Day Demand Forecast
                    </span>
                    <span className="text-xl font-black text-white font-mono">
                      {mlResults.demand_forecast.toFixed(1)}
                    </span>
                    <span className="text-[10px] text-slate-400 ml-1">units</span>
                  </div>

                  <div className="p-3.5 bg-[#08182A] rounded-xl border border-[#1A2D4A] text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                      Performance KPI
                    </span>
                    <span className="text-xl font-black text-purple-400 font-mono">
                      {mlResults.performance_kpi.toFixed(3)}
                    </span>
                    <span className="text-[10px] text-slate-400 ml-1">Score</span>
                  </div>
                </div>

                {/* SHAP Feature Contribution Bars */}
                {mlResults.explanations?.stockout_risk && (
                  <div className="p-4 bg-[#08182A] rounded-xl border border-[#1A2D4A] space-y-3">
                    <div className="flex justify-between items-center pb-2 border-b border-[#14253D]">
                      <span className="text-xs font-bold text-white uppercase tracking-wider">
                        Key Risk Factors (SHAP Attribution)
                      </span>
                      <span className="text-[10px] text-cyan-400 font-mono">Game-Theoretic</span>
                    </div>

                    <div className="space-y-2.5">
                      {mlResults.explanations.stockout_risk.slice(0, 4).map((f, i) => (
                        <div key={i} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-300 font-medium capitalize">
                              {f.feature.replace(/_/g, ' ')}
                            </span>
                            <span className="text-cyan-400 font-mono font-semibold">
                              {(f.importance * 100).toFixed(1)}%
                            </span>
                          </div>
                          <ProgressBar value={Math.min(100, f.importance * 120)} color="cyan" height="h-1.5" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Compact Empty State */
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-3">
                  <Database className="w-7 h-7" />
                </div>
                <h3 className="text-sm font-bold text-white mb-1">No Prediction Yet</h3>
                <p className="text-xs text-slate-400 max-w-sm mb-4 leading-relaxed">
                  Enter warehouse inventory metrics or load a preset, then click &quot;Run Warehouse Intelligence&quot; to view the ML prediction.
                </p>
                <Button size="sm" variant="outline" onClick={loadHighRiskPreset}>
                  Load Sample SKU
                </Button>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* TAB 2: MODEL COMPARISON */}
      {activeSubTab === 'comparison' && (
        <Card className="space-y-6">
          <div className="pb-3 border-b border-[#1A2D4A] flex justify-between items-center">
            <div>
              <h2 className="text-base font-bold text-white">Cross-Family Model Benchmark</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Empirical evaluation on 481 untouched test items (351 Low Risk, 130 High Risk)
              </p>
            </div>
            <Badge variant="primary" size="sm">Academic Benchmark</Badge>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#1A2D4A] text-slate-400 uppercase font-mono">
                  <th className="py-3 px-4">Model Family</th>
                  <th className="py-3 px-4">Parameters</th>
                  <th className="py-3 px-4">Accuracy</th>
                  <th className="py-3 px-4">High-Risk Recall</th>
                  <th className="py-3 px-4">Precision</th>
                  <th className="py-3 px-4">F1-Score</th>
                  <th className="py-3 px-4">ROC-AUC</th>
                  <th className="py-3 px-4">PR-AUC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1A2D4A]/60">
                {/* XGBoost Champion */}
                <tr className="bg-blue-950/20 font-medium">
                  <td className="py-3.5 px-4 flex items-center gap-2">
                    <span className="font-bold text-white">Tuned XGBoost</span>
                    <span className="px-1.5 py-0.2 rounded bg-blue-500/20 text-[#00D9FF] text-[10px] font-bold border border-blue-500/30">
                      CHAMPION
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-300">spw=2.68, lr=0.03, depth=4</td>
                  <td className="py-3.5 px-4 font-mono text-slate-200">0.8399</td>
                  <td className="py-3.5 px-4 font-mono font-bold text-cyan-300">86.92% (113/130)</td>
                  <td className="py-3.5 px-4 font-mono text-slate-200">65.32%</td>
                  <td className="py-3.5 px-4 font-mono text-slate-200">0.7459</td>
                  <td className="py-3.5 px-4 font-mono font-bold text-white">0.9197</td>
                  <td className="py-3.5 px-4 font-mono text-slate-200">0.7779</td>
                </tr>

                {/* Random Forest */}
                <tr>
                  <td className="py-3.5 px-4 font-bold text-slate-200">Random Forest</td>
                  <td className="py-3.5 px-4 font-mono text-slate-400">balanced weights, depth=10</td>
                  <td className="py-3.5 px-4 font-mono text-slate-300">0.8462</td>
                  <td className="py-3.5 px-4 font-mono text-slate-300">76.92% (100/130)</td>
                  <td className="py-3.5 px-4 font-mono text-slate-300">69.44%</td>
                  <td className="py-3.5 px-4 font-mono text-slate-300">0.7299</td>
                  <td className="py-3.5 px-4 font-mono text-slate-300">0.9218</td>
                  <td className="py-3.5 px-4 font-mono text-slate-300">0.7690</td>
                </tr>

                {/* Logistic Regression */}
                <tr>
                  <td className="py-3.5 px-4 font-bold text-slate-200">Logistic Regression</td>
                  <td className="py-3.5 px-4 font-mono text-slate-400">C=10.0, L2 penalty, scaled</td>
                  <td className="py-3.5 px-4 font-mono text-slate-300">0.8503</td>
                  <td className="py-3.5 px-4 font-mono text-slate-300">71.54% (93/130)</td>
                  <td className="py-3.5 px-4 font-mono text-slate-300">72.66%</td>
                  <td className="py-3.5 px-4 font-mono text-slate-300">0.7209</td>
                  <td className="py-3.5 px-4 font-mono text-slate-300">0.9221</td>
                  <td className="py-3.5 px-4 font-mono text-slate-300">0.7578</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="p-4 bg-[#08182A] rounded-xl border border-[#1A2D4A] text-xs text-slate-300 space-y-1.5">
            <h4 className="font-bold text-white">Operational Asymmetric Loss Finding:</h4>
            <p className="leading-relaxed">
              In logistics warehousing, a False Negative (unanticipated stockout) halts packing stations and causes contractual SLA breach penalties, whereas a False Positive merely triggers an automated inventory cycle count.
              Tuned XGBoost with <code>scale_pos_weight=2.68</code> captured <strong>86.92% of all imminent stockouts</strong> (catching 20 more stockouts than Logistic Regression).
            </p>
          </div>
        </Card>
      )}

      {/* TAB 3: FEATURE IMPORTANCE */}
      {activeSubTab === 'importance' && (
        <Card className="space-y-6">
          <div className="pb-3 border-b border-[#1A2D4A] flex justify-between items-center">
            <div>
              <h2 className="text-base font-bold text-white">SHAP Game-Theoretic Feature Importance</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Calculated via shap.TreeExplainer on 38 engineered operational warehouse features
              </p>
            </div>
            <Badge variant="cyan" size="sm">TreeExplainer Global</Badge>
          </div>

          {/* Feature Bars */}
          <div className="space-y-3.5 max-w-2xl">
            {[
              { name: 'stock_level', shap: 2.6211, gain: 80.6, desc: 'Current physical units on hand' },
              { name: 'safety_stock_coverage', shap: 0.2720, gain: 44.7, desc: 'Ratio to 95% service safety buffer' },
              { name: 'reorder_buffer_ratio', shap: 0.1803, gain: 24.9, desc: 'Proximity to reorder point' },
              { name: 'days_of_supply', shap: 0.1241, gain: 12.0, desc: 'Operational runout horizon (days)' },
              { name: 'daily_demand', shap: 0.1029, gain: 8.1, desc: 'Daily consumption velocity' },
              { name: 'picking_time_seconds', shap: 0.0773, gain: 7.5, desc: 'Aisle pick latency' },
              { name: 'total_orders_last_month', shap: 0.0671, gain: 6.7, desc: 'Throughput volume' },
              { name: 'demand_std_dev', shap: 0.0660, gain: 6.8, desc: 'Demand volatility' },
              { name: 'days_since_last_restock', shap: 0.0658, gain: 6.7, desc: 'SKU aging index' },
              { name: 'stockout_pressure_index', shap: 0.0587, gain: 8.2, desc: 'Historical friction' },
            ].map((item, idx) => (
              <div key={idx} className="p-3 bg-[#08182A] rounded-xl border border-[#1A2D4A] space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-slate-400 font-bold">{idx + 1}.</span>
                    <span className="font-bold text-white font-mono">{item.name}</span>
                    <span className="text-[11px] text-slate-400 hidden sm:inline">({item.desc})</span>
                  </div>
                  <span className="font-mono text-xs text-cyan-400 font-semibold">
                    SHAP: {item.shap.toFixed(4)} | Gain: {item.gain}
                  </span>
                </div>
                <ProgressBar
                  value={Math.min(100, (item.shap / 2.6211) * 100)}
                  color={idx === 0 ? 'cyan' : idx < 4 ? 'blue' : 'purple'}
                  height="h-1.5"
                />
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* TAB 4: EVALUATION */}
      {activeSubTab === 'evaluation' && (
        <Card className="space-y-6">
          <div className="pb-3 border-b border-[#1A2D4A] flex justify-between items-center">
            <div>
              <h2 className="text-base font-bold text-white">Diagnostic Error Analysis</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Confusion matrix breakdown on untouched test set (481 samples)
              </p>
            </div>
            <Badge variant="purple" size="sm">Confusion Matrix</Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/40">
              <span className="text-[10px] font-bold uppercase text-emerald-400 tracking-wider">True Positives</span>
              <p className="text-2xl font-black text-white font-mono my-1">113</p>
              <span className="text-xs text-slate-300">Stockouts Accurately Caught (86.92% Recall)</span>
            </div>

            <div className="p-4 rounded-xl bg-blue-950/30 border border-blue-500/40">
              <span className="text-[10px] font-bold uppercase text-blue-400 tracking-wider">True Negatives</span>
              <p className="text-2xl font-black text-white font-mono my-1">291</p>
              <span className="text-xs text-slate-300">Safe SKUs Confirmed (60.50% of test set)</span>
            </div>

            <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/40">
              <span className="text-[10px] font-bold uppercase text-amber-400 tracking-wider">False Positives</span>
              <p className="text-2xl font-black text-white font-mono my-1">60</p>
              <span className="text-xs text-slate-300">Over-Alerts (Precautionary audits)</span>
            </div>

            <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/40">
              <span className="text-[10px] font-bold uppercase text-rose-400 tracking-wider">False Negatives</span>
              <p className="text-2xl font-black text-white font-mono my-1">17</p>
              <span className="text-xs text-slate-300">Missed Stockouts (Borderline runouts)</span>
            </div>
          </div>

          <div className="p-4 bg-[#08182A] rounded-xl border border-[#1A2D4A] text-xs text-slate-300 space-y-1.5">
            <h4 className="font-bold text-white">False Negative Deep Dive:</h4>
            <p className="leading-relaxed">
              Every single missed stockout item (17 cases) had borderline days of supply (between 5.5 and 7.0 days), where stock was within 1-3 units of the 7-day demand threshold. Safety stock buffers in these cases mitigated physical stockout before the next replenishment delivery.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
};

export default AnalyticsView;
