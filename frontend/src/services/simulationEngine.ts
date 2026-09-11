import type { SimState, DynamicObstacleState, TaskInfo, TimelineEvent } from '../types';
import { createInitialSimState } from './mockData';

type StateListener = (state: SimState) => void;

class SimulationEngine {
  private state: SimState;
  private listeners: Set<StateListener> = new Set();
  private timer: any = null;
  private tickIntervalMs: number = 800;

  constructor() {
    this.state = createInitialSimState();
  }

  public getState(): SimState {
    return JSON.parse(JSON.stringify(this.state));
  }

  public subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  private notify() {
    const copy = this.getState();
    this.listeners.forEach((fn) => fn(copy));
  }

  public start() {
    if (this.state.running) return;
    this.state.running = true;
    this.notify();
    this.scheduleNextTick();
  }

  public stop() {
    this.state.running = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.notify();
  }

  public reset() {
    this.stop();
    this.state = createInitialSimState();
    this.notify();
  }

  public setSpeed(multiplier: number) {
    this.state.speed = multiplier;
    this.tickIntervalMs = Math.max(150, Math.round(800 / multiplier));
    if (this.state.running) {
      if (this.timer) clearTimeout(this.timer);
      this.scheduleNextTick();
    }
    this.notify();
  }

  public step() {
    this.tick();
  }

  private scheduleNextTick() {
    if (!this.state.running) return;
    this.timer = setTimeout(() => {
      this.tick();
      if (this.state.running) {
        this.scheduleNextTick();
      }
    }, this.tickIntervalMs);
  }

  private isShelf(x: number, y: number): boolean {
    return (x === 2 || x === 3 || x === 6 || x === 7) && y >= 2 && y <= 6;
  }

  private isObstacle(x: number, y: number): boolean {
    if (this.isShelf(x, y)) return true;
    return (this.state.dynamic_obstacles || []).some((o) => o.x === x && o.y === y);
  }

  // Simple Space-Time A* pathfinding on 10x10 grid avoiding shelves & obstacles
  private findPath(startX: number, startY: number, targetX: number, targetY: number): [number, number][] {
    const key = (x: number, y: number) => `${x},${y}`;
    const openSet: { x: number; y: number; g: number; h: number; f: number; parent?: any }[] = [];
    const closedSet = new Set<string>();

    const h = (x: number, y: number) => Math.abs(x - targetX) + Math.abs(y - targetY);

    openSet.push({ x: startX, y: startY, g: 0, h: h(startX, startY), f: h(startX, startY) });

    while (openSet.length > 0) {
      openSet.sort((a, b) => a.f - b.f);
      const current = openSet.shift()!;

      if (current.x === targetX && current.y === targetY) {
        const path: [number, number][] = [];
        let curr: any = current;
        while (curr) {
          path.unshift([curr.x, curr.y]);
          curr = curr.parent;
        }
        return path;
      }

      closedSet.add(key(current.x, current.y));

      const neighbors = [
        { x: current.x + 1, y: current.y },
        { x: current.x - 1, y: current.y },
        { x: current.x, y: current.y + 1 },
        { x: current.x, y: current.y - 1 },
      ];

      for (const nb of neighbors) {
        if (nb.x < 0 || nb.x >= 10 || nb.y < 0 || nb.y >= 10) continue;
        if (closedSet.has(key(nb.x, nb.y))) continue;
        
        // Target can be a shelf for picking, but intermediate tiles cannot be obstacles
        const isTarget = nb.x === targetX && nb.y === targetY;
        if (!isTarget && this.isObstacle(nb.x, nb.y)) continue;

        const gScore = current.g + 1;
        let existing = openSet.find((item) => item.x === nb.x && item.y === nb.y);
        if (!existing) {
          const hScore = h(nb.x, nb.y);
          openSet.push({
            x: nb.x,
            y: nb.y,
            g: gScore,
            h: hScore,
            f: gScore + hScore,
            parent: current,
          });
        } else if (gScore < existing.g) {
          existing.g = gScore;
          existing.f = gScore + existing.h;
          existing.parent = current;
        }
      }
    }

    return [[startX, startY]];
  }

