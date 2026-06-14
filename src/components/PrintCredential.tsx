import React from 'react';
import { Participant, Event } from '../types';
import LabelPrint from './LabelPrint';
import BadgePrint from './BadgePrint';

interface PrintCredentialProps {
  id?: string;
  participant: Participant | null;
  event: Event | null;
  onClose: () => void;
  autoPrint?: boolean;
}

export default function PrintCredential({
  id,
  participant,
  event,
  onClose,
  autoPrint = true
}: PrintCredentialProps) {
  if (!participant || !event) return null;

  if (event.credentialType === 'label') {
    return (
      <LabelPrint
        id={id}
        participant={participant}
        event={event}
        onClose={onClose}
        autoPrint={autoPrint}
      />
    );
  } else {
    return (
      <BadgePrint
        id={id}
        participant={participant}
        event={event}
        onClose={onClose}
        autoPrint={autoPrint}
      />
    );
  }
}
