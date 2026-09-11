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
  onClick,
}) => {
  const hoverClass = hoverable
    ? 'transition-all duration-250 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1 hover:border-amber-500/30 hover:shadow-2xl hover:shadow-amber-500/5 cursor-pointer active:scale-[0.995]'
    : 'transition-colors duration-200';

  return (
    <div
      onClick={onClick}
      className={`bg-[#0A0F1D]/80 backdrop-blur-md border border-white/[0.08] rounded-2xl p-5 shadow-lg shadow-black/40 ${hoverClass} ${className}`}
    >
      {children}
    </div>
  );
};

export default Card;