  public tick() {
    this.state.tick += 1;

    // 1. Update Dynamic Obstacles duration
    if (this.state.dynamic_obstacles && this.state.dynamic_obstacles.length > 0) {
      const remaining: DynamicObstacleState[] = [];
      for (const obs of this.state.dynamic_obstacles) {
        const d = (obs.duration ?? 60) - 1;
        if (d > 0) {
          remaining.push({ ...obs, duration: d });
        } else {
          this.logEvent("CLEAR", `Hazard spill at (${obs.x}, ${obs.y}) resolved. Thoroughfare corridor reopened.`);
        }
      }
      this.state.dynamic_obstacles = remaining;
    }

    // 2. Step Robots
    const robots = this.state.robots;

    for (const r of robots) {
      if (r.health === 'FAILED') continue;

      // Drain battery slightly
      r.battery = Math.max(12, +(r.battery - 0.08).toFixed(1));

      // Autonomous low battery rerouting
      if (r.battery < 22 && r.state !== 'charging' && !r.task?.includes('Charging')) {
        const charger = r.x < 5 ? { x: 0, y: 9, id: 'C1' } : { x: 9, y: 9, id: 'C2' };
        r.state = 'moving';
        r.task = `Autonomous Transit to ${charger.id} (Low Battery)`;
        r.path = this.findPath(r.x, r.y, charger.x, charger.y);
        this.logEvent("POWER", `AMR-${r.id.replace('R','')} battery critical (${r.battery}%). Autonomous priority transit to ${charger.id}.`, 'WARNING');
        continue;
      }

      // If charging at station
      if (r.state === 'charging' || (r.x === 0 && r.y === 9) || (r.x === 9 && r.y === 9)) {
        if (r.battery < 98) {
          r.battery = Math.min(100, +(r.battery + 5.0).toFixed(1));
          r.state = 'charging';
          r.task = `Fast Charging Dock (${r.battery}%)`;
          continue;
        } else {
          r.state = 'idle';
          r.task = 'Ready for Dispatch';
        }
      }

      // Advance along path
      if (r.path && r.path.length > 1) {
        // Next waypoint
        const next = r.path[1];

        // Check if next waypoint became blocked by dynamic obstacle
        if ((this.state.dynamic_obstacles || []).some((o) => o.x === next[0] && o.y === next[1])) {
          r.replans_count = (r.replans_count ?? 0) + 1;
          const target = r.path[r.path.length - 1];
          r.path = this.findPath(r.x, r.y, target[0], target[1]);
          r.state = 'yielding';
          this.logEvent("REROUTE", `Dynamic obstacle detected ahead of AMR-${r.id.replace('R','')}. Real-time A* detoured around hazard.`, 'WARNING');
          continue;
        }

        r.x = next[0];
        r.y = next[1];
        r.path.shift();
        r.accumulated_distance = (r.accumulated_distance ?? 0) + 1;

        // Reached destination
        if (r.path.length <= 1) {
          r.path = undefined;

          // Reached Packing Station P1 (5, 0)
          if (r.x === 5 && r.y === 0) {
            r.completed_tasks = (r.completed_tasks ?? 0) + 1;
            if (this.state.metrics) {
              this.state.metrics.completed_orders += 1;
            }
            this.logEvent("ORDER_COMPLETE", `AMR-${r.id.replace('R','')} delivered inventory order at Packing Station P1 (0 physical collisions).`, 'SUCCESS');

            // Dispatch return trip to shelf or home base
            const targetShelf = this.state.shelves[Math.floor(Math.random() * this.state.shelves.length)];
            r.state = 'moving';
            r.task = `Navigating to Shelf ${targetShelf.id}`;
            r.path = this.findPath(r.x, r.y, targetShelf.x, targetShelf.y);
          } else {
            // Reached shelf: pick product and return to P1
            r.state = 'delivering';
            r.task = `Fulfilling Order to Packing Station P1`;
            r.path = this.findPath(r.x, r.y, 5, 0);
          }
        }
      } else {
        // Robot is idle: assign new order
        const targetShelf = this.state.shelves[Math.floor(Math.random() * this.state.shelves.length)];
        r.state = 'moving';
        r.task = `Picking SKU from Shelf ${targetShelf.id}`;
        r.path = this.findPath(r.x, r.y, targetShelf.x, targetShelf.y);
      }
    }

    // Update fleet power reserve metric
    const avgBattery = robots.reduce((acc, curr) => acc + curr.battery, 0) / robots.length;
    if (this.state.metrics) {
      this.state.metrics.fleet_power_reserve = +avgBattery.toFixed(1);
    }

    this.notify();
  }

  public addObstacle(x: number, y: number, duration: number = 60, type: 'barrier' | 'spill' | 'maintenance' = 'spill') {
    const id = `OBS_${Date.now()}`;
    if (!this.state.dynamic_obstacles) {
      this.state.dynamic_obstacles = [];
    }
    this.state.dynamic_obstacles.push({ id, x, y, duration, obstacle_type: type });
    this.logEvent("OBSTACLE", `Hazard ${type} placed at (${x}, ${y}) [Duration: ${duration} ticks]. Triggering fleet reroute.`);

    // Trigger immediate replanning for robots passing through this coordinate
    for (const r of this.state.robots) {
      if (r.path && r.path.some((p) => p[0] === x && p[1] === y)) {
        r.replans_count = (r.replans_count ?? 0) + 1;
        const target = r.path[r.path.length - 1];
        r.path = this.findPath(r.x, r.y, target[0], target[1]);
        r.state = 'yielding';
      }
    }

    this.notify();
  }

