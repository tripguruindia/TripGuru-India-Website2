import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, ArrowRight, Clock, Star } from 'lucide-react';
import { DESTINATIONS } from '../../constants';
import { Destination } from '../../types';
import { getOptimizedCloudinaryUrl } from '../../utils';

const DestinationCard: React.FC<{ dest: Destination, index: number, onExplore: () => void }> = ({ dest, index, onExplore }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [imageError, setImageError] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.7, delay: (index % 4) * 0.1 }}
      className="relative h-[480px] w-[300px] md:w-full flex-shrink-0 perspective-1000 group"
      onMouseEnter={() => setIsFlipped(true)}
      onMouseLeave={() => setIsFlipped(false)}
      onClick={() => setIsFlipped(!isFlipped)}
    >
      <motion.div
        className="relative w-full h-full transition-all duration-500 preserve-3d cursor-pointer"
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.6, ease: "easeInOut" }}
      >
        {/* Front Side */}
        <div className="absolute inset-0 w-full h-full backface-hidden rounded-[24px] overflow-hidden shadow-2xl border border-white/5">
          <div className="absolute inset-0 w-full h-full">
            {!imageError ? (
              <img 
                src={getOptimizedCloudinaryUrl(dest.image, 600)} 
                alt={dest.name}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover object-[center_35%] transition-transform duration-1000 group-hover:scale-110"
                referrerPolicy="no-referrer"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-bg-2 text-gold p-8 text-center border border-gold/10">
                <MapPin size={48} className="mb-4 opacity-40 animate-pulse" />
                <span className="text-[10px] uppercase tracking-[0.3em] font-bold mb-2">Image Unavailable</span>
                <span className="text-xl font-display italic opacity-80">{dest.name}</span>
              </div>
            )}
          </div>
          
          <div className="absolute inset-0 bg-gradient-to-t from-bg/95 via-bg/30 to-transparent" />
          
          <div className="absolute bottom-0 left-0 right-0 p-8">
            <div className="flex items-center gap-2 mb-3 opacity-0 group-hover:opacity-100 transition-opacity duration-500 md:hidden">
              <span className="text-[9px] uppercase tracking-[0.2em] text-gold/80 font-medium">Tap to view itinerary</span>
            </div>
            <h3 className="font-display text-[36px] md:text-[44px] font-light italic text-text-primary mb-3 leading-tight">{dest.name}</h3>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onExplore();
              }}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-text-primary font-medium text-[10px] uppercase tracking-[0.2em] hover:bg-gold hover:text-bg transition-all duration-300"
            >
              View Details <ArrowRight size={14} />
            </button>
          </div>
        </div>

        {/* Back Side */}
        <div className="absolute inset-0 w-full h-full backface-hidden rounded-[24px] overflow-hidden bg-surface border border-gold/30 p-6 flex flex-col justify-between rotate-y-180 shadow-2xl">
          <div className="flex-1 overflow-y-auto no-scrollbar space-y-6 pr-1">
            <div className="text-center sticky top-0 bg-surface pb-4 z-10">
              <span className="text-[9px] uppercase tracking-[0.3em] text-gold/60 font-bold block mb-1">Recommended Itinerary</span>
              <h3 className="font-display text-3xl text-gold italic leading-tight">{dest.name}</h3>
              <div className="h-px w-12 bg-gold/30 mx-auto mt-2" />
            </div>
            
            <div className="space-y-5">
              {dest.itinerary ? dest.itinerary.map((day) => (
                <div key={day.day} className="relative pl-6 border-l border-gold/20">
                  <div className="absolute left-[-5px] top-0 w-2.5 h-2.5 rounded-full bg-gold shadow-[0_0_8px_rgba(212,175,55,0.5)]" />
                  <span className="text-[10px] uppercase tracking-widest text-gold font-bold block mb-1">Day {day.day}: {day.title}</span>
                  <p className="text-text-secondary text-[12px] font-light leading-relaxed">{day.activity}</p>
                </div>
              )) : (
                <div className="text-center py-8 opacity-50">
                  <Clock size={32} className="mx-auto mb-2 text-gold/40" />
                  <p className="text-[10px] uppercase tracking-widest">Curating your experience...</p>
                </div>
              )}
            </div>

            <div className="pt-6 border-t border-gold/10">
              <div className="relative group/mustdo overflow-hidden bg-gradient-to-br from-gold/10 to-transparent p-5 rounded-2xl border border-gold/20 transition-all duration-500 hover:border-gold/40">
                <div className="absolute top-0 right-0 p-3 opacity-20 group-hover/mustdo:opacity-40 transition-opacity">
                  <Star size={40} className="text-gold" />
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
                    <span className="text-[10px] uppercase tracking-[0.3em] text-gold font-bold">The Absolute Must-Do</span>
                  </div>
                  <p className="text-text-primary text-[15px] font-display italic leading-relaxed tracking-wide">
                    "{dest.mustDo || dest.vibe}"
                  </p>
                </div>
              </div>
            </div>
          </div>

          <button 
            onClick={(e) => {
              e.stopPropagation();
              onExplore();
            }}
            className="w-full py-4 mt-4 bg-gold text-bg rounded-xl font-bold text-[11px] uppercase tracking-[0.25em] hover:bg-gold-light transition-all duration-300 shadow-xl shadow-gold/10 flex-shrink-0"
          >
            Plan My Trip
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export const Destinations = ({ onExplore }: { onExplore: (dest?: string) => void }) => {
  const [activeRegion, setActiveRegion] = useState('All Destinations');
  const regions = ['All Destinations', 'Asia', 'Europe', 'Africa', 'Middle East', 'Americas', 'Oceania'];

  // Sort by conversion probability for Indian travelers
  const conversionOrder = ['Dubai', 'Thailand', 'Indonesia', 'Singapore', 'Malaysia', 'Maldives', 'Vietnam', 'Sri Lanka', 'Nepal', 'Switzerland', 'Turkey', 'France', 'Italy', 'Japan', 'Egypt', 'Greece', 'Australia', 'Oman', 'Saudi Arabia', 'South Korea', 'Seychelles', 'Kenya', 'Bhutan', 'Cambodia', 'Philippines', 'Spain', 'Croatia', 'Georgia', 'Azerbaijan', 'Uzbekistan'];
  
  const sortByConversion = (dests: typeof DESTINATIONS) => {
    return [...dests].sort((a, b) => {
      const ai = conversionOrder.indexOf(a.name);
      const bi = conversionOrder.indexOf(b.name);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });
  };

  const filteredDestinations = useMemo(() => sortByConversion(activeRegion === 'All Destinations' 
    ? DESTINATIONS 
    : DESTINATIONS.filter(d => d.region === activeRegion)), [activeRegion]);

  return (
    <section id="destinations" className="py-20 md:py-32 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-12 md:mb-16">
        <motion.span
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="inline-block text-gold uppercase tracking-[0.28em] text-[10px] font-semibold mb-6"
        >
          Global Curation
        </motion.span>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="font-display text-[clamp(42px,6vw,82px)] text-text-primary leading-[0.95] tracking-tight font-light mb-12"
        >
          The World's Most <br />
          <span className="italic">Exquisite Escapes</span>
        </motion.h2>

        {/* Region Tabs */}
        <div className="flex flex-wrap justify-center gap-4 md:gap-8 border-b border-gold/10 pb-4">
          {regions.map((region) => (
            <button
              key={region}
              onClick={() => setActiveRegion(region)}
              className={`relative py-2 px-1 text-[11px] uppercase tracking-[0.2em] font-medium transition-colors duration-300 ${
                activeRegion === region ? 'text-gold' : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              {region}
              {activeRegion === region && (
                <motion.div 
                  layoutId="activeRegion"
                  className="absolute bottom-0 left-0 right-0 h-px bg-gold"
                />
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          layout
          className="flex md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8 overflow-x-auto md:overflow-visible pb-12 md:pb-0 no-scrollbar snap-x snap-mandatory"
        >
          <AnimatePresence mode="popLayout">
            {filteredDestinations.map((dest, index) => (
              <div key={dest.id} className="snap-center">
                <DestinationCard 
                  dest={dest} 
                  index={index} 
                  onExplore={() => onExplore(dest.name)} 
                />
              </div>
            ))}
          </AnimatePresence>
        </motion.div>
        
        {/* Mobile Scroll Indicator */}
        <div className="flex justify-center gap-2 mt-4 md:hidden">
          <div className="w-12 h-1 bg-gold/20 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-gold"
              animate={{ x: ["-100%", "100%"] }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            />
          </div>
          <span className="text-[9px] uppercase tracking-widest text-gold/60 font-medium">Swipe to explore</span>
        </div>
      </div>
    </section>
  );
};
