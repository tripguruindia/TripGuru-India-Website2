import React from 'react';
import { ArrowRight, Check, MapPin, Phone, Plane, ShieldCheck, Sparkles, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CONTACT_INFO, DESTINATIONS } from '../../constants';
import { CityLandingPageConfig } from '../../cityLandingPages';

interface TravelAgencyCityPageProps {
  config: CityLandingPageConfig;
  onOpenConcierge: () => void;
}

const pageDestinations = DESTINATIONS.filter((destination) =>
  ['Japan', 'Switzerland', 'Australia', 'Vietnam'].includes(destination.name),
);

const serviceHighlights = [
  'International holiday planning with checked flights, hotels and custom itineraries.',
  'Flight, hotel, transfer, visa, and sightseeing coordination in one place.',
  'Responsive support on WhatsApp before departure and while you travel.',
];

const faqFollowUps = [
  {
    question: 'Can TripGuru help with custom travel packages?',
    answer:
      'Yes. We help with custom itineraries, premium hotels, private experiences, honeymoon travel, family vacations, and destination planning based on your pace and budget.',
  },
  {
    question: 'Can I get support on WhatsApp while traveling?',
    answer:
      'Yes. The team supports clients on WhatsApp for itinerary coordination, travel assistance, and quick updates during the trip.',
  },
];

