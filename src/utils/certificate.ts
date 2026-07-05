import type { Certificate, CertificateActivityView, Event, Participant } from '../types';
import { fixMojibake } from './text';

export const escapeCertificateHtml = (value?: string) => fixMojibake(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

export const replaceCertificatePlaceholders = (
  value: string,
  participant: Participant,
  event: Event,
  certificate: Certificate,
  activity?: CertificateActivityView
) => {
  const replacements: Record<string, string> = {
    '{{participant.name}}': participant.name || '',
    '{{event.name}}': event.name || '',
    '{{activity.title}}': activity?.title || '',
    '{{activity.speakerName}}': activity?.speakerName || '',
    '{{activity.workloadHours}}': String(activity?.workloadHours || ''),
    '{{certificate.totalHours}}': String(certificate.totalHours || 0),
    '{{certificate.code}}': certificate.certificateCode || '',
    '{{certificate.issuedAt}}': certificate.issuedAt ? new Date(certificate.issuedAt).toLocaleString('pt-BR') : ''
  };

  return Object.entries(replacements).reduce(
    (text, [placeholder, replacement]) => text.split(placeholder).join(fixMojibake(replacement)),
    value || ''
  );
};
