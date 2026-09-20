import React from 'react';
import { Check, Clock, Info, MapPin, Moon, Utensils, X } from 'lucide-react';
import { CONTACT_INFO } from '../../constants';
import { PackageLandingPageConfig } from '../../packageLandingPages';
import { WhatsAppIcon } from '../common/Icons';
import { Reviews } from '../sections/Reviews';

interface PackageLandingPageProps {
  config: PackageLandingPageConfig;
}

const formatPrice = (amount: number) => `₹${amount.toLocaleString('en-IN')}`;

// Visitors arrive from a WhatsApp chat, so the only call to action is the way
// back into it — with the package named, so the team knows what was seen.
const WhatsAppButton = ({
  config,
  placement,
  label,
  className = '',
}: {
  config: PackageLandingPageConfig;
  placement: string;
  label: string;
  className?: string;
}) => {
  const href = `${CONTACT_INFO.whatsapp}?text=${encodeURIComponent(config.whatsappMessage)}`;

  const trackClick = () => {
    if (typeof (window as any).gtag === 'function') {
      (window as any).gtag('event', 'whatsapp_click', {
        package_name: config.name,
        placement,
        page_path: window.location.pathname,
      });
    }
  };

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={trackClick}
      className={`inline-flex items-center justify-center gap-2.5 rounded-full bg-emerald-500 text-white font-bold uppercase tracking-[0.12em] shadow-lg shadow-emerald-950/30 hover:bg-emerald-400 transition-colors ${className}`}
    >
      <WhatsAppIcon size={18} />
      {label}
    </a>
  );
};

const PriceBlock = ({ config, compact = false }: { config: PackageLandingPageConfig; compact?: boolean }) => {
  if (config.priceFrom === null) {
    if (compact) {
      return <p className="font-display text-gold leading-none text-xl mt-1">Price on request</p>;
    }

    return (
      <div>
        <p className="font-display text-gold leading-none text-3xl md:text-4xl">Best price on WhatsApp</p>
        <p className="mt-2 text-xs text-text-muted">{config.priceNote}</p>
      </div>
    );
  }

  if (compact) {
    return (
      <p className="font-display text-gold leading-none text-2xl mt-1">
        <span className="text-sm text-text-muted">from </span>
        {formatPrice(config.priceFrom)}
      </p>
    );
  }

  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.2em] text-text-muted">Starting from</p>
      <p className="font-display text-gold leading-none mt-1 text-4xl md:text-5xl">{formatPrice(config.priceFrom)}</p>
      <p className="mt-2 text-xs text-text-muted">{config.priceNote}</p>
    </div>
  );
};

const SectionHeading = ({ eyebrow, children }: { eyebrow: string; children: React.ReactNode }) => (
  <div className="space-y-3 mb-8 md:mb-12">
    <span className="text-gold uppercase tracking-[0.24em] text-[10px] font-semibold">{eyebrow}</span>
    <h2 className="font-display text-[clamp(30px,5vw,54px)] text-text-primary leading-[1] tracking-tight font-light">
      {children}
    </h2>
  </div>
);

