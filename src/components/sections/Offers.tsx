import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { MessageSquare } from 'lucide-react';
import { CONTACT_INFO } from '../../constants';
import { WhatsAppIcon } from '../common/Icons';
import { TRIPGURU_OFFERS_API } from '../../config/api';
import { getOptimizedCloudinaryUrl } from '../../utils';

interface Offer {
  id: string;
  title: string;
  description: string;
  details: string;
  price: string;
  image_url: string;
  cta_text: string;
  is_featured: number;
  sort_order: number;
}

export const Offers = () => {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [whatsapp, setWhatsapp] = useState(CONTACT_INFO.whatsapp);
  const [loaded, setLoaded] = useState(false);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch(TRIPGURU_OFFERS_API)
      .then(res => res.json())
      .then(data => {
        setOffers(data.offers || []);
        if (data.whatsapp) setWhatsapp(data.whatsapp);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  if (!loaded) return null;

  const getOfferWhatsAppUrl = (offer: Offer) => {
    const msg = `Hi, I'm interested in your TripGuru offer: ${offer.title || 'Travel Offer'}${offer.price ? ' (' + offer.price + ')' : ''}.\n\nSource: TripGuru website offers section\n\nPlease share more details.`;
    return `${whatsapp}?text=${encodeURIComponent(msg)}`;
  };

  const validOffers = offers.filter(o => !imageErrors[o.id]);

  if (validOffers.length === 0) {
    return (
      <section id="offers" className="py-24 md:py-32 relative overflow-hidden bg-bg border-y border-gold-border/10">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full bg-gold/5 blur-[80px] pointer-events-none" />
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 30 }} 
            whileInView={{ opacity: 1, y: 0 }} 
            viewport={{ once: true }}
            className="glass-morphism rounded-[32px] p-8 md:p-16 border border-gold-border/20 max-w-2xl mx-auto shadow-2xl"
          >
            <motion.span 
              className="inline-block text-gold uppercase tracking-[0.28em] text-[10px] font-semibold mb-6"
            >
              Tailored For You
            </motion.span>
            <h2 className="font-display text-[clamp(28px,4vw,44px)] text-text-primary leading-tight font-light mb-6">
              Looking for a <span className="italic text-gold">custom itinerary?</span>
            </h2>
            <p className="text-text-secondary text-sm md:text-base font-light leading-relaxed max-w-md mx-auto mb-8">
              While we regularly update our seasonal offers, our specialty is crafting unique, personalized global travel plans. Speak directly to our travel experts to get started.
            </p>
            <a 
              href={whatsapp} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 bg-gold text-bg px-8 py-4 rounded-full font-bold text-[11px] tracking-[0.16em] uppercase hover:bg-gold-light hover:scale-[1.02] transition-all shadow-xl shadow-gold/25"
            >
              <WhatsAppIcon size={18} /> Talk to a Travel Expert
            </a>
          </motion.div>
        </div>
      </section>
    );
  }

  return (
    <section id="offers" className="py-20 md:py-32 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-16 md:mb-20">
        <motion.span initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="inline-block text-gold uppercase tracking-[0.28em] text-[10px] font-semibold mb-6">
          Limited Time Exclusive
        </motion.span>
        <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="font-display text-[clamp(42px,6vw,82px)] text-text-primary leading-[0.95] tracking-tight font-light">
          OFFERS
        </motion.h2>
      </div>

      <div className="relative">
        <div className="flex overflow-x-auto no-scrollbar snap-x snap-mandatory gap-6 md:gap-10 px-6 md:px-[10vw] pb-12">
          {validOffers.map((offer, i) => (
            <motion.div key={offer.id}
              initial={{ opacity: 0, x: 100 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
              transition={{ duration: 0.8, delay: i * 0.1, ease: "easeOut" }}
              className="flex-none snap-center group relative">
              <a href={getOfferWhatsAppUrl(offer)} target="_blank" rel="noopener noreferrer"
                className="block relative bg-bg border border-gold-border rounded-2xl overflow-hidden shadow-2xl transition-transform duration-500 hover:scale-[1.02]">
                <div className="relative w-[85vw] sm:w-[70vw] md:w-[45vw] lg:w-[35vw] max-w-[500px]">
                  <img src={getOptimizedCloudinaryUrl(offer.image_url, 600)} alt={offer.title || 'Offer'}
                    className="w-full h-auto object-contain" referrerPolicy="no-referrer" loading="lazy" decoding="async"
                    onError={() => setImageErrors(prev => ({ ...prev, [offer.id]: true }))} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-8">
                    <span className="bg-gold text-bg px-8 py-3 rounded-full font-bold text-[11px] tracking-[0.14em] uppercase shadow-xl">
                      {offer.cta_text || 'Enquire Now'}
                    </span>
                  </div>
                </div>
              </a>
            </motion.div>
          ))}
        </div>
        <div className="text-center mt-4 md:hidden">
          <span className="text-[10px] text-text-muted uppercase tracking-widest animate-pulse">Swipe to explore →</span>
        </div>
      </div>
    </section>
  );
};
