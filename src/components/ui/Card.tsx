import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export function Card({ interactive = false, className = '', children, ...props }: CardProps) {
  return (
    <div
      className={`cx-card ${interactive ? 'hover:-translate-y-0.5 hover:shadow-xl cursor-pointer' : ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className = '', children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`flex items-start justify-between gap-4 border-b border-slate-200/70 px-5 py-4 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardBody({ className = '', children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`p-5 ${className}`} {...props}>
      {children}
    </div>
  );
}