  public clearObstacles() {
    this.state.dynamic_obstacles = [];
    this.logEvent("CLEAR", "All dynamic obstacles cleared. Re-establishing optimal highway lanes.");
    this.notify();
  }

  public failRobot(robotId: string) {
    const r = this.state.robots.find((item) => item.id === robotId);
    if (r) {
      r.health = 'FAILED';
      r.health_percent = 20;
      r.state = 'failed';
      r.task = 'Hardware Motor Fault [STALLED]';
      r.path = undefined;
      this.logEvent("FAULT", `Simulated hardware stall on AMR-${r.id.replace('R','')}. Task failover activated.`, 'ERROR');
      this.notify();
    }
  }

  public recoverRobot(robotId: string) {
    const r = this.state.robots.find((item) => item.id === robotId);
    if (r) {
      r.health = 'HEALTHY';
      r.health_percent = 98;
      r.state = 'idle';
      r.task = 'Diagnostics Complete — Nominal';
      this.logEvent("RECOVERY", `AMR-${r.id.replace('R','')} recovered from fault. Re-admitted to space-time fleet.`, 'SUCCESS');
      this.notify();
    }
  }

  public chargeRobot(robotId: string) {
    const r = this.state.robots.find((item) => item.id === robotId);
    if (r) {
      const charger = r.x < 5 ? { x: 0, y: 9, id: 'C1' } : { x: 9, y: 9, id: 'C2' };
      r.state = 'moving';
      r.task = `Manual Dispatch to ${charger.id}`;
      r.path = this.findPath(r.x, r.y, charger.x, charger.y);
      this.notify();
    }
  }

  public applyScenario(scenarioId: string) {
    this.state.dynamic_obstacles = [];
    
    if (scenarioId === 'BLOCKED_AISLE') {
      this.addObstacle(4, 4, 120, 'spill');
      this.addObstacle(5, 4, 120, 'barrier');
    } else if (scenarioId === 'ROBOT_FAILURE') {
      this.failRobot('R1');
    } else if (scenarioId === 'LOW_BATTERY') {
      this.state.robots.forEach((r, idx) => {
        if (idx < 3) r.battery = 18.0;
      });
      this.logEvent("POWER", "Low battery cascade scenario triggered across 3 AMRs.", 'WARNING');
    } else if (scenarioId === 'HEAVY_TRAFFIC') {
      this.state.speed = 2.0;
      this.logEvent("SCENARIO", "Heavy Traffic Congestion active: high volume order throughput.", 'INFO');
    }

    this.notify();
  }

  public dispatchOrder(sku: string, priority: 'HIGH' | 'NORMAL' | 'LOW' = 'HIGH') {
    const availableRobot = this.state.robots.find((r) => r.health !== 'FAILED' && (r.state === 'idle' || !r.path));
    const targetShelf = this.state.shelves[Math.floor(Math.random() * this.state.shelves.length)];

    const newTask: TaskInfo = {
      id: `TASK-${Date.now().toString().slice(-4)}`,
      sku,
      product_name: `Replenishment Order ${sku}`,
      source: `Shelf ${targetShelf.id} (${targetShelf.zone})`,
      destination: "Packing Station P1",
      priority,
      status: "DISPATCHED",
      assigned_robot_id: availableRobot ? availableRobot.id : null,
      created_at: this.state.tick,
      estimated_distance: 8,
      estimated_completion_time: this.state.tick + 16,
    };

    this.state.tasks_queue = [newTask, ...(this.state.tasks_queue || []).slice(0, 8)];

    if (availableRobot) {
      availableRobot.state = 'moving';
      availableRobot.task = `Fulfilling ${sku} from ${targetShelf.id}`;
      availableRobot.path = this.findPath(availableRobot.x, availableRobot.y, targetShelf.x, targetShelf.y);
      this.logEvent("DISPATCH", `Autonomous order ${sku} dispatched to AMR-${availableRobot.id.replace('R','')}.`, 'INFO');
    }

    this.notify();
  }

  private logEvent(type: string, message: string, severity: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' = 'INFO') {
    const event: TimelineEvent = {
      id: `EVT-${Date.now()}`,
      tick: this.state.tick,
      type,
      message,
      severity,
    };
    this.state.timeline_events = [event, ...(this.state.timeline_events || []).slice(0, 15)];
    this.state.events = this.state.timeline_events;
  }
}

export const clientSimulationEngine = new SimulationEngine();
