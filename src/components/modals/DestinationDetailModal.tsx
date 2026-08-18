import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, MapPin, Clock, Star, Sparkles, ArrowRight, Calendar, Info } from 'lucide-react';
import { Destination } from '../../types';

interface DestinationDetailModalProps {
  destination: Destination | null;
  isOpen: boolean;
  onClose: () => void;
  onPlanTrip: (destName: string) => void;
}

export const DestinationDetailModal: React.FC<DestinationDetailModalProps> = ({ 
  destination, 
  isOpen, 
  onClose, 
  onPlanTrip 
}) => {
  // Lock scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!destination) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-6">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/90 backdrop-blur-xl"
          />
          
          {/* Modal Content */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative bg-surface w-full max-w-5xl h-full md:h-auto md:max-h-[90vh] md:rounded-[32px] overflow-hidden flex flex-col md:flex-row shadow-2xl border border-gold/20"
          >
            {/* Left Side: Image & Hero Info */}
            <div className="relative w-full md:w-2/5 h-64 md:h-auto overflow-hidden">
              <img 
                loading="lazy"
                src={destination.image} 
                alt={destination.name}
                className="w-full h-full object-cover"
                decoding="async"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/20 to-transparent md:bg-gradient-to-r md:from-transparent md:to-bg/40" />
              
              <div className="absolute bottom-0 left-0 p-8 md:hidden">
                <span className="text-gold text-[10px] uppercase tracking-[0.3em] font-bold mb-2 block">{destination.region}</span>
                <h2 className="font-display text-4xl text-white italic leading-tight">{destination.name}</h2>
              </div>

              {/* Close button for mobile */}
              <button 
                onClick={onClose}
                className="absolute top-4 right-4 md:hidden w-10 h-10 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/10"
              >
                <X size={20} />
              </button>
            </div>

            {/* Right Side: Details & Itinerary */}
            <div className="flex-1 flex flex-col bg-surface overflow-hidden">
              {/* Header */}
              <div className="hidden md:flex items-center justify-between px-10 py-8 border-b border-gold/10">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <MapPin size={14} className="text-gold" />
                    <span className="text-gold text-[10px] uppercase tracking-[0.3em] font-bold">{destination.region}</span>
                  </div>
                  <h2 className="font-display text-5xl text-gold italic leading-tight">{destination.name}</h2>
                </div>
                <button 
                  onClick={onClose}
                  className="w-12 h-12 flex items-center justify-center hover:bg-gold/10 rounded-full transition-colors group"
                >
                  <X size={24} className="text-gold/60 group-hover:text-gold" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto px-6 py-8 md:px-10 md:py-10 custom-scrollbar space-y-10">
                {/* Description & Vibe */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Info size={16} className="text-gold" />
                      <h3 className="text-[11px] uppercase tracking-[0.2em] text-gold font-bold">The Experience</h3>
                    </div>
                    <p className="font-display text-2xl text-text-primary italic leading-tight mb-4">
                      {destination.hook}
                    </p>
                    <p className="text-text-secondary text-sm leading-relaxed font-light">
                      {destination.description}
                    </p>
                  </div>
                  <div className="space-y-6">
                    <div className="bg-gold/5 p-6 rounded-2xl border border-gold/10 space-y-3">
                      <div className="flex items-center gap-2">
                        <Sparkles size={16} className="text-gold" />
                        <h3 className="text-[11px] uppercase tracking-[0.2em] text-gold font-bold">The Vibe</h3>
                      </div>
                      <p className="font-display text-xl text-text-primary italic leading-relaxed">
                        "{destination.vibe}"
                      </p>
                    </div>

                    {/* Highlights */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Star size={16} className="text-gold" />
                        <h3 className="text-[11px] uppercase tracking-[0.2em] text-gold font-bold">Curated Highlights</h3>
                      </div>
                      <ul className="space-y-3">
                        {destination.highlights?.map((highlight, idx) => (
                          <li key={idx} className="flex items-start gap-3 text-sm text-text-secondary font-light">
                            <div className="mt-1.5 w-1 h-1 rounded-full bg-gold flex-shrink-0" />
                            {highlight}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Itinerary Section */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b border-gold/10 pb-4">
                    <div className="flex items-center gap-2">
                      <Calendar size={18} className="text-gold" />
                      <h3 className="text-[11px] uppercase tracking-[0.2em] text-gold font-bold">Recommended Itinerary</h3>
                    </div>
                    <span className="text-[10px] text-text-muted italic">Curated by TripGuru Experts</span>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-6">
                    {destination.itinerary.map((day) => (
                      <div key={day.day} className="relative pl-8 border-l border-gold/20 group">
                        <div className="absolute left-[-5px] top-0 w-2.5 h-2.5 rounded-full bg-gold shadow-[0_0_10px_rgba(212,175,55,0.4)] group-hover:scale-125 transition-transform" />
                        <div className="space-y-1">
                          <span className="text-[10px] uppercase tracking-widest text-gold font-bold block">Day {day.day}: {day.title}</span>
                          <p className="text-text-secondary text-sm font-light leading-relaxed">{day.activity}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Must Do Section */}
                <div className="relative overflow-hidden bg-gradient-to-br from-gold/10 to-transparent p-8 rounded-3xl border border-gold/20">
                  <div className="absolute top-0 right-0 p-6 opacity-10">
                    <Star size={80} className="text-gold" />
                  </div>
                  <div className="relative z-10 space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-gold animate-pulse" />
                      <h3 className="text-[11px] uppercase tracking-[0.3em] text-gold font-bold">The Absolute Must-Do</h3>
                    </div>
                    <p className="font-display text-2xl md:text-3xl text-text-primary italic leading-tight tracking-wide">
                      {destination.mustDo}
                    </p>
                  </div>
                </div>
              </div>

              {/* Footer Action */}
              <div className="px-6 py-6 md:px-10 md:py-8 bg-surface border-t border-gold/10 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="text-center md:text-left">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-text-muted mb-1">Ready to explore {destination.name}?</p>
                  <p className="text-xs text-text-secondary font-light">Get a personalized quote and itinerary in minutes.</p>
                </div>
                <button 
                  onClick={() => onPlanTrip(destination.name)}
                  className="w-full md:w-auto px-10 py-4 bg-gold text-bg rounded-full font-bold text-xs uppercase tracking-[0.2em] hover:bg-gold-light transition-all duration-300 shadow-2xl shadow-gold/20 flex items-center justify-center gap-3 group"
                >
                  Plan My Trip <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
