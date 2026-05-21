import React from 'react';
import { Plane, Hotel, BadgeCheck, Map, MessageCircle, ShieldCheck } from 'lucide-react';

const ITEMS = [
  { icon: Plane, label: 'Flights' },
  { icon: Hotel, label: 'Hotels' },
  { icon: BadgeCheck, label: 'Visas' },
  { icon: Map, label: 'Holiday Packages' },
  { icon: MessageCircle, label: 'WhatsApp Support' },
  { icon: ShieldCheck, label: 'Clear Inclusions' },
];

export const TrustStrip = () => (
  <section className="bg-bg-2 border-y border-gold-border/15">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 md:py-6">
      <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 md:gap-x-12">
        {ITEMS.map(({ icon: Icon, label }) => (
          <div
            key={label}
            className="flex items-center gap-2.5 text-text-primary/80"
          >
            <Icon size={15} className="text-gold shrink-0 opacity-90 animate-float" style={{ animationDelay: `${ITEMS.indexOf(ITEMS.find(i => i.label === label)) * 0.25}s` }} />
            <span className="text-[10px] md:text-[11px] font-semibold uppercase tracking-[0.18em]">
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  </section>
);
