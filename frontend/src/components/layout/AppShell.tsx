import React from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import type { PageId, SystemStatus } from '../../types';

interface AppShellProps {
  activePage: PageId;
  onSelectPage: (page: PageId) => void;
  systemStatus: SystemStatus;
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  onOpenSettings: () => void;
  onOpenAbout: () => void;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  activePage,
  onSelectPage,
  systemStatus,
  sidebarCollapsed,
  onToggleSidebar,
  onOpenSettings,
  onOpenAbout,
  children,
}) => {
  return (
    <div className="h-screen w-screen bg-warehouse-grid text-slate-100 flex overflow-hidden font-sans relative">
      {/* 1. Atmospheric Ambient Overhead Lighting & Vignette Cone */}
      <div className="warehouse-ambient-cone" />

      {/* 2. Mission Control CRT Scanline Overlay */}
      <div className="hud-scanline-layer" />

      {/* 3. Sweeping Overhead Warehouse Laser Scanner */}
      <div className="ambient-beam-sweep" />

      {/* 4. Background Ambient Volumetric Light Pods */}
      <div className="ambient-glow-cyan top-[-140px] left-[28%] animate-float pointer-events-none" />
      <div className="ambient-glow-purple bottom-[-120px] right-[10%] animate-float pointer-events-none" style={{ animationDelay: '3s' }} />
      <div className="ambient-glow-green bottom-[-100px] left-[15%] animate-float pointer-events-none" style={{ animationDelay: '1.5s' }} />

      {/* 5. Industrial Watermark Telemetry (Subtle CAD Markings) */}
      <div className="fixed bottom-3 right-6 text-[9px] font-mono text-cyan-400/25 tracking-widest uppercase pointer-events-none select-none z-0 hidden lg:block">
        [ SECTOR 04-A // FLEET LOGISTICS HUB • CAD RESOLUTION: 10x10 MESH • WMS v2.4 ]
      </div>
      <div className="fixed top-3 right-52 text-[9px] font-mono text-cyan-400/20 tracking-widest uppercase pointer-events-none select-none z-0 hidden xl:block">
        [ YOLOv8s PERCEPTION // XGBOOST RISK // A* MULTI-AGENT NAV ]
      </div>

      {/* Sidebar - left column */}
      <Sidebar
        activePage={activePage}
        onSelectPage={onSelectPage}
        collapsed={sidebarCollapsed}
        onToggleCollapse={onToggleSidebar}
        onOpenSettings={onOpenSettings}
        onOpenAbout={onOpenAbout}
      />

      {/* Main Column - header + scrollable content */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <TopBar
          activePage={activePage}
          systemStatus={systemStatus}
        />

        <main className="flex-1 overflow-y-auto px-4 sm:px-6 md:px-8 py-6">
          <div className="max-w-[1440px] mx-auto w-full space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AppShell;
