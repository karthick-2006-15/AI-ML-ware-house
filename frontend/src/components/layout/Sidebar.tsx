import React from 'react';
import { 
  LayoutDashboard, 
  Bot, 
  Scan, 
  TrendingUp, 
  Database, 
  Network, 
  Settings, 
  HelpCircle,
  Layers,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import type { PageId } from '../../types';

interface SidebarProps {
  activePage: PageId;
  onSelectPage: (page: PageId) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onOpenSettings: () => void;
  onOpenAbout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activePage,
  onSelectPage,
  collapsed,
  onToggleCollapse,
  onOpenSettings,
  onOpenAbout,
}) => {
  const navItems: { id: PageId; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'simulation', label: '2D Simulation', icon: Bot },
    { id: 'vision', label: 'Computer Vision', icon: Scan },
    { id: 'analytics', label: 'Predictive Analytics', icon: TrendingUp },
    { id: 'experiments', label: 'Dataset & Experiments', icon: Database },
    { id: 'architecture', label: 'System Architecture', icon: Network },
  ];

  return (
    <aside
      className={`relative h-screen flex-shrink-0 bg-[#08182A] border-r border-[#14253D] z-30 flex flex-col justify-between transition-all duration-300 select-none ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Top: Logo & Title */}
      <div className="p-5 border-b border-[#14253D] flex items-center justify-between">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1683FF] via-[#00D9FF] to-[#0099FF] flex items-center justify-center text-white shadow-[0_0_20px_rgba(0,217,255,0.45)] flex-shrink-0 animate-pulse-glow">
            <Layers className="w-5 h-5 text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="font-tech font-extrabold text-base text-white tracking-wider leading-none whitespace-nowrap neon-text-cyan">
                AI WAREHOUSE
              </span>
              <span className="font-tech text-[10px] text-cyan-400 font-bold tracking-widest uppercase mt-1 whitespace-nowrap">
                Autonomous AI
              </span>
            </div>
          )}
        </div>
        <button
          onClick={onToggleCollapse}
          className="text-slate-400 hover:text-cyan-400 p-1 rounded-lg hover:bg-slate-800/60 transition"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 py-5 px-3 space-y-1.5 overflow-y-auto">
        <div className={`px-3 mb-2 font-tech text-[11px] font-bold uppercase tracking-widest text-slate-400 ${collapsed ? 'text-center' : ''}`}>
          {collapsed ? '•••' : 'Core Systems'}
        </div>
        {navItems.map((item) => {
          const isActive = activePage === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onSelectPage(item.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative ${
                isActive
                  ? 'bg-gradient-to-r from-blue-600/30 to-cyan-500/15 text-white border border-cyan-500/50 shadow-[0_0_15px_rgba(0,217,255,0.25)]'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/40 hover:border hover:border-[#1E3A5F]'
              } ${collapsed ? 'justify-center px-0' : ''}`}
              title={collapsed ? item.label : undefined}
            >
              {/* Left active glowing indicator strip */}
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full bg-[#00D9FF] shadow-[0_0_10px_#00D9FF]" />
              )}
              <Icon
                className={`w-5 h-5 flex-shrink-0 transition-colors ${
                  isActive ? 'text-[#00D9FF] drop-shadow-[0_0_8px_rgba(0,217,255,0.8)]' : 'text-slate-400 group-hover:text-cyan-300'
                }`}
              />
              {!collapsed && (
                <span className="truncate font-tech text-base font-semibold tracking-wide">{item.label}</span>
              )}
              {isActive && (
                <div className="absolute right-2.5 w-2 h-2 rounded-full bg-[#00D9FF] shadow-[0_0_8px_#00D9FF] animate-pulse" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom Actions: Settings & Help */}
      <div className="p-3 border-t border-[#14253D] space-y-1">
        <button
          onClick={onOpenSettings}
          className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-tech font-semibold tracking-wide text-slate-400 hover:text-white hover:bg-slate-800/40 transition ${
            collapsed ? 'justify-center px-0' : ''
          }`}
          title="Settings"
        >
          <Settings className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>Settings</span>}
        </button>
        <button
          onClick={onOpenAbout}
          className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-tech font-semibold tracking-wide text-slate-400 hover:text-white hover:bg-slate-800/40 transition ${
            collapsed ? 'justify-center px-0' : ''
          }`}
          title="Help & Project Info"
        >
          <HelpCircle className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>Help / About</span>}
        </button>

        {!collapsed && (
          <div className="pt-3 px-3">
            <div className="p-2.5 rounded-xl bg-[#0D1B2E] border border-[#1A2D4A] flex items-center gap-2.5">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <div className="flex flex-col min-w-0">
                <span className="font-tech text-[11px] font-bold text-slate-300 uppercase tracking-wider">A* + YOLO + XGBoost</span>
                <span className="text-[10px] text-emerald-400 truncate font-mono">v2.4 Production</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
