import React from 'react';

interface UserProfileProps {
  name?: string;
  role?: string;
  avatarUrl?: string;
  className?: string;
}

export const UserProfile: React.FC<UserProfileProps> = ({
  name = 'Benjamin Carter',
  role = 'Lead Systems Architect',
  avatarUrl,
  className = '',
}) => {
  // First and last initials
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  const [firstName, ...rest] = name.split(' ');
  const lastName = rest.join(' ');

  return (
    <div className={`flex items-center gap-3 cursor-pointer group select-none ${className}`}>
      {/* Two-Line Typography Name */}
      <div className="flex flex-col text-right">
        <span className="text-xs sm:text-sm font-semibold text-white tracking-tight leading-tight group-hover:text-amber-200 transition-colors">
          {firstName}
        </span>
        <span className="text-[11px] sm:text-xs font-normal text-slate-400 tracking-tight leading-tight group-hover:text-slate-300 transition-colors">
          {lastName || role}
        </span>
      </div>

      {/* Circular Avatar with Warm Orange/Amber Biological Halo */}
      <div className="relative flex-shrink-0">
        {/* Warm biological aura ring on hover */}
        <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-amber-500/30 to-orange-500/20 blur-[3px] opacity-75 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300" />
        
        <div className="relative w-9 h-9 rounded-full bg-gradient-to-br from-[#1E293B] to-[#0F172A] border border-amber-500/30 flex items-center justify-center overflow-hidden shadow-inner">
          {avatarUrl ? (
            <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-xs font-bold text-amber-300 font-mono tracking-wider">
              {initials}
            </span>
          )}
        </div>

        {/* Small live online status dot */}
        <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-400 border border-[#090D16]" />
      </div>
    </div>
  );
};

export default UserProfile;
