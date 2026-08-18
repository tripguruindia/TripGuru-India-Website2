import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { CONTACT_INFO } from '../../constants';
import { TRIPGURU_OFFERS_API } from '../../config/api';

export const PromotionPopup = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [offer, setOffer] = useState<any>(null);
  const [whatsapp, setWhatsapp] = useState(CONTACT_INFO.whatsapp);

  useEffect(() => {
    fetch(TRIPGURU_OFFERS_API)
      .then(r => r.json())
      .then(d => {
        const featured = (d.offers || []).find((o: any) => o.is_featured);
        if (featured) {
          if (d.whatsapp) setWhatsapp(d.whatsapp);
          
          if (featured.image_url) {
            const img = new Image();
            img.src = featured.image_url;
            img.onload = () => {
              setOffer(featured);
              setTimeout(() => setIsOpen(true), 1500);
            };
            img.onerror = () => {
              console.warn('Featured offer image failed to load, skipping popup.');
            };
          } else {
            setOffer(featured);
            setTimeout(() => setIsOpen(true), 1500);
          }
        }
      })
      .catch(() => {});
  }, []);

  if (!offer) return null;

  const enquiryUrl = () => {
    const msg = `Hi TripGuru, I saw your featured offer: ${offer.title || 'featured deal'}${offer.price ? ' (' + offer.price + ')' : ''}.\n\nSource: TripGuru website offer popup\n\nI'd like to know more.`;
    return `${whatsapp}?text=${encodeURIComponent(msg)}`;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-lg"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 30 }}
            className="relative w-fit max-w-[92vw] md:max-w-[520px] bg-bg border border-gold-border rounded-2xl overflow-hidden shadow-2xl mx-auto"
          >
            {/* Close button */}
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-3 right-3 z-20 p-2 bg-black/60 hover:bg-gold text-white rounded-full transition-all backdrop-blur-sm border border-white/10"
              aria-label="Close popup"
            >
              <X size={20} />
            </button>

            <a href={enquiryUrl()} target="_blank" rel="noopener noreferrer" className="block group relative">
              {offer.image_url ? (
                <div className="relative overflow-hidden">
                  <img
                    loading="lazy"
                    src={offer.image_url}
                    alt={offer.title || 'Special Offer'}
                    className="block w-full h-auto max-h-[70vh] object-contain"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-6 text-center">
                    {offer.title && (
                      <h4 className="font-display text-xl text-white font-semibold mb-2">{offer.title}</h4>
                    )}
                    {offer.details && (
                      <p className="text-white/60 text-xs font-light mb-4 max-w-xs mx-auto">{offer.details}</p>
                    )}
                    <span className="inline-block bg-gold text-bg px-8 py-3 rounded-full font-bold text-[11px] tracking-[0.14em] uppercase shadow-xl hover:bg-gold-light transition-colors">
                      {offer.cta_text || 'Claim This Offer'}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center">
                  <h4 className="font-display text-xl text-text-primary font-semibold mb-2">{offer.title || 'Special Offer'}</h4>
                  {offer.details && <p className="text-text-secondary text-sm mb-4">{offer.details}</p>}
                  <span className="inline-block bg-gold text-bg px-8 py-3 rounded-full font-bold text-[11px] tracking-[0.14em] uppercase">
                    {offer.cta_text || 'Enquire Now'}
                  </span>
                </div>
              )}
            </a>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
