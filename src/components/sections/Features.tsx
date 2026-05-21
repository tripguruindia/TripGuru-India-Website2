import React from 'react';
import { motion } from 'motion/react';
import { ArrowRight, BadgeCheck, Hotel, Map, MessageCircle, Plane, ShieldCheck } from 'lucide-react';

const SERVICES = [
  {
    icon: Plane,
    title: 'Flight Planning',
    desc: 'Route, timing, baggage and connection options reviewed before you decide.',
  },
  {
    icon: Hotel,
    title: 'Hotel Booking',
    desc: 'City hotels, resorts and premium stays checked for category, location and inclusions.',
  },
  {
    icon: BadgeCheck,
    title: 'Visa Guidance',
    desc: 'Practical document and timing support for destinations where visa help is required.',
  },
  {
    icon: Map,
    title: 'Holiday Packages',
    desc: 'Day-wise plans shaped around your dates, comfort, interests and budget.',
  },
];

export const Features = () => (
  <section id="services" className="py-20 md:py-32 relative overflow-hidden bg-bg">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
      <div className="grid grid-cols-1 lg:grid-cols-[0.82fr_1.18fr] gap-12 lg:gap-16 items-start">
        <motion.div 
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="space-y-7 lg:sticky lg:top-28"
        >
          <span className="inline-block text-gold uppercase tracking-[0.28em] text-[10px] font-semibold">
            Services
          </span>
          <h2 className="font-display text-[clamp(36px,5vw,64px)] text-text-primary leading-[0.98] tracking-tight font-light">
            One agency. Flights, hotels, visas and the full <span className="italic text-gold">itinerary</span>.
          </h2>
          <p className="text-text-secondary text-base md:text-lg font-light leading-relaxed">
            TripGuru handles each piece of the trip so nothing slips between separate bookings — the
            full picture is checked and confirmed before you pay.
          </p>
          <div className="rounded-xl border border-gold-border/20 bg-surface/45 p-5">
            <div className="flex items-start gap-3">
              <ShieldCheck size={20} className="text-gold mt-1 shrink-0" />
              <div>
                <h3 className="text-text-primary font-display text-xl mb-2">Clear before booking</h3>
                <p className="text-text-secondary text-sm font-light leading-relaxed">
                  Inclusions, exclusions, payment steps and support expectations are explained before
                  the booking moves ahead.
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {SERVICES.map(({ icon: Icon, title, desc }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.55, delay: i * 0.07 }}
              className="min-h-[220px] rounded-xl border border-gold-border/18 bg-surface/40 p-6 hover:border-gold/45 transition-colors"
            >
              <div className="w-11 h-11 rounded-lg bg-gold-dim border border-gold-border flex items-center justify-center text-gold mb-7">
                <Icon size={20} />
              </div>
              <h3 className="font-display text-2xl text-text-primary mb-3">{title}</h3>
              <p className="text-text-secondary text-sm font-light leading-relaxed">{desc}</p>
              <div className="mt-7 flex items-center gap-2 text-gold/70 text-[10px] uppercase tracking-[0.18em]">
                TripGuru support <ArrowRight size={13} />
              </div>
            </motion.div>
          ))}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55, delay: 0.28 }}
            className="sm:col-span-2 rounded-xl border border-gold-border/20 bg-gold-dim/40 p-6"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div>
                <h3 className="font-display text-2xl text-text-primary mb-2">Need help choosing a destination?</h3>
                <p className="text-text-secondary text-sm font-light leading-relaxed">
                  Share dates, traveller count and budget. The team can suggest practical options to compare.
                </p>
              </div>
              <div className="inline-flex items-center gap-2 text-gold text-[11px] uppercase tracking-[0.16em] font-semibold">
                <MessageCircle size={16} /> WhatsApp first
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  </section>
);
