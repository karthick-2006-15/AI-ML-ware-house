import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hoverable?: boolean;
  glow?: 'blue' | 'cyan' | 'purple' | 'green' | 'none';
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  hoverable = false,
  glow = 'none',
  onClick,
}) => {
  const glowClasses = {
    blue: 'glow-blue border-blue-500/30',
    cyan: 'glow-cyan border-cyan-500/30',
    purple: 'glow-purple border-purple-500/30',
    green: 'glow-green border-emerald-500/30',
    none: 'border-[#1A2D4A]',
  };

  const hoverClass = hoverable
    ? 'transition-all duration-300 hover:-translate-y-1 hover:border-cyan-500/50 hover:shadow-[0_8px_30px_rgba(0,217,255,0.15)] cursor-pointer'
    : 'transition-all duration-200';

  return (
    <div
      onClick={onClick}
      className={`bg-[#0D1B2E] border rounded-2xl p-5 shadow-lg shadow-black/40 backdrop-blur-sm ${glowClasses[glow]} ${hoverClass} ${className}`}
    >
      {children}
    </div>
  );
};

export default Card;
