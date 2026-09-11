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
    <div className="h-screen w-screen bg-[#080C14] bg-warehouse-grid text-slate-100 flex overflow-hidden font-sans relative">
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
