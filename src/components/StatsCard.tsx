import React from 'react';
import * as LucideIcons from 'lucide-react';
import { motion } from 'motion/react';

interface StatsCardProps {
  id?: string;
  title: string;
  value: string | number;
  iconName: keyof typeof LucideIcons;
  description?: string;
  trend?: {
    text: string;
    type: 'success' | 'warning' | 'info';
  };
  isLoading?: boolean;
  colorTheme?: 'blue' | 'purple' | 'emerald' | 'amber' | 'rose';
  onClick?: () => void;
}

export default function StatsCard({
  id,
  title,
  value,
  iconName,
  description,
  trend,
  isLoading = false,
  colorTheme = 'blue',
  onClick
}: StatsCardProps) {
  const IconComponent = LucideIcons[iconName] as React.ComponentType<{ size?: number; className?: string }>;

  const themes = {
    blue: {
      accent: 'from-[#12e000] to-[#8fff86]',
      icon: 'text-emerald-700',
      halo: 'bg-emerald-400/12',
      pill: 'bg-emerald-50 text-emerald-800 border-emerald-200'
    },
    purple: {
      accent: 'from-slate-950 to-slate-700',
      icon: 'text-slate-900',
      halo: 'bg-slate-900/8',
      pill: 'bg-slate-100 text-slate-700 border-slate-200'
    },
    emerald: {
      accent: 'from-emerald-500 to-lime-300',
      icon: 'text-emerald-700',
      halo: 'bg-emerald-400/12',
      pill: 'bg-emerald-50 text-emerald-800 border-emerald-200'
    },
    amber: {
      accent: 'from-amber-500 to-lime-300',
      icon: 'text-amber-700',
      halo: 'bg-amber-300/16',
      pill: 'bg-amber-50 text-amber-800 border-amber-200'
    },
    rose: {
      accent: 'from-rose-600 to-rose-300',
      icon: 'text-rose-700',
      halo: 'bg-rose-300/12',
      pill: 'bg-rose-50 text-rose-800 border-rose-200'
    }
  };

  const activeTheme = themes[colorTheme] || themes.blue;

  if (isLoading) {
    return (
      <div
        id={id}
        className="cx-card p-5 flex flex-col gap-3 relative overflow-hidden animate-pulse"
      >
        <div className="flex justify-between items-center">
          <div className="h-4 w-28 bg-slate-205 bg-slate-200 rounded"></div>
          <div className="w-9 h-9 bg-slate-200 rounded-md"></div>
        </div>
        <div className="h-8 w-20 bg-slate-200 rounded mt-2"></div>
        <div className="h-3 w-40 bg-slate-150 rounded mt-1"></div>
      </div>
    );
  }

  return (
    <motion.div
      id={id}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(event) => {
        if (!onClick) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick();
        }
      }}
      className={`cx-card flex flex-col justify-between gap-3 relative overflow-hidden ${
        onClick ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-emerald-400/20' : ''
      }`}
    >
      <div className={`h-1 w-full bg-gradient-to-r ${activeTheme.accent}`} />
      <div className={`pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full blur-2xl ${activeTheme.halo}`} />

      <div className="flex justify-between items-start px-5 pt-4">
        <div className="flex flex-col gap-1 min-w-0">
          <span className="text-slate-500 text-xs font-bold uppercase tracking-wider block truncate">
            {title}
          </span>
          <span className="text-3xl font-bold text-[#0F172A] tracking-tight leading-none mt-2">
            {value}
          </span>
        </div>
        
        <div className={`w-10 h-10 rounded-xl shrink-0 border border-slate-200/80 bg-white/70 shadow-sm backdrop-blur flex items-center justify-center ${activeTheme.icon}`}>
          {IconComponent && <IconComponent size={18} />}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 mt-2 px-5 pb-5">
        {trend && (
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-md border ${
            trend.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
            trend.type === 'warning' ? 'bg-amber-50 text-amber-800 border-amber-200' :
            activeTheme.pill
          }`}>
            {trend.text}
          </span>
        )}
        {description && (
          <span className="text-[11px] text-slate-600 font-medium">
            {description}
          </span>
        )}
      </div>
    </motion.div>
  );
}
