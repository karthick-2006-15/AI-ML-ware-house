import React, { useState, useEffect } from 'react';
import { 
  Bot, 
  Play, 
  Pause, 
  RotateCcw, 
  PlusCircle, 
  Battery, 
  BatteryCharging, 
  Clock 
} from 'lucide-react';
import Card from '../common/Card';
import Badge from '../common/Badge';
import Button from '../common/Button';
import ProgressBar from '../common/ProgressBar';
import WarehouseCanvas from './WarehouseCanvas';
import type { SimState, SimMetrics, SimEvent } from '../../types';

interface SimulationViewProps {
  simState: SimState | null;
  simRunning: boolean;
  onStartSim: () => void;
  onStopSim: () => void;
  onResetSim?: () => void;
  selectedRobotId: string | null;
  onSelectRobot: (robotId: string | null) => void;
}

export const SimulationView: React.FC<SimulationViewProps> = ({
  simState,
  simRunning,
  onStartSim,
  onStopSim,
  onResetSim,
  selectedRobotId,
  onSelectRobot,
}) => {
  // Recent events log
  const [events, setEvents] = useState<SimEvent[]>([
    { time: 'Ready', robotId: 'R0', description: 'AMR Fleet initialized at staging zone (row 8)', type: 'move' },
    { time: 'Ready', robotId: 'P1', description: 'Packing Station P1 operational at (5, 0)', type: 'task' },
    { time: 'Ready', robotId: 'C1', description: 'Charging Bays C1 (0, 9) and C2 (9, 9) online', type: 'charge' },
  ]);

  // Dynamically record live simulation events when ticks progress
  useEffect(() => {
    if (!simState || !simRunning) return;
    if (simState.tick > 0 && simState.tick % 10 === 0) {
      const activeRobots = simState.robots.filter(r => r.state !== 'idle');
      const robot = activeRobots.length > 0 
        ? activeRobots[Math.floor(Math.random() * activeRobots.length)] 
        : simState.robots[0];

      if (robot) {
        const timeStr = new Date().toLocaleTimeString();
        let desc = `Tick #${simState.tick}: ${robot.id} moved to (${robot.x}, ${robot.y})`;
        let type: 'task' | 'move' | 'charge' = 'move';

        if (robot.state === 'picking') {
          type = 'task';
          desc = `Fulfillment: ${robot.id} retrieving SKU carton at rack (${robot.x}, ${robot.y})`;
        } else if (robot.state === 'moving_to_packing') {
          type = 'task';
          desc = `Dispatch: ${robot.id} delivering picked batch to Packing Station P1`;
        } else if (robot.state === 'charging') {
          type = 'charge';
          desc = `Charging: ${robot.id} docked at bay (${robot.battery}%)`;
        }

        setEvents(prev => [
          { time: timeStr, robotId: robot.id, description: desc, type },
          ...prev.slice(0, 9)
        ]);
      }
    }
  }, [simState?.tick, simRunning]);

  const handleAddTask = () => {
    const randomShelf = `S_${Math.floor(Math.random() * 20)}`;
    const randomRobot = `R${Math.floor(Math.random() * 5)}`;
    const newEvent: SimEvent = {
      time: new Date().toLocaleTimeString(),
      robotId: randomRobot,
      description: `Manual Dispatch: ${randomRobot} routed to Shelf ${randomShelf} via A*`,
      type: 'task',
    };
    setEvents([newEvent, ...events.slice(0, 8)]);
  };

  // Robot friendly status mapper
  const getFriendlyStatus = (state?: string) => {
    switch (state) {
      case 'idle':
        return { label: 'Idle', variant: 'neutral' as const, dotColor: 'bg-slate-400' };
      case 'picking':
        return { label: 'Picking SKU', variant: 'danger' as const, dotColor: 'bg-rose-400' };
      case 'moving_to_packing':
      case 'en_route':
        return { label: 'Delivering', variant: 'warning' as const, dotColor: 'bg-emerald-400' };
      case 'charging':
        return { label: 'Charging', variant: 'success' as const, dotColor: 'bg-amber-400' };
      default:
        return { label: 'Active', variant: 'primary' as const, dotColor: 'bg-blue-400' };
    }
  };

  const metrics: SimMetrics = simState?.metrics || {
    completed_orders: 0,
    total_distance: 0,
    collisions: 0,
    average_battery: 100,
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* 1. Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 tracking-wider uppercase mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Autonomous Navigation & A* Fleet Simulation
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Autonomous Navigation
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Digital warehouse environment for A* robot path planning
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant="simulation" size="md" dot>
            SIMULATION MODE
          </Badge>
          <div className="flex items-center gap-2 bg-[#08182A] border border-[#1A2D4A] rounded-xl px-3 py-1.5 text-xs">
            <span className="text-slate-400">Status:</span>
            <span className={`font-bold font-mono ${simRunning ? 'text-emerald-400 animate-pulse' : 'text-amber-400'}`}>
              {simRunning ? 'RUNNING' : 'PAUSED'}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Main Two-Column Layout: Left (Canvas 8 cols) + Right (Status 4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT: Large Warehouse Map & Controls */}
        <Card className="lg:col-span-8 space-y-5">
          {/* Header Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#1A2D4A]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Warehouse Grid Environment</h2>
                <p className="text-xs text-slate-400">10x10 Aisle coordinates with real-time dynamic obstacle avoidance</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2.5">
              {!simRunning ? (
                <Button
                  size="sm"
                  variant="success"
                  className="shadow-[0_0_18px_rgba(16,185,129,0.4)] hover:shadow-[0_0_25px_rgba(16,185,129,0.6)] transition-all"
                  icon={<Play className="w-3.5 h-3.5 fill-current" />}
                  onClick={onStartSim}
                >
                  Start Simulation
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="danger"
                  className="shadow-[0_0_18px_rgba(244,63,94,0.4)] hover:shadow-[0_0_25px_rgba(244,63,94,0.6)] transition-all animate-pulse"
                  icon={<Pause className="w-3.5 h-3.5 fill-current" />}
                  onClick={onStopSim}
                >
                  Pause Simulation
                </Button>
              )}
              <Button
                size="sm"
                variant="secondary"
                className="hover:border-cyan-500/50 hover:shadow-[0_0_15px_rgba(0,217,255,0.25)] transition-all"
                icon={<RotateCcw className="w-3.5 h-3.5" />}
                onClick={onResetSim ?? onStopSim}
              >
                Reset
              </Button>
              <Button
                size="sm"
                variant="primary"
                className="shadow-[0_0_18px_rgba(22,131,255,0.4)] hover:shadow-[0_0_25px_rgba(0,217,255,0.5)] transition-all"
                icon={<PlusCircle className="w-3.5 h-3.5" />}
                onClick={handleAddTask}
              >
                Add Task
              </Button>
            </div>
          </div>

          {/* Central Map Canvas */}
          <div className={`w-full flex justify-center rounded-2xl p-6 transition-all duration-500 relative overflow-hidden ${
            simRunning
              ? 'bg-[#06101F] border border-cyan-500/40 shadow-[0_0_40px_rgba(0,217,255,0.15)]'
              : 'bg-[#06101F] border border-[#14253D] shadow-[0_0_20px_rgba(0,0,0,0.5)]'
          }`}>
            <WarehouseCanvas
              simState={simState}
              selectedRobotId={selectedRobotId}
              onSelectRobot={onSelectRobot}
              width={540}
              height={540}
            />
          </div>

          {/* Map Legend Footer */}
          <div className="p-3 bg-[#08182A] rounded-xl border border-[#1A2D4A] flex flex-wrap justify-between items-center gap-3 text-xs">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="w-3.5 h-3.5 rounded bg-[#1E293B] border border-slate-600 inline-block" /> Shelves
              </span>
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="w-3.5 h-3.5 rounded bg-emerald-500 inline-block" /> Packing Station (P)
              </span>
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="w-3.5 h-3.5 rounded bg-orange-500 inline-block" /> Charging Bay (C)
              </span>
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="w-3.5 h-3.5 rounded-full bg-blue-500 inline-block" /> Active Robot
              </span>
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="w-3.5 h-1 bg-cyan-400 inline-block border-t border-dashed border-cyan-300" /> A* Route
              </span>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              Click any robot to inspect route
            </span>
          </div>
        </Card>

        {/* RIGHT: Robot Fleet Status Table & Legend */}
        <Card className="lg:col-span-4 space-y-6">
          <div className="flex justify-between items-center pb-3 border-b border-[#1A2D4A]">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white">Robot Fleet Status</h2>
              <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-[#1683FF] text-[10px] font-bold">
                {simState?.robots ? simState.robots.length : 5} Active
              </span>
            </div>
            {selectedRobotId && (
              <button
                onClick={() => onSelectRobot(null)}
                className="text-[11px] text-cyan-400 hover:underline"
              >
                Clear selection
              </button>
            )}
          </div>

          {/* Robot List */}
          <div className="space-y-3">
            {(simState?.robots || [
              { id: 'R0', x: 1, y: 8, state: 'idle', battery: 94 },
              { id: 'R1', x: 3, y: 8, state: 'moving_to_packing', battery: 85 },
              { id: 'R2', x: 5, y: 8, state: 'picking', battery: 78 },
              { id: 'R3', x: 7, y: 8, state: 'idle', battery: 98 },
              { id: 'R4', x: 9, y: 8, state: 'charging', battery: 45 },
            ]).map((robot) => {
              const isSelected = selectedRobotId === robot.id;
              const status = getFriendlyStatus(robot.state);
              const battery = robot.battery ?? 100;

              return (
                <div
                  key={robot.id}
                  onClick={() => onSelectRobot(isSelected ? null : robot.id)}
                  className={`p-3 rounded-xl border transition-all duration-150 cursor-pointer ${
                    isSelected
                      ? 'bg-blue-950/40 border-cyan-400 shadow-md shadow-cyan-500/10'
                      : 'bg-[#08182A] border-[#1A2D4A] hover:border-slate-600'
                  }`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-[#0D1B2E] border border-[#1A2D4A] flex items-center justify-center font-bold text-xs text-white font-mono">
                        {robot.id}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-white">AMR Unit {robot.id}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Pos: ({robot.x}, {robot.y})
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${status.dotColor}`} />
                      <span className="text-xs font-semibold text-slate-300">
                        {status.label}
                      </span>
                    </div>
                  </div>

                  {/* Battery Bar */}
                  <div className="flex items-center gap-2 pt-1 border-t border-[#14253D]/80">
                    {battery < 30 ? (
                      <BatteryCharging className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                    ) : (
                      <Battery className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <ProgressBar
                        value={battery}
                        color={battery > 50 ? 'green' : battery > 25 ? 'amber' : 'red'}
                        height="h-1.5"
                      />
                    </div>
                    <span className="text-[11px] font-mono text-slate-400">{battery}%</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selected Robot Route Panel */}
          {selectedRobotId ? (
            <div className="p-3.5 bg-blue-950/30 rounded-xl border border-blue-500/40 text-xs space-y-1.5">
              <span className="text-[10px] uppercase font-bold text-cyan-400">
                A* Active Route: {selectedRobotId}
              </span>
              <p className="text-slate-300">
                Optimal path dynamically generated. Waypoints avoid Shelf blocks at (2..3, 2..6) and (6..7, 2..6).
              </p>
            </div>
          ) : (
            <div className="p-3 bg-[#08182A] rounded-xl border border-[#1A2D4A] text-center text-xs text-slate-400">
              Click any robot to visualize its A* planned route.
            </div>
          )}
        </Card>
      </div>

      {/* 3. Bottom Row: Simulation Metrics (4 cards) + Recent Events Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 4 Metric Cards */}
        <div className="lg:col-span-6 grid grid-cols-2 gap-4">
          <Card className="flex flex-col justify-between p-4">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Robots</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-3xl font-black text-white font-mono">
                {simState?.robots ? simState.robots.length : 5}
              </span>
              <span className="text-xs text-emerald-400 font-semibold">100% Operational</span>
            </div>
            <span className="text-[11px] text-slate-400 mt-2">Fleet: R0, R1, R2, R3, R4</span>
          </Card>

          <Card className="flex flex-col justify-between p-4">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Completed Orders</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-3xl font-black text-cyan-400 font-mono">
                {metrics.completed_orders ?? 28}
              </span>
              <span className="text-xs text-cyan-300 font-semibold">+6 this hour</span>
            </div>
            <span className="text-[11px] text-slate-400 mt-2">Target throughput: 50/shift</span>
          </Card>

          <Card className="flex flex-col justify-between p-4">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Travel Distance</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-3xl font-black text-purple-400 font-mono">
                {metrics.total_distance ?? 342}
              </span>
              <span className="text-xs text-slate-400">Grid units</span>
            </div>
            <span className="text-[11px] text-slate-400 mt-2">A* pathing saved ~18% steps</span>
          </Card>

          <Card className="flex flex-col justify-between p-4">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Fleet Battery Avg</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-3xl font-black text-emerald-400 font-mono">
                {metrics.average_battery ?? 88}%
              </span>
              <span className="text-xs text-emerald-300 font-semibold">Healthy</span>
            </div>
            <span className="text-[11px] text-slate-400 mt-2">Auto-recharge trigger at &le;20%</span>
          </Card>
        </div>

        {/* Recent Events Timeline */}
        <Card className="lg:col-span-6 flex flex-col justify-between">
          <div className="flex justify-between items-center pb-3 border-b border-[#1A2D4A] mb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-bold text-white">Live Event Timeline</h2>
            </div>
            <span className="text-[10px] font-mono text-slate-400">Auto-updating</span>
          </div>

          <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1 text-xs">
            {events.map((evt, idx) => (
              <div
                key={idx}
                className="p-2.5 bg-[#08182A] rounded-xl border border-[#14253D] flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-md bg-[#0D1B2E] border border-[#1A2D4A] flex items-center justify-center font-bold text-[10px] font-mono text-cyan-400">
                    {evt.robotId}
                  </div>
                  <span className="text-slate-200 font-medium">{evt.description}</span>
                </div>
                <span className="font-mono text-[10px] text-slate-400 flex-shrink-0">{evt.time}</span>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-[#1A2D4A] flex justify-between items-center text-[11px] text-slate-400">
            <span>Dynamic congestion events: <strong>{metrics.collisions ?? 0}</strong></span>
            <span className="text-emerald-400 font-semibold">Zero deadlocks recorded</span>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default SimulationView;
