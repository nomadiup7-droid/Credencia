import type { CloakroomLabelConfig } from '../types';

export const DEFAULT_CLOAKROOM_LABEL_CONFIG: CloakroomLabelConfig = {
  showEventName: false,
  showLabelType: false,
  showTicketNumber: true,
  showParticipantName: true,
  showDescription: true,
  showVolumeCount: false,
  showDateTime: false,
  showOperator: false,
  lineOrder: ['participantName', 'description', 'ticketNumber'],
  fontSizes: {
    participantName: 24,
    description: 13,
    ticketNumber: 34,
    volumeCount: 11,
    eventName: 11,
    labelType: 11,
    dateTime: 10,
    operator: 10
  }
};
