import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  Database, 
  Zap,
  Sliders,
  Send,
  ArrowRight,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Gauge,
  Activity,
  Truck
} from 'lucide-react';
import Card from '../common/Card';
import Badge from '../common/Badge';
import Button from '../common/Button';
import Input from '../common/Input';
import Select from '../common/Select';
import ProgressBar from '../common/ProgressBar';
import type { PredictInput, PredictResult, SystemStatus, PageId } from '../../types';

interface AnalyticsViewProps {
  systemStatus: SystemStatus;
  mlInput: PredictInput;
  setMlInput: React.Dispatch<React.SetStateAction<PredictInput>>;
  mlResults: PredictResult | null;
  isMlLoading: boolean;
  mlError: string | null;
  onMlPredict: () => void;
  onNavigate?: (page: PageId) => void;
}

interface SkuPreset {
  id: string;
  sku: string;
  name: string;
  categoryName: string;
  category: string;
  zone: string;
  zoneName: string;
  statusBadge: string;
  statusColor: 'danger' | 'warning' | 'success';
  scenarioDesc: string;
  data: PredictInput;
}

const SKU_PRESETS: SkuPreset[] = [
  {
    id: 'sku-lidar',
    sku: 'SKU-7729',
    name: 'LiDAR Navigation Sensor Core',
    categoryName: 'Electronics & Sensors',
    category: 'Electronics',
    zone: 'A',
    zoneName: 'Zone A (Fast Pick)',
    statusBadge: 'Imminent Stockout Risk',
    statusColor: 'danger',
    scenarioDesc: 'Stock (25) critically below reorder threshold (60) with 12 units/day velocity.',
    data: {
      stock_level: 25,
      reorder_point: 60,
      reorder_frequency_days: 14,
      lead_time_days: 5,
      daily_demand: 12,
      demand_std_dev: 2.5,
      item_popularity_score: 85.0,
      picking_time_seconds: 42.0,
      handling_cost_per_unit: 2.1,
      unit_price: 180.0,
      holding_cost_per_unit_day: 0.35,
      order_fulfillment_rate: 0.93,
      total_orders_last_month: 240,
      turnover_ratio: 6.2,
      layout_efficiency_score: 84.0,
      category: 'Electronics',
      zone: 'A',
    }
  },
  {
    id: 'sku-hydraulic',
    sku: 'SKU-3410',
    name: 'Hydraulic Valve Manifold',
    categoryName: 'Automotive & Heavy Parts',
    category: 'Automotive',
    zone: 'B',
    zoneName: 'Zone B (Standard)',
    statusBadge: 'Supplier Lead Time Delay',
    statusColor: 'warning',
    scenarioDesc: 'Long 8-day lead time creates supply buffer vulnerability during peak dispatch.',
    data: {
      stock_level: 52,
      reorder_point: 75,
      reorder_frequency_days: 21,
      lead_time_days: 8,
      daily_demand: 9,
      demand_std_dev: 3.1,
      item_popularity_score: 68.0,
      picking_time_seconds: 55.0,
      handling_cost_per_unit: 3.8,
      unit_price: 95.0,
      holding_cost_per_unit_day: 0.45,
      order_fulfillment_rate: 0.91,
      total_orders_last_month: 160,
      turnover_ratio: 4.1,
      layout_efficiency_score: 79.0,
      category: 'Automotive',
      zone: 'B',
    }
  },
  {
    id: 'sku-battery',
    sku: 'SKU-9902',
    name: 'Li-Ion 48V AMR Battery Module',
    categoryName: 'Power & Storage',
    category: 'Electronics',
    zone: 'A',
    zoneName: 'Zone A (Fast Pick)',
    statusBadge: 'Surge Demand Volume',
    statusColor: 'warning',
    scenarioDesc: 'Rapid order spike with 22 units/day consumption rate approaching threshold.',
    data: {
      stock_level: 110,
      reorder_point: 95,
      reorder_frequency_days: 10,
      lead_time_days: 4,
      daily_demand: 22,
      demand_std_dev: 4.2,
      item_popularity_score: 92.0,
      picking_time_seconds: 38.0,
      handling_cost_per_unit: 1.5,
      unit_price: 240.0,
      holding_cost_per_unit_day: 0.50,
      order_fulfillment_rate: 0.96,
      total_orders_last_month: 310,
      turnover_ratio: 7.8,
      layout_efficiency_score: 88.0,
      category: 'Electronics',
      zone: 'A',
    }
  },
  {
    id: 'sku-wrap',
    sku: 'SKU-1084',
    name: 'High-Tensile Pallet Shrink Film',
    categoryName: 'Bulk Consumables',
    category: 'Groceries',
    zone: 'C',
    zoneName: 'Zone C (Bulk Storage)',
    statusBadge: 'Optimal Safe Buffer',
    statusColor: 'success',
    scenarioDesc: 'Healthy 350-unit inventory buffer comfortably exceeds reorder safety threshold.',
    data: {
      stock_level: 350,
      reorder_point: 40,
      reorder_frequency_days: 30,
      lead_time_days: 3,
      daily_demand: 8,
      demand_std_dev: 1.2,
      item_popularity_score: 50.0,
      picking_time_seconds: 25.0,
      handling_cost_per_unit: 0.8,
      unit_price: 32.0,
      holding_cost_per_unit_day: 0.08,
      order_fulfillment_rate: 0.99,
      total_orders_last_month: 90,
      turnover_ratio: 2.8,
      layout_efficiency_score: 93.0,
      category: 'Groceries',
      zone: 'C',
    }
  }
];

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  systemStatus,
  mlInput,
  setMlInput,
  mlResults,
  isMlLoading,
  mlError,
  onMlPredict,
  onNavigate,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'predict' | 'comparison' | 'importance' | 'evaluation'>('predict');
  const [selectedSkuId, setSelectedSkuId] = useState<string>('sku-lidar');
  const [paramGroup, setParamGroup] = useState<'inventory' | 'demand'>('inventory');
  const [dispatchedMission, setDispatchedMission] = useState<string | null>(null);

  // Auto-run prediction once on initial mount if not yet evaluated
  useEffect(() => {
    if (!mlResults && systemStatus.xgboost_ready && !isMlLoading) {
      onMlPredict();
    }
  }, [systemStatus.xgboost_ready]);

  // Handle Preset Selection
  const handleSelectPreset = (preset: SkuPreset) => {
    setSelectedSkuId(preset.id);
    setMlInput(preset.data);
    setDispatchedMission(null);
    setTimeout(() => {
      onMlPredict();
    }, 50);
  };

  // Real-time Buffer calculations
  const dailyDemand = Math.max(0.1, mlInput.daily_demand || 1);
  const stockLevel = mlInput.stock_level || 0;
  const leadTime = mlInput.lead_time_days || 1;
  const reorderPoint = mlInput.reorder_point || 0;
  const daysOfSupply = (stockLevel / dailyDemand).toFixed(1);
  const leadTimeExposure = Math.round(leadTime * dailyDemand);
  const bufferMargin = stockLevel - leadTimeExposure;

  // Handle Dispatch Mission to AMR Fleet
  const handleDispatchRestock = () => {
    const activeSku = SKU_PRESETS.find(p => p.id === selectedSkuId)?.sku || 'SKU-7729';
    setDispatchedMission(`RESTOCK-${activeSku.replace('SKU-', '')}-AMR02`);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-400 mb-1">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            Predictive Analytics & Inventory Intelligence
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Predictive Analytics
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Real-time stockout risk forecasting and replenishment planning powered by tuned XGBoost (0.9197 ROC-AUC).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant={systemStatus.xgboost_ready ? 'success' : 'danger'} size="md" dot>
            {systemStatus.xgboost_ready ? 'XGBoost Active' : 'Model Unavailable'}
          </Badge>
          <span className="text-xs text-slate-400 font-mono hidden sm:inline-block">
            0.9197 ROC-AUC Champion
          </span>
        </div>
      </div>

      {/* 2. Sub-Tabs Navigation */}
      <div className="flex border-b border-slate-800 space-x-1 sm:space-x-4 overflow-x-auto pb-px">
        {[
          { id: 'predict', label: 'Risk Prediction & Digital Twin' },
          { id: 'comparison', label: 'Model Benchmark Comparison' },
          { id: 'importance', label: 'SHAP Feature Importance' },
          { id: 'evaluation', label: 'Evaluation Metrics' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id as any)}
            className={`px-4 py-2.5 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeSubTab === tab.id
                ? 'border-amber-500 text-amber-300 bg-amber-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: PREDICTION & DIGITAL TWIN */}
      {activeSubTab === 'predict' && (
        <div className="space-y-6">
          {/* Warehouse SKU Catalog Presets Carousel */}
          <div>
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Select Warehouse SKU Catalog Preset:
              </span>
              <span className="text-xs text-amber-400 font-medium">Click to Load & Auto-Predict</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {SKU_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer group ${
                    selectedSkuId === preset.id
                      ? 'bg-amber-500/15 border-amber-500/60 shadow-lg shadow-amber-500/10'
                      : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/80'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono text-xs font-bold text-amber-400">{preset.sku}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                      preset.statusColor === 'danger'
                        ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                        : preset.statusColor === 'warning'
                        ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                        : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                    }`}>
                      {preset.statusBadge}
                    </span>
                  </div>
                  <h4 className="text-xs font-semibold text-white truncate">{preset.name}</h4>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2 pt-2 border-t border-slate-800/80">
                    <span>{preset.zoneName}</span>
                    <span className="font-mono text-slate-300">Stock: {preset.data.stock_level}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Main 2-Column Workspace: Left (Telemetry & Sensitivity) + Right (Intelligence Results & Digital Twin) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LEFT: SKU Telemetry & What-If Sandbox (7 cols) */}
            <Card className="lg:col-span-7 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                <div>
                  <h2 className="text-base font-semibold text-white">SKU Telemetry & What-If Sandbox</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Adjust key inventory drivers to test operational resilience in real time
                  </p>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs">
                  <Sliders className="w-3.5 h-3.5 text-amber-400" />
                  <span className="font-mono text-slate-300">Active SKU: {SKU_PRESETS.find(p => p.id === selectedSkuId)?.sku || 'CUSTOM'}</span>
                </div>
              </div>

              {/* Real-time Inventory Runway Digital Twin Banner */}
              <div className={`p-4 rounded-xl border transition-all ${
                bufferMargin < 0
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-200'
                  : bufferMargin < 20
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
              }`}>
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    {bufferMargin < 0 ? (
                      <ShieldAlert className="w-4 h-4 text-rose-400" />
                    ) : (
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    )}
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                      Inventory Runway & Buffer Status
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-950/80 border border-slate-800 text-white">
                    {daysOfSupply} Days of Supply
                  </span>
                </div>

                {/* Visual Buffer Runway Bar */}
                <div className="space-y-1.5 my-2">
                  <div className="h-2.5 w-full bg-slate-900 rounded-full overflow-hidden flex border border-slate-800">
                    <div
                      className={`h-full transition-all duration-300 ${
                        bufferMargin < 0 ? 'bg-rose-500' : bufferMargin < 20 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(8, (stockLevel / Math.max(reorderPoint * 1.5, stockLevel, 100)) * 100))}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] font-mono text-slate-400">
                    <span>On-Hand: <strong className="text-white">{stockLevel}</strong> units</span>
                    <span>Reorder Point: <strong className="text-amber-400">{reorderPoint}</strong> units</span>
                    <span>Lead Time Depletion: <strong className="text-sky-400">{leadTimeExposure}</strong> units</span>
                  </div>
                </div>

                <p className="text-xs leading-relaxed text-slate-300 mt-2">
                  {bufferMargin < 0
                    ? `Critical supply deficit of ${Math.abs(bufferMargin)} units during the ${leadTime}-day supplier lead time window. Stockout will occur before reorder arrives.`
                    : `Safe buffer margin of +${bufferMargin} units above projected lead-time consumption.`}
                </p>
              </div>

              {/* 3 Interactive "What-If" Sliders */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between pb-1 border-b border-slate-800/80">
                  <span className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Gauge className="w-3.5 h-3.5 text-amber-400" />
                    Live Sensitivity Simulator
                  </span>
                  <span className="text-[10px] text-slate-400">Drag to test scenario</span>
                </div>

                {/* Slider 1: Stock Level */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300">On-Hand Stock Level:</span>
                    <span className="font-mono text-amber-400 font-bold">{mlInput.stock_level} units</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="500"
                    step="5"
                    value={mlInput.stock_level}
                    onChange={(e) => setMlInput({ ...mlInput, stock_level: Number(e.target.value) })}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>0 (Depleted)</span>
                    <span>250 (Mid)</span>
                    <span>500 (Max Capacity)</span>
                  </div>
                </div>

                {/* Slider 2: Daily Demand */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300">Daily Demand Velocity:</span>
                    <span className="font-mono text-sky-400 font-bold">{mlInput.daily_demand} units/day</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="40"
                    step="1"
                    value={mlInput.daily_demand}
                    onChange={(e) => setMlInput({ ...mlInput, daily_demand: Number(e.target.value) })}
                    className="w-full accent-sky-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>1 unit/day</span>
                    <span>20 units/day</span>
                    <span>40 units/day (Surge)</span>
                  </div>
                </div>

                {/* Slider 3: Supplier Lead Time */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300">Supplier Lead Time:</span>
                    <span className="font-mono text-purple-400 font-bold">{mlInput.lead_time_days} days</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="21"
                    step="1"
                    value={mlInput.lead_time_days}
                    onChange={(e) => setMlInput({ ...mlInput, lead_time_days: Number(e.target.value) })}
                    className="w-full accent-purple-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>1 day (Instant)</span>
                    <span>10 days (Standard)</span>
                    <span>21 days (Protracted)</span>
                  </div>
                </div>
              </div>

              {/* Categorized Parameter Groups (Inventory vs Demand/Facility) */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                  <button
                    type="button"
                    onClick={() => setParamGroup('inventory')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      paramGroup === 'inventory'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Inventory & Cost Variables
                  </button>
                  <button
                    type="button"
                    onClick={() => setParamGroup('demand')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      paramGroup === 'demand'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Demand Dynamics & Facility
                  </button>
                </div>

                {paramGroup === 'inventory' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 animate-in fade-in">
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
                      label="Picking Time"
                      type="number"
                      unit="Seconds"
                      value={mlInput.picking_time_seconds}
                      onChange={(e) => setMlInput({ ...mlInput, picking_time_seconds: Number(e.target.value) })}
                    />
                    <Input
                      label="Unit Price"
                      type="number"
                      unit="$ / SKU"
                      value={mlInput.unit_price}
                      onChange={(e) => setMlInput({ ...mlInput, unit_price: Number(e.target.value) })}
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
                      label="Holding Cost"
                      type="number"
                      step="0.05"
                      unit="$ / day"
                      value={mlInput.holding_cost_per_unit_day}
                      onChange={(e) => setMlInput({ ...mlInput, holding_cost_per_unit_day: Number(e.target.value) })}
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 animate-in fade-in">
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
                      unit="Index"
                      value={mlInput.item_popularity_score}
                      onChange={(e) => setMlInput({ ...mlInput, item_popularity_score: Number(e.target.value) })}
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
                    <Select
                      label="Category"
                      value={mlInput.category}
                      onChange={(e) => setMlInput({ ...mlInput, category: e.target.value })}
                      options={[
                        { value: 'Electronics', label: 'Electronics & Sensors' },
                        { value: 'Apparel', label: 'Apparel & Workwear' },
                        { value: 'Automotive', label: 'Automotive & Heavy Parts' },
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
                )}
              </div>

              {mlError && (
                <div className="p-3 bg-rose-950/40 border border-rose-500/40 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-400" />
                  <span>{mlError}</span>
                </div>
              )}

              {/* Action Button */}
              <Button
                className="w-full"
                size="lg"
                variant="primary"
                icon={<Zap className="w-4 h-4" />}
                isLoading={isMlLoading}
                loadingText="Computing XGBoost Inferences..."
                disabled={!systemStatus.xgboost_ready}
                onClick={onMlPredict}
              >
                Run XGBoost Intelligence
              </Button>
            </Card>

            {/* RIGHT: Intelligence Results & Digital Twin (5 cols) */}
            <Card className="lg:col-span-5 flex flex-col justify-between min-h-[520px] space-y-5">
              <div className="pb-3 border-b border-slate-800/80 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-amber-400" />
                  <h2 className="text-base font-semibold text-white">Intelligence Results</h2>
                </div>
                {mlResults && (
                  <Badge
                    variant={mlResults.risk_level === 'HIGH' ? 'danger' : mlResults.risk_level === 'MEDIUM' ? 'warning' : 'success'}
                    size="sm"
                    dot
                  >
                    {mlResults.risk_level} Risk
                  </Badge>
                )}
              </div>

              {mlResults ? (
                <div className="space-y-4">
                  {/* Glowing Risk Dial & Assessment */}
                  <div
                    className={`p-4 rounded-xl border transition-all ${
                      mlResults.risk_level === 'HIGH'
                        ? 'bg-rose-500/10 border-rose-500/30'
                        : mlResults.risk_level === 'MEDIUM'
                        ? 'bg-amber-500/10 border-amber-500/30'
                        : 'bg-emerald-500/10 border-emerald-500/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                          Stockout Probability (XGBoost)
                        </span>
                        <div className="flex items-baseline gap-2 mt-1">
                          <span className={`text-3xl font-bold font-mono ${
                            mlResults.risk_level === 'HIGH' ? 'text-rose-400' : mlResults.risk_level === 'LOW' ? 'text-emerald-400' : 'text-amber-400'
                          }`}>
                            {(mlResults.stockout_probability * 100).toFixed(1)}%
                          </span>
                          <span className="text-xs font-semibold uppercase text-slate-300">
                            {mlResults.risk_level} RISK
                          </span>
                        </div>
                      </div>

                      {/* Mini Radial Indicator Ring */}
                      <div className="relative w-14 h-14 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                          <path
                            className="text-slate-800"
                            strokeWidth="3.5"
                            stroke="currentColor"
                            fill="none"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          />
                          <path
                            className={mlResults.risk_level === 'HIGH' ? 'text-rose-500' : mlResults.risk_level === 'MEDIUM' ? 'text-amber-500' : 'text-emerald-500'}
                            strokeDasharray={`${Math.round(mlResults.stockout_probability * 100)}, 100`}
                            strokeWidth="3.5"
                            strokeLinecap="round"
                            stroke="currentColor"
                            fill="none"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          />
                        </svg>
                        <span className="absolute text-[10px] font-mono font-bold text-white">
                          {(mlResults.stockout_probability * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1.5 my-3">
                      <ProgressBar
                        value={mlResults.stockout_probability * 100}
                        color={mlResults.risk_level === 'HIGH' ? 'red' : mlResults.risk_level === 'MEDIUM' ? 'amber' : 'green'}
                        height="h-2"
                      />
                    </div>

                    <p className="text-xs leading-relaxed text-slate-300">
                      {mlResults.risk_level === 'HIGH'
                        ? 'Projected runout horizon is under 7 days. On-hand stock is insufficient to buffer consumption while supplier order is fulfilled.'
                        : 'Operational buffer is nominal. Fulfillment rate and turnover velocity remain well within safe safety stock tolerances.'}
                    </p>
                  </div>

                  {/* Secondary Metrics: Demand Forecast & KPI */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800/80 text-center">
                      <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-0.5">
                        7-Day Demand Forecast
                      </span>
                      <span className="text-2xl font-bold text-white font-mono">
                        {mlResults.demand_forecast.toFixed(1)}
                      </span>
                      <span className="text-[10px] text-slate-400 ml-1">units</span>
                    </div>

                    <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800/80 text-center">
                      <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-0.5">
                        Performance KPI
                      </span>
                      <span className="text-2xl font-bold text-amber-400 font-mono">
                        {mlResults.performance_kpi.toFixed(3)}
                      </span>
                      <span className="text-[10px] text-slate-400 ml-1">Score</span>
                    </div>
                  </div>

                  {/* SHAP Feature Contribution Bars */}
                  {mlResults.explanations?.stockout_risk && (
                    <div className="p-3.5 bg-slate-900/60 rounded-xl border border-slate-800/80 space-y-2.5">
                      <div className="flex justify-between items-center pb-2 border-b border-slate-800/60">
                        <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                          Key Risk Factors (SHAP Attribution)
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">Game-Theoretic</span>
                      </div>

                      <div className="space-y-2">
                        {mlResults.explanations.stockout_risk.slice(0, 4).map((f, i) => (
                          <div key={i} className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-300 font-medium capitalize truncate">
                                {f.feature.replace(/_/g, ' ')}
                              </span>
                              <span className="font-mono text-amber-400 font-medium text-[11px]">
                                {(f.importance * 100).toFixed(1)}% influence
                              </span>
                            </div>
                            <ProgressBar value={Math.min(100, f.importance * 120)} color="amber" height="h-1.5" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Closed-Loop Action: AMR Restock Dispatch */}
                  <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                        <Truck className="w-3.5 h-3.5 text-amber-400" />
                        <span>Closed-Loop Replenishment</span>
                      </div>
                      <Badge variant={dispatchedMission ? 'success' : 'neutral'} size="sm">
                        {dispatchedMission ? 'Mission Dispatched' : 'Ready to Dispatch'}
                      </Badge>
                    </div>

                    {dispatchedMission ? (
                      <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-xs space-y-2">
                        <div className="flex items-center gap-2 text-emerald-300 font-medium">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                          <span>Mission #{dispatchedMission} transmitted to AMR-02.</span>
                        </div>
                        {onNavigate && (
                          <button
                            type="button"
                            onClick={() => onNavigate('simulation')}
                            className="w-full py-1.5 px-3 rounded-md bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <span>Watch AMR-02 in 2D Fleet Simulation</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ) : (
                      <Button
                        size="md"
                        variant={mlResults.risk_level === 'HIGH' ? 'primary' : 'outline'}
                        className="w-full text-xs font-semibold"
                        icon={<Send className="w-3.5 h-3.5" />}
                        onClick={handleDispatchRestock}
                      >
                        ⚡ Dispatch Restock Mission to AMR Fleet
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                /* Pre-Inference Digital Twin Overview */
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                    <Database className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-semibold text-white">Ready for XGBoost Inference</h3>
                  <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
                    Select any SKU preset above or adjust the sensitivity sliders to execute real-time 0.92 ROC-AUC stockout forecasting.
                  </p>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={onMlPredict}
                    icon={<Zap className="w-3.5 h-3.5" />}
                  >
                    Execute XGBoost Model
                  </Button>
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* TAB 2: MODEL COMPARISON */}
      {activeSubTab === 'comparison' && (
        <Card className="space-y-6">
          <div className="pb-3 border-b border-slate-800/80 flex justify-between items-center">
            <div>
              <h2 className="text-base font-semibold text-white">Cross-Family Model Benchmark</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Empirical evaluation on 481 test items (351 Low Risk, 130 High Risk)
              </p>
            </div>
            <Badge variant="primary" size="sm">Academic Benchmark</Badge>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800/80 text-slate-400 uppercase font-mono">
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
              <tbody className="divide-y divide-slate-800/60">
                {/* XGBoost Champion */}
                <tr className="bg-amber-500/5 font-medium">
                  <td className="py-3.5 px-4 flex items-center gap-2">
                    <span className="font-semibold text-white">Tuned XGBoost</span>
                    <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[10px] font-semibold border border-amber-500/30">
                      CHAMPION
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-300">spw=2.68, lr=0.03, depth=4</td>
                  <td className="py-3.5 px-4 font-mono text-slate-200">0.8399</td>
                  <td className="py-3.5 px-4 font-mono font-semibold text-amber-400">86.92% (113/130)</td>
                  <td className="py-3.5 px-4 font-mono text-slate-200">65.32%</td>
                  <td className="py-3.5 px-4 font-mono text-slate-200">0.7459</td>
                  <td className="py-3.5 px-4 font-mono font-semibold text-white">0.9197</td>
                  <td className="py-3.5 px-4 font-mono text-slate-200">0.7779</td>
                </tr>

                {/* Random Forest */}
                <tr>
                  <td className="py-3.5 px-4 font-medium text-slate-200">Random Forest</td>
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
                  <td className="py-3.5 px-4 font-medium text-slate-200">Logistic Regression</td>
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

          <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800/80 text-xs text-slate-300 space-y-1.5">
            <h4 className="font-semibold text-white">Operational Asymmetric Loss Finding:</h4>
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
          <div className="pb-3 border-b border-slate-800/80 flex justify-between items-center">
            <div>
              <h2 className="text-base font-semibold text-white">SHAP Game-Theoretic Feature Importance</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Calculated via shap.TreeExplainer on 38 engineered operational warehouse features
              </p>
            </div>
            <Badge variant="primary" size="sm">TreeExplainer Global</Badge>
          </div>

          <div className="space-y-3 max-w-2xl">
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
              <div key={idx} className="p-3 bg-slate-900/60 rounded-lg border border-slate-800/80 space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-slate-400">{idx + 1}.</span>
                    <span className="font-semibold text-white font-mono">{item.name}</span>
                    <span className="text-[11px] text-slate-400 hidden sm:inline">({item.desc})</span>
                  </div>
                  <span className="font-mono text-xs text-amber-400 font-medium">
                    SHAP: {item.shap.toFixed(4)} | Gain: {item.gain}
                  </span>
                </div>
                <ProgressBar
                  value={Math.min(100, (item.shap / 2.6211) * 100)}
                  color="amber"
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
          <div className="pb-3 border-b border-slate-800/80 flex justify-between items-center">
            <div>
              <h2 className="text-base font-semibold text-white">Diagnostic Error Analysis</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Confusion matrix breakdown on untouched test set (481 samples)
              </p>
            </div>
            <Badge variant="purple" size="sm">Confusion Matrix</Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80">
              <span className="text-[10px] font-semibold uppercase text-emerald-400 tracking-wider">True Positives</span>
              <p className="text-2xl font-bold text-white font-mono my-1">113</p>
              <span className="text-xs text-slate-400">Stockouts Accurately Caught (86.92% Recall)</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80">
              <span className="text-[10px] font-semibold uppercase text-blue-400 tracking-wider">True Negatives</span>
              <p className="text-2xl font-bold text-white font-mono my-1">291</p>
              <span className="text-xs text-slate-400">Safe SKUs Confirmed (60.50% of test set)</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80">
              <span className="text-[10px] font-semibold uppercase text-amber-400 tracking-wider">False Positives</span>
              <p className="text-2xl font-bold text-white font-mono my-1">60</p>
              <span className="text-xs text-slate-400">Over-Alerts (Precautionary audits)</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80">
              <span className="text-[10px] font-semibold uppercase text-rose-400 tracking-wider">False Negatives</span>
              <p className="text-2xl font-bold text-white font-mono my-1">17</p>
              <span className="text-xs text-slate-400">Missed Stockouts (Borderline runouts)</span>
            </div>
          </div>

          <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800/80 text-xs text-slate-300 space-y-1.5">
            <h4 className="font-semibold text-white">False Negative Deep Dive:</h4>
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
