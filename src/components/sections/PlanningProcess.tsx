import React from 'react';
import { motion } from 'motion/react';
import { MessageSquare, Search, CheckCircle, Headphones } from 'lucide-react';

const STEPS = [
  {
    title: 'Share your trip ideas',
    description: 'Tell us where you want to go, who you are traveling with, your flexible dates, and any preferences.',
    icon: MessageSquare,
  },
  {
    title: 'We custom check options',
    description: 'We review multiple flight schedules, hotels, routing, and visa timelines to select the right combination.',
    icon: Search,
  },
  {
    title: 'Review your complete plan',
    description: 'Get a clean, easy-to-read proposal with all prices, inclusions, and exclusions listed clearly.',
    icon: CheckCircle,
  },
  {
    title: 'Book and travel with support',
    description: 'We handle your bookings and remain available on WhatsApp before you leave and while you are away.',
    icon: Headphones,
  },
];

export const PlanningProcess = ({ onOpenConcierge }: { onOpenConcierge: () => void }) => (
  <section className="py-20 md:py-32 bg-bg border-y border-gold-border/10">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 lg:grid-cols-[0.8fr_1.2fr] gap-12 lg:gap-20 items-start">
        {/* Left Column (Sticky info block) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="space-y-6 lg:sticky lg:top-24"
        >
          <span className="inline-block text-gold uppercase tracking-[0.26em] text-[10px] font-semibold">
            The Journey Path
          </span>
          <h2 className="font-display text-[clamp(34px,5vw,56px)] text-text-primary leading-[1.05] tracking-tight font-light">
            How we prepare <br />
            your <span className="italic text-gold">itinerary</span>
          </h2>
          <p className="text-text-secondary text-sm md:text-base font-light leading-relaxed max-w-xl">
            From initial brainstorm to boarding pass, we structure the booking process with absolute clarity — outlining options, inclusions, and zero hidden fees.
          </p>
          <button
            type="button"
            onClick={onOpenConcierge}
            className="inline-flex items-center justify-center bg-gold text-bg px-7 py-3.5 rounded-[4px] font-semibold text-[11px] tracking-[0.14em] uppercase hover:bg-gold-light transition-all shadow-xl shadow-black/20"
          >
            Start Planning With Us
          </button>
        </motion.div>

        {/* Right Column (Vertical Timeline) */}
        <div className="relative pl-10 md:pl-16 space-y-12">
          {/* Vertical line track */}
          <div className="absolute left-[17px] md:left-[25px] top-3 bottom-3 w-[1.5px] bg-gradient-to-b from-gold/40 via-gold/15 to-transparent pointer-events-none" />

          {STEPS.map(({ title, description }, index) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.7, delay: index * 0.1 }}
              className="relative group"
            >
              {/* Step point */}
              <div className="absolute left-[-33px] md:left-[-51px] top-1.5 w-[18px] h-[18px] md:w-[22px] md:h-[22px] rounded-full bg-bg border-2 border-gold flex items-center justify-center z-10 transition-transform duration-300 group-hover:scale-125">
                <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-gold" />
              </div>

              {/* Step Content */}
              <div className="border-b border-gold-border/10 pb-8 last:border-0 last:pb-0">
                <span className="inline-block text-[9px] uppercase tracking-[0.25em] text-gold font-bold mb-1.5">
                  Phase 0{index + 1}
                </span>
                <h3 className="text-text-primary font-display text-2xl font-light mb-2.5 group-hover:text-gold transition-colors duration-300">
                  {title}
                </h3>
                <p className="text-text-secondary text-sm font-light leading-relaxed max-w-xl">
                  {description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  </section>
);
