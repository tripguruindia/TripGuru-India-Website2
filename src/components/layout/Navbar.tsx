import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Menu } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { LOGO_URL } from '../../constants';

interface NavbarProps {
  onOpenConcierge: () => void;
}

export const Navbar = ({ onOpenConcierge }: NavbarProps) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 80);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    setIsMobileMenuOpen(false);
    navigate('/');
    window.setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 80);
  };

  const handleHomeClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    scrollToTop();
  };

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
      isScrolled ? 'bg-bg/88 backdrop-blur-xl border-b border-gold-border/20 py-3' : 'bg-transparent py-5 md:py-7'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          <div 
            className="flex items-center gap-3 cursor-pointer group"
            onClick={scrollToTop}
          >
            <img 
              src={LOGO_URL} 
              alt="TripGuru" 
              className={`h-11 w-auto group-hover:scale-105 transition-transform ${
                isScrolled ? 'drop-shadow-sm' : 'drop-shadow-[0_2px_8px_rgba(0,0,0,0.55)] brightness-110'
              }`}
              referrerPolicy="no-referrer"
              decoding="async"
              fetchPriority="high"
            />
            <span className={`font-display text-[23px] font-medium tracking-normal leading-none group-hover:text-gold transition-colors ${
              isScrolled ? 'text-text-primary' : 'text-white drop-shadow-[0_1px_8px_rgba(0,0,0,0.45)]'
            }`}>
              TripGuru
            </span>
          </div>

          <div className="hidden md:flex items-center gap-10">
            <Link to="/" onClick={handleHomeClick} className={`transition-colors text-xs font-semibold tracking-[0.14em] uppercase ${isScrolled ? 'text-text-primary hover:text-gold' : 'text-white/92 hover:text-white drop-shadow-[0_1px_8px_rgba(0,0,0,0.45)]'}`}>Home</Link>
            <Link to="/offers" className={`transition-colors text-xs font-semibold tracking-[0.14em] uppercase ${isScrolled ? 'text-text-primary hover:text-gold' : 'text-white/92 hover:text-white drop-shadow-[0_1px_8px_rgba(0,0,0,0.45)]'}`}>Offers</Link>
            <Link to="/reviews" className={`transition-colors text-xs font-semibold tracking-[0.14em] uppercase ${isScrolled ? 'text-text-primary hover:text-gold' : 'text-white/92 hover:text-white drop-shadow-[0_1px_8px_rgba(0,0,0,0.45)]'}`}>Reviews</Link>
            <Link to="/destinations" className={`transition-colors text-xs font-semibold tracking-[0.14em] uppercase ${isScrolled ? 'text-text-primary hover:text-gold' : 'text-white/92 hover:text-white drop-shadow-[0_1px_8px_rgba(0,0,0,0.45)]'}`}>Destinations</Link>
            <Link to="/services" className={`transition-colors text-xs font-semibold tracking-[0.14em] uppercase ${isScrolled ? 'text-text-primary hover:text-gold' : 'text-white/92 hover:text-white drop-shadow-[0_1px_8px_rgba(0,0,0,0.45)]'}`}>Services</Link>
            <Link to="/contact" className={`transition-colors text-xs font-semibold tracking-[0.14em] uppercase ${isScrolled ? 'text-text-primary hover:text-gold' : 'text-white/92 hover:text-white drop-shadow-[0_1px_8px_rgba(0,0,0,0.45)]'}`}>Contact</Link>
            <button 
              onClick={onOpenConcierge}
              className="bg-gold text-dark px-8 py-3 rounded-[4px] font-bold text-[11px] tracking-[0.14em] hover:bg-gold-light hover:scale-[1.02] transition-all uppercase shadow-lg shadow-gold/20"
            >
              PLAN MY TRIP
            </button>
          </div>

          <button 
            className={isScrolled ? 'md:hidden text-text-primary' : 'md:hidden text-white drop-shadow-[0_1px_8px_rgba(0,0,0,0.45)]'}
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Open navigation menu"
          >
            <Menu size={24} />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-bg border-b border-gold-border overflow-hidden"
          >
            <div className="px-4 py-8 flex flex-col gap-6 text-center">
              <Link to="/" onClick={handleHomeClick} className="text-text-secondary text-[11px] font-normal tracking-[0.14em] uppercase">Home</Link>
              <Link to="/offers" onClick={() => setIsMobileMenuOpen(false)} className="text-text-secondary text-[11px] font-normal tracking-[0.14em] uppercase">Offers</Link>
              <Link to="/reviews" onClick={() => setIsMobileMenuOpen(false)} className="text-text-secondary text-[11px] font-normal tracking-[0.14em] uppercase">Reviews</Link>
              <Link to="/destinations" onClick={() => setIsMobileMenuOpen(false)} className="text-text-secondary text-[11px] font-normal tracking-[0.14em] uppercase">Destinations</Link>
              <Link to="/services" onClick={() => setIsMobileMenuOpen(false)} className="text-text-secondary text-[11px] font-normal tracking-[0.14em] uppercase">Services</Link>
              <Link to="/contact" onClick={() => setIsMobileMenuOpen(false)} className="text-text-secondary text-[11px] font-normal tracking-[0.14em] uppercase">Contact</Link>
              <button 
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onOpenConcierge();
                }}
                className="bg-gold text-dark py-4 rounded-[4px] font-bold text-[11px] tracking-[0.14em] uppercase"
              >
                PLAN MY TRIP
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};
