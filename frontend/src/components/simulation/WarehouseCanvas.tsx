import React, { useEffect, useRef, useState } from 'react';
import type { SimState } from '../../types';

interface WarehouseCanvasProps {
  simState: SimState | null;
  selectedRobotId: string | null;
  onSelectRobot: (robotId: string | null) => void;
  width?: number;
  height?: number;
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
  path: [number, number][];
  task?: string;
  isLoaded: boolean;
  scanAngle: number;
  trail: { x: number; y: number; alpha: number }[];
}

const DEFAULT_SHELVES = [
  { id: 'S_0', x: 2, y: 2 }, { id: 'S_1', x: 2, y: 3 }, { id: 'S_2', x: 2, y: 4 }, { id: 'S_3', x: 2, y: 5 }, { id: 'S_4', x: 2, y: 6 },
  { id: 'S_5', x: 3, y: 2 }, { id: 'S_6', x: 3, y: 3 }, { id: 'S_7', x: 3, y: 4 }, { id: 'S_8', x: 3, y: 5 }, { id: 'S_9', x: 3, y: 6 },
  { id: 'S_10', x: 6, y: 2 }, { id: 'S_11', x: 6, y: 3 }, { id: 'S_12', x: 6, y: 4 }, { id: 'S_13', x: 6, y: 5 }, { id: 'S_14', x: 6, y: 6 },
  { id: 'S_15', x: 7, y: 2 }, { id: 'S_16', x: 7, y: 3 }, { id: 'S_17', x: 7, y: 4 }, { id: 'S_18', x: 7, y: 5 }, { id: 'S_19', x: 7, y: 6 },
];

const DEFAULT_STATIONS = [
  { id: 'P1', x: 5, y: 0, type: 'packing' },
  { id: 'C1', x: 0, y: 9, type: 'charging' },
  { id: 'C2', x: 9, y: 9, type: 'charging' },
];

const DEFAULT_ROBOTS = [
  { id: 'R0', x: 1, y: 8, state: 'idle', battery: 100 },
  { id: 'R1', x: 3, y: 8, state: 'idle', battery: 100 },
  { id: 'R2', x: 5, y: 8, state: 'idle', battery: 100 },
  { id: 'R3', x: 7, y: 8, state: 'idle', battery: 100 },
  { id: 'R4', x: 9, y: 8, state: 'idle', battery: 100 },
];

