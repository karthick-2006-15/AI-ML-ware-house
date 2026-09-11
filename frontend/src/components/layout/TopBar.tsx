import React, { useState } from 'react';
import { Search, Bell, User, CheckCircle2, Sparkles } from 'lucide-react';
import type { PageId, SystemStatus } from '../../types';

interface TopBarProps {
  activePage: PageId;
  systemStatus: SystemStatus;
}

export const TopBar: React.FC<TopBarProps> = ({
  activePage,
  systemStatus,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);

  const pageNames: Record<PageId, { title: string; category: string }> = {
    dashboard: { title: 'Operations Dashboard', category: 'Executive View' },
    simulation: { title: 'Autonomous Navigation', category: 'A* Pathfinding' },
    vision: { title: 'Computer Vision', category: 'YOLOv8 Detection' },
    analytics: { title: 'Predictive Analytics', category: 'XGBoost Risk AI' },
    experiments: { title: 'Dataset & Experiments', category: 'Empirical Audit' },
    architecture: { title: 'System Architecture', category: 'Technical Pipeline' },
  };

  const isOnline = systemStatus.yolo_ready && systemStatus.xgboost_ready;

  return (
    <header className="h-14 w-full flex-shrink-0 bg-[#0C121E]/95 backdrop-blur-md border-b border-[#1A2333] z-30 px-4 sm:px-6">
      <div className="max-w-[1440px] mx-auto h-full flex items-center justify-between">
        {/* Left: Page Context */}
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <span className="text-[11px] font-semibold text-blue-400 uppercase tracking-wider">
              {pageNames[activePage].category}
            </span>
            <h1 className="text-sm sm:text-base font-bold text-white tracking-tight">
              {pageNames[activePage].title}
            </h1>
          </div>
        </div>

        {/* Center: Search Field */}
        <div className="flex-1 max-w-md mx-6 hidden md:block">
          <div className="relative flex items-center group">
            <Search className="w-3.5 h-3.5 text-slate-500 group-focus-within:text-blue-400 absolute left-3 pointer-events-none transition-colors" />
            <input
              type="text"
              placeholder="Search assets, telemetry, robots, or models..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900/90 border border-slate-800 focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/20 text-slate-200 placeholder-slate-500 rounded-lg pl-9 pr-3 py-1.5 text-xs transition-all outline-none"
            />
          </div>
        </div>

        {/* Right: Status, Notifications & Profile */}
        <div className="flex items-center gap-3">
          {/* System Status */}
          <div className={`hidden sm:inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium border ${
            isOnline 
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
              : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-rose-400'}`} />
            <span>{isOnline ? 'System Operational' : 'System Degraded'}</span>
          </div>

          {/* Notifications Popover */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 flex items-center justify-center text-slate-300 hover:text-white transition relative"
              title="Notifications"
            >
              <Bell className="w-3.5 h-3.5" />
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 absolute top-2 right-2" />
            </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-[#0D1B2E] border border-[#1E3A5F] rounded-2xl shadow-2xl p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="flex justify-between items-center pb-2 border-b border-[#1A2D4A] mb-3">
                <span className="text-xs font-bold text-white uppercase tracking-wide">System Alerts</span>
                <span className="text-[10px] text-cyan-400 font-medium">3 New</span>
              </div>
              <div className="space-y-2.5 text-xs">
                <div className="p-2 bg-[#08182A] rounded-xl border border-[#1A2D4A] flex gap-2.5 items-start">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-slate-200">XGBoost Champion Loaded</p>
                    <p className="text-[11px] text-slate-400">0.9197 ROC-AUC model active on port 8000.</p>
                  </div>
                </div>
                <div className="p-2 bg-[#08182A] rounded-xl border border-[#1A2D4A] flex gap-2.5 items-start">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-slate-200">YOLOv8 Weights Ready</p>
                    <p className="text-[11px] text-slate-400">6 warehouse object classes primed.</p>
                  </div>
                </div>
                <div className="p-2 bg-[#08182A] rounded-xl border border-[#1A2D4A] flex gap-2.5 items-start">
                  <Sparkles className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-slate-200">A* Pathfinding Initialized</p>
                    <p className="text-[11px] text-slate-400">10x10 automated fulfillment grid online.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Profile / Demo User Pill */}
        <div className="flex items-center gap-2.5 pl-3 border-l border-[#1A2D4A]">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#1683FF] to-[#7C3AED] flex items-center justify-center text-white font-bold text-xs shadow-md shadow-blue-500/20">
            <User className="w-4 h-4" />
          </div>
          <div className="flex flex-col text-left hidden sm:flex">
            <span className="text-xs font-bold text-slate-200 leading-none">Student</span>
            <span className="text-[10px] text-slate-400 font-medium leading-tight mt-0.5">Project Demo</span>
          </div>
        </div>
      </div>
    </div>
  </header>
  );
};

export default TopBar;
