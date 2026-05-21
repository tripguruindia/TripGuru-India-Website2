import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, ChevronDown, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getOptimizedCloudinaryUrl } from '../../utils';

const HERO_SLIDES = [
  {
    image: "https://res.cloudinary.com/dnty2fhxp/image/upload/v1774087828/Nepal_iox55t.avif",
    destination: "Nepal",
    tagline: "Himalayan Retreats",
    position: "50% center",
  },
  {
    image: "https://res.cloudinary.com/dnty2fhxp/image/upload/v1774087827/Bhutan_jg68b1.avif",
    destination: "Bhutan",
    tagline: "The Thunder Dragon",
    position: "50% center",
  },
  {
    image: "https://res.cloudinary.com/dnty2fhxp/image/upload/v1774087829/Philippines_gbdtuh.avif",
    destination: "Philippines",
    tagline: "Tropical Archipelagos",
    position: "50% center",
  },
  {
    image: "https://res.cloudinary.com/dnty2fhxp/image/upload/v1774102564/China_ia0kj1.avif",
    destination: "China",
    tagline: "Imperial Dynasties",
    position: "50% center",
  },
];

const PROOF_POINTS = [
  'Bespoke Itineraries',
  'Premium Accommodations',
  '24/7 WhatsApp Concierge',
  'Seamless Visa Guidance',
];

const HERO_STATS = [
  { num: "1,000+", label: "Bespoke Trips Curated" },
  { num: "40+", label: "Global Destinations" },
  { num: "24/7", label: "WhatsApp Concierge" },
];

interface HeroProps {
  onOpenConcierge: () => void;
}

export const Hero = ({ onOpenConcierge }: HeroProps) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const slide = HERO_SLIDES[currentSlide];

  return (
    <section id="hero" className="relative min-h-[100svh] lg:min-h-screen w-full overflow-hidden bg-dark">
      {/* Slideshow */}
      <AnimatePresence>
        <motion.div
          key={currentSlide}
          initial={{ opacity: 0, scale: 1.03 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="absolute inset-0"
        >
          <div
            className="w-full h-full bg-cover"
            style={{ backgroundImage: `url(${getOptimizedCloudinaryUrl(slide.image, 1600)})`, backgroundPosition: slide.position }}
          />
        </motion.div>
      </AnimatePresence>

      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-dark/66 via-dark/24 to-dark/78 z-10" />
      <div className="absolute inset-0 bg-gradient-to-r from-dark/94 via-dark/62 to-dark/16 z-10" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_45%,transparent_0%,rgba(20,17,10,0.12)_45%,rgba(20,17,10,0.48)_100%)] z-10" />

      {/* Content */}
      <div className="relative z-20 flex min-h-[100svh] lg:min-h-screen flex-col justify-between px-4 sm:px-8 lg:px-16 pt-28 pb-28 sm:pt-32 sm:pb-20 lg:pt-32 lg:pb-8">
        <div className="flex flex-1 flex-col justify-center max-w-4xl">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="inline-flex items-center gap-2 mb-5"
          >
            <div className="w-8 h-px bg-gold" />
            <span className="text-gold uppercase tracking-[0.18em] sm:tracking-[0.24em] text-[10px] sm:text-[11px] font-semibold">
              Exquisite International Travel
            </span>
          </motion.div>

          <h1 className="sr-only">TripGuru — Custom travel planner for international holiday packages</h1>
          <div className="overflow-hidden mb-2 py-4 -my-4">
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
              className="font-display text-[clamp(44px,7vw,88px)] text-text-primary font-medium leading-[1.03] tracking-normal pb-2 drop-shadow-[0_2px_18px_rgba(0,0,0,0.45)]"
              aria-hidden="true"
            >
              Your World.
            </motion.div>
          </div>
          <div className="overflow-hidden mb-8 py-4 -my-4">
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="font-display text-[clamp(44px,7vw,88px)] text-gold font-medium italic leading-[1.03] tracking-normal pb-2 drop-shadow-[0_2px_18px_rgba(0,0,0,0.45)]"
              aria-hidden="true"
            >
              Curated.
            </motion.div>
          </div>

          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.9 }}
            className="text-[15px] sm:text-[17px] text-text-primary font-light mb-7 md:mb-9 max-w-[640px] leading-relaxed drop-shadow-[0_2px_12px_rgba(0,0,0,0.55)]"
          >
            Handcrafted international itineraries tailored to your style. Flights, handpicked hotels, visa assistance, and 24/7 WhatsApp support—all in one clear plan.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.0 }}
            className="flex flex-wrap gap-2 mb-7"
          >
            {PROOF_POINTS.map((point) => (
              <span
                key={point}
                className="rounded-full border border-white/28 bg-dark/52 px-3 py-2 text-[10px] sm:text-[11px] text-white font-medium backdrop-blur-sm"
              >
                {point}
              </span>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.12 }}
            className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto"
          >
            <button
              onClick={onOpenConcierge}
              className="bg-gold text-dark px-8 sm:px-10 py-4 rounded-[4px] font-bold text-[11px] sm:text-[12px] tracking-[0.14em] uppercase hover:bg-gold-light hover:scale-[1.02] transition-all shadow-2xl shadow-gold/25"
            >
              Plan My Trip
            </button>
            <Link
              to="/destinations"
              className="border border-white/36 bg-dark/25 text-white px-8 sm:px-10 py-4 rounded-[4px] font-semibold text-[11px] sm:text-[12px] tracking-[0.14em] uppercase hover:bg-white/10 hover:border-white/55 transition-all flex items-center justify-center gap-2 backdrop-blur-sm"
            >
              View Destinations <ArrowRight size={14} />
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.28 }}
            className="mt-9 hidden w-full max-w-[640px] grid-cols-3 overflow-hidden rounded-[8px] border border-gold-border/20 bg-dark/60 shadow-2xl shadow-black/40 backdrop-blur-md sm:grid"
          >
            {HERO_STATS.map((stat, i) => (
              <div
                key={stat.label}
                className={`px-5 py-4 text-left md:px-6 md:py-5 ${i > 0 ? 'border-l border-gold-border/20' : ''}`}
              >
                <div className="font-display text-[28px] text-gold font-semibold leading-none md:text-[34px]">
                  {stat.num}
                </div>
                <div className="mt-2 text-[9px] uppercase leading-[1.35] tracking-[0.18em] text-text-primary/78 font-bold">
                  {stat.label}
                </div>
              </div>
            ))}
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1.45 }}
          className="flex justify-start sm:justify-end"
        >
          <div className="flex items-center gap-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSlide}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex items-center gap-2"
              >
                <MapPin size={12} className="text-gold" />
                <span className="text-white/78 text-[11px] font-medium tracking-wide">{slide.destination}</span>
                <span className="text-white/72 text-[10px] italic">{slide.tagline}</span>
              </motion.div>
            </AnimatePresence>

            <div className="flex gap-1.5 ml-1 sm:ml-4">
              {HERO_SLIDES.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentSlide(i)}
                  className={`transition-all duration-500 rounded-full ${
                    currentSlide === i ? 'bg-gold w-6 h-1.5' : 'bg-white/20 w-1.5 h-1.5'
                  }`}
                />
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Scroll Indicator */}
      <motion.div
        animate={{ y: [0, 4, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 text-gold opacity-40"
      >
        <ChevronDown size={20} />
      </motion.div>
    </section>
  );
};
