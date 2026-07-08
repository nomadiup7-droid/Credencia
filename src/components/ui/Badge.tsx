import React from 'react';

type BadgeTone = 'success' | 'neutral' | 'warning' | 'danger' | 'premium';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  className?: string;
  children?: React.ReactNode;
}

const toneClasses: Record<BadgeTone, string> = {
  success: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  neutral: 'bg-slate-100 text-slate-700 border-slate-200',
  warning: 'bg-amber-50 text-amber-800 border-amber-200',
  danger: 'bg-rose-50 text-rose-700 border-rose-200',
  premium: 'cx-badge'
};

export function Badge({ tone = 'premium', className = '', children, ...props }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] ${toneClasses[tone]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
