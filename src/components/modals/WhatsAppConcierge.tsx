import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Send, 
  MapPin, 
  Calendar as CalendarIcon, 
  Users, 
  Sparkles, 
  User, 
  Phone, 
  PlaneTakeoff, 
  Hotel, 
  Briefcase, 
  MessageSquare,
  ChevronDown,
  Plus,
  Minus,
  Search,
  ArrowRightLeft,
  ArrowRight,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { format, addMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isBefore, startOfToday, addDays } from 'date-fns';
import { DESTINATIONS, CONTACT_INFO } from '../../constants';
import { WhatsAppIcon } from '../common/Icons';
import { TRIPGURU_LEADS_API } from '../../config/api';

interface WhatsAppConciergeProps {
  isOpen: boolean;
  onClose: () => void;
  initialDestination?: string;
}

const HOTEL_CATEGORIES = [
  "3 Star", "4 Star", "5 Star", "Luxury Villa", "Homestay", "Boutique"
];

const TRAVEL_CLASSES = [
  "Economy", "Premium Economy", "Business", "First Class"
];

const TRIP_TYPES = [
  { id: 'family', label: 'Family Trip', icon: <Users size={16} />, sub: 'Travel with loved ones' },
  { id: 'honeymoon', label: 'Honeymoon', icon: <Sparkles size={16} />, sub: 'Romantic Getaway' },
  { id: 'group', label: 'Group Tour', icon: <Users size={16} />, sub: 'Travel with friends' },
  { id: 'business', label: 'Corporate / Business', icon: <Briefcase size={16} />, sub: 'Work & MICE events' },
];

function getLeadSourcePayload(sourceSection: string) {
  const params = new URLSearchParams(window.location.search);
  return {
    source: 'website',
    sourcePage: `${window.location.pathname}${window.location.search}`,
    sourceSection,
    utmSource: params.get('utm_source') || '',
    utmMedium: params.get('utm_medium') || '',
    utmCampaign: params.get('utm_campaign') || '',
    utmContent: params.get('utm_content') || '',
    utmTerm: params.get('utm_term') || '',
  };
}

