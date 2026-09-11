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
      className={`relative h-screen flex-shrink-0 bg-[#0C121E] border-r border-[#1A2333] z-30 flex flex-col justify-between transition-all duration-300 select-none ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Top: Logo & Title */}
      <div className="p-4 border-b border-[#1A2333] flex items-center justify-between">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white flex-shrink-0 shadow-sm">
            <Layers className="w-5 h-5 text-white" />
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-sm text-white tracking-tight leading-none whitespace-nowrap">
                AI WAREHOUSE
              </span>
              <span className="text-[11px] text-slate-400 font-medium mt-1 whitespace-nowrap">
                Fleet Management
              </span>
            </div>
          )}
        </div>
        <button
          onClick={onToggleCollapse}
          className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800/60 transition"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        <div className={`px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400 ${collapsed ? 'text-center' : ''}`}>
          {collapsed ? '•••' : 'Platform'}
        </div>
        {navItems.map((item) => {
          const isActive = activePage === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onSelectPage(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group relative ${
                isActive
                  ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              } ${collapsed ? 'justify-center px-0' : ''}`}
              title={collapsed ? item.label : undefined}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-r bg-blue-500" />
              )}
              <Icon
                className={`w-4 h-4 flex-shrink-0 transition-colors ${
                  isActive ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-200'
                }`}
              />
              {!collapsed && (
                <span className="truncate text-xs font-semibold">{item.label}</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom Actions: Settings & Help */}
      <div className="p-3 border-t border-[#1A2333] space-y-1">
        <button
          onClick={onOpenSettings}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800/40 transition ${
            collapsed ? 'justify-center px-0' : ''
          }`}
          title="Settings"
        >
          <Settings className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>Settings</span>}
        </button>
        <button
          onClick={onOpenAbout}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800/40 transition ${
            collapsed ? 'justify-center px-0' : ''
          }`}
          title="Help & Project Info"
        >
          <HelpCircle className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>Help & Docs</span>}
        </button>

        {!collapsed && (
          <div className="pt-2">
            <div className="px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] font-semibold text-slate-300">Core Models Online</span>
                <span className="text-[9px] text-slate-400 truncate font-mono">A* • YOLOv8 • XGBoost</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
