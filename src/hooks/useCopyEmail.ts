import React, { useState } from 'react';
import { CONTACT_INFO } from '../constants';

export const useCopyEmail = () => {
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');

  const copyEmail = (e: React.MouseEvent) => {
    e.preventDefault();
    navigator.clipboard.writeText(CONTACT_INFO.email);
    setCopyStatus('copied');
    setTimeout(() => setCopyStatus('idle'), 2000);
  };

  return { copyEmail, copyStatus };
};