export const TravelAgencyCityPage = ({ config, onOpenConcierge }: TravelAgencyCityPageProps) => {
  return (
    <main className="bg-gradient-to-b from-bg via-surface/20 to-bg">
      <section className="relative overflow-hidden pt-36 pb-20 md:pt-44 md:pb-28">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(201,168,76,0.18),_transparent_42%),radial-gradient(circle_at_bottom_right,_rgba(255,255,255,0.06),_transparent_30%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(13,11,8,0.65)_0%,rgba(13,11,8,0.92)_100%)]" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-12 items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-3 border border-gold-border bg-gold-dim px-4 py-2 rounded-full">
                <MapPin size={14} className="text-gold" />
                <span className="text-[10px] uppercase tracking-[0.24em] text-gold font-semibold">
                  {config.eyebrow}
                </span>
              </div>

              <div className="space-y-6">
                <h1 className="font-display text-[clamp(42px,7vw,86px)] text-text-primary leading-[0.95] tracking-tight font-light">
                  {config.heroTitle.split(config.city)[0]}
                  <span className="italic text-gold">{config.city}</span>
                  {config.heroTitle.split(config.city)[1]}
                </h1>
                <p className="max-w-3xl text-base md:text-lg text-text-secondary font-light leading-relaxed">
                  {config.heroDescription}
                </p>
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                {[
                  { value: '1000+', label: 'Trips Curated' },
                  { value: '40+', label: 'Destinations' },
                  { value: '24/7', label: 'Travel Support' },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="border border-gold-border/40 bg-surface/50 backdrop-blur-sm rounded-2xl px-5 py-6"
                  >
                    <p className="font-display text-4xl text-gold leading-none">{item.value}</p>
                    <p className="mt-3 text-[11px] uppercase tracking-[0.18em] text-text-muted">{item.label}</p>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={onOpenConcierge}
                  className="bg-gold text-bg px-8 py-4 rounded-[4px] font-medium text-[11px] tracking-[0.14em] uppercase hover:bg-gold-light hover:scale-[1.02] transition-all inline-flex items-center justify-center gap-3"
                >
                  Start Planning
                  <ArrowRight size={16} />
                </button>
                <a
                  href={CONTACT_INFO.whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="border border-gold text-gold px-8 py-4 rounded-[4px] font-medium text-[11px] tracking-[0.14em] uppercase hover:bg-gold-dim transition-all inline-flex items-center justify-center gap-3"
                >
                  WhatsApp Us
                  <Phone size={16} />
                </a>
              </div>
            </div>

            <div className="relative">
              <div className="rounded-[28px] border border-gold-border/30 bg-surface/70 backdrop-blur-md p-8 md:p-10 shadow-2xl">
                <div className="flex items-center gap-3 text-gold mb-6">
                  <Sparkles size={18} />
                  <span className="text-[11px] uppercase tracking-[0.24em] font-semibold">Why Travelers Choose Us</span>
                </div>
                <div className="space-y-5">
                  {config.trustPoints.map((item) => (
                    <div key={item} className="flex items-start gap-4">
                      <div className="mt-0.5 w-8 h-8 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center shrink-0">
                        <Check size={14} className="text-gold" />
                      </div>
                      <p className="text-sm text-text-secondary font-light leading-relaxed">{item}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-8 rounded-2xl border border-gold-border/20 bg-bg/40 p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <Star size={16} className="text-gold" />
                    <p className="text-text-primary font-display text-2xl italic">Personal planning, local trust.</p>
                  </div>
                  <p className="text-sm text-text-secondary font-light leading-relaxed">
                    From first inquiry to your return flight, TripGuru helps make international travel feel simple,
                    clear, and well-managed.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-14 items-start">
            <div className="space-y-5">
              <span className="text-gold uppercase tracking-[0.24em] text-[10px] font-semibold">Services</span>
              <h2 className="font-display text-[clamp(34px,5vw,64px)] text-text-primary leading-[0.98] tracking-tight font-light">
                {config.serviceHeading}
              </h2>
              <p className="text-text-secondary font-light leading-relaxed">
                The focus is not just booking. It is building the right trip flow, the right hotels, the right
                flights, and the right experiences around your timeline.
              </p>
              <div className="pt-3">
                <p className="text-[10px] uppercase tracking-[0.22em] text-gold/70 font-semibold mb-3">
                  Common service areas
                </p>
                <div className="flex flex-wrap gap-2">
                  {config.nearbyAreas.map((area) => (
                    <span
                      key={area}
                      className="rounded-full border border-gold-border/25 bg-gold-dim px-3 py-1.5 text-[11px] text-gold/80"
                    >
                      {area}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-6">
              {serviceHighlights.map((item, index) => (
                <div
                  key={item}
                  className="rounded-2xl border border-gold-border/20 bg-surface/40 p-6 md:p-7 flex items-start gap-5"
                >
                  <div className="w-10 h-10 rounded-full bg-gold/10 border border-gold/20 text-gold flex items-center justify-center shrink-0">
                    {index === 0 ? <Plane size={18} /> : index === 1 ? <ShieldCheck size={18} /> : <Sparkles size={18} />}
                  </div>
                  <p className="text-sm md:text-base text-text-secondary font-light leading-relaxed">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 md:py-28 border-y border-gold-border/10 bg-surface/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8 mb-12">
            <div className="space-y-4">
              <span className="text-gold uppercase tracking-[0.24em] text-[10px] font-semibold">Popular Trips</span>
              <h2 className="font-display text-[clamp(34px,5vw,62px)] text-text-primary leading-[0.98] tracking-tight font-light">
                Popular international trips planned by TripGuru.
              </h2>
            </div>
            <Link
              to="/destinations"
              className="text-gold text-[11px] uppercase tracking-[0.16em] inline-flex items-center gap-2 hover:text-gold-light transition-colors"
            >
              Explore all destinations
              <ArrowRight size={14} />
            </Link>
          </div>

          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6">
            {pageDestinations.map((destination) => (
              <Link
                key={destination.id}
                to={`/destinations/${destination.slug}`}
                className="group rounded-[26px] overflow-hidden border border-gold-border/20 bg-surface/30 hover:border-gold/40 transition-all"
              >
                <div className="aspect-[4/5] overflow-hidden">
                  <img
                    src={destination.image}
                    alt={`${destination.name} international travel packages ${config.destinationAltSuffix}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                    decoding="async"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="p-6 space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="font-display text-2xl text-text-primary italic">{destination.name}</h3>
                    <ArrowRight size={16} className="text-gold shrink-0" />
                  </div>
                  <p className="text-sm text-text-secondary font-light leading-relaxed">{destination.hook}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 md:py-28">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-4 mb-12">
            <span className="text-gold uppercase tracking-[0.24em] text-[10px] font-semibold">FAQs</span>
            <h2 className="font-display text-[clamp(34px,5vw,60px)] text-text-primary leading-[0.98] tracking-tight font-light">
              {config.faqHeading}
            </h2>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-gold-border/20 bg-surface/40 p-6 md:p-7">
              <h3 className="text-text-primary text-lg font-display mb-3">{config.faqQuestion}</h3>
              <p className="text-text-secondary font-light leading-relaxed">{config.faqAnswer}</p>
            </div>
            {faqFollowUps.map((item) => (
              <div key={item.question} className="rounded-2xl border border-gold-border/20 bg-surface/40 p-6 md:p-7">
                <h3 className="text-text-primary text-lg font-display mb-3">{item.question}</h3>
                <p className="text-text-secondary font-light leading-relaxed">{item.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="pb-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-[32px] border border-gold-border/20 bg-gradient-to-br from-surface via-bg to-surface/80 px-8 py-10 md:px-12 md:py-14 text-center shadow-2xl">
            <span className="text-gold uppercase tracking-[0.24em] text-[10px] font-semibold">Plan With TripGuru</span>
            <h2 className="mt-4 font-display text-[clamp(34px,5vw,60px)] text-text-primary leading-[0.98] tracking-tight font-light">
              {config.ctaHeading}
            </h2>
            <p className="mt-5 max-w-2xl mx-auto text-text-secondary font-light leading-relaxed">
              Share your travel dates, destination ideas, and style preferences. We will help shape a smoother,
              better-matched itinerary for you.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={onOpenConcierge}
                className="bg-gold text-bg px-8 py-4 rounded-[4px] font-medium text-[11px] tracking-[0.14em] uppercase hover:bg-gold-light hover:scale-[1.02] transition-all inline-flex items-center gap-3"
              >
                Get My Itinerary
                <ArrowRight size={16} />
              </button>
              <a
                href={`tel:${CONTACT_INFO.phone.replace(/\s/g, '')}`}
                className="border border-gold text-gold px-8 py-4 rounded-[4px] font-medium text-[11px] tracking-[0.14em] uppercase hover:bg-gold-dim transition-all"
              >
                Call {CONTACT_INFO.phone}
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};
