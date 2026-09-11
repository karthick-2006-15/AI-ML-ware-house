import React, { useEffect, useRef, useState } from 'react';
import type { SimState, WarehouseEditTool, RouteViewMode } from '../../types';

interface WarehouseCanvasProps {
  simState: SimState | null;
  selectedRobotId: string | null;
  onSelectRobot: (robotId: string | null) => void;
  width?: number;
  height?: number;
  editTool?: WarehouseEditTool;
  onCellClick?: (gridX: number, gridY: number, tool: WarehouseEditTool) => void;
  routeViewMode?: RouteViewMode;
  showZoneOverlay?: boolean;
}

interface RobotAnim {
  id: string;
  currentX: number;
  currentY: number;
  targetX: number;
  targetY: number;
  angle: number;
  targetAngle: number;
  battery: number;
  state: string;
  health: 'HEALTHY' | 'WARNING' | 'FAILED' | 'RECOVERING';
  path: [number, number][];
  task?: string | null;
  isLoaded: boolean;
  scanAngle: number;
  trail: { x: number; y: number; alpha: number }[];
  smoke: { x: number; y: number; vx: number; vy: number; alpha: number; size: number }[];
  waitCounter: number;
}

const DEFAULT_SHELVES = [
  { id: 'S_0', x: 2, y: 2, zone: 'A' }, { id: 'S_1', x: 2, y: 3, zone: 'A' }, { id: 'S_2', x: 2, y: 4, zone: 'A' }, { id: 'S_3', x: 2, y: 5, zone: 'C' }, { id: 'S_4', x: 2, y: 6, zone: 'C' },
  { id: 'S_5', x: 3, y: 2, zone: 'A' }, { id: 'S_6', x: 3, y: 3, zone: 'A' }, { id: 'S_7', x: 3, y: 4, zone: 'A' }, { id: 'S_8', x: 3, y: 5, zone: 'C' }, { id: 'S_9', x: 3, y: 6, zone: 'C' },
  { id: 'S_10', x: 6, y: 2, zone: 'B' }, { id: 'S_11', x: 6, y: 3, zone: 'B' }, { id: 'S_12', x: 6, y: 4, zone: 'B' }, { id: 'S_13', x: 6, y: 5, zone: 'D' }, { id: 'S_14', x: 6, y: 6, zone: 'D' },
  { id: 'S_15', x: 7, y: 2, zone: 'B' }, { id: 'S_16', x: 7, y: 3, zone: 'B' }, { id: 'S_17', x: 7, y: 4, zone: 'B' }, { id: 'S_18', x: 7, y: 5, zone: 'D' }, { id: 'S_19', x: 7, y: 6, zone: 'D' },
];

const DEFAULT_STATIONS = [
  { id: 'P1', x: 5, y: 0, type: 'packing' as const, status: 'AVAILABLE' as const },
  { id: 'C1', x: 0, y: 9, type: 'charging' as const, status: 'AVAILABLE' as const },
  { id: 'C2', x: 9, y: 9, type: 'charging' as const, status: 'AVAILABLE' as const },
];

const DEFAULT_ROBOTS = [
  { id: 'R0', x: 1, y: 8, state: 'idle', health: 'HEALTHY' as const, battery: 100 },
  { id: 'R1', x: 3, y: 8, state: 'idle', health: 'HEALTHY' as const, battery: 100 },
  { id: 'R2', x: 5, y: 8, state: 'idle', health: 'HEALTHY' as const, battery: 100 },
  { id: 'R3', x: 7, y: 8, state: 'idle', health: 'HEALTHY' as const, battery: 100 },
  { id: 'R4', x: 9, y: 8, state: 'idle', health: 'HEALTHY' as const, battery: 100 },
];

