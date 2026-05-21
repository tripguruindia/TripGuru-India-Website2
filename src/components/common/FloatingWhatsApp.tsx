import React from 'react';
import { motion } from 'motion/react';
import { CONTACT_INFO } from '../../constants';
import { WhatsAppIcon } from './Icons';

export const FloatingWhatsApp = () => (
  <div className="hidden md:block fixed bottom-8 right-8 z-[90] group">
    {/* Pulsing Ring */}
    <div className="absolute inset-0 rounded-full bg-gold/40 animate-[ping_2.5s_infinite]" />
    
    <motion.button
      onClick={() => window.open(CONTACT_INFO.whatsapp, '_blank')}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.06 }}
      className="relative w-[60px] h-[60px] bg-gold rounded-full text-bg shadow-[0_8px_32px_rgba(201,168,76,0.35),0_2px_8px_rgba(0,0,0,0.4)] border-2 border-white/12 flex items-center justify-center hover:bg-gold-light transition-all duration-300"
    >
      <WhatsAppIcon size={24} />
      {/* Tooltip */}
      <div className="absolute right-full mr-4 top-1/2 -translate-y-1/2 bg-bg border border-gold-border px-4 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
        <span className="text-gold text-[10px] font-bold uppercase tracking-widest">Chat with an Expert</span>
      </div>
    </motion.button>
  </div>
);
