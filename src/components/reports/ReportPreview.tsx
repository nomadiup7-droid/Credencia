import React from 'react';

export default function ReportPreview({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <h3 className="text-sm font-black text-slate-950">{title}</h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}
