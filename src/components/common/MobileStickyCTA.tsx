import React from 'react';
import { Phone } from 'lucide-react';
import { CONTACT_INFO } from '../../constants';
import { WhatsAppIcon } from './Icons';

interface MobileStickyCTAProps {
  onOpenConcierge: () => void;
}

const phoneHref = `tel:${CONTACT_INFO.phone.replace(/[^+\d]/g, '')}`;

export const MobileStickyCTA = ({ onOpenConcierge }: MobileStickyCTAProps) => (
  <div className="md:hidden fixed left-0 right-0 bottom-0 z-[95] bg-bg/94 backdrop-blur-xl border-t border-gold-border px-3 pt-2 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-12px_32px_rgba(0,0,0,0.35)]">
    <div className="grid grid-cols-3 gap-2">
      <a
        href={phoneHref}
        className="h-12 rounded-full border border-gold-border bg-white/5 text-text-primary text-[10px] font-bold uppercase tracking-[0.12em] flex items-center justify-center gap-1.5"
      >
        <Phone size={15} />
        Call
      </a>
      <a
        href={CONTACT_INFO.whatsapp}
        target="_blank"
        rel="noopener noreferrer"
        className="h-12 rounded-full border border-emerald-400/30 bg-emerald-500 text-white text-[10px] font-bold uppercase tracking-[0.12em] flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-950/20"
      >
        <WhatsAppIcon size={16} />
        WhatsApp
      </a>
      <button
        type="button"
        onClick={onOpenConcierge}
        className="h-12 rounded-full bg-gold text-dark text-[10px] font-black uppercase tracking-[0.12em] flex items-center justify-center shadow-lg shadow-gold/20"
      >
        Plan Trip
      </button>
    </div>
  </div>
);
