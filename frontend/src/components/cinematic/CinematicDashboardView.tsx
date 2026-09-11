import React, { useState } from 'react';
import BiologicalDnaCanvas from './BiologicalDnaCanvas';
import BiologicalAgePortal from './BiologicalAgePortal';
import DashboardVisionCard from './DashboardVisionCard';
import DashboardPredictorCard from './DashboardPredictorCard';
import HealthSnapshotCard from './HealthSnapshotCard';
import BloodModal from './BloodModal';
import VisionModal from './VisionModal';
import type { PageId, SimState, SystemStatus } from '../../types';

interface CinematicDashboardViewProps {
  onNavigate: (page: PageId) => void;
  systemStatus: SystemStatus;
  simState: SimState | null;
  simRunning: boolean;
  onStartSim: () => void;
  onStopSim: () => void;
}

export const CinematicDashboardView: React.FC<CinematicDashboardViewProps> = ({
  onNavigate,
  systemStatus,
  simState,
  simRunning,
  onStartSim,
  onStopSim,
}) => {
  // Modal states
  const [isBloodOpen, setIsBloodOpen] = useState(false);
  const [isVisionOpen, setIsVisionOpen] = useState(false);

  React.useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.toLowerCase();
      if (hash.includes('blood') || hash.includes('telemetry') || hash.includes('health')) setIsBloodOpen(true);
      if (hash.includes('vision-modal') || hash.includes('cctv-modal') || hash.includes('vision')) setIsVisionOpen(true);
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const handleCloseModal = (setter: React.Dispatch<React.SetStateAction<boolean>>) => {
    setter(false);
    if (['blood', 'telemetry', 'health', 'vision-modal', 'cctv-modal', 'vision'].some(m => window.location.hash.toLowerCase().includes(m))) {
      window.location.hash = '/dashboard';
    }
  };

  // Dynamic values from backend simulation/ML if available
  const completedOrders = simState?.metrics?.completed_orders ?? 0;
  const targetHealth = 98; // Fleet Operational Health Index (%)
  const baselineHealth = 94;
  const activeRobotsCount = simState?.robots ? simState.robots.filter(r => r.state !== 'idle').length : 5;

  return (
    <div className="relative w-full h-full min-h-full flex flex-col justify-between overflow-y-auto lg:overflow-hidden select-none px-6 sm:px-10 py-5 sm:py-6">
      {/* 1. Background Digital Twin Route Topology Canvas (3D rotating cyber flow + spatial particles) */}
      <BiologicalDnaCanvas 
        portalCenterXRatio={0.30} 
        portalCenterYRatio={0.46} 
        portalRadius={130} 
      />

      {/* 2. Main Middle Area: Asymmetric Composition */}
      <div className="relative z-10 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 xl:gap-10 items-center my-1 sm:my-2 w-full">
        {/* Left / Center-Left: Autonomous Fleet Health Portal Circle */}
        <div className="lg:col-span-7 flex flex-col items-center justify-center pt-2 sm:pt-4">
          <BiologicalAgePortal
            targetAge={targetHealth}
            chronologicalAge={baselineHealth}
            label={'Fleet Operational\nHealth Index'}
            differenceText="+4.2% Peak Efficiency"
            subIndicatorText="ALL 5 AMRS OPTIMAL • ZERO COLLISIONS"
            minLabel="70% CRIT"
            targetLabel="98% NOMINAL"
            maxLabel="100% PEAK"
            onPortalClick={() => setIsBloodOpen(true)}
          />
        </div>

        {/* Right Side: Dedicated AI Hero Cards - YOLOv8 Vision & XGBoost Predictor */}
        <div className="lg:col-span-5 flex flex-col gap-4 max-w-md xl:max-w-lg ml-auto w-full">
          {/* Card 1: YOLOv8 Computer Vision Optical Node */}
          <DashboardVisionCard
            detectedCount={102}
            latencyMs={9.9}
            onOpenModal={() => setIsVisionOpen(true)}
            onNavigateVision={() => onNavigate('vision')}
          />

          {/* Card 2: XGBoost Predictive Intelligence Engine */}
          <DashboardPredictorCard
            onNavigateAnalytics={() => onNavigate('analytics')}
          />
        </div>
      </div>

      {/* 3. Bottom Row: Health Snapshot Card Floating Over Scene */}
      <div className="relative z-20 flex flex-col sm:flex-row items-end justify-between gap-4 mt-4 pt-2">
        {/* Dynamic Health Snapshot Card with Animated Expand/Collapse */}
        <HealthSnapshotCard
          biologicalAge={targetHealth}
          onOpenBloodReport={() => setIsBloodOpen(true)}
          defaultExpanded={true}
        />

        {/* Operational Quick Pill indicator (Bottom Right corner) */}
        <div className="hidden md:flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-black/50 backdrop-blur-md border border-white/10 text-[11px] font-mono text-slate-400">
          <button
            onClick={simRunning ? onStopSim : onStartSim}
            className="flex items-center gap-1.5 text-amber-300 hover:text-amber-200 transition-colors cursor-pointer"
            title={simRunning ? 'Click to Pause Fleet' : 'Click to Start Fleet'}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${simRunning ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'}`} />
            <span>{simRunning ? 'FLEET ACTIVE' : 'FLEET STANDBY'}</span>
          </button>
          <span className="text-slate-600">|</span>
          <span className="text-slate-300">{activeRobotsCount} AMRs</span>
          <span className="text-slate-600">|</span>
          <span className="text-emerald-400 font-semibold">{completedOrders} ORDERS</span>
          {systemStatus.xgboost_ready && (
            <>
              <span className="text-slate-600">|</span>
              <span className="text-amber-400">XGB READY</span>
            </>
          )}
          {systemStatus.yolo_ready && (
            <>
              <span className="text-slate-600">|</span>
              <button
                onClick={() => setIsVisionOpen(true)}
                className="text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1 cursor-pointer"
                title="Click to view live Optical Perception feed"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>YOLOv8 LIVE</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* 4. Interactive Modals */}
      <BloodModal 
        isOpen={isBloodOpen} 
        onClose={() => handleCloseModal(setIsBloodOpen)} 
      />

      <VisionModal 
        isOpen={isVisionOpen} 
        onClose={() => handleCloseModal(setIsVisionOpen)} 
        onNavigateVision={() => {
          handleCloseModal(setIsVisionOpen);
          onNavigate('vision');
        }}
      />
    </div>
  );
};

export default CinematicDashboardView;
