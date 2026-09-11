import React from 'react';
import Logo from './Logo';
import UserProfile from './UserProfile';
import { HelpCircle, Play, Eye, TrendingUp, Layers, Cpu, Compass } from 'lucide-react';
import type { PageId, SystemStatus } from '../../types';

interface CinematicAppShellProps {
  activePage: PageId;
  onSelectPage: (page: PageId) => void;
  systemStatus: SystemStatus;
  onOpenHelpModal: () => void;
  children: React.ReactNode;
}

export const CinematicAppShell: React.FC<CinematicAppShellProps> = ({
  activePage,
  onSelectPage,
  systemStatus,
  onOpenHelpModal,
  children,
}) => {
  const isOnline = systemStatus.yolo_ready && systemStatus.xgboost_ready;

  const navItems: { id: PageId; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Fleet Overview', icon: <Compass className="w-3.5 h-3.5" /> },
    { id: 'simulation', label: '2D Simulation', icon: <Play className="w-3.5 h-3.5" /> },
    { id: 'vision', label: 'Vision YOLO', icon: <Eye className="w-3.5 h-3.5" /> },
    { id: 'analytics', label: 'Predictive AI', icon: <TrendingUp className="w-3.5 h-3.5" /> },
    { id: 'experiments', label: 'Experiments', icon: <Layers className="w-3.5 h-3.5" /> },
    { id: 'architecture', label: 'Architecture', icon: <Cpu className="w-3.5 h-3.5" /> },
  ];

  return (
    // Outer surrounding page: true edge-to-edge full screen layout
    <div className="w-screen h-screen bg-[#070A12] text-slate-100 flex flex-col overflow-hidden select-none font-sans">
      
      {/* 1. TOP BAR: Spans 100% full width edge-to-edge */}
      <header className="relative z-30 h-16 sm:h-18 px-6 sm:px-10 border-b border-white/10 bg-[#070A12]/90 backdrop-blur-xl flex items-center justify-between flex-shrink-0 w-full">
        {/* Top Left Branding */}
        <div className="flex items-center gap-4">
          <Logo 
            subtitle="autonomous warehouse intelligence" 
          />
        </div>

        {/* Navigation Pill Bar (Seamless switching between Bio-Dashboard and Full Fleet/Vision/AI views) */}
        <div className="hidden md:flex items-center gap-1 p-1 bg-black/50 backdrop-blur-md rounded-full border border-white/10 shadow-inner">
          {navItems.map((item) => {
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectPage(item.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Top Right: Utility Icon & User Profile */}
        <div className="flex items-center gap-4 sm:gap-5">
          <div className="flex items-center gap-2">
            <span 
              className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400 shadow-[0_0_6px_#34D399]' : 'bg-amber-400'}`} 
              title={isOnline ? 'System Models Online' : 'System Degraded'} 
            />
            <button
              onClick={onOpenHelpModal}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-white/15 bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all opacity-80 hover:opacity-100"
              title="Help & System Info"
            >
              <HelpCircle className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Mobile Navigation Dropdown Trigger */}
          <div className="md:hidden">
            <select
              value={activePage}
              onChange={(e) => onSelectPage(e.target.value as PageId)}
              className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-2 py-1"
            >
              {navItems.map((it) => (
                <option key={it.id} value={it.id}>
                  {it.label}
                </option>
              ))}
            </select>
          </div>

          {/* Top Right User Profile */}
          <UserProfile
            name="Benjamin Carter"
            role="Lead Systems Architect"
          />
        </div>
      </header>

      {/* 2. MAIN DASHBOARD CONTENT: Full screen width & height */}
      <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden relative z-10 flex flex-col w-full">
        {children}
      </main>
    </div>
  );
};

export default CinematicAppShell;
