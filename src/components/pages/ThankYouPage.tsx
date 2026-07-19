import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, MessageSquare, ArrowLeft, Sparkles, Home } from 'lucide-react';
import { CONTACT_INFO } from '../../constants';
import { WhatsAppIcon } from '../common/Icons';

export const ThankYouPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-bg text-text-secondary flex items-center justify-center pt-28 pb-20 relative overflow-hidden">
      {/* Decorative Top Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[500px] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gold/10 via-bg/0 to-bg/0 pointer-events-none z-0" />

      {/* Luxury Geometric Elements */}
      <div className="absolute top-1/4 left-10 w-72 h-72 rounded-full border border-gold-border/5 pointer-events-none hidden md:block" />
      <div className="absolute bottom-1/4 right-10 w-96 h-96 rounded-full border border-gold-border/5 pointer-events-none hidden md:block" />

      <div className="max-w-xl w-full mx-auto px-4 sm:px-6 relative z-10 text-center">
        {/* Success Icon */}
        <div className="relative inline-block mb-8">
          <div className="absolute inset-0 bg-gold/10 rounded-full blur-xl scale-125 animate-pulse" />
          <div className="relative p-6 bg-surface border border-gold-border/30 rounded-full flex items-center justify-center text-gold shadow-lg shadow-gold/10">
            <CheckCircle2 size={56} className="stroke-[1.5]" />
          </div>
          <div className="absolute -top-1 -right-1 p-2 bg-gold text-dark rounded-full shadow-md">
            <Sparkles size={14} className="animate-spin" style={{ animationDuration: '6s' }} />
          </div>
        </div>

        {/* Title & Headline */}
        <h1 className="text-text-primary font-display text-4xl md:text-5xl font-light tracking-tight mb-4">
          Request Received
        </h1>
        <p className="text-gold font-sans text-xs tracking-[0.2em] uppercase font-bold mb-8">
          Your Luxury Journey Begins Here
        </p>

        {/* Thank You Message */}
        <div className="space-y-4 mb-10 max-w-md mx-auto">
          <p className="text-text-secondary text-base font-light leading-relaxed">
            Thank you for choosing <strong className="text-text-primary font-normal">TripGuru India</strong>. 
            We have received your custom travel request and forwarded it to our dedicated travel desk.
          </p>
          <p className="text-text-secondary/80 text-sm font-light leading-relaxed bg-surface/40 border border-gold-border/10 rounded-xl p-4 mt-6">
            We have opened <strong className="text-text-primary font-normal">WhatsApp</strong> in another tab to connect you directly with our travel expert. 
            If it didn't open automatically, please click the button below to start chat.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          {/* WhatsApp Primary CTA */}
          <a
            href={CONTACT_INFO.whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-3 bg-whatsapp-green hover:bg-whatsapp-dark text-white px-8 py-4 rounded-[4px] font-bold text-xs uppercase tracking-widest transition-all hover:scale-[1.02] shadow-lg shadow-whatsapp-green/20"
          >
            <WhatsAppIcon size={16} />
            Chat on WhatsApp
          </a>

          {/* Homepage Secondary CTA */}
          <Link
            to="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-gold-border/40 hover:border-gold text-text-primary bg-surface/20 hover:bg-surface/50 px-8 py-4 rounded-[4px] font-bold text-xs uppercase tracking-widest transition-all hover:scale-[1.02]"
          >
            <Home size={14} className="text-gold" />
            Back to Homepage
          </Link>
        </div>

        {/* Custom Support Email */}
        <div className="mt-12 text-xs text-text-muted tracking-wider uppercase font-light">
          Questions? Contact us at{' '}
          <a href={`mailto:${CONTACT_INFO.email}`} className="text-gold hover:underline">
            {CONTACT_INFO.email}
          </a>
        </div>
      </div>
    </div>
  );
};