export const PackageLandingPage = ({ config }: PackageLandingPageProps) => {
  const [titleBefore, titleAfter] = config.heroTitle.split(config.heroHighlight);

  return (
    <main className="bg-gradient-to-b from-bg via-surface/20 to-bg pb-28">
      <section className="relative overflow-hidden pt-28 pb-14 md:pt-40 md:pb-24">
        <div className="absolute inset-0">
          <img
            src={config.heroImage}
            alt=""
            className="w-full h-full object-cover"
            fetchPriority="high"
            decoding="async"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(13,11,8,0.55)_0%,rgba(13,11,8,0.82)_55%,rgba(13,11,8,1)_100%)]" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl space-y-7">
            <div className="inline-flex items-center gap-3 border border-gold-border bg-bg/60 backdrop-blur-sm px-4 py-2 rounded-full">
              <MapPin size={14} className="text-gold" />
              <span className="text-[10px] uppercase tracking-[0.24em] text-gold font-semibold">{config.eyebrow}</span>
            </div>

            <h1 className="font-display text-[clamp(40px,7vw,84px)] text-text-primary leading-[0.95] tracking-tight font-light">
              {titleBefore}
              <span className="italic text-gold">{config.heroHighlight}</span>
              {titleAfter}
            </h1>

            <p className="text-base md:text-lg text-text-secondary font-light leading-relaxed">
              {config.heroDescription}
            </p>

            <div className="flex flex-wrap gap-2">
              {config.route.map((stop) => (
                <span
                  key={stop.city}
                  className="inline-flex items-center gap-2 rounded-full border border-gold-border/40 bg-bg/60 backdrop-blur-sm px-4 py-2 text-xs text-text-primary"
                >
                  <Moon size={12} className="text-gold" />
                  {stop.city} · {stop.nights} {stop.nights === 1 ? 'night' : 'nights'}
                </span>
              ))}
            </div>

            <div className="rounded-3xl border border-gold-border/30 bg-bg/70 backdrop-blur-md p-6 md:p-7 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
              <PriceBlock config={config} />
              <WhatsAppButton
                config={config}
                placement="hero"
                label="Get price on WhatsApp"
                className="px-7 py-4 text-[11px]"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="py-6 md:py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            {config.quickFacts.map((fact) => (
              <div key={fact.label} className="rounded-2xl border border-gold-border/25 bg-surface/50 px-4 py-5 md:px-6">
                <p className="text-[10px] uppercase tracking-[0.2em] text-gold/80 font-semibold">{fact.label}</p>
                <p className="mt-2 text-sm md:text-base text-text-primary leading-snug">{fact.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="Highlights">What you will see.</SectionHeading>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="-mx-4 px-4 sm:mx-0 sm:px-0 flex sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-4 overflow-x-auto sm:overflow-visible snap-x snap-mandatory pb-2">
            {config.gallery.map((photo) => (
              <figure
                key={photo.src}
                className="relative shrink-0 w-[72%] sm:w-auto snap-start rounded-[22px] overflow-hidden border border-gold-border/20"
              >
                <img
                  src={photo.src}
                  alt={photo.alt}
                  className="w-full aspect-[4/5] object-cover"
                  loading="lazy"
                  decoding="async"
                  referrerPolicy="no-referrer"
                />
                <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-4 pt-10 pb-4 text-sm text-white">
                  {photo.caption}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 md:py-20 border-y border-gold-border/10 bg-surface/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="Day by day">Your {config.duration.toLowerCase()}.</SectionHeading>

          <ol className="space-y-4">
            {config.days.map((day) => (
              <li key={day.day} className="rounded-2xl border border-gold-border/20 bg-surface/40 p-5 md:p-7">
                <div className="flex items-start gap-4">
                  <div className="shrink-0 w-12 h-12 rounded-full bg-gold/10 border border-gold/25 flex flex-col items-center justify-center leading-none">
                    <span className="text-[8px] uppercase tracking-widest text-gold/70">Day</span>
                    <span className="font-display text-xl text-gold">{day.day}</span>
                  </div>
                  <div className="min-w-0 space-y-3">
                    <h3 className="font-display text-2xl text-text-primary leading-tight">{day.title}</h3>
                    <p className="text-sm md:text-base text-text-secondary font-light leading-relaxed">
                      {day.description}
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-gold-border/25 bg-gold-dim px-3 py-1.5 text-xs text-gold">
                        <Utensils size={12} />
                        {day.meals}
                      </span>
                      {day.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1.5 rounded-full border border-gold-border/20 px-3 py-1.5 text-xs text-text-secondary"
                        >
                          <Clock size={12} className="text-gold/70" />
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="py-12 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="Where you stay">Hotels chosen for location.</SectionHeading>
          <div className="grid md:grid-cols-2 gap-4 md:gap-6">
            {config.stays.map((stay) => (
              <div key={stay.city} className="rounded-2xl border border-gold-border/20 bg-surface/40 p-6 md:p-8">
                <p className="text-[10px] uppercase tracking-[0.2em] text-gold/80 font-semibold">
                  {stay.city} · {stay.nights} nights
                </p>
                <h3 className="mt-3 font-display text-2xl md:text-3xl text-text-primary italic">{stay.category}</h3>
                <ul className="mt-5 space-y-2.5">
                  {stay.details.map((detail) => (
                    <li key={detail} className="flex items-start gap-3 text-sm text-text-secondary font-light">
                      <Check size={15} className="text-gold shrink-0 mt-0.5" />
                      {detail}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="mt-5 text-xs text-text-muted leading-relaxed">
            We confirm the exact hotel for your dates on WhatsApp, with photos, before you pay anything. Want a different
            category? Just ask.
          </p>
        </div>
      </section>

      <section className="py-12 md:py-20 border-y border-gold-border/10 bg-surface/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="The package">What is included, and what is not.</SectionHeading>
          <div className="grid md:grid-cols-2 gap-4 md:gap-6">
            <div className="rounded-2xl border border-gold-border/20 bg-surface/40 p-6 md:p-8">
              <h3 className="font-display text-2xl text-text-primary">Included</h3>
              <ul className="mt-5 space-y-3">
                {config.inclusions.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-text-secondary font-light leading-relaxed">
                    <Check size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-gold-border/20 bg-surface/40 p-6 md:p-8">
              <h3 className="font-display text-2xl text-text-primary">Not included</h3>
              <ul className="mt-5 space-y-3">
                {config.exclusions.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-text-secondary font-light leading-relaxed">
                    <X size={16} className="text-text-muted shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="py-12 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="Before you go">Good to know.</SectionHeading>
          <div className="grid sm:grid-cols-2 gap-4 md:gap-6">
            {config.goodToKnow.map((item) => (
              <div key={item.title} className="rounded-2xl border border-gold-border/20 bg-surface/40 p-6 flex items-start gap-4">
                <div className="w-9 h-9 rounded-full bg-gold/10 border border-gold/20 text-gold flex items-center justify-center shrink-0">
                  <Info size={16} />
                </div>
                <div>
                  <h3 className="text-text-primary font-display text-xl">{item.title}</h3>
                  <p className="mt-2 text-sm text-text-secondary font-light leading-relaxed">{item.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Reviews />

      <section className="py-12 md:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="FAQs">Questions we get asked.</SectionHeading>
          <div className="space-y-4">
            {config.faqs.map((faq) => (
              <div key={faq.question} className="rounded-2xl border border-gold-border/20 bg-surface/40 p-6 md:p-7">
                <h3 className="text-text-primary text-lg font-display mb-3">{faq.question}</h3>
                <p className="text-sm md:text-base text-text-secondary font-light leading-relaxed">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="pb-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-[32px] border border-gold-border/20 bg-gradient-to-br from-surface via-bg to-surface/80 px-6 py-10 md:px-12 md:py-14 text-center shadow-2xl">
            <span className="text-gold uppercase tracking-[0.24em] text-[10px] font-semibold">Plan with TripGuru</span>
            <h2 className="mt-4 font-display text-[clamp(30px,5vw,54px)] text-text-primary leading-[1] tracking-tight font-light">
              Send us your dates. We will do the rest.
            </h2>
            <p className="mt-5 max-w-xl mx-auto text-text-secondary font-light leading-relaxed">
              Tell us when you want to travel and how many of you are going. You get the exact price and hotel options
              on WhatsApp, usually within the hour.
            </p>
            <div className="mt-8">
              <WhatsAppButton
                config={config}
                placement="footer-cta"
                label="Chat on WhatsApp"
                className="px-8 py-4 text-[11px]"
              />
            </div>
          </div>
        </div>
      </section>

      <div className="fixed left-0 right-0 bottom-0 z-[95] bg-bg/94 backdrop-blur-xl border-t border-gold-border px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-12px_32px_rgba(0,0,0,0.35)]">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.16em] text-text-muted truncate">
              {config.name}
            </p>
            <PriceBlock config={config} compact />
          </div>
          <WhatsAppButton
            config={config}
            placement="sticky-bar"
            label="WhatsApp"
            className="shrink-0 h-12 px-6 text-[11px]"
          />
        </div>
      </div>
    </main>
  );
};