export const WarehouseCanvas: React.FC<WarehouseCanvasProps> = ({
  simState,
  selectedRobotId,
  onSelectRobot,
  width = 560,
  height = 560,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredRobot, setHoveredRobot] = useState<string | null>(null);

  // Store continuous physical positions and headings across frames
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

  // Sync incoming telemetry into animation models
  useEffect(() => {
    const animMap = robotsAnimRef.current;

    activeState.robots.forEach((robot) => {
      const targetPxX = robot.x * cellW + cellW / 2;
      const targetPxY = robot.y * cellH + cellH / 2;
      const existing = animMap.get(robot.id);

      const isCarrying = robot.state === 'picking' || robot.state === 'moving_to_packing';

      if (!existing) {
        animMap.set(robot.id, {
          id: robot.id,
          currentX: targetPxX,
          currentY: targetPxY,
          targetX: targetPxX,
          targetY: targetPxY,
          angle: -Math.PI / 2, // Facing up toward aisles
          targetAngle: -Math.PI / 2,
          battery: robot.battery ?? 100,
          state: robot.state ?? 'idle',
          path: robot.path ?? [],
          task: robot.task,
          isLoaded: isCarrying,
          scanAngle: 0,
          trail: [],
        });
      } else {
        existing.targetX = targetPxX;
        existing.targetY = targetPxY;
        existing.battery = robot.battery ?? existing.battery;
        existing.state = robot.state ?? existing.state;
        existing.path = robot.path ?? existing.path;
        existing.task = robot.task ?? existing.task;
        existing.isLoaded = isCarrying;

        // Compute heading direction if target moved
        const dx = targetPxX - existing.currentX;
        const dy = targetPxY - existing.currentY;
        if (Math.hypot(dx, dy) > 3) {
          existing.targetAngle = Math.atan2(dy, dx);
          // Append particle to motion trail
          existing.trail.push({ x: existing.currentX, y: existing.currentY, alpha: 0.7 });
          if (existing.trail.length > 8) existing.trail.shift();
        }
      }
    });
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

      // 1. Dark Blueprint Epoxy Floor Background
      ctx.fillStyle = '#06101F';
      ctx.fillRect(0, 0, width, height);

      // Subtle floor panel gradient
      const floorGrad = ctx.createRadialGradient(width / 2, height / 2, 80, width / 2, height / 2, width);
      floorGrad.addColorStop(0, 'rgba(10, 26, 47, 0.6)');
      floorGrad.addColorStop(1, 'rgba(4, 11, 22, 0.9)');
      ctx.fillStyle = floorGrad;
      ctx.fillRect(0, 0, width, height);

      // 2. High-Tech Precision Grid Lines & Floor Ticks
      ctx.lineWidth = 1;
      ctx.strokeStyle = '#0F233B';
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

      // Painted Transit Lane Guidelines (Highway between Shelves & Staging)
      ctx.save();
      ctx.strokeStyle = 'rgba(234, 179, 8, 0.25)'; // Yellow safety dashed guide
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 6]);

      // Center highway line between col 4 and 5
      ctx.beginPath();
      ctx.moveTo(cellW * 4.5, cellH * 1.5);
      ctx.lineTo(cellW * 4.5, cellH * 7.5);
      ctx.stroke();

      // Staging row guide line
      ctx.strokeStyle = 'rgba(0, 217, 255, 0.2)';
      ctx.beginPath();
      ctx.moveTo(cellW * 0.5, cellH * 7.5);
      ctx.lineTo(cellW * 9.5, cellH * 7.5);
      ctx.stroke();

      // Zone Labels
      ctx.font = '700 8px "JetBrains Mono", monospace';
      ctx.fillStyle = '#1E3A5F';
      ctx.textAlign = 'left';
      ctx.fillText('AISLE 1-2', cellW * 2.1, cellH * 1.8);
      ctx.fillText('AISLE 3-4', cellW * 6.1, cellH * 1.8);
      ctx.fillText('STAGING FLEET DOCK', cellW * 0.5, cellH * 7.3);
      ctx.restore();

      // 3. Draw Stations (Packing Station P1 with scanner, Charging Bays C1/C2 with induction fields)
      activeState.stations.forEach((st) => {
        const sx = st.x * cellW;
        const sy = st.y * cellH;
        const isPacking = st.type === 'packing';

        ctx.save();
        if (isPacking) {
          // PACKING DOCK P1
          ctx.strokeStyle = '#10B981';
          ctx.lineWidth = 2;
          ctx.fillStyle = 'rgba(16, 185, 129, 0.08)';
          ctx.beginPath();
          ctx.roundRect(sx + 3, sy + 3, cellW - 6, cellH - 6, 8);
          ctx.fill();
          ctx.stroke();

          // Conveyor rollers
          ctx.strokeStyle = 'rgba(16, 185, 129, 0.35)';
          ctx.lineWidth = 1.5;
          for (let ry = sy + 10; ry < sy + cellH - 8; ry += 8) {
            ctx.beginPath();
            ctx.moveTo(sx + 8, ry);
            ctx.lineTo(sx + cellW - 8, ry);
            ctx.stroke();
          }

          // Oscillating overhead laser scanner beam
          const scanOffset = (Math.sin(timestamp / 300) * 0.5 + 0.5) * (cellH - 16);
          ctx.strokeStyle = 'rgba(16, 185, 129, 0.85)';
          ctx.lineWidth = 2;
          ctx.shadowColor = '#10B981';
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.moveTo(sx + 6, sy + 8 + scanOffset);
          ctx.lineTo(sx + cellW - 6, sy + 8 + scanOffset);
          ctx.stroke();
          ctx.shadowBlur = 0;

          // Station Badge
          ctx.fillStyle = '#10B981';
          ctx.font = 'bold 11px "JetBrains Mono", monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('P1', sx + cellW / 2, sy + cellH / 2);
          ctx.font = '700 7px "JetBrains Mono", monospace';
          ctx.fillText('PACKING', sx + cellW / 2, sy + cellH - 9);

        } else {
          // CHARGING BAY C1/C2
          ctx.strokeStyle = '#F59E0B';
          ctx.lineWidth = 2;
          ctx.fillStyle = 'rgba(245, 158, 11, 0.08)';
          ctx.beginPath();
          ctx.roundRect(sx + 3, sy + 3, cellW - 6, cellH - 6, 8);
          ctx.fill();
          ctx.stroke();

          // Magnetic induction pulsing rings
          const pulseR = ((timestamp / 40) % 18) + 4;
          const pulseAlpha = Math.max(0, 1 - pulseR / 22);
          ctx.strokeStyle = `rgba(245, 158, 11, ${pulseAlpha * 0.7})`;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(sx + cellW / 2, sy + cellH / 2, pulseR, 0, Math.PI * 2);
          ctx.stroke();

          // Metallic charging contact pad plates
          ctx.fillStyle = '#B45309';
          ctx.fillRect(sx + cellW / 2 - 8, sy + cellH / 2 - 8, 16, 16);
          ctx.fillStyle = '#FDE68A';
          ctx.fillRect(sx + cellW / 2 - 6, sy + cellH / 2 - 6, 12, 12);

          // Station Label
          ctx.fillStyle = '#F59E0B';
          ctx.font = 'bold 11px "JetBrains Mono", monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(st.id, sx + cellW / 2, sy + cellH / 2);
          ctx.font = '700 7px "JetBrains Mono", monospace';
          ctx.fillText('CHARGER', sx + cellW / 2, sy + cellH - 9);
        }
        ctx.restore();
      });

      // 4. Draw Industrial Warehouse Storage Racks (Shelves with Pallets & Bins)
      activeState.shelves.forEach((shelf, idx) => {
        const gx = shelf.x * cellW;
        const gy = shelf.y * cellH;

        ctx.save();
        // Drop shadow under rack
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fillRect(gx + 7, gy + 7, cellW - 10, cellH - 10);

        // Rack Metal Frame Base
        ctx.fillStyle = '#0B1728';
        ctx.strokeStyle = '#1E3A5F';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(gx + 5, gy + 5, cellW - 10, cellH - 10, 5);
        ctx.fill();
        ctx.stroke();

        // 4 Steel Upright Corner Posts
        ctx.fillStyle = '#334155';
        ctx.fillRect(gx + 6, gy + 6, 5, 5);
        ctx.fillRect(gx + cellW - 11, gy + 6, 5, 5);
        ctx.fillRect(gx + 6, gy + cellH - 11, 5, 5);
        ctx.fillRect(gx + cellW - 11, gy + cellH - 11, 5, 5);

        // Wooden Pallet Base
        ctx.fillStyle = '#854D0E';
        ctx.fillRect(gx + 12, gy + 10, cellW - 24, cellH - 20);

        // Stored Inventory Boxes / Totes (Realistic Multi-Color Warehouse SKUs)
        const palette = ['#D97706', '#2563EB', '#059669', '#DC2626', '#7C3AED'];
        const boxColor = palette[idx % palette.length];

        // Box 1 (Left)
        ctx.fillStyle = boxColor;
        ctx.beginPath();
        ctx.roundRect(gx + 14, gy + 13, (cellW - 32) / 2, cellH - 26, 3);
        ctx.fill();
        // Tape stripe on box
        ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.fillRect(gx + 14, gy + cellH / 2 - 1.5, (cellW - 32) / 2, 3);

        // Box 2 (Right)
        ctx.fillStyle = palette[(idx + 2) % palette.length];
        ctx.beginPath();
        ctx.roundRect(gx + 14 + (cellW - 32) / 2 + 2, gy + 13, (cellW - 32) / 2, cellH - 26, 3);
        ctx.fill();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.fillRect(gx + 14 + (cellW - 32) / 2 + 2, gy + cellH / 2 - 1.5, (cellW - 32) / 2, 3);

        // Digital Shelf Label Badge
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
        ctx.fillText(`S${idx}`, gx + cellW / 2, gy + cellH / 2);

        // Green shelf stock LED
        ctx.fillStyle = '#10B981';
        ctx.beginPath();
        ctx.arc(gx + cellW - 9, gy + 9, 1.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      });

      // 5. Draw Dynamic A* Planned Navigation Path for Selected/Hovered Robot
      const targetRobotId = selectedRobotId ?? hoveredRobot;
      if (targetRobotId) {
        const activeBot = robotsAnimRef.current.get(targetRobotId);
        if (activeBot) {
          ctx.save();
          // Animated flowing laser chevrons
          const dashOffset = -(timestamp / 30) % 24;
          ctx.strokeStyle = '#00D9FF';
          ctx.lineWidth = 3;
          ctx.setLineDash([8, 6]);
          ctx.lineDashOffset = dashOffset;
          ctx.shadowColor = '#00D9FF';
          ctx.shadowBlur = 10;

          ctx.beginPath();
          ctx.moveTo(activeBot.currentX, activeBot.currentY);

          // If backend provided real waypoints, draw each segment
          if (activeBot.path && activeBot.path.length > 0) {
            activeBot.path.forEach(([px, py]) => {
              ctx.lineTo(px * cellW + cellW / 2, py * cellH + cellH / 2);
            });
          } else {
            // Default corridor route to Packing Station (5, 0)
            const targetX = 5 * cellW + cellW / 2;
            const targetY = 0 * cellH + cellH / 2;
            const waypointY = activeBot.currentY > 7 * cellH ? 7 * cellH + cellH / 2 : 1 * cellH + cellH / 2;
            ctx.lineTo(activeBot.currentX, waypointY);
            ctx.lineTo(targetX, waypointY);
            ctx.lineTo(targetX, targetY);
          }
          ctx.stroke();

          // Target Destination Holographic Reticle
          const destX = 5 * cellW + cellW / 2;
          const destY = 0 * cellH + cellH / 2;
          const reticleR = 14 + Math.sin(timestamp / 200) * 3;
          ctx.strokeStyle = '#00D9FF';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([]);
          ctx.beginPath();
          ctx.arc(destX, destY, reticleR, 0, Math.PI * 2);
          ctx.stroke();

          // Crosshairs
          ctx.beginPath();
          ctx.moveTo(destX - reticleR - 4, destY);
          ctx.lineTo(destX + reticleR + 4, destY);
          ctx.moveTo(destX, destY - reticleR - 4);
          ctx.lineTo(destX, destY + reticleR + 4);
          ctx.stroke();

          ctx.restore();
        }
      }

      // 6. Physics Step & Draw Realistic AMRs (Autonomous Mobile Robots)
      const animMap = robotsAnimRef.current;
      animMap.forEach((robot) => {
        // Smooth position interpolation (Spring / Lerp damping)
        robot.currentX += (robot.targetX - robot.currentX) * 0.14;
        robot.currentY += (robot.targetY - robot.currentY) * 0.14;

        // Smooth heading angular interpolation (shortest angular path)
        let angleDiff = robot.targetAngle - robot.angle;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        robot.angle += angleDiff * 0.16;

        // Advance 360 LiDAR scanner rotation
        robot.scanAngle += 0.08;

        const isSelected = robot.id === selectedRobotId;
        const isHovered = robot.id === hoveredRobot;
        const cx = robot.currentX;
        const cy = robot.currentY;

        ctx.save();

        // A. Motion Trail Particles
        robot.trail.forEach((t) => {
          ctx.fillStyle = `rgba(0, 217, 255, ${t.alpha * 0.3})`;
          ctx.beginPath();
          ctx.arc(t.x, t.y, 4, 0, Math.PI * 2);
          ctx.fill();
          t.alpha -= 0.03;
        });
        robot.trail = robot.trail.filter((t) => t.alpha > 0);

        // B. Holographic Targeting Ring for Selected Robot
        if (isSelected || isHovered) {
          ctx.save();
          const pulseR = cellW / 1.7 + Math.sin(timestamp / 250) * 2;
          ctx.strokeStyle = isSelected ? '#00D9FF' : '#1683FF';
          ctx.lineWidth = isSelected ? 2 : 1.5;
          ctx.shadowColor = '#00D9FF';
          ctx.shadowBlur = isSelected ? 12 : 6;

          // Outer HUD ring
          ctx.setLineDash([12, 8]);
          ctx.beginPath();
          ctx.arc(cx, cy, pulseR, timestamp / 500, timestamp / 500 + Math.PI * 2);
          ctx.stroke();

          // 4 Corner HUD Reticle Brackets
          ctx.setLineDash([]);
          const bracketSize = 7;
          const bOffset = pulseR + 4;
          // Top Left
          ctx.beginPath();
          ctx.moveTo(cx - bOffset, cy - bOffset + bracketSize);
          ctx.lineTo(cx - bOffset, cy - bOffset);
          ctx.lineTo(cx - bOffset + bracketSize, cy - bOffset);
          // Top Right
          ctx.moveTo(cx + bOffset - bracketSize, cy - bOffset);
          ctx.lineTo(cx + bOffset, cy - bOffset);
          ctx.lineTo(cx + bOffset, cy - bOffset + bracketSize);
          // Bottom Left
          ctx.moveTo(cx - bOffset, cy + bOffset - bracketSize);
          ctx.lineTo(cx - bOffset, cy + bOffset);
          ctx.lineTo(cx - bOffset + bracketSize, cy + bOffset);
          // Bottom Right
          ctx.moveTo(cx + bOffset - bracketSize, cy + bOffset);
          ctx.lineTo(cx + bOffset, cy + bOffset);
          ctx.lineTo(cx + bOffset, cy + bOffset - bracketSize);
          ctx.stroke();
          ctx.restore();
        }

        // C. Transform context to Robot Center & Heading Angle
        ctx.translate(cx, cy);
        ctx.rotate(robot.angle);

        const chassisW = cellW * 0.72; // Length along heading (forward = +x)
        const chassisH = cellH * 0.58; // Width across heading

        // D. Dual Front Headlights (Projected forward light cones)
        const headlightGrad = ctx.createRadialGradient(
          chassisW / 2, 0, 4,
          chassisW / 2 + 50, 0, 60
        );
        headlightGrad.addColorStop(0, 'rgba(0, 217, 255, 0.45)');
        headlightGrad.addColorStop(0.6, 'rgba(0, 217, 255, 0.12)');
        headlightGrad.addColorStop(1, 'rgba(0, 217, 255, 0)');

        ctx.fillStyle = headlightGrad;
        ctx.beginPath();
        ctx.moveTo(chassisW / 2, -chassisH / 2.6);
        ctx.lineTo(chassisW / 2 + 65, -chassisH * 1.4);
        ctx.lineTo(chassisW / 2 + 65, chassisH * 1.4);
        ctx.lineTo(chassisW / 2, chassisH / 2.6);
        ctx.closePath();
        ctx.fill();

        // E. Ambient Occlusion Drop Shadow Under Chassis
        ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
        ctx.beginPath();
        ctx.ellipse(0, 0, chassisW / 1.7, chassisH / 1.7, 0, 0, Math.PI * 2);
        ctx.fill();

        // F. Left & Right Drive Wheels / Rubber Tracks
        ctx.fillStyle = '#0F172A';
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1;
        // Top Wheel (Relative to chassis)
        ctx.beginPath();
        ctx.roundRect(-chassisW / 3, -chassisH / 2 - 3, chassisW * 0.66, 6, 2);
        ctx.fill();
        ctx.stroke();
        // Bottom Wheel
        ctx.beginPath();
        ctx.roundRect(-chassisW / 3, chassisH / 2 - 3, chassisW * 0.66, 6, 2);
        ctx.fill();
        ctx.stroke();

        // G. Main Industrial AGV Chassis Body
        ctx.fillStyle = '#0D1B2E';
        ctx.strokeStyle = isSelected ? '#00D9FF' : '#1E3A5F';
        ctx.lineWidth = isSelected ? 2.5 : 1.5;
        ctx.beginPath();
        ctx.roundRect(-chassisW / 2, -chassisH / 2, chassisW, chassisH, 7);
        ctx.fill();
        ctx.stroke();

        // Inner Tech Accents / Armor Plates
        ctx.fillStyle = '#102238';
        ctx.fillRect(-chassisW / 2 + 4, -chassisH / 2 + 4, chassisW - 8, chassisH - 8);

        // H. Front Headlight Diodes & Rear Red Brake Taillights
        // Front Headlights
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(chassisW / 2 - 2, -chassisH / 3, 2.5, 0, Math.PI * 2);
        ctx.arc(chassisW / 2 - 2, chassisH / 3, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Rear Brake LEDs (Red)
        ctx.fillStyle = '#EF4444';
        ctx.shadowColor = '#EF4444';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(-chassisW / 2 + 2, -chassisH / 3, 2, 0, Math.PI * 2);
        ctx.arc(-chassisW / 2 + 2, chassisH / 3, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // I. Carried Cargo / Pallet Pod (if picking or moving to packing)
        if (robot.isLoaded) {
          ctx.fillStyle = '#D97706'; // Carton box payload
          ctx.strokeStyle = '#FDE68A';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.roundRect(-chassisW / 3.2, -chassisH / 3.2, chassisW * 0.64, chassisH * 0.64, 3);
          ctx.fill();
          ctx.stroke();
          // Strapping bands
          ctx.strokeStyle = '#92400E';
          ctx.beginPath();
          ctx.moveTo(-chassisW / 3.2, 0);
          ctx.lineTo(chassisW * 0.32, 0);
          ctx.stroke();
        }

        // J. Center 360° LiDAR Puck & Rotating Laser Sweep
        ctx.save();
        // Rotating LiDAR Scanner Wedge
        const sweepWedge = Math.PI / 4; // 45 degree scanner cone
        const sweepGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, cellW * 0.8);
        sweepGrad.addColorStop(0, 'rgba(0, 217, 255, 0.4)');
        sweepGrad.addColorStop(1, 'rgba(0, 217, 255, 0)');
        ctx.fillStyle = sweepGrad;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, cellW * 0.8, robot.scanAngle, robot.scanAngle + sweepWedge);
        ctx.closePath();
        ctx.fill();

        // Sweeping Laser Beam Line
        ctx.strokeStyle = 'rgba(0, 217, 255, 0.85)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(robot.scanAngle + sweepWedge) * (cellW * 0.8), Math.sin(robot.scanAngle + sweepWedge) * (cellW * 0.8));
        ctx.stroke();
        ctx.restore();

        // Metallic Center LiDAR Puck Base
        ctx.fillStyle = '#1E293B';
        ctx.strokeStyle = '#00D9FF';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, 0, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Pulsing Central Status Tower Beacon
        let beaconColor = '#1683FF'; // Idle (Blue)
        if (robot.state === 'picking') beaconColor = '#EF4444'; // Red
        else if (robot.state === 'moving_to_packing' || robot.state === 'en_route') beaconColor = '#10B981'; // Green
        else if (robot.state === 'charging' || robot.state === 'moving_to_charge') beaconColor = '#F59E0B'; // Amber

        ctx.fillStyle = beaconColor;
        ctx.shadowColor = beaconColor;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.restore(); // Restore unrotated context for text & HUD

        // K. Monospace Robot ID Badge & Micro Battery Gauge (Rendered upright)
        ctx.save();
        ctx.translate(cx, cy);

        // ID pill above robot
        ctx.fillStyle = 'rgba(6, 16, 31, 0.85)';
        ctx.beginPath();
        ctx.roundRect(-14, -chassisH / 2 - 18, 28, 12, 3);
        ctx.fill();
        ctx.strokeStyle = isSelected ? '#00D9FF' : '#1A2D4A';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 9px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(robot.id, 0, -chassisH / 2 - 12);

        // Battery gauge underneath ID
        const batt = robot.battery;
        const battColor = batt > 50 ? '#10B981' : batt > 20 ? '#F59E0B' : '#EF4444';
        ctx.fillStyle = '#1E293B';
        ctx.fillRect(-12, -chassisH / 2 - 5, 24, 2.5);
        ctx.fillStyle = battColor;
        ctx.fillRect(-12, -chassisH / 2 - 5, (batt / 100) * 24, 2.5);

        // Floating Telemetry HUD Tooltip if selected
        if (isSelected) {
          const hudText = `${robot.id.toUpperCase()} • ${robot.state.replace(/_/g, ' ').toUpperCase()}`;
          ctx.font = '700 8px "JetBrains Mono", monospace';
          const hudW = ctx.measureText(hudText).width + 14;

          ctx.fillStyle = 'rgba(8, 24, 42, 0.95)';
          ctx.strokeStyle = '#00D9FF';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.roundRect(-hudW / 2, chassisH / 2 + 8, hudW, 16, 4);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#00D9FF';
          ctx.fillText(hudText, 0, chassisH / 2 + 17);
        }

        ctx.restore();
      });

      animFrameIdRef.current = requestAnimationFrame(render);
    };

    animFrameIdRef.current = requestAnimationFrame(render);

    return () => {
      isRunning = false;
      cancelAnimationFrame(animFrameIdRef.current);
    };
  }, [activeState.shelves, activeState.stations, selectedRobotId, hoveredRobot, cellW, cellH, width, height]);

  // Click handler to select robots with coordinate scaling
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = width / rect.width;
    const scaleY = height / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    let foundRobot: string | null = null;
    robotsAnimRef.current.forEach((robot) => {
      const dist = Math.hypot(clickX - robot.currentX, clickY - robot.currentY);
      if (dist <= cellW / 1.6) {
        foundRobot = robot.id;
      }
    });

    if (foundRobot) {
      onSelectRobot(foundRobot === selectedRobotId ? null : foundRobot);
    } else {
      onSelectRobot(null);
    }
  };

  // Hover detection for interactive cursor & HUD
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = width / rect.width;
    const scaleY = height / rect.height;
    const moveX = (e.clientX - rect.left) * scaleX;
    const moveY = (e.clientY - rect.top) * scaleY;

    let hovered: string | null = null;
    robotsAnimRef.current.forEach((robot) => {
      const dist = Math.hypot(moveX - robot.currentX, moveY - robot.currentY);
      if (dist <= cellW / 1.6) {
        hovered = robot.id;
      }
    });

    setHoveredRobot(hovered);
  };

  return (
    <div className="relative flex flex-col items-center w-full group">
      {/* High-Tech HUD Canvas Container */}
      <div className="relative rounded-2xl p-1 bg-gradient-to-b from-[#1A2D4A] via-[#0D1B2E] to-[#12233A] shadow-2xl shadow-black/80">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          onClick={handleCanvasClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoveredRobot(null)}
          className="rounded-xl cursor-crosshair max-w-full h-auto aspect-square block bg-[#06101F]"
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
