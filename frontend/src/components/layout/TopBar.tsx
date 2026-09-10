import React, { useState } from 'react';
import { Search, Bell, User, CheckCircle2, Sparkles } from 'lucide-react';
import type { PageId, SystemStatus } from '../../types';
import Badge from '../common/Badge';

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
    <header className="h-16 w-full flex-shrink-0 bg-[#08182A]/95 backdrop-blur-md border-b border-[#14253D] z-30 px-4 sm:px-6 md:px-8">
      <div className="max-w-[1440px] mx-auto h-full flex items-center justify-between">
        {/* Left: Page Context */}
        <div className="flex items-center gap-3">
        <div className="flex flex-col">
          <span className="font-tech text-xs uppercase font-bold text-cyan-400 tracking-widest">
            {pageNames[activePage].category}
          </span>
          <h1 className="font-tech text-lg font-bold text-white tracking-wide">
            {pageNames[activePage].title}
          </h1>
        </div>
      </div>

      {/* Center: Search Field */}
      <div className="flex-1 max-w-md mx-6 hidden md:block">
        <div className="relative flex items-center group">
          <Search className="w-4 h-4 text-slate-400 group-focus-within:text-cyan-400 absolute left-3.5 pointer-events-none transition-colors" />
          <input
            type="text"
            placeholder="Search anything..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#06101F] border border-[#1A2D4A] focus:border-[#00D9FF] focus:shadow-[0_0_15px_rgba(0,217,255,0.25)] text-slate-200 placeholder-slate-500 rounded-xl pl-10 pr-4 py-2 text-xs transition-all outline-none"
          />
        </div>
      </div>

      {/* Right: Status, Notifications & Profile */}
      <div className="flex items-center gap-4">
        {/* System Status */}
        <Badge
          variant={isOnline ? 'simulation' : 'danger'}
          dot
          className={`hidden sm:inline-flex ${isOnline ? 'shadow-[0_0_15px_rgba(16,185,129,0.3)] border-emerald-500/40' : 'shadow-[0_0_15px_rgba(239,68,68,0.3)]'}`}
        >
          {isOnline ? 'Simulation System Online' : 'System Degraded'}
        </Badge>

        {/* Notifications Popover */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="w-9 h-9 rounded-xl bg-[#0D1B2E] border border-[#1A2D4A] hover:border-cyan-500/50 hover:shadow-[0_0_12px_rgba(0,217,255,0.25)] flex items-center justify-center text-slate-300 hover:text-white transition relative"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="w-2 h-2 rounded-full bg-cyan-400 absolute top-2 right-2 ring-2 ring-[#0D1B2E] shadow-[0_0_6px_#00D9FF]" />
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
