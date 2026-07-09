import React from 'react';

export default function ReportCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      {children}
    </div>
  );
}
