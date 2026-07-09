import React from 'react';
import type { ReportPdfChartKey } from '../../types/report.types';

interface ReportChartCaptureProps {
  id: ReportPdfChartKey;
  children: React.ReactNode;
}

export default function ReportChartCapture({ id, children }: ReportChartCaptureProps) {
  return (
    <div data-report-chart={id} className="rounded-2xl bg-white">
      {children}
    </div>
  );
}
