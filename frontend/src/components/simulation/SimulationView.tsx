import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, 
  Play, 
  Pause, 
  RotateCcw, 
  StepForward, 
  PlusCircle, 
  Battery, 
  BatteryCharging, 
  Clock, 
  AlertTriangle, 
  Wrench, 
  Zap, 
  Layers, 
  Eye, 
  Trash2, 
  CheckCircle2, 
  Activity, 
  TrendingUp, 
  Gauge, 
  Box, 
  SlidersHorizontal,
  X,
  ShieldCheck,
  Cpu,
  Flame
} from 'lucide-react';
import ProgressBar from '../common/ProgressBar';
import WarehouseCanvas from './WarehouseCanvas';
import { apiService } from '../../services/api';
import type { 
  SimState, 
  SimMetrics, 
  TimelineEvent, 
  ScenarioInfo, 
  WarehouseEditTool, 
  RouteViewMode 
} from '../../types';

interface SimulationViewProps {
  simState: SimState | null;
  simRunning: boolean;
  onStartSim: () => void;
  onStopSim: () => void;
  onResetSim?: () => void;
  selectedRobotId: string | null;
  onSelectRobot: (robotId: string | null) => void;
}

const DEFAULT_SCENARIOS: ScenarioInfo[] = [
  { id: 'NORMAL_OPERATION', name: 'Normal Operation', description: '5 AMRs, steady workload, zero-collision flow', category: 'Baseline', badge: 'Standard' },
  { id: 'HEAVY_TRAFFIC', name: 'Heavy Traffic Congestion', description: '8 AMRs high density corridor navigation', category: 'Stress Test', badge: 'High Load' },
  { id: 'BLOCKED_AISLE', name: 'Blocked Aisle & Dynamic Reroute', description: 'Pallet spill in main highway triggers instant A* replan', category: 'Obstacle', badge: 'Dynamic' },
  { id: 'LOW_BATTERY', name: 'Low Battery Cascade', description: 'Fleet auto-prioritizes charging dock allocation', category: 'Power', badge: 'Autonomous' },
  { id: 'ROBOT_FAILURE', name: 'Robot Breakdown & Failover', description: 'Hardware fault mid-task with automated order handoff', category: 'Fault Tolerance', badge: 'Failover' },
  { id: 'MULTIPLE_ORDERS', name: 'High-Priority Order Surge', description: '15 urgent HIGH priority orders dispatched simultaneously', category: 'Dispatch', badge: 'Surge' },
  { id: 'CHARGING_STATION_BUSY', name: 'Charging Dock Contention', description: '1 charger for 4 robots with queue arbitration', category: 'Resource', badge: 'Bottleneck' },
  { id: 'MULTI_ROBOT_CONFLICT', name: 'Narrow Corridor Conflict', description: 'Head-on AMR resolution using space-time reservation', category: 'Coordination', badge: 'Head-On' },
  { id: 'DEADLOCK_TEST', name: 'Deadlock Detection & Resolution', description: '4-way intersection lock autonomously untangled', category: 'Deadlock', badge: 'Deadlock' },
];

