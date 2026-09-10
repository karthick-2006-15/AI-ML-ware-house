import React, { useEffect, useRef, useState } from 'react';

interface EntityState {
  id: string;
  x: number;
  y: number;
  type?: string;
  state?: string;
}

interface SimState {
  tick: number;
  robots: EntityState[];
  shelves: EntityState[];
  stations: EntityState[];
  metrics?: any;
}

interface WarehouseGridProps {
  onStateUpdate?: (state: SimState) => void;
}

const WarehouseGrid: React.FC<WarehouseGridProps> = ({ onStateUpdate }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [simState, setSimState] = useState<SimState | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
    const wsBaseUrl = apiUrl.replace('http://', 'ws://').replace('https://', 'wss://');
    const ws = new WebSocket(`${wsBaseUrl}/ws/state`);
    
    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    
    ws.onmessage = (event) => {
      const state = JSON.parse(event.data);
      setSimState(state);
      if (onStateUpdate) {
        onStateUpdate(state);
      }
    };

    return () => ws.close();
  }, [onStateUpdate]);

  useEffect(() => {
    if (!canvasRef.current || !simState) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cellSize = 50; // Increased cell size so it's still large on screen
    const width = 10 * cellSize;
    const height = 10 * cellSize;

    ctx.clearRect(0, 0, width, height);

    // Draw Grid
    ctx.strokeStyle = '#e5e7eb';
    for (let i = 0; i <= 10; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cellSize, 0);
      ctx.lineTo(i * cellSize, height);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(0, i * cellSize);
      ctx.lineTo(width, i * cellSize);
      ctx.stroke();
    }

    // Draw Stations
    simState.stations.forEach(station => {
      ctx.fillStyle = station.type === 'packing' ? '#22c55e' : '#f97316';
      ctx.fillRect(station.x * cellSize, station.y * cellSize, cellSize, cellSize);
      ctx.fillStyle = '#ffffff';
      ctx.font = '14px Arial';
      ctx.fillText(station.type === 'packing' ? 'P' : 'C', station.x * cellSize + 10, station.y * cellSize + 20);
    });

    // Draw Shelves
    simState.shelves.forEach(shelf => {
      ctx.fillStyle = '#374151';
      ctx.fillRect(shelf.x * cellSize, shelf.y * cellSize, cellSize, cellSize);
    });

    // Draw Robots
    simState.robots.forEach(robot => {
      ctx.beginPath();
      const centerX = robot.x * cellSize + cellSize / 2;
      const centerY = robot.y * cellSize + cellSize / 2;
      
      let color = '#3b82f6'; // Blue
      if (robot.state === 'picking') color = '#ef4444'; // Red
      else if (robot.state === 'moving_to_packing') color = '#f59e0b'; // Amber
      
      ctx.arc(centerX, centerY, cellSize / 2.5, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();
      
      ctx.fillStyle = '#ffffff';
      ctx.font = '10px Arial';
      ctx.fillText(robot.id, centerX - 6, centerY + 3);
    });

  }, [simState]);

  return (
    <div className="flex flex-col items-center p-4 bg-white rounded-xl shadow-lg border border-gray-200">
      <div className="flex w-full justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-800">Live Simulation</h2>
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="text-sm text-gray-600">{connected ? 'Connected' : 'Disconnected'}</span>
          {simState && <span className="ml-4 font-mono font-medium">Tick: {simState.tick}</span>}
        </div>
      </div>
      <canvas 
        ref={canvasRef} 
        width={500} 
        height={500} 
        className="bg-gray-50 border border-gray-300 rounded-md"
      />
    </div>
  );
};

export default WarehouseGrid;