export const WhatsAppConcierge: React.FC<WhatsAppConciergeProps> = ({ isOpen, onClose, initialDestination }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    fromCity: "",
    toCity: initialDestination || "",
    departureDate: null as Date | null,
    returnDate: null as Date | null,
    isFlexible: false,
    adults: 1,
    children: 0,
    childAges: "",
    infants: 0,
    travelClass: "Economy",
    hotelCategory: "4 Star",
    budget: "",
    budgetType: "Flexible",
    tripType: "Holiday Packages",
    notes: ""
  });

  const [showCalendarModal, setShowCalendarModal] = useState<'departure' | 'return' | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(startOfMonth(new Date()));
  const [isSending, setIsSending] = useState(false);

  // Lock scroll and listen for Escape key when modal is open
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setFormData({
        fullName: "",
        phone: "",
        fromCity: "",
        toCity: "",
        departureDate: null,
        returnDate: null,
        isFlexible: false,
        adults: 1,
        children: 0,
        childAges: "",
        infants: 0,
        travelClass: "Economy",
        hotelCategory: "4 Star",
        budget: "",
        budgetType: "Flexible",
        tripType: "Holiday Packages",
        notes: ""
      });
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && initialDestination) {
      setFormData(prev => ({ ...prev, toCity: initialDestination }));
      setStep(3);
    }
  }, [isOpen, initialDestination]);

  const updateField = (field: keyof typeof formData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const nextStep = () => setStep(prev => Math.min(prev + 1, 6));
  const prevStep = () => setStep(prev => Math.max(prev - 1, 1));

  const formatDateDisplay = (date: Date | null) => {
    if (!date) return "Select Date";
    return format(date, 'dd MMM yyyy');
  };

  const generateMessage = () => {
    const { 
      fullName, phone, fromCity, toCity, departureDate, returnDate, isFlexible,
      adults, children, childAges, infants, travelClass, hotelCategory, budget, budgetType, tripType, notes 
    } = formData;

    const capitalize = (str: string) => str.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');

    const lines: string[] = [];
    
    lines.push("NEW TRAVEL LEAD\n");

    if (fullName) lines.push(`Name: ${capitalize(fullName)}`);
    if (phone) {
      const phoneDigits = phone.replace(/\D/g, '');
      const formattedPhone = phoneDigits.length === 10 ? `+91 ${phoneDigits}` : phone;
      lines.push(`Phone: ${formattedPhone}`);
    }

    if (tripType) lines.push(`\nTravel Type: ${tripType}`);

    if (fromCity || toCity) lines.push("");
    if (fromCity) lines.push(`From: ${capitalize(fromCity)}`);
    if (toCity) lines.push(`To: ${capitalize(toCity)}`);

    // Travel Dates
    let dateStr = "";
    if (isFlexible) {
      dateStr = "Flexible";
    } else if (departureDate && returnDate) {
      dateStr = `${format(departureDate, 'dd/MM/yyyy')} - ${format(returnDate, 'dd/MM/yyyy')}`;
    } else if (departureDate) {
      dateStr = format(departureDate, 'dd/MM/yyyy');
    } else if (returnDate) {
      dateStr = format(returnDate, 'dd/MM/yyyy');
    }
    if (dateStr) lines.push(`\nTravel Dates: ${dateStr}`);

    // Travellers
    const travellers = [];
    if (adults > 0) travellers.push(`${adults} ${adults === 1 ? 'Adult' : 'Adults'}`);
    if (children > 0) {
      let childStr = `${children} ${children === 1 ? 'Child' : 'Children'}`;
      if (childAges) childStr += ` (Ages: ${childAges})`;
      travellers.push(childStr);
    }
    if (infants > 0) travellers.push(`${infants} ${infants === 1 ? 'Infant' : 'Infants'}`);
    if (travellers.length > 0) lines.push(`\nTravellers: ${travellers.join(', ')}`);

    const preferences = [];
    if (travelClass) preferences.push(`Travel Class: ${travelClass}`);
    if (hotelCategory) preferences.push(`Hotel Preference: ${hotelCategory}`);
    const displayBudget = budget ? `INR ${budget}` : (budgetType !== 'Flexible' ? budgetType : '');
    if (displayBudget) preferences.push(`Budget: ${displayBudget}`);
    if (preferences.length > 0) {
      lines.push("");
      lines.push(...preferences);
    }

    if (notes) {
      lines.push(`\nNotes:\n${notes}`);
    }

    lines.push("\n---\nSource: TripGuru website concierge");

    // Clean up extra blank lines and join
    return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  };

  const handleSend = async () => {
    if (isSending) return;

    const message = encodeURIComponent(generateMessage());
    const whatsappUrl = `https://wa.me/${CONTACT_INFO.whatsapp.split('/').pop()}?text=${message}`;
    const whatsappWindow = window.open('about:blank', '_blank');

    if (whatsappWindow) {
      whatsappWindow.document.title = 'Opening WhatsApp';
      whatsappWindow.document.body.innerHTML = '<p style="font-family:sans-serif;padding:24px">Opening WhatsApp...</p>';
      whatsappWindow.opener = null;
    }

    setIsSending(true);

    const saveLead = fetch(TRIPGURU_LEADS_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify({
        fullName: formData.fullName,
        phone: formData.phone.replace(/\D/g, '').length === 10 ? `+91${formData.phone.replace(/\D/g, '')}` : formData.phone,
        tripType: formData.tripType,
        fromCity: formData.fromCity,
        toCity: formData.toCity,
        departure: formData.departureDate ? format(formData.departureDate, 'dd/MM/yyyy') : '',
        returnDate: formData.returnDate ? format(formData.returnDate, 'dd/MM/yyyy') : '',
        isFlexible: formData.isFlexible,
        adults: formData.adults,
        children: formData.children,
        childAges: formData.childAges,
        infants: formData.infants,
        travelClass: formData.travelClass,
        hotelCategory: formData.hotelCategory,
        budgetType: formData.budgetType,
        budget: formData.budget,
        notes: formData.notes,
        ...getLeadSourcePayload('concierge-form'),
      }),
    }).catch(() => null);

    await Promise.race([
      saveLead,
      new Promise((resolve) => window.setTimeout(resolve, 2500)),
    ]);

    if (whatsappWindow && !whatsappWindow.closed) {
      whatsappWindow.location.href = whatsappUrl;
    } else {
      window.open(whatsappUrl, '_blank');
    }

    setIsSending(false);
    onClose();
  };

  const isStepValid = () => {
    switch(step) {
      case 1: return !!formData.tripType;
      case 2: return true; // Destination can be "Suggest something"
      case 3: return formData.isFlexible || !!formData.departureDate;
      case 4: return formData.adults > 0 && (formData.children === 0 || formData.childAges.trim().length > 0);
      case 5: return true; 
      case 6: {
        const digitsLen = formData.phone.replace(/[^0-9]/g, '').length;
        return formData.fullName.trim().length > 2 && digitsLen >= 7 && digitsLen <= 15;
      }
      default: return false;
    }
  };

  const renderStep = () => {
    switch(step) {
      case 1:
        return (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-1">
              <h3 className="text-xl font-display font-light text-gray-900 leading-tight">Who are you <span className="italic">traveling with?</span></h3>
              <p className="text-[11px] text-gray-500 font-light">Select who is joining you on this trip</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {TRIP_TYPES.map(type => (
                <button
                  key={type.id}
                  onClick={() => {
                    updateField('tripType', type.label);
                  }}
                  className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all text-center group ${
                    formData.tripType === type.label 
                      ? 'border-gold bg-gold/5' 
                      : 'border-gray-100 hover:border-gold/30 hover:bg-gray-50'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                    formData.tripType === type.label ? 'bg-gold text-bg' : 'bg-gray-50 text-gray-400 group-hover:bg-gold/10 group-hover:text-gold'
                  }`}>
                    {type.icon}
                  </div>
                  <div className="space-y-0.5">
                    <p className="font-bold text-gray-900 text-[11px] leading-tight">{type.label}</p>
                    <p className="text-[8px] text-gray-400 uppercase tracking-widest leading-none">
                      {type.sub}
                    </p>
                  </div>
                </button>
              ))}
              {/* Special Suggestion Button */}
              <button
                onClick={() => {
                  updateField('tripType', 'Custom Request');
                }}
                className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-gold/30 bg-gold/5 text-center group hover:bg-gold/10 transition-all"
              >
                <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-gold/10 text-gold">
                  <MessageSquare size={16} />
                </div>
                <div className="space-y-0.5">
                  <p className="font-bold text-gold text-[11px] leading-tight">Other</p>
                  <p className="text-[8px] text-gold/60 uppercase tracking-widest leading-none">
                    Custom Request
                  </p>
                </div>
              </button>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-1">
              <h3 className="text-xl font-display font-light text-gray-900 leading-tight">Where to <span className="italic">next?</span></h3>
              <p className="text-[11px] text-gray-500 font-light">Tell us your dream destination</p>
            </div>
            <div className="space-y-3">
              <div className="relative group">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gold" size={18} />
                <input 
                  type="text"
                  autoFocus
                  value={formData.toCity}
                  onChange={(e) => updateField('toCity', e.target.value)}
                  placeholder="Destination (e.g. Switzerland)"
                  className="w-full pl-11 pr-6 py-4 bg-white border-2 border-gray-100 rounded-xl text-base font-bold text-gray-900 focus:border-gold focus:ring-0 transition-all placeholder:text-gray-200"
                />
              </div>
              <div className="relative group">
                <PlaneTakeoff className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                <input 
                  type="text"
                  value={formData.fromCity}
                  onChange={(e) => updateField('fromCity', e.target.value)}
                  placeholder="Departure City (Optional)"
                  className="w-full pl-11 pr-6 py-3 bg-white border-2 border-gray-100 rounded-xl text-xs font-medium text-gray-900 focus:border-gold focus:ring-0 transition-all placeholder:text-gray-200"
                />
              </div>
              <div className="pt-2">
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-2">Popular</p>
                <div className="flex flex-wrap gap-1.5">
                  {['Vietnam', 'Japan', 'Dubai', 'Switzerland', 'Australia'].map(city => (
                    <button
                      key={city}
                      onClick={() => {
                        updateField('toCity', city);
                      }}
                      className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all ${
                        formData.toCity === city ? 'bg-gold text-bg' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      {city}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-1">
              <h3 className="text-xl font-display font-light text-gray-900 leading-tight">When are you <span className="italic">traveling?</span></h3>
              <p className="text-[11px] text-gray-500 font-light">Select your preferred dates</p>
            </div>
            
            <div className="grid grid-cols-1 gap-3">
              <div className={`grid grid-cols-2 gap-3 transition-opacity ${formData.isFlexible ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
                <button 
                  onClick={() => setShowCalendarModal('departure')}
                  className="p-4 bg-white border-2 border-gray-100 rounded-xl text-left hover:border-gold transition-all group"
                >
                  <div className="flex items-center gap-2 text-[9px] font-bold text-gray-400 uppercase mb-2">
                    <CalendarIcon size={12} className="text-gold" />
                    Departure
                  </div>
                  <p className="text-sm font-black text-gray-900">{formatDateDisplay(formData.departureDate)}</p>
                </button>
                <button 
                  onClick={() => setShowCalendarModal('return')}
                  className="p-4 bg-white border-2 border-gray-100 rounded-xl text-left hover:border-gold transition-all group"
                >
                  <div className="flex items-center gap-2 text-[9px] font-bold text-gray-400 uppercase mb-2">
                    <ArrowRightLeft size={12} className="text-gold" />
                    Return
                  </div>
                  <p className="text-sm font-black text-gray-900">{formatDateDisplay(formData.returnDate)}</p>
                </button>
              </div>

              <button
                onClick={() => {
                  updateField('isFlexible', !formData.isFlexible);
                  if (!formData.isFlexible) {
                    updateField('departureDate', null);
                    updateField('returnDate', null);
                  }
                }}
                className={`w-full p-4 rounded-xl border-2 transition-all flex items-center justify-center gap-3 font-bold text-xs ${
                  formData.isFlexible 
                    ? 'border-gold bg-gold/5 text-gold' 
                    : 'border-gray-100 text-gray-400 hover:border-gray-200'
                }`}
              >
                <Sparkles size={16} />
                I'm Flexible with Dates
              </button>
            </div>

            <div className="bg-gold/5 p-3 rounded-xl border border-gold/10 flex items-center gap-3">
              <Sparkles size={14} className="text-gold" />
              <p className="text-[10px] text-gold font-medium leading-tight">Pro Tip: Flexible dates often get better flight deals!</p>
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-1">
              <h3 className="text-xl font-display font-light text-gray-900 leading-tight">Who's <span className="italic">joining?</span></h3>
              <p className="text-[11px] text-gray-500 font-light">Tell us about your travel group</p>
            </div>
            <div className="space-y-3">
              {[
                { key: 'adults', label: 'Adults', sub: '12y+', icon: <User size={16} /> },
                { key: 'children', label: 'Children', sub: '2-12y', icon: <Users size={16} /> },
                { key: 'infants', label: 'Infants', sub: 'Below 2y', icon: <Users size={16} /> },
              ].map((cat) => (
                <div key={cat.key} className="flex items-center justify-between p-3 bg-white border-2 border-gray-100 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gold">
                      {cat.icon}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-xs">{cat.label}</p>
                      <p className="text-[8px] text-gray-400 uppercase tracking-widest">{cat.sub}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => updateField(cat.key as any, Math.max(0, (formData as any)[cat.key] - 1))}
                      className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
                    >
                      <Minus size={14} className="text-gray-400" />
                    </button>
                    <span className="w-4 text-center font-black text-base text-gray-900">{(formData as any)[cat.key]}</span>
                    <button 
                      onClick={() => updateField(cat.key as any, (formData as any)[cat.key] + 1)}
                      className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
                    >
                      <Plus size={14} className="text-gold" />
                    </button>
                  </div>
                </div>
              ))}

              {formData.children > 0 && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                  <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">Child Ages</label>
                  <input 
                    type="text"
                    value={formData.childAges}
                    onChange={(e) => updateField('childAges', e.target.value)}
                    placeholder="e.g. 5, 8 (Required)"
                    className="w-full px-4 py-3 bg-white border-2 border-gray-100 rounded-xl text-xs font-medium text-gray-900 focus:border-gold focus:ring-0 transition-all placeholder:text-gray-200"
                  />
                </div>
              )}

              <div className="pt-2">
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-2">Travel Class</p>
                <div className="flex flex-wrap gap-1.5">
                  {TRAVEL_CLASSES.map(cls => (
                    <button
                      key={cls}
                      onClick={() => updateField('travelClass', cls)}
                      className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all border ${
                        formData.travelClass === cls ? 'bg-gold border-gold text-bg' : 'bg-white border-gray-200 text-gray-500 hover:border-gold'
                      }`}
                    >
                      {cls}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      case 5:
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-1">
              <h3 className="text-xl font-display font-light text-gray-900 leading-tight">Preferences & <span className="italic">Budget</span></h3>
              <p className="text-[11px] text-gray-500 font-light">Help us tailor the perfect deal</p>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-2">Hotel Category</p>
                <div className="flex flex-wrap gap-1.5">
                  {HOTEL_CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      onClick={() => updateField('hotelCategory', cat)}
                      className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all border ${
                        formData.hotelCategory === cat ? 'bg-gold border-gold text-bg' : 'bg-white border-gray-200 text-gray-500 hover:border-gold'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">Approx Budget (Per Person)</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {['Budget', 'Mid-range', 'Luxury', 'Flexible'].map(type => (
                    <button
                      key={type}
                      onClick={() => {
                        updateField('budgetType', type);
                        if (type === 'Flexible') updateField('budget', '');
                      }}
                      className={`px-3 py-1.5 rounded-full text-[9px] font-bold transition-all border ${
                        formData.budgetType === type ? 'bg-gold border-gold text-bg' : 'bg-white border-gray-200 text-gray-500 hover:border-gold'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
                {formData.budgetType !== 'Flexible' && (
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base font-bold text-gray-300">₹</span>
                    <input 
                      type="text" 
                      inputMode="numeric"
                      value={formData.budget}
                      onChange={(e) => updateField('budget', e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="Enter Amount"
                      className="w-full pl-9 pr-6 py-3 bg-white border-2 border-gray-100 rounded-xl text-base font-bold text-gray-900 focus:border-gold focus:ring-0 transition-all placeholder:text-gray-200"
                    />
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">Anything else?</label>
                <textarea 
                  value={formData.notes}
                  onChange={(e) => updateField('notes', e.target.value)}
                  placeholder="Special requests, etc."
                  rows={2}
                  className="w-full px-4 py-3 bg-white border-2 border-gray-100 rounded-xl text-xs font-medium text-gray-900 focus:border-gold focus:ring-0 transition-all placeholder:text-gray-200 resize-none"
                />
              </div>
            </div>
          </div>
        );
      case 6:
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-1">
              <h3 className="text-xl font-display font-light text-gray-900 leading-tight">Almost <span className="italic">there!</span></h3>
              <p className="text-[11px] text-gray-500 font-light">How should we reach you?</p>
            </div>
            <div className="space-y-3">
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gold" size={18} />
                <input 
                  type="text"
                  autoFocus
                  value={formData.fullName}
                  onChange={(e) => updateField('fullName', e.target.value)}
                  placeholder="Full Name"
                  className="w-full pl-11 pr-6 py-4 bg-white border-2 border-gray-100 rounded-xl text-base font-bold text-gray-900 focus:border-gold focus:ring-0 transition-all placeholder:text-gray-200"
                />
              </div>
              <div className="relative group">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gold" size={18} />
                <input 
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^\d+]/g, '');
                    updateField('phone', val);
                  }}
                  placeholder="WhatsApp / Phone number"
                  className="w-full pl-11 pr-6 py-4 bg-white border-2 border-gray-100 rounded-xl text-base font-bold text-gray-900 focus:border-gold focus:ring-0 transition-all placeholder:text-gray-200"
                />
              </div>
              {formData.phone.length > 0 && (formData.phone.replace(/[^0-9]/g, '').length < 7 || formData.phone.replace(/[^0-9]/g, '').length > 15) && (
                <p className="text-[10px] text-red-500 font-bold animate-in fade-in slide-in-from-top-1">
                  Please enter a valid phone number (7 to 15 digits)
                </p>
              )}
              <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white shrink-0">
                  <WhatsAppIcon size={16} />
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-emerald-900">Instant WhatsApp Support</p>
                  <p className="text-[10px] text-emerald-700 leading-tight">We'll send your curated itinerary directly to WhatsApp.</p>
                </div>
              </div>
            </div>
          </div>
        );
      default: return null;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />
          
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="relative bg-[#f8f9fa] w-full max-w-xl md:rounded-[32px] rounded-t-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="px-6 py-4 flex justify-between items-center bg-white border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gold flex items-center justify-center text-bg shadow-lg shadow-gold/20">
                  <Sparkles size={16} />
                </div>
                <div>
                  <h3 className="font-display text-base font-bold text-gray-900">TripGuru Concierge</h3>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[8px] text-gray-400 font-bold uppercase tracking-widest">Expert Online</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={onClose} 
                className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} className="text-gray-400" />
              </button>
            </div>

            {/* Progress Bar */}
            <div className="h-1 bg-gray-100 w-full overflow-hidden">
              <motion.div 
                className="h-full bg-gold"
                initial={{ width: 0 }}
                animate={{ width: `${(step / 6) * 100}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar">
              {renderStep()}
            </div>

            {/* Footer Actions */}
            <div className="px-6 py-4 bg-white border-t border-gray-100 flex items-center justify-between gap-4">
              {step > 1 ? (
                <button
                  onClick={prevStep}
                  className="flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-gray-900 transition-colors uppercase tracking-widest"
                >
                  <ChevronLeft size={16} />
                  Back
                </button>
              ) : (
                <div />
              )}
              
              <div className="flex items-center gap-4">
                <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">Step {step} of 6</span>
                {step < 6 ? (
                  <button
                    disabled={!isStepValid()}
                    onClick={nextStep}
                    className={`px-8 py-3.5 rounded-full font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 shadow-xl ${
                      isStepValid() 
                        ? 'bg-gold text-bg hover:scale-105 active:scale-95 shadow-gold/20' 
                        : 'bg-gray-100 text-gray-300 cursor-not-allowed shadow-none'
                    }`}
                  >
                    Continue
                    <ArrowRight size={16} />
                  </button>
                ) : (
                  <button
                    disabled={!isStepValid() || isSending}
                    onClick={handleSend}
                    className={`px-8 py-3.5 rounded-full font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 shadow-xl ${
                      isStepValid() && !isSending
                        ? 'bg-emerald-500 text-white hover:scale-105 active:scale-95 shadow-emerald-200' 
                        : 'bg-gray-100 text-gray-300 cursor-not-allowed shadow-none'
                    }`}
                  >
                    {isSending ? 'Opening...' : 'Get Itinerary'}
                    <WhatsAppIcon size={18} />
                  </button>
                )}
              </div>
            </div>

            {/* Calendar Modal */}
            <AnimatePresence>
              {showCalendarModal && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
                >
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl"
                  >
                    <div className="flex justify-between items-center mb-6">
                      <h4 className="text-lg font-black text-gray-900">Select Date</h4>
                      <button onClick={() => setShowCalendarModal(null)} className="p-2 hover:bg-gray-100 rounded-full">
                        <X size={20} className="text-gray-400" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between mb-6">
                      <button onClick={() => setCalendarMonth(prev => addMonths(prev, -1))} className="p-2 hover:bg-gray-100 rounded-full">
                        <ChevronLeft size={20} />
                      </button>
                      <h5 className="font-bold text-gray-900">{format(calendarMonth, 'MMMM yyyy')}</h5>
                      <button onClick={() => setCalendarMonth(prev => addMonths(prev, 1))} className="p-2 hover:bg-gray-100 rounded-full">
                        <ChevronRight size={20} />
                      </button>
                    </div>

                    <div className="grid grid-cols-7 gap-1 mb-6">
                      {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                        <div key={day} className="text-center text-[10px] font-bold text-gray-400 py-2">{day}</div>
                      ))}
                      {eachDayOfInterval({
                        start: startOfMonth(calendarMonth),
                        end: endOfMonth(calendarMonth)
                      }).map((date, i) => {
                        const currentSelectedDate = showCalendarModal === 'departure' ? formData.departureDate : formData.returnDate;
                        const isSelected = currentSelectedDate && isSameDay(date, currentSelectedDate);
                        const isDisabled = isBefore(date, startOfToday());
                        const dayOfWeek = date.getDay() + 1;
                        
                        return (
                          <button
                            key={date.toString()}
                            disabled={isDisabled}
                            style={i === 0 ? { gridColumnStart: dayOfWeek } : {}}
                            onClick={() => {
                              updateField(showCalendarModal === 'departure' ? 'departureDate' : 'returnDate', date);
                              setShowCalendarModal(null);
                            }}
                            className={`aspect-square flex items-center justify-center text-sm rounded-xl transition-all ${
                              isSelected 
                                ? 'bg-gold text-bg font-bold shadow-lg shadow-gold/20' 
                                : isDisabled 
                                  ? 'text-gray-200 cursor-not-allowed' 
                                  : 'text-gray-700 hover:bg-gold/10 hover:text-gold'
                            }`}
                          >
                            {format(date, 'd')}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      onClick={() => setShowCalendarModal(null)}
                      className="w-full py-4 bg-gray-900 text-white font-black rounded-2xl text-xs uppercase tracking-widest shadow-xl hover:bg-gray-800 transition-all"
                    >
                      Close
                    </button>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