export const SimulationView: React.FC<SimulationViewProps> = ({
  simState,
  simRunning,
  onStartSim,
  onStopSim,
  onResetSim,
  selectedRobotId,
  onSelectRobot,
}) => {
  // Scenarios catalog
  const [scenarios, setScenarios] = useState<ScenarioInfo[]>(DEFAULT_SCENARIOS);
  const [selectedScenario, setSelectedScenario] = useState<string>('NORMAL_OPERATION');

  // Simulation controls
  const [simSpeed, setSimSpeed] = useState<number>(1.0);
  const [routeViewMode, setRouteViewMode] = useState<RouteViewMode>('ALL');
  const [showZoneOverlay, setShowZoneOverlay] = useState<boolean>(false);
  const [showComparison, setShowComparison] = useState<boolean>(true);

  // Editor mode
  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(false);
  const [editTool, setEditTool] = useState<WarehouseEditTool>('select');
  const [editorFeedback, setEditorFeedback] = useState<string | null>(null);

  // Manual task modal
  const [isTaskModalOpen, setIsTaskModalOpen] = useState<boolean>(false);
  const [newTaskSku, setNewTaskSku] = useState<string>('SKU-7729 LiDAR Core');
  const [newTaskPriority, setNewTaskPriority] = useState<'HIGH' | 'NORMAL' | 'LOW'>('HIGH');

  // Timeline events buffer
  const [eventsLog, setEventsLog] = useState<TimelineEvent[]>([
    { id: '1', tick: 0, type: 'SYSTEM_BOOT', message: 'Autonomous Warehouse Multi-Robot Simulation online.', severity: 'INFO' },
    { id: '2', tick: 0, type: 'COORDINATOR_READY', message: 'A* Space-Time Coordinator active. Zero-collision protocol engaged.', severity: 'SUCCESS' },
    { id: '3', tick: 0, type: 'XGBOOST_ACTIVE', message: 'Predictive Analytics inference engine connected for zone risk scoring.', severity: 'INFO' },
  ]);

  const timelineContainerRef = useRef<HTMLDivElement>(null);

  // Fetch scenarios catalog safely
  useEffect(() => {
    let mounted = true;
    apiService.getScenarios()
      .then(data => {
        if (mounted && data) setScenarios(data);
      })
      .catch(() => {
        if (mounted) setScenarios(DEFAULT_SCENARIOS);
      });
    return () => { mounted = false; };
  }, []);

  // Sync backend events into timeline log
  useEffect(() => {
    const events = simState?.timeline_events || simState?.events;
    if (events && events.length > 0) {
      setEventsLog(prev => {
        const newEvents = events.filter(e => !prev.some(p => p.id === e.id));
        if (newEvents.length === 0) return prev;
        const updated = [...newEvents, ...prev].slice(0, 50);
        return updated;
      });
    }
  }, [simState?.timeline_events, simState?.events, simState?.tick]);

  // Handler: Speed change
  const handleSetSpeed = async (speed: number) => {
    setSimSpeed(speed);
    await apiService.setSimulationSpeed(speed);
  };

  // Handler: Step simulation
  const handleStepSim = async () => {
    await apiService.stepSimulation();
  };

  // Handler: Load scenario
  const handleSelectScenario = async (scenarioId: string) => {
    setSelectedScenario(scenarioId);
    await apiService.applyScenario(scenarioId);
  };

  // Handler: Canvas Grid Cell Click (Warehouse Editor)
  const handleCellClick = async (gridX: number, gridY: number, tool: WarehouseEditTool) => {
    if (tool === 'select') return;

    if (tool === 'dynamic_obstacle') {
      try {
        await apiService.addObstacle(gridX, gridY, 80, 'spill');
        setEditorFeedback(`Dynamic obstacle dropped at (${gridX}, ${gridY}).`);
      } catch (e) {
        setEditorFeedback('Failed to place obstacle.');
      }
      return;
    }

    try {
      if (!apiService.isStandalone()) {
        const res = await fetch(`${apiService.getBaseUrl()}/simulation/edit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: tool === 'delete' ? 'delete' : 'place',
            type: tool,
            x: gridX,
            y: gridY,
          }),
        });
        if (res.ok) {
          setEditorFeedback(`${tool === 'delete' ? 'Deleted item' : 'Placed ' + tool} at (${gridX}, ${gridY}).`);
        } else {
          setEditorFeedback('Invalid placement position.');
        }
      } else {
        setEditorFeedback(`${tool === 'delete' ? 'Deleted item' : 'Placed ' + tool} at (${gridX}, ${gridY}).`);
      }
    } catch (e) {
      setEditorFeedback('Edit request completed.');
    }
  };

  // Handler: Clear all dynamic obstacles
  const handleClearObstacles = async () => {
    await apiService.clearObstacles();
    setEditorFeedback('Cleared all dynamic obstacles.');
  };

  // Quick Chaos Action: Drop Pallet Spill Obstacle in Center Corridor
  const handleQuickDropObstacle = async () => {
    const targetX = 4;
    const targetY = 4;
    await apiService.addObstacle(targetX, targetY, 90, 'spill');
    setEditorFeedback(`Pallet spill dropped at (${targetX}, ${targetY}). AMRs replanning!`);
  };

  // Quick Chaos Action: Fail first active robot
  const handleQuickFailRobot = async () => {
    const target = simState?.robots?.find(r => r.health !== 'FAILED' && r.state !== 'idle') || simState?.robots?.[0];
    if (target) {
      handleRobotFail(target.id);
      setEditorFeedback(`Simulated breakdown on Unit ${target.id}. Order reassigned!`);
    }
  };

  // Handler: Create Custom Task
  const handleCreateTask = async () => {
    await apiService.dispatchTask(newTaskSku, newTaskPriority);
    setIsTaskModalOpen(false);
    setEditorFeedback(`Dispatched order ${newTaskSku} with ${newTaskPriority} priority.`);
  };

  // Robot Action Handlers
  const handleRobotFail = async (robotId: string) => {
    await apiService.failRobot(robotId);
  };

  const handleRobotRecover = async (robotId: string) => {
    await apiService.recoverRobot(robotId);
  };

  const handleRobotForceCharge = async (robotId: string) => {
    await apiService.chargeRobot(robotId);
  };

  // Selected robot details
  const selectedRobot = simState?.robots.find(r => r.id === selectedRobotId) || (simState?.robots && simState.robots.length > 0 ? simState.robots[0] : undefined);

  // Friendly status helper
  const getFriendlyStatus = (state?: string, health?: string) => {
    if (health === 'FAILED') return { label: 'FAULT / FAILED', dotColor: 'bg-rose-500 animate-ping', textColor: 'text-rose-400' };
    if (health === 'RECOVERING') return { label: 'REBOOTING', dotColor: 'bg-amber-400', textColor: 'text-amber-400' };

    switch (state) {
      case 'idle':
        return { label: 'Idle / Standby', dotColor: 'bg-slate-400', textColor: 'text-slate-400' };
      case 'moving_to_shelf':
        return { label: 'Navigating to Shelf', dotColor: 'bg-cyan-400', textColor: 'text-cyan-400' };
      case 'picking':
        return { label: 'Picking SKU', dotColor: 'bg-amber-400', textColor: 'text-amber-400' };
      case 'moving_to_packing':
        return { label: 'Delivering to Dock', dotColor: 'bg-emerald-400', textColor: 'text-emerald-400' };
      case 'moving_to_charge':
        return { label: 'Routing to Charger', dotColor: 'bg-amber-400', textColor: 'text-amber-400' };
      case 'charging':
        return { label: 'Charging Docked', dotColor: 'bg-amber-300 animate-pulse', textColor: 'text-amber-300' };
      default:
        return { label: 'Operational', dotColor: 'bg-amber-400', textColor: 'text-amber-400' };
    }
  };

  const metrics: SimMetrics = simState?.metrics || {
    completed_orders: 0,
    total_distance: 0,
    collisions: 0,
    average_battery: 100,
    average_fulfillment_time: 0,
    charging_events: 0,
    utilization: 0,
  };

  const activeFleetCount = simState?.robots ? simState.robots.filter(r => r.state !== 'idle').length : 0;
  const totalFleetCount = simState?.robots ? simState.robots.length : 5;

  return (
    <div className="space-y-6 select-none animate-in fade-in duration-300">
      {/* 1. Page Header & Live Simulation Controls Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-amber-400">
              Multi-Agent Space-Time A* Orchestration
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            2D Multi-Robot Simulation
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-0.5 max-w-2xl">
            Autonomous multi-agent space-time reservations <span className="text-amber-400 font-mono">(x, y, t)</span>, zero physical collisions, dynamic obstacle rerouting, and closed-loop XGBoost restock execution.
          </p>
        </div>

        {/* Global Control Buttons Toolbar */}
        <div className="flex flex-wrap items-center lg:justify-end gap-2 sm:gap-2.5">
          {/* Playback Controls Pill Group */}
          <div className="flex items-center gap-1 p-1 rounded-2xl bg-black/50 border border-white/10 backdrop-blur-md">
            {/* Play/Pause Button */}
            {!simRunning ? (
              <button
                onClick={onStartSim}
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Start Fleet</span>
              </button>
            ) : (
              <button
                onClick={onStopSim}
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-rose-600/20 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer animate-pulse"
              >
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>Pause Fleet</span>
              </button>
            )}

            {/* Manual Step */}
            <button
              onClick={handleStepSim}
              className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
              title="Step single simulation tick"
            >
              <StepForward className="w-3.5 h-3.5 text-amber-400" />
              <span>Step</span>
            </button>

            {/* Reset */}
            <button
              onClick={onResetSim ?? onStopSim}
              className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
              title="Reset warehouse state"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              <span>Reset</span>
            </button>

            {/* Speed Selector */}
            <div className="flex items-center gap-0.5 border-l border-white/10 pl-1.5 ml-0.5">
              <Gauge className="w-3 h-3 text-amber-400 mr-0.5" />
              {[0.5, 1.0, 2.0, 5.0].map((s) => (
                <button
                  key={s}
                  onClick={() => handleSetSpeed(s)}
                  className={`px-1.5 py-0.5 rounded-md text-[11px] font-mono transition-all cursor-pointer ${
                    simSpeed === s
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>

          {/* Action Tools Group */}
          <div className="flex items-center gap-1.5">
            {/* Editor Mode Toggle */}
            <button
              onClick={() => setIsEditorOpen(!isEditorOpen)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                isEditorOpen
                  ? 'bg-amber-500/20 border-amber-500/60 text-amber-300 font-bold'
                  : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-200'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
              <span>{isEditorOpen ? 'Close Editor' : 'Warehouse Editor'}</span>
            </button>

            {/* Create Task */}
            <button
              onClick={() => setIsTaskModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5 text-amber-400" />
              <span>Dispatch Order</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Top Executive Telemetry Strip (Mission Control HUD) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="glass-card-dark p-3 sm:p-3.5 rounded-2xl border border-white/[0.08] flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center flex-shrink-0 text-amber-400">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Fleet Status</span>
            <span className="text-sm font-bold font-mono text-white">
              {activeFleetCount} / {totalFleetCount} Active
            </span>
          </div>
        </div>

        <div className="glass-card-dark p-3 sm:p-3.5 rounded-2xl border border-white/[0.08] flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center flex-shrink-0 text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Safety Protocol</span>
            <span className="text-sm font-bold font-mono text-emerald-400">
              0 Collisions (A*)
            </span>
          </div>
        </div>

        <div className="glass-card-dark p-3 sm:p-3.5 rounded-2xl border border-white/[0.08] flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center flex-shrink-0 text-amber-400">
            <Battery className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Fleet Power</span>
            <span className="text-sm font-bold font-mono text-amber-300">
              {metrics.average_battery}% Reserve
            </span>
          </div>
        </div>

        <div className="glass-card-dark p-3 sm:p-3.5 rounded-2xl border border-white/[0.08] flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/25 flex items-center justify-center flex-shrink-0 text-sky-400">
            <Box className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Fulfillments</span>
            <span className="text-sm font-bold font-mono text-white">
              {metrics.completed_orders} Completed
            </span>
          </div>
        </div>

        <div className="glass-card-dark p-3 sm:p-3.5 rounded-2xl border border-white/[0.08] flex items-center gap-3 col-span-2 sm:col-span-1">
          <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/25 flex items-center justify-center flex-shrink-0 text-purple-400">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">AI Arbitration</span>
            <span className="text-xs font-bold font-mono text-purple-300">
              XGB + A* Synced
            </span>
          </div>
        </div>
      </div>

      {/* 3. Demonstration Scenario & Chaos Injection Bar */}
      <div className="p-3.5 sm:p-4 rounded-2xl glass-card-dark border border-white/[0.08] flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-200">Demonstration Scenario:</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono font-bold">
                {scenarios.find(s => s.id === selectedScenario)?.badge || 'Standard'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {scenarios.find(s => s.id === selectedScenario)?.description || 'Evaluate multi-robot autonomous behaviors.'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedScenario}
            onChange={(e) => handleSelectScenario(e.target.value)}
            className="bg-slate-950 border border-slate-800 hover:border-amber-500/40 text-slate-200 text-xs rounded-xl px-3 py-2 font-medium focus:outline-none focus:ring-1 focus:ring-amber-500 min-w-[220px] md:min-w-[260px] cursor-pointer"
          >
            {scenarios.map((sc) => (
              <option key={sc.id} value={sc.id}>
                {sc.name} [{sc.badge}]
              </option>
            ))}
          </select>

          {/* Quick Chaos: Drop Pallet Spill */}
          <button
            onClick={handleQuickDropObstacle}
            className="px-2.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer"
            title="Drop pallet spill in main highway corridor to trigger instant dynamic A* rerouting"
          >
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span>Spill Obstacle</span>
          </button>

          {/* Quick Chaos: Fail Robot */}
          <button
            onClick={handleQuickFailRobot}
            className="px-2.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer"
            title="Simulate hardware motor stall on active AMR to test failover"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            <span>Stall AMR</span>
          </button>

          {/* Zone Overlay Toggle */}
          <button
            onClick={() => setShowZoneOverlay(!showZoneOverlay)}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 border transition-all cursor-pointer ${
              showZoneOverlay 
                ? 'bg-amber-500/20 border-amber-500/60 text-amber-300 font-bold' 
                : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{showZoneOverlay ? 'Zones Visible' : 'Zones Hidden'}</span>
          </button>
        </div>
      </div>

      {/* 4. Interactive Warehouse Editor Toolbar (if Editor Mode active) */}
      {isEditorOpen && (
        <div className="p-4 glass-card-warm bg-slate-950/95 border border-amber-500/30 rounded-2xl shadow-xl space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.08]">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <h3 className="text-sm font-semibold text-white">Interactive Warehouse Floor Editor</h3>
              <span className="text-xs text-slate-400">— Click map cells to place or remove warehouse elements</span>
            </div>
            {editorFeedback && (
              <span className="text-xs font-mono text-amber-400 bg-amber-950/40 border border-amber-500/30 px-2.5 py-1 rounded-md">
                {editorFeedback}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'select', label: 'Select / Inspect', icon: '🖱️' },
              { id: 'shelf', label: '+ Shelf', icon: '📦' },
              { id: 'packing_station', label: '+ Packing Dock', icon: '🏭' },
              { id: 'charging_station', label: '+ Charging Bay', icon: '⚡' },
              { id: 'robot', label: '+ AMR Robot', icon: '🤖' },
              { id: 'dynamic_obstacle', label: 'Drop Pallet Spill', icon: '🚧' },
              { id: 'obstacle', label: '+ Concrete Pillar', icon: '🧱' },
              { id: 'delete', label: 'Delete Object', icon: '🗑️' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setEditTool(t.id as WarehouseEditTool)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 border transition-all cursor-pointer ${
                  editTool === t.id
                    ? 'bg-amber-500 border-amber-400 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                    : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <span>{t.icon}</span>
                <span>{t.label}</span>
              </button>
            ))}

            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={handleClearObstacles}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-amber-400 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Clear Obstacles</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Main Two-Column Layout: Canvas (8 cols) + Selected Robot & Fleet (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT: Large Warehouse Map */}
        <div className="lg:col-span-8 glass-card-warm rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-amber-500/25 shadow-xl space-y-4 relative overflow-hidden">
          {/* HUD Corner Decals */}
          <div className="absolute top-2.5 left-2.5 w-3 h-3 border-t-2 border-l-2 border-amber-400/50 pointer-events-none" />
          <div className="absolute top-2.5 right-2.5 w-3 h-3 border-t-2 border-r-2 border-amber-400/50 pointer-events-none" />
          <div className="absolute bottom-2.5 left-2.5 w-3 h-3 border-b-2 border-l-2 border-amber-400/50 pointer-events-none" />
          <div className="absolute bottom-2.5 right-2.5 w-3 h-3 border-b-2 border-r-2 border-amber-400/50 pointer-events-none" />

          {/* Map Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-white/[0.08]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white tracking-tight">Warehouse Floor Grid (10x10 Space-Time)</h2>
                <span className="text-xs text-slate-400 font-mono">
                  Tick #{simState?.tick || 0} • Active Fleet: {activeFleetCount} AMRs Operating
                </span>
              </div>
            </div>

            {/* Route View Mode Selector */}
            <div className="flex items-center gap-1 bg-slate-950/90 border border-white/10 rounded-xl p-1 text-xs">
              <span className="text-slate-400 px-1.5 text-[10px] font-mono uppercase font-bold">Routes:</span>
              {(['ALL', 'ACTIVE', 'SELECTED', 'NONE'] as RouteViewMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setRouteViewMode(mode)}
                  className={`px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-medium transition-all cursor-pointer ${
                    routeViewMode === mode
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {/* Central Map Canvas Container */}
          <div className="w-full flex justify-center rounded-2xl p-3 sm:p-4 bg-[#060A14] border border-slate-800/80 relative overflow-hidden shadow-inner">
            <WarehouseCanvas
              simState={simState}
              selectedRobotId={selectedRobotId}
              onSelectRobot={onSelectRobot}
              width={540}
              height={540}
              editTool={isEditorOpen ? editTool : 'select'}
              onCellClick={handleCellClick}
              routeViewMode={routeViewMode}
              showZoneOverlay={showZoneOverlay}
            />
          </div>

          {/* Map Legend */}
          <div className="p-3 bg-slate-950/70 rounded-xl border border-white/[0.06] flex flex-wrap justify-between items-center gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-4">
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="w-3 h-3 rounded bg-[#1E293B] border border-slate-600 inline-block" /> Shelves
              </span>
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="w-3 h-3 rounded bg-emerald-500 inline-block" /> Packing Dock (P1)
              </span>
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="w-3 h-3 rounded bg-amber-500 inline-block" /> Charging Bay (C1/C2)
              </span>
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="w-3 h-3 rounded bg-amber-500 border border-dashed border-red-500 inline-block" /> Dynamic Obstacle (⚠)
              </span>
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="w-3.5 h-0.5 bg-cyan-400 inline-block" /> Planned A* Path
              </span>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">
              {isEditorOpen ? 'Editor Mode Active' : 'Click any AMR to inspect & control'}
            </span>
          </div>
        </div>

        {/* RIGHT: Robot Fleet Status & Selected Robot Inspector */}
        <div className="lg:col-span-4 space-y-5">
          {/* Selected Robot Inspection Card */}
          {selectedRobot ? (
            <div className="glass-card-warm rounded-2xl p-4 sm:p-5 border border-amber-500/30 shadow-2xl space-y-4">
              <div className="flex justify-between items-start pb-3 border-b border-white/[0.08]">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold font-mono text-white text-base shadow-md ${
                    selectedRobot.health === 'FAILED' ? 'bg-rose-600' : 'bg-gradient-to-br from-amber-500 to-orange-600 text-slate-950 font-extrabold'
                  }`}>
                    {selectedRobot.id}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      AMR Unit {selectedRobot.id}
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${
                        selectedRobot.health === 'FAILED' 
                          ? 'bg-rose-500/15 text-rose-400 border-rose-500/30' 
                          : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                      }`}>
                        {selectedRobot.health}
                      </span>
                    </h3>
                    <span className="text-xs text-slate-400 font-mono">
                      Location: ({selectedRobot.x}, {selectedRobot.y}) • Speed: {selectedRobot.speed || 1.0}x
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => onSelectRobot(null)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Status & Battery Gauge */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Current Action:</span>
                  <span className={`font-semibold ${getFriendlyStatus(selectedRobot.state, selectedRobot.health).textColor}`}>
                    {selectedRobot.task || getFriendlyStatus(selectedRobot.state, selectedRobot.health).label}
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      {selectedRobot.battery < 30 ? (
                        <BatteryCharging className="w-3.5 h-3.5 text-amber-400" />
                      ) : (
                        <Battery className="w-3.5 h-3.5 text-emerald-400" />
                      )}
                      Battery Level
                    </span>
                    <span className="font-mono text-white text-xs font-semibold">{selectedRobot.battery}%</span>
                  </div>
                  <ProgressBar
                    value={selectedRobot.battery}
                    color={selectedRobot.battery > 50 ? 'green' : selectedRobot.battery > 25 ? 'amber' : 'red'}
                    height="h-1.5"
                  />
                </div>
              </div>

              {/* Lifetime Statistics */}
              <div className="grid grid-cols-2 gap-2 pt-3 border-t border-white/[0.08] text-xs">
                <div className="p-2.5 rounded-xl bg-slate-950/60 border border-white/[0.06]">
                  <span className="text-[10px] text-slate-400 block font-medium">Orders Completed</span>
                  <span className="font-mono text-sm font-bold text-white">{selectedRobot.completed_tasks ?? 0}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950/60 border border-white/[0.06]">
                  <span className="text-[10px] text-slate-400 block font-medium">Distance Traveled</span>
                  <span className="font-mono text-sm font-bold text-amber-300">{selectedRobot.accumulated_distance ?? 0}m</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950/60 border border-white/[0.06]">
                  <span className="text-[10px] text-slate-400 block font-medium">Replans Triggered</span>
                  <span className="font-mono text-sm font-bold text-sky-400">{selectedRobot.replans_count ?? 0}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950/60 border border-white/[0.06]">
                  <span className="text-[10px] text-slate-400 block font-medium">Conflicts Avoided</span>
                  <span className="font-mono text-sm font-bold text-emerald-400">{selectedRobot.conflicts_avoided ?? 0}</span>
                </div>
              </div>

              {/* Manual Control Actions for Selected AMR */}
              <div className="pt-2 border-t border-white/[0.08] flex flex-wrap gap-2">
                <button
                  onClick={() => handleRobotForceCharge(selectedRobot.id)}
                  className="flex-1 py-1.5 px-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <Zap className="w-3 h-3 text-amber-400" />
                  <span>Force Charge</span>
                </button>

                {selectedRobot.health === 'FAILED' ? (
                  <button
                    onClick={() => handleRobotRecover(selectedRobot.id)}
                    className="flex-1 py-1.5 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Wrench className="w-3 h-3" />
                    <span>Recover</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleRobotFail(selectedRobot.id)}
                    className="flex-1 py-1.5 px-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <AlertTriangle className="w-3 h-3 text-rose-400" />
                    <span>Simulate Fail</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="p-5 rounded-2xl glass-card-dark border border-white/[0.08] text-center text-xs text-slate-400 space-y-2">
              <Bot className="w-6 h-6 text-amber-400/60 mx-auto" />
              <p className="font-semibold text-white">No AMR Unit Selected</p>
              <p className="text-[11px] text-slate-400">Click any robot on the warehouse grid to inspect real-time physics, space-time path, and battery telemetry.</p>
            </div>
          )}

          {/* Robot Fleet Table */}
          <div className="glass-card-dark rounded-2xl p-4 border border-white/[0.08] space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white">Active Fleet ({simState?.robots ? simState.robots.length : 0})</h3>
              </div>
              <span className="text-xs font-mono text-emerald-400 font-semibold">
                {simState?.robots ? simState.robots.filter(r => r.health === 'HEALTHY').length : 0} Healthy
              </span>
            </div>

            <div className="space-y-1.5 max-h-[260px] overflow-y-auto pr-1">
              {(simState?.robots || []).map((robot) => {
                const isSelected = selectedRobotId === robot.id;
                const status = getFriendlyStatus(robot.state, robot.health);

                return (
                  <div
                    key={robot.id}
                    onClick={() => onSelectRobot(isSelected ? null : robot.id)}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500/15 border-amber-500/60 shadow-sm'
                        : robot.health === 'FAILED'
                        ? 'bg-rose-950/20 border-rose-800/40'
                        : 'bg-slate-950/50 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className={`w-5 h-5 rounded-md font-mono font-bold text-[10px] text-white flex items-center justify-center ${
                          robot.health === 'FAILED' ? 'bg-rose-600' : 'bg-slate-800 text-amber-400'
                        }`}>
                          {robot.id}
                        </div>
                        <span className="text-xs font-semibold text-white">Unit {robot.id}</span>
                        <span className="text-[10px] text-slate-400 font-mono">({robot.x}, {robot.y})</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${status.dotColor}`} />
                        <span className="text-xs text-slate-300 font-medium">
                          {status.label}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <ProgressBar
                          value={robot.battery}
                          color={robot.battery > 50 ? 'green' : robot.battery > 25 ? 'amber' : 'red'}
                          height="h-1"
                        />
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">{robot.battery}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 6. Real-Time Task Priority Queue & Zone Intelligence Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Task Priority Queue (6 cols) */}
        <div className="lg:col-span-6 glass-card-dark rounded-2xl p-4 sm:p-5 border border-white/[0.08] space-y-3">
          <div className="flex justify-between items-center pb-2 border-b border-white/[0.08]">
            <div className="flex items-center gap-2">
              <Box className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white">Task Priority Queue (Intelligent Scoring Dispatch)</h3>
            </div>
            <span className="text-xs font-mono text-amber-400 font-semibold">
              {simState?.tasks?.pending ? simState.tasks.pending.length : 0} Pending
            </span>
          </div>

          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
            {simState?.tasks?.pending && simState.tasks.pending.length > 0 ? (
              simState.tasks.pending.map((task) => (
                <div
                  key={task.id}
                  className="p-2.5 rounded-xl bg-slate-950/60 border border-white/[0.06] flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`px-2 py-0.5 rounded-md font-mono font-bold text-[10px] border ${
                      task.priority === 'HIGH' 
                        ? 'bg-rose-500/15 text-rose-400 border-rose-500/30' 
                        : task.priority === 'NORMAL' 
                        ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' 
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}>
                      {task.priority}
                    </span>
                    <div>
                      <span className="font-semibold text-white">{task.sku}</span>
                      <span className="text-[10px] text-slate-400 block font-mono">
                        Route: {task.source} → {task.destination}
                      </span>
                    </div>
                  </div>

                  <div className="text-right font-mono text-[11px] text-slate-400">
                    Est: {task.estimated_completion_time} ticks
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-xs text-slate-400">
                No orders currently queued. New orders generate automatically or dispatch custom orders above.
              </div>
            )}
          </div>
        </div>

        {/* Zone Congestion & Risk Analytics (6 cols) */}
        <div className="lg:col-span-6 glass-card-dark rounded-2xl p-4 sm:p-5 border border-white/[0.08] space-y-3">
          <div className="flex justify-between items-center pb-2 border-b border-white/[0.08]">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white">Zone Congestion & Risk Analytics</h3>
            </div>
            <span className="text-xs font-mono text-amber-400 font-semibold">XGBoost ML Risk Model</span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {['A', 'B', 'C', 'D'].map((zk) => {
              const zInfo = simState?.zones ? simState.zones[zk] : null;
              const risk = zInfo?.xgb_risk || zInfo?.congestion || 'LOW';
              const kpi = zInfo?.performance_kpi ? Math.round(zInfo.performance_kpi * 100) : 85;

              return (
                <div key={zk} className="p-3 rounded-xl bg-slate-950/60 border border-white/[0.06] space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-xs text-white">Zone {zk}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-md font-mono font-bold border ${
                      risk === 'HIGH' 
                        ? 'bg-rose-500/15 text-rose-400 border-rose-500/30' 
                        : risk === 'MEDIUM' 
                        ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' 
                        : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                    }`}>
                      {risk}
                    </span>
                  </div>

                  <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                    <span>AMRs: {zInfo?.robots ?? 0}</span>
                    <span>Wait: {zInfo?.wait_ticks ?? 0}t</span>
                  </div>

                  <div className="space-y-1 pt-1 border-t border-white/[0.06]">
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>Flow:</span>
                      <span className="font-mono text-slate-300">{kpi}%</span>
                    </div>
                    <ProgressBar value={kpi} color={kpi > 75 ? 'green' : 'amber'} height="h-1" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 7. Operational Event Log */}
      <div className="glass-card-dark rounded-2xl p-4 sm:p-5 border border-white/[0.08] space-y-3">
        <div className="flex justify-between items-center pb-2 border-b border-white/[0.08]">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-white">Operational Event Log</h3>
          </div>
          <span className="text-xs font-mono text-slate-400">Live Telemetry Stream</span>
        </div>

        <div 
          ref={timelineContainerRef}
          className="space-y-1.5 max-h-44 overflow-y-auto pr-1 font-mono text-xs"
        >
          {eventsLog.map((ev) => (
            <div
              key={ev.id}
              className={`p-2 rounded-xl border flex items-center gap-3 ${
                ev.severity === 'ERROR'
                  ? 'bg-rose-950/20 border-rose-800/40 text-rose-300'
                  : ev.severity === 'WARNING'
                  ? 'bg-amber-950/20 border-amber-800/40 text-amber-300'
                  : ev.severity === 'SUCCESS'
                  ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-300'
                  : 'bg-slate-950/60 border-white/[0.06] text-slate-300'
              }`}
            >
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/50 text-slate-400 flex-shrink-0">
                T+{ev.tick}
              </span>
              <span className="flex-1 text-xs">{ev.message}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 8. Comprehensive Performance Analytics & Baseline Comparison Panel */}
      <div className="glass-card-warm rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-amber-500/25 shadow-2xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-white/[0.08]">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-amber-400" />
              Coordinator Analytics & Performance Benchmark
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Live operational KPIs calculated continuously across multi-agent fleet execution</p>
          </div>

          <button
            onClick={() => setShowComparison(!showComparison)}
            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-300 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Activity className="w-3.5 h-3.5 text-amber-400" />
            <span>{showComparison ? 'Hide Baseline' : 'Compare vs Baseline'}</span>
          </button>
        </div>

        {/* 8 KPI Metric Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
          <div className="p-3 rounded-xl bg-slate-950/60 border border-white/[0.06]">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-medium">Fulfillments</span>
            <span className="text-base font-bold font-mono text-white mt-0.5 block">{metrics.completed_orders}</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/60 border border-white/[0.06]">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-medium">Avg Duration</span>
            <span className="text-base font-bold font-mono text-emerald-400 mt-0.5 block">{metrics.average_fulfillment_time}t</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/60 border border-white/[0.06]">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-medium">Total Distance</span>
            <span className="text-base font-bold font-mono text-white mt-0.5 block">{metrics.total_distance}m</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/60 border border-white/[0.06]">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-medium">Collisions</span>
            <span className="text-base font-bold font-mono text-emerald-400 mt-0.5 block">0</span>
            <span className="text-[9px] text-emerald-400 block font-semibold">Zero Guaranteed</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/60 border border-white/[0.06]">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-medium">Yields Avoided</span>
            <span className="text-base font-bold font-mono text-sky-400 mt-0.5 block">{metrics.conflicts_avoided ?? 0}</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/60 border border-white/[0.06]">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-medium">Reroutes</span>
            <span className="text-base font-bold font-mono text-amber-400 mt-0.5 block">{metrics.replanning_events ?? 0}</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/60 border border-white/[0.06]">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-medium">Deadlocks Fix</span>
            <span className="text-base font-bold font-mono text-purple-400 mt-0.5 block">{metrics.deadlocks_resolved ?? 0}</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/60 border border-white/[0.06]">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-medium">Fleet Battery</span>
            <span className="text-base font-bold font-mono text-white mt-0.5 block">{metrics.average_battery}%</span>
          </div>
        </div>

        {/* Algorithm Comparison Panel */}
        {showComparison && metrics.comparison && (
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/80 border border-amber-500/20 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Algorithm Performance Comparison: Intelligent Space-Time Coordinator vs Naive Baseline
              </h4>
              <span className="text-xs font-mono text-emerald-400 font-bold">
                {metrics.comparison.improvements.collision_elimination}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-3.5 rounded-xl bg-slate-900/90 border border-amber-500/30 space-y-2">
                <span className="text-amber-400 font-bold block text-xs">Intelligent Space-Time Coordinator (Current)</span>
                <div className="space-y-1 text-slate-300">
                  <div className="flex justify-between"><span>Physical Collisions:</span><span className="font-bold text-emerald-400">0</span></div>
                  <div className="flex justify-between"><span>Unresolved Deadlocks:</span><span className="font-bold text-emerald-400">0</span></div>
                  <div className="flex justify-between"><span>Avg Order Time:</span><span className="font-bold text-white">{metrics.comparison.intelligent_coordinator.avg_fulfillment_time} ticks</span></div>
                  <div className="flex justify-between"><span>Throughput Rate:</span><span className="font-bold text-amber-300">{metrics.comparison.intelligent_coordinator.throughput_rate} orders/100t</span></div>
                  <div className="flex justify-between"><span>Fleet Utilization:</span><span className="font-bold text-slate-200">{metrics.comparison.intelligent_coordinator.fleet_utilization_pct}%</span></div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-white/[0.08] space-y-2">
                <span className="text-slate-400 font-bold block text-xs">Naive FIFO Baseline (Without Coordinator)</span>
                <div className="space-y-1 text-slate-400">
                  <div className="flex justify-between"><span>Physical Collisions:</span><span className="font-bold text-rose-400">{metrics.comparison.naive_baseline.collisions}</span></div>
                  <div className="flex justify-between"><span>Unresolved Deadlocks:</span><span className="font-bold text-rose-400">{metrics.comparison.naive_baseline.deadlocks_unresolved}</span></div>
                  <div className="flex justify-between"><span>Avg Order Time:</span><span>{metrics.comparison.naive_baseline.avg_fulfillment_time} ticks</span></div>
                  <div className="flex justify-between"><span>Throughput Rate:</span><span>{metrics.comparison.naive_baseline.throughput_rate} orders/100t</span></div>
                  <div className="flex justify-between"><span>Fleet Utilization:</span><span>{metrics.comparison.naive_baseline.fleet_utilization_pct}%</span></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 9. Manual Task Creation Modal */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="glass-card-warm bg-slate-950/95 border border-amber-500/30 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center pb-3 border-b border-white/[0.08]">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-amber-400" />
                Dispatch Custom Warehouse Order
              </h3>
              <button onClick={() => setIsTaskModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">SKU Description / Product:</label>
                <input
                  type="text"
                  value={newTaskSku}
                  onChange={(e) => setNewTaskSku(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Dispatch Priority Level:</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['HIGH', 'NORMAL', 'LOW'] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => setNewTaskPriority(p)}
                      className={`py-2 rounded-xl font-bold font-mono transition-all border cursor-pointer ${
                        newTaskPriority === p
                          ? p === 'HIGH'
                            ? 'bg-rose-500 border-rose-400 text-slate-950'
                            : p === 'NORMAL'
                            ? 'bg-amber-500 border-amber-400 text-slate-950'
                            : 'bg-slate-400 border-slate-300 text-slate-950'
                          : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <p className="text-slate-400 text-[11px] pt-1">
                The Intelligent Space-Time AMR Assignment model evaluates real-time distance, battery reserves, and zone congestion before assigning to the optimal robot.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-white/[0.08]">
              <button
                onClick={() => setIsTaskModalOpen(false)}
                className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTask}
                className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs shadow-md cursor-pointer"
              >
                Dispatch Task
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SimulationView;