export const WarehouseCanvas: React.FC<WarehouseCanvasProps> = ({
  simState,
  selectedRobotId,
  onSelectRobot,
  width = 560,
  height = 560,
  editTool = 'select',
  onCellClick,
  routeViewMode = 'ALL',
  showZoneOverlay = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredRobot, setHoveredRobot] = useState<string | null>(null);
  const [hoverGridCell, setHoverGridCell] = useState<{ x: number; y: number } | null>(null);

  // Store continuous physical positions, headings, and visual particle states
  const robotsAnimRef = useRef<Map<string, RobotAnim>>(new Map());
  const animFrameIdRef = useRef<number>(0);

  const activeState: SimState = simState ?? {
    tick: 0,
    robots: DEFAULT_ROBOTS,
    shelves: DEFAULT_SHELVES,
    stations: DEFAULT_STATIONS,
  };

  const gridCols = 10;
  const gridRows = 10;
  const cellW = width / gridCols;
  const cellH = height / gridRows;

  // Sync incoming telemetry into physics/animation models
  useEffect(() => {
    const animMap = robotsAnimRef.current;

    activeState.robots.forEach((robot) => {
      const targetPxX = robot.x * cellW + cellW / 2;
      const targetPxY = robot.y * cellH + cellH / 2;
      const existing = animMap.get(robot.id);

      const isCarrying = robot.state === 'picking' || robot.state === 'moving_to_packing';
      const health = robot.health ?? (robot.state === 'failed' ? 'FAILED' : 'HEALTHY');

      if (!existing) {
        animMap.set(robot.id, {
          id: robot.id,
          currentX: targetPxX,
          currentY: targetPxY,
          targetX: targetPxX,
          targetY: targetPxY,
          angle: -Math.PI / 2,
          targetAngle: -Math.PI / 2,
          battery: robot.battery ?? 100,
          state: robot.state ?? 'idle',
          health,
          path: robot.path ?? [],
          task: robot.task,
          isLoaded: isCarrying,
          scanAngle: 0,
          trail: [],
          smoke: [],
          waitCounter: robot.wait_counter ?? 0,
        });
      } else {
        existing.targetX = targetPxX;
        existing.targetY = targetPxY;
        existing.battery = robot.battery ?? existing.battery;
        existing.state = robot.state ?? existing.state;
        existing.health = health;
        existing.path = robot.path ?? existing.path;
        existing.task = robot.task ?? existing.task;
        existing.isLoaded = isCarrying;
        existing.waitCounter = robot.wait_counter ?? 0;

        // Directional heading calculation
        const dx = targetPxX - existing.currentX;
        const dy = targetPxY - existing.currentY;
        if (Math.hypot(dx, dy) > 3) {
          existing.targetAngle = Math.atan2(dy, dx);
          existing.trail.push({ x: existing.currentX, y: existing.currentY, alpha: 0.7 });
          if (existing.trail.length > 8) existing.trail.shift();
        }
      }
    });

    // Remove robots no longer present
    const currentIds = new Set(activeState.robots.map(r => r.id));
    for (const [id] of animMap.entries()) {
      if (!currentIds.has(id)) {
        animMap.delete(id);
      }
    }
  }, [activeState.robots, cellW, cellH]);

  // Main 60 FPS Render Loop
  useEffect(() => {
    let isRunning = true;

    const render = (timestamp: number) => {
      if (!isRunning) return;
      const canvas = canvasRef.current;
      if (!canvas) {
        animFrameIdRef.current = requestAnimationFrame(render);
        return;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        animFrameIdRef.current = requestAnimationFrame(render);
        return;
      }

      // 1. Clean Minimal Floor Background
      ctx.fillStyle = '#0B111E';
      ctx.fillRect(0, 0, width, height);

      // 2. Zone Overlays (Subtle minimal dividers)
      if (showZoneOverlay && activeState.zones) {
        const quadrantW = width / 2;
        const quadrantH = height / 2;
        const quads = [
          { key: 'A', name: 'Zone A', x: 0, y: 0, w: quadrantW, h: quadrantH },
          { key: 'B', name: 'Zone B', x: quadrantW, y: 0, w: quadrantW, h: quadrantH },
          { key: 'C', name: 'Zone C', x: 0, y: quadrantH, w: quadrantW, h: quadrantH },
          { key: 'D', name: 'Zone D', x: quadrantW, y: quadrantH, w: quadrantW, h: quadrantH },
        ];

        ctx.save();
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.2)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);

        // Draw quadrant boundary lines
        ctx.beginPath();
        ctx.moveTo(quadrantW, 0);
        ctx.lineTo(quadrantW, height);
        ctx.moveTo(0, quadrantH);
        ctx.lineTo(width, quadrantH);
        ctx.stroke();

        quads.forEach((q) => {
          ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
          ctx.beginPath();
          ctx.roundRect(q.x + 8, q.y + 8, 64, 18, 4);
          ctx.fill();
          ctx.strokeStyle = 'rgba(51, 65, 85, 0.8)';
          ctx.lineWidth = 1;
          ctx.setLineDash([]);
          ctx.stroke();

          ctx.fillStyle = '#94A3B8';
          ctx.font = '600 9px "Plus Jakarta Sans", sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`Zone ${q.key}`, q.x + 40, q.y + 17);
        });
        ctx.restore();
      }

      // 3. Grid Lines
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
      for (let x = 0; x <= gridCols; x++) {
        ctx.beginPath();
        ctx.moveTo(x * cellW, 0);
        ctx.lineTo(x * cellW, height);
        ctx.stroke();
      }
      for (let y = 0; y <= gridRows; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * cellH);
        ctx.lineTo(width, y * cellH);
        ctx.stroke();
      }

      // Coordinate numbers along top and left perimeter
      ctx.save();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
      ctx.font = '700 8px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      for (let x = 0; x < gridCols; x++) {
        ctx.fillText(`${x}`, x * cellW + cellW / 2, 3);
      }
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      for (let y = 0; y < gridRows; y++) {
        ctx.fillText(`${y}`, 3, y * cellH + cellH / 2);
      }
      ctx.restore();

      // Highway Transit Lane Guidelines
      ctx.save();
      ctx.strokeStyle = 'rgba(234, 179, 8, 0.15)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 6]);
      ctx.beginPath();
      ctx.moveTo(cellW * 4.5, cellH * 1.5);
      ctx.lineTo(cellW * 4.5, cellH * 7.5);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(59, 130, 246, 0.12)';
      ctx.beginPath();
      ctx.moveTo(cellW * 0.5, cellH * 7.5);
      ctx.lineTo(cellW * 9.5, cellH * 7.5);
      ctx.stroke();
      ctx.restore();

      // 4. Stations (Packing Dock P1 + Charging Bays C1/C2)
      activeState.stations.forEach((st) => {
        const sx = st.x * cellW;
        const sy = st.y * cellH;
        const isPacking = st.type === 'packing';
        const isOccupied = st.occupied_by !== null && st.occupied_by !== undefined;
        const isOffline = st.status === 'OFFLINE';

        ctx.save();
        if (isPacking) {
          ctx.strokeStyle = '#059669';
          ctx.lineWidth = 1.5;
          const dockGlow = isOccupied ? 0.12 + Math.sin(timestamp / 240) * 0.05 : 0.08;
          ctx.fillStyle = `rgba(5, 150, 105, ${dockGlow})`;
          ctx.beginPath();
          ctx.roundRect(sx + 3, sy + 3, cellW - 6, cellH - 6, 6);
          ctx.fill();
          ctx.stroke();

          // Conveyor rollers with subtle motion when dock is active/occupied
          ctx.strokeStyle = 'rgba(5, 150, 105, 0.35)';
          ctx.lineWidth = 1.2;
          const rollerShift = isOccupied ? (timestamp / 40) % 8 : 0;
          for (let ry = sy + 10 + rollerShift; ry < sy + cellH - 8; ry += 8) {
            ctx.beginPath();
            ctx.moveTo(sx + 8, ry);
            ctx.lineTo(sx + cellW - 8, ry);
            ctx.stroke();
          }

          ctx.fillStyle = '#10B981';
          ctx.font = '600 10px "JetBrains Mono", monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(st.id, sx + cellW / 2, sy + cellH / 2 - 4);
          ctx.fillStyle = '#6EE7B7';
          ctx.font = '500 7px "Plus Jakarta Sans", sans-serif';
          ctx.fillText(isOccupied ? 'PACKING...' : 'PACKING', sx + cellW / 2, sy + cellH - 10);

        } else {
          // Charging Station with breathing dock aura when occupied
          const baseColor = isOffline ? '#64748B' : isOccupied ? '#10B981' : '#D97706';
          ctx.strokeStyle = baseColor;
          ctx.lineWidth = 1.5;
          const chargePulse = isOccupied ? 0.14 + Math.sin(timestamp / 200) * 0.06 : 0.08;
          ctx.fillStyle = isOffline ? 'rgba(100, 116, 139, 0.08)' : isOccupied ? `rgba(16, 185, 129, ${chargePulse})` : 'rgba(217, 119, 6, 0.08)';
          ctx.beginPath();
          ctx.roundRect(sx + 3, sy + 3, cellW - 6, cellH - 6, 6);
          ctx.fill();
          ctx.stroke();

          // Contact pad
          ctx.fillStyle = isOffline ? '#334155' : isOccupied ? '#064E3B' : '#78350F';
          ctx.fillRect(sx + cellW / 2 - 8, sy + cellH / 2 - 8, 16, 16);
          const padColor = isOffline ? '#475569' : isOccupied ? `rgba(52, 211, 153, ${0.7 + Math.sin(timestamp / 180) * 0.3})` : '#FDE68A';
          ctx.fillStyle = padColor;
          ctx.fillRect(sx + cellW / 2 - 6, sy + cellH / 2 - 6, 12, 12);

          ctx.fillStyle = baseColor;
          ctx.font = '600 10px "JetBrains Mono", monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(st.id, sx + cellW / 2, sy + cellH / 2 - 4);
          ctx.fillStyle = isOffline ? '#94A3B8' : isOccupied ? '#34D399' : '#FCD34D';
          ctx.font = '500 7px "Plus Jakarta Sans", sans-serif';
          ctx.fillText(isOffline ? 'OFFLINE' : isOccupied ? 'CHARGING' : 'CHARGER', sx + cellW / 2, sy + cellH - 10);
        }
        ctx.restore();
      });

      // 5. Static Obstacles (Reinforced Concrete Pillars)
      (activeState.static_obstacles || []).forEach((so) => {
        const sx = so.x * cellW;
        const sy = so.y * cellH;
        ctx.save();
        ctx.fillStyle = '#1E293B';
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(sx + 6, sy + 6, cellW - 12, cellH - 12, 4);
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = '#64748B';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(sx + 9, sy + 9);
        ctx.lineTo(sx + cellW - 9, sy + cellH - 9);
        ctx.moveTo(sx + cellW - 9, sy + 9);
        ctx.lineTo(sx + 9, sy + cellH - 9);
        ctx.stroke();
        ctx.restore();
      });

      // 6. Shelves / Inventory Racks
      activeState.shelves.forEach((shelf, idx) => {
        const gx = shelf.x * cellW;
        const gy = shelf.y * cellH;

        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fillRect(gx + 7, gy + 7, cellW - 10, cellH - 10);

        ctx.fillStyle = '#0B1728';
        ctx.strokeStyle = '#1E3A5F';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(gx + 5, gy + 5, cellW - 10, cellH - 10, 5);
        ctx.fill();
        ctx.stroke();

        // Corner posts
        ctx.fillStyle = '#334155';
        ctx.fillRect(gx + 6, gy + 6, 5, 5);
        ctx.fillRect(gx + cellW - 11, gy + 6, 5, 5);
        ctx.fillRect(gx + 6, gy + cellH - 11, 5, 5);
        ctx.fillRect(gx + cellW - 11, gy + cellH - 11, 5, 5);

        // Pallet Base
        ctx.fillStyle = '#854D0E';
        ctx.fillRect(gx + 12, gy + 10, cellW - 24, cellH - 20);

        // Inventory SKUs
        const palette = ['#D97706', '#2563EB', '#059669', '#DC2626', '#7C3AED'];
        const boxColor = palette[idx % palette.length];

        ctx.fillStyle = boxColor;
        ctx.beginPath();
        ctx.roundRect(gx + 14, gy + 13, (cellW - 32) / 2, cellH - 26, 3);
        ctx.fill();

        ctx.fillStyle = palette[(idx + 2) % palette.length];
        ctx.beginPath();
        ctx.roundRect(gx + 14 + (cellW - 32) / 2 + 2, gy + 13, (cellW - 32) / 2, cellH - 26, 3);
        ctx.fill();

        // Shelf ID badge
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.beginPath();
        ctx.roundRect(gx + cellW / 2 - 11, gy + cellH / 2 - 7, 22, 14, 3);
        ctx.fill();
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = '#94A3B8';
        ctx.font = 'bold 8px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(shelf.id.replace('S_', 'S'), gx + cellW / 2, gy + cellH / 2);
        ctx.restore();
      });

      // 7. Dynamic Obstacles (Spills, Barriers with Hazard Stripes)
      (activeState.dynamic_obstacles || []).forEach((obs) => {
        const ox = obs.x * cellW;
        const oy = obs.y * cellH;

        ctx.save();
        ctx.fillStyle = '#180B04';
        ctx.strokeStyle = '#F59E0B';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(ox + 4, oy + 4, cellW - 8, cellH - 8, 6);
        ctx.fill();
        ctx.stroke();

        // Hazard stripes clip with subtle motion
        ctx.save();
        ctx.clip();
        ctx.strokeStyle = '#F59E0B';
        ctx.lineWidth = 4;
        const stripeOffset = (timestamp / 80) % 10;
        for (let d = -cellW + stripeOffset; d < cellW * 2; d += 10) {
          ctx.beginPath();
          ctx.moveTo(ox + d, oy);
          ctx.lineTo(ox + d + cellH, oy + cellH);
          ctx.stroke();
        }
        ctx.restore();

        // Warning Icon Badge
        ctx.fillStyle = 'rgba(10, 15, 25, 0.9)';
        ctx.beginPath();
        ctx.arc(ox + cellW / 2, oy + cellH / 2, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#F59E0B';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        const dangerGlow = Math.sin(timestamp / 180) * 0.3 + 0.7;
        ctx.fillStyle = `rgba(245, 158, 11, ${dangerGlow})`;
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('⚠', ox + cellW / 2, oy + cellH / 2);

        if (obs.duration && obs.duration > 0) {
          ctx.fillStyle = '#FBBF24';
          ctx.font = 'bold 8px "JetBrains Mono", monospace';
          ctx.fillText(`${obs.duration}t`, ox + cellW / 2, oy + cellH - 6);
        }
        ctx.restore();
      });

      // 8. Draw Planned Routes based on Route View Mode
      if (routeViewMode !== 'NONE') {
        const animMap = robotsAnimRef.current;
        animMap.forEach((robot) => {
          const isTarget = robot.id === selectedRobotId || robot.id === hoveredRobot;
          const shouldDraw = 
            routeViewMode === 'ALL' ||
            (routeViewMode === 'SELECTED' && isTarget) ||
            (routeViewMode === 'ACTIVE' && robot.state !== 'idle' && robot.state !== 'charging');

          if (shouldDraw && robot.path && robot.path.length > 0) {
            ctx.save();
            const isHighlight = isTarget;
            const lineColor = robot.health === 'FAILED' ? '#EF4444' : isHighlight ? '#00D9FF' : 'rgba(0, 217, 255, 0.35)';
            const dashOffset = -(timestamp / 30) % 24;

            ctx.strokeStyle = lineColor;
            ctx.lineWidth = isHighlight ? 3 : 1.5;
            ctx.setLineDash([6, 5]);
            ctx.lineDashOffset = dashOffset;
            if (isHighlight) {
              ctx.shadowColor = lineColor;
              ctx.shadowBlur = 8;
            }

            ctx.beginPath();
            ctx.moveTo(robot.currentX, robot.currentY);
            robot.path.forEach(([px, py]) => {
              ctx.lineTo(px * cellW + cellW / 2, py * cellH + cellH / 2);
            });
            ctx.stroke();

            // Destination waypoint ring for highlighted robot
            if (isHighlight && robot.path.length > 0) {
              const lastNode = robot.path[robot.path.length - 1];
              const destX = lastNode[0] * cellW + cellW / 2;
              const destY = lastNode[1] * cellH + cellH / 2;
              const reticleR = 12 + Math.sin(timestamp / 200) * 2.5;

              ctx.strokeStyle = lineColor;
              ctx.lineWidth = 1.5;
              ctx.setLineDash([]);
              ctx.beginPath();
              ctx.arc(destX, destY, reticleR, 0, Math.PI * 2);
              ctx.stroke();

              // Concentric expanding radar ping
              const radarR = 12 + ((timestamp / 24) % 16);
              const radarAlpha = Math.max(0, 1 - (radarR - 12) / 16) * 0.45;
              ctx.strokeStyle = `rgba(0, 217, 255, ${radarAlpha})`;
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.arc(destX, destY, radarR, 0, Math.PI * 2);
              ctx.stroke();

              ctx.strokeStyle = lineColor;
              ctx.beginPath();
              ctx.moveTo(destX - reticleR - 3, destY);
              ctx.lineTo(destX + reticleR + 3, destY);
              ctx.moveTo(destX, destY - reticleR - 3);
              ctx.lineTo(destX, destY + reticleR + 3);
              ctx.stroke();
            }
            ctx.restore();
          }
        });
      }

      // 9. Physics Step & Draw AMRs
      const animMap = robotsAnimRef.current;
      animMap.forEach((robot) => {
        const dx = robot.targetX - robot.currentX;
        const dy = robot.targetY - robot.currentY;
        const dist = Math.hypot(dx, dy);

        // Adaptive distance-scaled critically damped lerp for buttery smooth differential-drive kinematics
        const stepRate = dist > 40 ? 0.18 : dist > 10 ? 0.15 : 0.12;
        robot.currentX += dx * stepRate;
        robot.currentY += dy * stepRate;

        let angleDiff = robot.targetAngle - robot.angle;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        robot.angle += angleDiff * 0.18;

        robot.scanAngle += 0.08;

        const isSelected = robot.id === selectedRobotId;
        const isHovered = robot.id === hoveredRobot;
        const cx = robot.currentX;
        const cy = robot.currentY;

        ctx.save();

        // Smooth Motion Trail / Tire traces
        if (robot.trail && robot.trail.length > 1) {
          ctx.save();
          for (let i = 0; i < robot.trail.length - 1; i++) {
            const pt1 = robot.trail[i];
            const pt2 = robot.trail[i + 1];
            const alpha = (i / robot.trail.length) * 0.22;
            ctx.strokeStyle = robot.health === 'FAILED' ? `rgba(239, 68, 68, ${alpha})` : `rgba(59, 130, 246, ${alpha})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(pt1.x, pt1.y);
            ctx.lineTo(pt2.x, pt2.y);
            ctx.stroke();
          }
          ctx.restore();
        }

        // Smoke particles if robot failed
        if (robot.health === 'FAILED') {
          if (Math.random() < 0.3) {
            robot.smoke.push({
              x: cx + (Math.random() - 0.5) * 10,
              y: cy - 6,
              vx: (Math.random() - 0.5) * 0.6,
              vy: -0.8 - Math.random() * 0.5,
              alpha: 0.8,
              size: 4 + Math.random() * 3,
            });
          }
        }
        robot.smoke.forEach((p) => {
          ctx.fillStyle = `rgba(239, 68, 68, ${p.alpha * 0.6})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          p.x += p.vx;
          p.y += p.vy;
          p.alpha -= 0.02;
          p.size += 0.1;
        });
        robot.smoke = robot.smoke.filter((p) => p.alpha > 0);

        // Selection Reticle (Tactile outline with gentle breathing radius)
        if (isSelected || isHovered) {
          ctx.save();
          const haloColor = robot.health === 'FAILED' ? '#EF4444' : '#3B82F6';
          const haloPulse = isSelected ? 1 + Math.sin(timestamp / 220) * 0.04 : 1;
          ctx.strokeStyle = haloColor;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(cx, cy, cellW * 0.52 * haloPulse, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }

        // Render Robot Physical Chassis
        ctx.translate(cx, cy);
        ctx.rotate(robot.angle);

        const chassisW = cellW * 0.68;
        const chassisH = cellH * 0.56;

        // Forward Perception Arc (LiDAR scan cone - active when moving/operational)
        if (robot.health !== 'FAILED' && robot.state !== 'idle' && robot.state !== 'charging') {
          const coneDist = cellW * 0.46;
          const sweepAngle = Math.PI / 4.5;
          const scanOsc = Math.sin(timestamp / 160) * 0.04;
          const coneGrad = ctx.createRadialGradient(chassisW / 2, 0, 2, chassisW / 2, 0, coneDist);
          coneGrad.addColorStop(0, 'rgba(59, 130, 246, 0.12)');
          coneGrad.addColorStop(1, 'rgba(59, 130, 246, 0)');

          ctx.fillStyle = coneGrad;
          ctx.beginPath();
          ctx.moveTo(chassisW / 2, 0);
          ctx.arc(chassisW / 2, 0, coneDist, -sweepAngle / 2 + scanOsc, sweepAngle / 2 + scanOsc);
          ctx.closePath();
          ctx.fill();

          // Forward Twin LED Headlights (Cast warm light beams onto floor)
          const beamLen = cellW * 0.55;
          const beamAngle = Math.PI / 6;

          const leftBeam = ctx.createRadialGradient(chassisW / 2, -chassisH / 3.2, 1, chassisW / 2 + beamLen * 0.7, -chassisH / 3.2, beamLen);
          leftBeam.addColorStop(0, 'rgba(245, 158, 11, 0.4)');
          leftBeam.addColorStop(1, 'rgba(245, 158, 11, 0)');
          ctx.fillStyle = leftBeam;
          ctx.beginPath();
          ctx.moveTo(chassisW / 2, -chassisH / 3.2);
          ctx.arc(chassisW / 2, -chassisH / 3.2, beamLen, -beamAngle, beamAngle);
          ctx.closePath();
          ctx.fill();

          const rightBeam = ctx.createRadialGradient(chassisW / 2, chassisH / 3.2, 1, chassisW / 2 + beamLen * 0.7, chassisH / 3.2, beamLen);
          rightBeam.addColorStop(0, 'rgba(245, 158, 11, 0.4)');
          rightBeam.addColorStop(1, 'rgba(245, 158, 11, 0)');
          ctx.fillStyle = rightBeam;
          ctx.beginPath();
          ctx.moveTo(chassisW / 2, chassisH / 3.2);
          ctx.arc(chassisW / 2, chassisH / 3.2, beamLen, -beamAngle, beamAngle);
          ctx.closePath();
          ctx.fill();

          // Glowing LED bulb dots
          ctx.fillStyle = '#FDE68A';
          ctx.beginPath();
          ctx.arc(chassisW / 2 - 1, -chassisH / 3.2, 1.8, 0, Math.PI * 2);
          ctx.arc(chassisW / 2 - 1, chassisH / 3.2, 1.8, 0, Math.PI * 2);
          ctx.fill();
        }

        // Drive Wheels
        ctx.fillStyle = '#0F172A';
        ctx.fillRect(-chassisW / 2 + 3, -chassisH / 2 - 3, chassisW - 6, 3);
        ctx.fillRect(-chassisW / 2 + 3, chassisH / 2, chassisW - 6, 3);

        // Chassis Outer Shell
        const chassisGrad = ctx.createLinearGradient(-chassisW / 2, -chassisH / 2, chassisW / 2, chassisH / 2);
        if (robot.health === 'FAILED') {
          chassisGrad.addColorStop(0, '#7F1D1D');
          chassisGrad.addColorStop(1, '#450A0A');
        } else if (robot.state === 'charging') {
          chassisGrad.addColorStop(0, '#064E3B');
          chassisGrad.addColorStop(1, '#022C22');
        } else {
          chassisGrad.addColorStop(0, '#1E293B');
          chassisGrad.addColorStop(1, '#0F172A');
        }
        ctx.fillStyle = chassisGrad;
        ctx.strokeStyle = robot.health === 'FAILED' ? '#EF4444' : isSelected ? '#3B82F6' : '#334155';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(-chassisW / 2, -chassisH / 2, chassisW, chassisH, 5);
        ctx.fill();
        ctx.stroke();

        // Forward Optical Sensor array
        ctx.fillStyle = robot.health === 'FAILED' ? '#EF4444' : '#3B82F6';
        ctx.beginPath();
        ctx.arc(chassisW / 2 - 2, 0, 3, -Math.PI / 2, Math.PI / 2);
        ctx.fill();

        // Center LiDAR puck
        ctx.fillStyle = '#0F172A';
        ctx.strokeStyle = robot.health === 'FAILED' ? '#EF4444' : '#475569';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, 0, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Dynamic Cargo Pallet & SKU parcel with motion inertia
        if (robot.isLoaded) {
          const cargoBob = Math.sin(timestamp / 130) * 0.6;
          // Pallet base
          ctx.fillStyle = '#78350F';
          ctx.beginPath();
          ctx.roundRect(-chassisW / 3.6, -chassisH / 2.8 + cargoBob, chassisW / 1.8, chassisH * 0.7, 2);
          ctx.fill();
          ctx.strokeStyle = '#B45309';
          ctx.lineWidth = 1;
          ctx.stroke();

          // Box Package
          ctx.fillStyle = '#D97706';
          ctx.beginPath();
          ctx.roundRect(-chassisW / 4.5, -chassisH / 3.4 + cargoBob, chassisW / 2.2, chassisH * 0.58, 2);
          ctx.fill();

          // Parcel sealing tape
          ctx.strokeStyle = '#92400E';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(-chassisW / 4.5, cargoBob);
          ctx.lineTo(chassisW / 4.5 - 2, cargoBob);
          ctx.stroke();
        }

        // Central Status Beacon
        let beaconColor = '#3B82F6';
        if (robot.health === 'FAILED') beaconColor = '#EF4444';
        else if (robot.waitCounter > 0) beaconColor = '#F59E0B';
        else if (robot.state === 'picking') beaconColor = '#EC4899';
        else if (robot.state === 'moving_to_packing') beaconColor = '#10B981';
        else if (robot.state === 'charging' || robot.state === 'moving_to_charge') beaconColor = '#F59E0B';

        ctx.fillStyle = beaconColor;
        ctx.beginPath();
        ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore(); // Restore context for upright badges

        // Upright ID & Battery Badge
        ctx.save();
        ctx.translate(cx, cy);

        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.beginPath();
        ctx.roundRect(-14, -chassisH / 2 - 18, 28, 12, 3);
        ctx.fill();
        ctx.strokeStyle = isSelected ? '#3B82F6' : robot.health === 'FAILED' ? '#EF4444' : '#334155';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = robot.health === 'FAILED' ? '#FCA5A5' : '#FFFFFF';
        ctx.font = 'bold 9px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(robot.id, 0, -chassisH / 2 - 12);

        // Battery gauge
        const batt = robot.battery;
        const battColor = batt > 50 ? '#10B981' : batt > 20 ? '#F59E0B' : '#EF4444';
        ctx.fillStyle = '#1E293B';
        ctx.fillRect(-12, -chassisH / 2 - 5, 24, 2.5);
        ctx.fillStyle = battColor;
        ctx.fillRect(-12, -chassisH / 2 - 5, (batt / 100) * 24, 2.5);

        // Status pill badge if selected, failed, or yielding
        if (isSelected || robot.health === 'FAILED' || robot.waitCounter > 0) {
          const hudText = robot.health === 'FAILED' 
            ? `${robot.id} • HARDWARE FAULT` 
            : robot.waitCounter > 0 
            ? `${robot.id} • YIELDING` 
            : `${robot.id} • ${robot.state.replace(/_/g, ' ').toUpperCase()}`;
          ctx.font = '600 8px "Plus Jakarta Sans", sans-serif';
          const hudW = ctx.measureText(hudText).width + 12;

          ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
          ctx.strokeStyle = robot.health === 'FAILED' ? '#EF4444' : robot.waitCounter > 0 ? '#F59E0B' : '#3B82F6';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.roundRect(-hudW / 2, chassisH / 2 + 8, hudW, 15, 3);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = robot.health === 'FAILED' ? '#F87171' : robot.waitCounter > 0 ? '#FBBF24' : '#60A5FA';
          ctx.fillText(hudText, 0, chassisH / 2 + 16);
        }

        ctx.restore();
      });

      // 10. Interactive Editor Ghost Preview Cursor
      if (editTool !== 'select' && hoverGridCell) {
        const hx = hoverGridCell.x * cellW;
        const hy = hoverGridCell.y * cellH;

        ctx.save();
        if (editTool === 'delete') {
          ctx.fillStyle = 'rgba(239, 68, 68, 0.25)';
          ctx.strokeStyle = '#EF4444';
          ctx.lineWidth = 2;
          ctx.fillRect(hx + 2, hy + 2, cellW - 4, cellH - 4);
          ctx.strokeRect(hx + 2, hy + 2, cellW - 4, cellH - 4);

          ctx.strokeStyle = '#EF4444';
          ctx.beginPath();
          ctx.moveTo(hx + 8, hy + 8);
          ctx.lineTo(hx + cellW - 8, hy + cellH - 8);
          ctx.moveTo(hx + cellW - 8, hy + 8);
          ctx.lineTo(hx + 8, hy + cellH - 8);
          ctx.stroke();
        } else {
          ctx.fillStyle = 'rgba(16, 185, 129, 0.25)';
          ctx.strokeStyle = '#10B981';
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 4]);
          ctx.fillRect(hx + 2, hy + 2, cellW - 4, cellH - 4);
          ctx.strokeRect(hx + 2, hy + 2, cellW - 4, cellH - 4);

          ctx.fillStyle = '#10B981';
          ctx.font = 'bold 9px "JetBrains Mono", monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const toolLabel = editTool.replace('_', ' ').toUpperCase();
          ctx.fillText(`+${toolLabel}`, hx + cellW / 2, hy + cellH / 2);
        }
        ctx.restore();
      }

      animFrameIdRef.current = requestAnimationFrame(render);
    };

    animFrameIdRef.current = requestAnimationFrame(render);

    return () => {
      isRunning = false;
      cancelAnimationFrame(animFrameIdRef.current);
    };
  }, [activeState.shelves, activeState.stations, activeState.dynamic_obstacles, activeState.static_obstacles, activeState.zones, selectedRobotId, hoveredRobot, hoverGridCell, editTool, routeViewMode, showZoneOverlay, cellW, cellH, width, height]);

  // Click handler
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = width / rect.width;
    const scaleY = height / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    const gridX = Math.floor(clickX / cellW);
    const gridY = Math.floor(clickY / cellH);

    // If in Editor Tool Mode, delegate to onCellClick
    if (editTool !== 'select' && onCellClick) {
      onCellClick(gridX, gridY, editTool);
      return;
    }

    // Otherwise standard robot inspection selection
    let foundRobot: string | null = null;
    robotsAnimRef.current.forEach((robot) => {
      const dist = Math.hypot(clickX - robot.currentX, clickY - robot.currentY);
      if (dist <= cellW / 1.5) {
        foundRobot = robot.id;
      }
    });

    if (foundRobot) {
      onSelectRobot(foundRobot === selectedRobotId ? null : foundRobot);
    } else {
      onSelectRobot(null);
    }
  };

  // Hover detection for cursor, HUD, and editor ghost
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = width / rect.width;
    const scaleY = height / rect.height;
    const moveX = (e.clientX - rect.left) * scaleX;
    const moveY = (e.clientY - rect.top) * scaleY;

    const gridX = Math.max(0, Math.min(gridCols - 1, Math.floor(moveX / cellW)));
    const gridY = Math.max(0, Math.min(gridRows - 1, Math.floor(moveY / cellH)));
    setHoverGridCell({ x: gridX, y: gridY });

    let hovered: string | null = null;
    robotsAnimRef.current.forEach((robot) => {
      const dist = Math.hypot(moveX - robot.currentX, moveY - robot.currentY);
      if (dist <= cellW / 1.5) {
        hovered = robot.id;
      }
    });

    setHoveredRobot(hovered);
  };

  return (
    <div className="relative flex flex-col items-center w-full group">
      <div className="relative rounded-2xl p-1 bg-gradient-to-b from-[#1A2D4A] via-[#0D1B2E] to-[#12233A] shadow-2xl shadow-black/80">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          onClick={handleCanvasClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => {
            setHoveredRobot(null);
            setHoverGridCell(null);
          }}
          className={`rounded-xl max-w-full h-auto aspect-square block bg-[#06101F] ${
            editTool !== 'select' ? 'cursor-pointer' : 'cursor-crosshair'
          }`}
        />

        {/* Ambient Corner Decals */}
        <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-cyan-400/60 pointer-events-none" />
        <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-cyan-400/60 pointer-events-none" />
        <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-cyan-400/60 pointer-events-none" />
        <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-cyan-400/60 pointer-events-none" />
      </div>
    </div>
  );
};

export default WarehouseCanvas;
