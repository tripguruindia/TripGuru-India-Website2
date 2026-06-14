import React from 'react';
import { Shield, Eye, Share2, Cookie, Mail, FileText, ArrowLeft, Lock, FileCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CONTACT_INFO } from '../../constants';

interface Section {
  id: string;
  title: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}

export const PrivacyPolicyPage: React.FC = () => {
  const sections: Section[] = [
    {
      id: 'introduction',
      title: '1. Introduction',
      icon: <Shield size={18} className="text-gold" />,
      content: (
        <>
          <p className="mb-4">
            Welcome to <strong>TripGuru India</strong>. We respect your privacy and are committed to protecting your personal data. This Privacy Policy outlines how we collect, process, use, and protect your information when you visit our website, use our services, or communicate with our travel desks.
          </p>
          <p>
            By accessing our website or engaging with our travel concierge services (including WhatsApp planning, flight bookings, hotel reservations, and custom visa itineraries), you consent to the data practices described in this policy.
          </p>
        </>
      ),
    },
    {
      id: 'information-we-collect',
      title: '2. Information We Collect',
      icon: <Eye size={18} className="text-gold" />,
      content: (
        <>
          <p className="mb-4">
            To deliver personalized, luxury travel itineraries, we collect information that is essential to customize and confirm your travel arrangements. This includes:
          </p>
          <ul className="list-none space-y-3 pl-0 mb-4">
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-gold shrink-0 mt-2"></span>
              <span><strong>Personal Identification:</strong> Full name, gender, date of birth, and nationality.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-gold shrink-0 mt-2"></span>
              <span><strong>Contact Information:</strong> Phone number (including WhatsApp ID), email address, and billing/mailing address.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-gold shrink-0 mt-2"></span>
              <span><strong>Travel Details:</strong> Passport information, visa details, frequent flyer numbers, dietary restrictions, and health/accessibility preferences.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-gold shrink-0 mt-2"></span>
              <span><strong>Financial Information:</strong> Payment details, transaction history, and billing records required to finalize bookings.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-gold shrink-0 mt-2"></span>
              <span><strong>Technical Data:</strong> IP address, device type, browser settings, and page engagement data gathered via cookies and analytics tools.</span>
            </li>
          </ul>
        </>
      ),
    },
    {
      id: 'how-we-use-information',
      title: '3. How We Use Your Information',
      icon: <FileText size={18} className="text-gold" />,
      content: (
        <>
          <p className="mb-4">
            We use the information we collect to create seamless travel experiences and improve our services:
          </p>
          <ul className="list-none space-y-3 pl-0 mb-4">
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-gold shrink-0 mt-2"></span>
              <span><strong>Booking & Reservation:</strong> Processing flight tickets, hotel reservations, visa preparation, travel insurance, and booking local tour activities.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-gold shrink-0 mt-2"></span>
              <span><strong>Concierge Support:</strong> Communicating custom itineraries and updates via our WhatsApp travel desk.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-gold shrink-0 mt-2"></span>
              <span><strong>Personalization:</strong> Adapting destinations and hotel choices to match your unique interests.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-gold shrink-0 mt-2"></span>
              <span><strong>Safety & Verification:</strong> Securing transactions against fraud and verifying identities for bookings.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-gold shrink-0 mt-2"></span>
              <span><strong>Updates:</strong> Informing you about premium offers, loyalty benefits, or changes to schedule, provided you have opted in.</span>
            </li>
          </ul>
        </>
      ),
    },
    {
      id: 'data-sharing',
      title: '4. Information Sharing & Transfers',
      icon: <Share2 size={18} className="text-gold" />,
      content: (
        <>
          <p className="mb-4">
            We share your information strictly on a need-to-know basis. Your data is disclosed only under the following circumstances:
          </p>
          <ul className="list-none space-y-3 pl-0 mb-4">
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-gold shrink-0 mt-2"></span>
              <span><strong>Travel Providers:</strong> Airlines, hotels, transport providers, local destination managers, and visa centers that need details to fulfill your travel services.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-gold shrink-0 mt-2"></span>
              <span><strong>Service Partners:</strong> Payment gateways, IT infrastructure providers, and secure communication platforms (like WhatsApp API providers).</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-gold shrink-0 mt-2"></span>
              <span><strong>Legal Mandates:</strong> Where required by immigration laws, border authorities, or government regulators.</span>
            </li>
          </ul>
          <p className="text-text-primary font-medium mt-4">
            We never sell, rent, or lease your personal information to third-party marketing companies.
          </p>
        </>
      ),
    },
    {
      id: 'data-security',
      title: '5. Data Security',
      icon: <Lock size={18} className="text-gold" />,
      content: (
        <>
          <p className="mb-4">
            We implement industry-standard administrative, physical, and technical security measures to protect your personal data from unauthorized access, alteration, disclosure, or destruction.
          </p>
          <p className="mb-4">
            Your connection to our site is fully encrypted using Transport Layer Security (TLS). Payment processing is managed via secure, PCI-DSS compliant third-party payment providers to guarantee the integrity of your financial details.
          </p>
          <p>
            Please note that no transmission method over the Internet or cellular network is 100% secure. While we strive to use premium safeguards, we cannot guarantee absolute security.
          </p>
        </>
      ),
    },
    {
      id: 'cookie-policy',
      title: '6. Cookie Policy',
      icon: <Cookie size={18} className="text-gold" />,
      content: (
        <>
          <p className="mb-4">
            Our website uses cookies and similar tracking technologies to enhance user navigation and analyze traffic patterns. We use two main categories of cookies:
          </p>
          <ul className="list-none space-y-3 pl-0 mb-4">
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-gold shrink-0 mt-2"></span>
              <span><strong>Essential Cookies:</strong> Critical for website navigation and features (e.g. keeping custom routes loaded).</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-gold shrink-0 mt-2"></span>
              <span><strong>Analytical/Performance Cookies:</strong> Allow us to recognize traffic sources and measure page performance so we can continuously refine the site interface.</span>
            </li>
          </ul>
          <p>
            You can modify your browser settings to decline cookies if you prefer. However, this may restrict accessibility to certain features on our platform.
          </p>
        </>
      ),
    },
    {
      id: 'your-rights',
      title: '7. Your Rights',
      icon: <FileCheck size={18} className="text-gold" />,
      content: (
        <>
          <p className="mb-4">
            Depending on your location, you have several rights regarding your personal information, including:
          </p>
          <ul className="list-none space-y-3 pl-0 mb-4">
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-gold shrink-0 mt-2"></span>
              <span><strong>Access:</strong> The right to request copies of your personal data held by us.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-gold shrink-0 mt-2"></span>
              <span><strong>Correction:</strong> The right to request that we correct inaccurate or incomplete information.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-gold shrink-0 mt-2"></span>
              <span><strong>Erasure:</strong> The right to request that we erase your personal data, subject to local legal requirements.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-gold shrink-0 mt-2"></span>
              <span><strong>Opt-out:</strong> The right to opt-out of marketing communications at any point.</span>
            </li>
          </ul>
        </>
      ),
    },
    {
      id: 'contact-us',
      title: '8. Contact Us & Inquiries',
      icon: <Mail size={18} className="text-gold" />,
      content: (
        <>
          <p className="mb-4">
            If you have questions, feedback, or requests regarding this Privacy Policy or your personal information, feel free to contact our dedicated data privacy representative:
          </p>
          <div className="bg-surface/50 border border-gold-border/20 rounded-lg p-6 space-y-3 max-w-lg mt-6">
            <p className="text-sm font-light"><strong className="text-text-primary uppercase tracking-widest text-xs">TripGuru India Concierge Desk</strong></p>
            <p className="text-sm font-light flex items-center gap-2">
              <span className="text-gold">Email:</span>
              <a href={`mailto:${CONTACT_INFO.email}`} className="text-text-secondary hover:text-gold transition-colors">{CONTACT_INFO.email}</a>
            </p>
            <p className="text-sm font-light flex items-center gap-2">
              <span className="text-gold">Phone:</span>
              <a href={`tel:${CONTACT_INFO.phone.replace(/\s/g, '')}`} className="text-text-secondary hover:text-gold transition-colors">{CONTACT_INFO.phone}</a>
            </p>
            <p className="text-sm font-light">
              <a href={CONTACT_INFO.whatsapp} target="_blank" rel="noopener noreferrer" className="inline-block bg-gold-dim border border-gold/30 text-gold hover:bg-gold hover:text-dark transition-all px-4 py-2 rounded text-xs uppercase tracking-widest font-bold mt-2">
                Contact via WhatsApp
              </a>
            </p>
          </div>
        </>
      ),
    },
  ];

  const handleScrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const top = element.getBoundingClientRect().top + window.scrollY - 100;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-bg text-text-secondary pt-28 pb-20">
      {/* Decorative Top Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[450px] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gold/8 via-bg/0 to-bg/0 pointer-events-none z-0" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Back Button */}
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-text-muted hover:text-gold transition-colors uppercase tracking-widest text-[10px] font-bold mb-10 group"
        >
          <ArrowLeft size={12} className="group-hover:-translate-x-1 transition-transform" />
          Back to Home
        </Link>

        {/* Page Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 md:mb-24">
          <h1 className="text-text-primary font-display text-5xl md:text-6xl font-light tracking-tight mb-4">
            Privacy Policy
          </h1>
          <p className="text-text-secondary font-sans text-sm tracking-wider uppercase font-light">
            Last Updated: June 14, 2026
          </p>
          <div className="w-16 h-[1px] bg-gold/50 mx-auto mt-6" />
        </div>

        {/* Two-Column Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
          {/* Table of Contents (Sticky Sidebar) */}
          <aside className="lg:col-span-1 lg:sticky lg:top-28 h-fit max-h-[80vh] overflow-y-auto custom-scrollbar pr-2 mb-10 lg:mb-0">
            <h4 className="text-text-primary font-display text-lg tracking-widest uppercase mb-6 border-b border-gold-border/20 pb-3">
              Table of Contents
            </h4>
            <nav className="flex flex-col gap-2">
              {sections.map((sect) => (
                <button
                  key={sect.id}
                  onClick={() => handleScrollToSection(sect.id)}
                  className="flex items-center gap-3 text-left py-2 px-3 text-xs tracking-wider uppercase font-light text-text-secondary hover:text-gold hover:bg-surface/35 border-l-2 border-transparent hover:border-gold/50 transition-all rounded-r-md cursor-pointer text-ellipsis overflow-hidden"
                >
                  {sect.title}
                </button>
              ))}
            </nav>
          </aside>

          {/* Detailed Policy Text */}
          <main className="lg:col-span-3 space-y-12">
            {sections.map((sect) => (
              <section 
                key={sect.id} 
                id={sect.id} 
                className="scroll-mt-28 border-b border-gold-border/10 pb-12 last:border-0 last:pb-0"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 bg-surface border border-gold-border/20 rounded-md">
                    {sect.icon}
                  </div>
                  <h2 className="text-text-primary font-display text-2xl md:text-3xl font-light tracking-tight">
                    {sect.title.split('. ')[1] || sect.title}
                  </h2>
                </div>
                <div className="text-text-secondary text-sm md:text-base font-light leading-relaxed space-y-4">
                  {sect.content}
                </div>
              </section>
            ))}
          </main>
        </div>
      </div>
    </div>
  );
};
