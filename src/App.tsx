import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BrowserRouter, Routes, Route, useLocation, useNavigate, useParams } from 'react-router-dom';

import { WhatsAppConcierge } from './components/modals/WhatsAppConcierge';
import { DestinationDetailModal } from './components/modals/DestinationDetailModal';
import { Navbar } from './components/layout/Navbar';
import { Hero } from './components/sections/Hero';
import { TrustStrip } from './components/sections/TrustStrip';
import { Offers } from './components/sections/Offers';
import { Destinations } from './components/sections/Destinations';
import { Features } from './components/sections/Features';
import { PlanningProcess } from './components/sections/PlanningProcess';
import { ContactCTA } from './components/sections/ContactCTA';
import { Footer } from './components/layout/Footer';
import { FloatingWhatsApp } from './components/common/FloatingWhatsApp';
import { MobileStickyCTA } from './components/common/MobileStickyCTA';
import { PromotionPopup } from './components/modals/PromotionPopup';
import { Reviews } from './components/sections/Reviews';
import { TravelAgencyCityPage } from './components/pages/TravelAgencyCityPage';
import { PrivacyPolicyPage } from './components/pages/PrivacyPolicyPage';
import { ThankYouPage } from './components/pages/ThankYouPage';
import { SeoManager } from './components/seo/SeoManager';
import { cityLandingPageMap, cityLandingPages } from './cityLandingPages';
import { DESTINATIONS } from './constants';
import { Destination } from './types';
import NepalApp from './portals/nepal/App';

const ScrollToSection = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    if (pathname === '/') {
      window.scrollTo(0, 0);
      const timeoutId = window.setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'auto' });
      }, 50);
      return () => window.clearTimeout(timeoutId);
    }

    const parts = pathname.split('/');
    const sectionId = parts[1];
    const hasSlug = parts[2];

    const validSections = ['services', 'destinations', 'contact', 'offers', 'reviews'];

    if (!validSections.includes(sectionId) || hasSlug) {
      window.scrollTo(0, 0);
      const timeoutId = window.setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'auto' });
      }, 50);
      return () => window.clearTimeout(timeoutId);
    }

    const tryScroll = () => {
      const element = document.getElementById(sectionId);
      if (!element) return false;
      const top = element.getBoundingClientRect().top + window.scrollY - 76;
      window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
      return true;
    };

    if (tryScroll()) return;

    const timeoutId = window.setTimeout(tryScroll, 300);
    return () => window.clearTimeout(timeoutId);
  }, [pathname]);

  return null;
};

const DestinationDeepLink = ({ onOpenDetail }: { onOpenDetail: (dest: Destination) => void }) => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const lastSlug = React.useRef<string | undefined>(undefined);

  useEffect(() => {
    if (slug && slug !== lastSlug.current) {
      lastSlug.current = slug;
      const destination = DESTINATIONS.find(d => d.slug === slug);
      if (destination) {
        onOpenDetail(destination);
      } else {
        navigate('/destinations', { replace: true });
      }
    }
  }, [slug, onOpenDetail, navigate]);

  return null;
};

const RouteRedirect = ({ to }: { to: string }) => {
  const navigate = useNavigate();
  useEffect(() => {
    navigate(to, { replace: true });
  }, [navigate, to]);
  return null;
};

