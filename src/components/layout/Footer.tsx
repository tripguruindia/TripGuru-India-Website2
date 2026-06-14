import React from 'react';
import { Instagram, Mail, Phone, Linkedin, Facebook } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CONTACT_INFO, LOGO_URL, DESTINATIONS } from '../../constants';
import { cityLandingPages } from '../../cityLandingPages';
import { WhatsAppIcon } from '../common/Icons';
import { useCopyEmail } from '../../hooks/useCopyEmail';

export const Footer: React.FC = () => {
  const { copyEmail, copyStatus } = useCopyEmail();
  
  // Get a few top destinations for the footer
  const topDestinations = DESTINATIONS.filter(d => 
    ['Vietnam', 'Switzerland', 'Japan', 'Kenya', 'Australia'].includes(d.name)
  );

  return (
    <footer className="bg-bg py-20 border-t border-gold-border/10">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16 mb-20">
        {/* Branding Column */}
        <div className="space-y-8">
          <div className="flex items-center gap-4">
            <img src={LOGO_URL} alt="TripGuru logo" className="h-10 w-auto opacity-90" loading="lazy" decoding="async" />
            <h4 className="text-text-primary font-display text-3xl font-light tracking-tight">TripGuru</h4>
          </div>
          <p className="text-text-secondary text-sm font-light leading-relaxed max-w-xs">
            International holidays, flights, hotels, visas and custom itineraries handled by a responsive travel desk.
          </p>
          <div className="flex gap-4">
            <a href={CONTACT_INFO.instagram} target="_blank" rel="noopener noreferrer" className="text-gold hover:text-gold-light transition-colors p-2 border border-gold/20 rounded-full hover:border-gold/50 transition-all">
              <Instagram size={18} />
            </a>
            <a href={CONTACT_INFO.facebook} target="_blank" rel="noopener noreferrer" className="text-gold hover:text-gold-light transition-colors p-2 border border-gold/20 rounded-full hover:border-gold/50 transition-all">
              <Facebook size={18} />
            </a>
            <a href={CONTACT_INFO.linkedin} target="_blank" rel="noopener noreferrer" className="text-gold hover:text-gold-light transition-colors p-2 border border-gold/20 rounded-full hover:border-gold/50 transition-all">
              <Linkedin size={18} />
            </a>
            <a href={CONTACT_INFO.whatsapp} target="_blank" rel="noopener noreferrer" className="text-gold hover:text-gold-light transition-colors p-2 border border-gold/20 rounded-full hover:border-gold/50 transition-all">
              <WhatsAppIcon size={18} />
            </a>
          </div>
        </div>

        {/* Quick Links */}
        <div className="space-y-8">
          <h5 className="text-text-primary font-display text-lg tracking-widest uppercase">Quick Links</h5>
          <ul className="space-y-4">
            {[
              { label: 'Home', to: '/' },
              { label: 'Destinations', to: '/destinations' },
              { label: 'Offers', to: '/offers' },
              { label: 'Services', to: '/services' },
              { label: 'Contact', to: '/contact' },
              { label: 'Privacy Policy', to: '/privacy-policy' },
            ].map((item) => (
              <li key={item.label}>
                <Link
                  to={item.to}
                  className="text-text-muted hover:text-gold text-xs uppercase tracking-widest transition-colors inline-block"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Top Destinations */}
        <div className="space-y-8">
          <h5 className="text-text-primary font-display text-lg tracking-widest uppercase">Destinations</h5>
          <ul className="space-y-4">
            {topDestinations.map((dest) => (
              <li key={dest.id}>
                <Link to={`/destinations/${dest.slug}`} className="text-text-muted hover:text-gold text-xs uppercase tracking-widest transition-colors inline-block">
                  {dest.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Contact Info */}
        <div className="space-y-8">
          <h5 className="text-text-primary font-display text-lg tracking-widest uppercase">Contact</h5>
          <div className="space-y-6">
            <div className="flex items-center gap-4 group">
              <Mail size={18} className="text-gold shrink-0" />
              <div className="flex flex-col">
                <a 
                  href={`mailto:${CONTACT_INFO.email}`} 
                  onClick={(e) => {
                    if (window.innerWidth < 768) return;
                    copyEmail(e);
                  }}
                  className="text-text-muted hover:text-gold text-sm font-light transition-colors flex items-center gap-2"
                >
                  {copyStatus === 'copied' ? 'Email Copied' : CONTACT_INFO.email}
                </a>
                <span className="text-[10px] text-text-muted/40 uppercase tracking-widest mt-1">Click to mail or copy</span>
              </div>
            </div>
            <div className="flex items-center gap-4 group">
              <Phone size={18} className="text-gold shrink-0" />
              <a href={`tel:${CONTACT_INFO.phone.replace(/\s/g, '')}`} className="text-text-muted hover:text-gold text-sm font-light transition-colors">
                {CONTACT_INFO.phone}
              </a>
            </div>
          </div>
        </div>
      </div>
      
      {/* Regional Hubs Directory Section */}
      <div className="pt-12 pb-8 border-t border-gold-border/20">
        <h5 className="text-text-primary font-display text-[10px] tracking-[0.25em] uppercase mb-4 text-center md:text-left">Programmatic Regional Desks</h5>
        <div className="flex flex-wrap justify-center md:justify-start gap-x-6 gap-y-3">
          {cityLandingPages.map((page) => (
            <Link
              key={page.slug}
              to={page.path}
              className="text-text-muted hover:text-gold text-[10px] uppercase tracking-widest transition-colors font-light"
            >
              {page.city}
            </Link>
          ))}
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="pt-8 flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="text-text-muted text-[10px] tracking-[0.2em] font-light uppercase text-center md:text-left">
          © 2026 TripGuru · ALL RIGHTS RESERVED
        </div>
        <div className="text-text-muted text-[10px] tracking-[0.2em] font-light uppercase text-center md:text-right">
          WhatsApp-first travel planning <span className="mx-3 text-gold">|</span> Flights, stays and itineraries
        </div>
      </div>
    </div>
  </footer>
);
};
