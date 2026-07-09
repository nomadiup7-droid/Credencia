import type { Participant, CloakroomItem } from '../types';
import type { BIChartDatum, BIMetric } from '../components/bi';

export type ReportPdfKind = 'executive' | 'complete' | 'summary';

export type ReportPdfChartKey =
  | 'visitorsByHour'
  | 'presence'
  | 'category'
  | 'area'
  | 'operator'
  | 'heatmap';

export type ReportPdfTableRow = Record<string, string | number | boolean | null | undefined>;

export interface ReportPdfPayload {
  eventName: string;
  eventDate?: string;
  eventLocation?: string;
  organizationName?: string;
  generatedAt: Date;
  logoUrl?: string;
  metrics: BIMetric[];
  summary: {
    total: number;
    checkedIn: number;
    pending: number;
    attendanceRate: number;
  };
  hourlyData: BIChartDatum[];
  presenceData: BIChartDatum[];
  categoryData: BIChartDatum[];
  areaData: BIChartDatum[];
  operatorData: BIChartDatum[];
  participants: Participant[];
  participantRows: ReportPdfTableRow[];
  areaRows: ReportPdfTableRow[];
  operatorRows: ReportPdfTableRow[];
  cloakroomItems: CloakroomItem[];
  printedLabelsCount: number;
}

export type ReportPdfProgress = (message: string) => void;
