import React from 'react';

export type BadgeVariant = 'primary' | 'cyan' | 'success' | 'warning' | 'danger' | 'purple' | 'neutral' | 'simulation';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  dot?: boolean;
  className?: string;
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'primary',
  dot = false,
  className = '',
  size = 'md',
}) => {
  const variantStyles: Record<BadgeVariant, { bg: string; text: string; border: string; dotColor: string }> = {
    primary: {
      bg: 'bg-amber-500/10',
      text: 'text-amber-300',
      border: 'border-amber-500/30',
      dotColor: 'bg-amber-400',
    },
    cyan: {
      bg: 'bg-cyan-500/10',
      text: 'text-[#00D9FF]',
      border: 'border-cyan-500/30',
      dotColor: 'bg-[#00D9FF]',
    },
    success: {
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-400',
      border: 'border-emerald-500/30',
      dotColor: 'bg-emerald-400',
    },
    warning: {
      bg: 'bg-amber-500/10',
      text: 'text-amber-400',
      border: 'border-amber-500/30',
      dotColor: 'bg-amber-400',
    },
    danger: {
      bg: 'bg-rose-500/10',
      text: 'text-rose-400',
      border: 'border-rose-500/30',
      dotColor: 'bg-rose-400',
    },
    purple: {
      bg: 'bg-purple-500/10',
      text: 'text-purple-400',
      border: 'border-purple-500/30',
      dotColor: 'bg-purple-400',
    },
    neutral: {
      bg: 'bg-slate-700/20',
      text: 'text-slate-300',
      border: 'border-slate-700/50',
      dotColor: 'bg-slate-400',
    },
    simulation: {
      bg: 'bg-emerald-950/40',
      text: 'text-emerald-300',
      border: 'border-emerald-500/40',
      dotColor: 'bg-emerald-400',
    },
  };

  const style = variantStyles[variant];
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border transition-all duration-200 ${style.bg} ${style.text} ${style.border} ${sizeClasses} ${className}`}
    >
      {dot && (
        <span className="relative flex h-2 w-2 mr-0.5">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-35 ${style.dotColor}`} />
          <span className={`relative inline-flex rounded-full h-2 w-2 ${style.dotColor}`} />
        </span>
      )}
      {children}
    </span>
  );
};

export default Badge;