function AppContent() {
  const [isConciergeOpen, setIsConciergeOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedDestination, setSelectedDestination] = useState<string | undefined>(undefined);
  const [selectedDetailDestination, setSelectedDetailDestination] = useState<Destination | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const openDetail = useCallback((dest: Destination) => {
    setSelectedDetailDestination(dest);
    setIsDetailModalOpen(true);
    // Only navigate if we're not already on this destination's page
    if (!location.pathname.includes(`/destinations/${dest.slug}`)) {
      navigate(`/destinations/${dest.slug}`);
    }
  }, [navigate, location.pathname]);

  const closeDetail = useCallback(() => {
    setIsDetailModalOpen(false);
    setSelectedDetailDestination(null);
    // If we were on a deep link, go back to destinations section
    if (location.pathname.startsWith('/destinations/')) {
      navigate('/destinations');
    }
  }, [navigate, location.pathname]);

  const openConcierge = useCallback((dest?: string) => {
    if (dest) {
      const destination = DESTINATIONS.find(d => d.name === dest);
      if (destination) {
        setSelectedDestination(dest);
      }
    } else {
      setSelectedDestination(undefined);
    }
    setIsConciergeOpen(true);
    // Close detail modal if it was open when initiating concierge
    setIsDetailModalOpen(false);
  }, []);

  const closeConcierge = useCallback(() => {
    setIsConciergeOpen(false);
    // If we were on a deep link and closed concierge, we should still be on the detail view if it was open
    // but the user might want to go back to the section. 
    // For now, let's keep it simple: closing concierge doesn't change URL unless we want it to.
  }, []);

  // Sync modal state with URL for back/forward navigation
  useEffect(() => {
    const isDestinationRoute = location.pathname.startsWith('/destinations/');
    const pathParts = location.pathname.split('/');
    const slug = pathParts[2];

    // If we are NOT on a specific destination route, but the detail modal is open, close it.
    if (!slug && isDetailModalOpen) {
      setIsDetailModalOpen(false);
      setSelectedDetailDestination(null);
    }
  }, [location.pathname, isDetailModalOpen]);

  const handleExplore = useCallback((destName?: string) => {
    const dest = DESTINATIONS.find(d => d.name === destName);
    if (dest) openDetail(dest);
  }, [openDetail]);

  const handleOpenConcierge = useCallback((dest?: string) => {
    openConcierge(dest);
  }, [openConcierge]);

  const normalizedPath = location.pathname.replace(/\/+$/, '') || '/';
  const isNepalRoute = normalizedPath === '/nepal';
  const isPrivacyPolicyRoute = normalizedPath === '/privacy-policy';
  const isThankYouRoute = normalizedPath === '/thank-you';

  if (isNepalRoute) {
    return <NepalApp />;
  }

  const cityLandingPage =
    cityLandingPageMap[normalizedPath as keyof typeof cityLandingPageMap];

  return (
    <div className="min-h-screen font-sans selection:bg-gold selection:text-bg overflow-x-hidden">
      <SeoManager />
      <ScrollToSection />
      <Routes>
        <Route path="/destinations/:slug" element={<DestinationDeepLink onOpenDetail={openDetail} />} />
        {cityLandingPages.map((page) => (
          <React.Fragment key={page.path}>
            <Route path={page.path} element={null} />
          </React.Fragment>
        ))}
        <Route path="/nepal" element={null} />
        <Route path="/privacy-policy" element={null} />
        <Route path="/thank-you" element={null} />
        <Route path="/:section" element={null} />
        <Route path="/" element={null} />
        {/* Catch-all redirect to home */}
        <Route path="*" element={<RouteRedirect to="/" />} />
      </Routes>

      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
        >
          <Navbar onOpenConcierge={handleOpenConcierge} />
          {cityLandingPage ? (
            <TravelAgencyCityPage config={cityLandingPage} onOpenConcierge={handleOpenConcierge} />
          ) : isPrivacyPolicyRoute ? (
            <PrivacyPolicyPage />
          ) : isThankYouRoute ? (
            <ThankYouPage />
          ) : (
            <main className="bg-gradient-to-b from-bg via-surface/20 to-bg pb-24 md:pb-0">
              <Hero onOpenConcierge={handleOpenConcierge} />
              <TrustStrip />
              <Destinations onExplore={handleExplore} />
              <Offers />
              <Reviews />
              <PlanningProcess onOpenConcierge={() => handleOpenConcierge()} />
              <Features />
              <ContactCTA onOpenConcierge={handleOpenConcierge} />
            </main>
          )}
          <Footer />
          <FloatingWhatsApp />
          <MobileStickyCTA onOpenConcierge={() => handleOpenConcierge()} />
          {!cityLandingPage && <PromotionPopup />}
          
          <DestinationDetailModal
            isOpen={isDetailModalOpen}
            destination={selectedDetailDestination}
            onClose={closeDetail}
            onPlanTrip={(destName) => openConcierge(destName)}
          />

          <WhatsAppConcierge 
            isOpen={isConciergeOpen} 
            onClose={closeConcierge} 
            initialDestination={selectedDestination}
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
