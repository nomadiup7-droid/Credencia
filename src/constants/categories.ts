import type { ParticipantCategory } from '../types';

export const CATEGORY_TAGS: Record<ParticipantCategory, { bg: string, text: string, border: string }> = {
  VIP: { bg: 'bg-amber-100 text-amber-800', text: 'text-amber-800', border: 'border-amber-200' },
  Palestrante: { bg: 'bg-purple-100 text-purple-800', text: 'text-purple-800', border: 'border-purple-200' },
  Expositor: { bg: 'bg-teal-100 text-teal-800', text: 'text-teal-800', border: 'border-teal-200' },
  Participante: { bg: 'bg-blue-100 text-blue-800', text: 'text-blue-800', border: 'border-blue-200' },
  Staff: { bg: 'bg-rose-100 text-rose-800', text: 'text-rose-800', border: 'border-rose-200' }
};
