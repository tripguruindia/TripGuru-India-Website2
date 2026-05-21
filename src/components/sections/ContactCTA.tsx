import React from 'react';
import { motion } from 'motion/react';
import { Plane, Hotel, Sparkles } from 'lucide-react';
import { CONTACT_INFO } from '../../constants';
import { WhatsAppIcon } from '../common/Icons';

export const ContactCTA: React.FC<{ onOpenConcierge: () => void }> = ({ onOpenConcierge }) => {
  
  return (
    <section id="contact" className="py-20 md:py-32 relative overflow-hidden">
    {/* Background Image */}
    <div className="absolute inset-0">
      <img 
        src="https://images.unsplash.com/photo-1488085061387-422e29b40080?auto=format&fit=crop&w=1920&q=70" 
        alt="Travel Planning" 
        className="w-full h-full object-cover opacity-20"
        loading="lazy"
        decoding="async"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-bg via-bg/90 to-bg" />
    </div>
    
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
      <div className="max-w-4xl mx-auto space-y-12">
        <div className="space-y-6">
          <h2 className="font-display text-[clamp(42px,6vw,82px)] font-light text-text-primary leading-[1.0] tracking-tight">
            Ready to Plan Your <br />
            <span className="italic">Next Trip?</span>
          </h2>
          <p className="text-lg md:text-xl text-text-secondary font-light leading-relaxed max-w-2xl mx-auto">
            Tell TripGuru where you want to go. We help with flights, hotels, visas, holiday
            packages and clear travel planning before you book.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row justify-center gap-4 sm:gap-6">
          <button 
            onClick={onOpenConcierge}
            className="bg-gold text-bg px-8 sm:px-12 py-4 sm:py-5 rounded-[4px] font-medium text-[11px] tracking-[0.14em] uppercase flex items-center justify-center gap-4 hover:bg-gold-light hover:scale-[1.02] transition-all shadow-2xl"
          >
            <WhatsAppIcon size={24} />
            PLAN MY TRIP
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-12">
          {[
            { title: "Flights", sub: "Options reviewed for timing, route, baggage and value.", icon: <Plane size={20} /> },
            { title: "Hotels", sub: "Stay options checked for category, location and inclusions.", icon: <Hotel size={20} /> },
            { title: "Packages", sub: "Custom plans built around your dates, interests and budget.", icon: <Sparkles size={20} /> }
          ].map((item, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              className="bg-surface/60 border border-gold-border backdrop-blur-[20px] rounded-xl p-8 flex flex-col items-center text-center gap-6"
            >
              <div className="text-gold shrink-0">
                {item.icon}
              </div>
              <div>
                <h4 className="text-text-primary font-normal font-display text-xl mb-3">{item.title}</h4>
                <p className="text-text-secondary text-sm font-light leading-relaxed">{item.sub}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  </section>
);
};
