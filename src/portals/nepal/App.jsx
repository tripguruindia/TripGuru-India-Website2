import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Minus, Trash2, Edit3, Save, Settings, Layers, Calendar, Users, 
  MapPin, TrendingUp, Briefcase, Compass, FileText, CheckCircle, Clock, 
  Printer, ArrowLeft, ArrowRight, Hotel, Car, Coffee, ShieldCheck, Check, Info, AlertTriangle,
  Download, Upload, Lock, Unlock, Image, User, Mail, Phone, Globe, X, MessageSquare, LogOut,
  Wallet, ArrowUpCircle, ArrowDownCircle, Plane
} from 'lucide-react';
import { syncUserToSheet, syncLeadToSheet, syncBookingToSheet } from './utils/dbSync';
import { initializeDB, saveDB, INITIAL_ROUTES } from './data/seedData';
import { calculateQuote, validateRoomCapacity, deriveFromRooms } from './utils/calculator';
import {
  getDayTransfers,
  withDayTransfers,
  getAirportForCity,
  cityHasAirport,
  canFlyBetween,
  airportTransferKey,
  cityToCityRouteKey,
  flightLegTransfers,
  resolveAirportTransfer,
  airportStopValue,
  stopLabel,
  buildRouteKey,
  buildRouteName,
  isAirportRouteKey,
  airportFromKeySegment,
  reverseRouteKey,
  rateForRoute,
  findRoute,
  routeExistsEitherWay,
  TRAVEL_MODE_CAR,
  TRAVEL_MODE_FLIGHT,
} from './utils/transfers';
import { requireXLSX } from './utils/loadXlsx';
import {
  apiLogin,
  apiSignup,
  apiLogoutLocal,
  isAdminSession,
  isApiSession,
  getAdminDb,
  getPublicDb,
  createBooking,
  getMyBookings,
  listMyQuotes,
  createQuote,
  updateQuote,
  deleteQuote,
  convertQuote,
  createUser,
  updateUser,
  deleteUser,
  resetUserPassword,
  getMyWallet,
  getAgentWallet,
  addWalletTransaction,
} from './utils/apiClient';
import './App.css';
import './index.css';

// True only when the portal is being served from a developer's own machine.
// Gates anything that is a convenience while building but a disclosure in
// public -- currently the quick-login buttons on the sign-in gate, which
// print working credentials on screen. Deliberately a hostname check rather
// than import.meta.env.DEV: a production build served locally for testing
// should still show them, and a dev build must never reach the live domain
// with them switched on.
const isLocalDevHost =
  typeof window !== 'undefined' &&
  /^(localhost|127\.0\.0\.1|\[::1\])$/.test(window.location.hostname);

const EMPTY_B2B_PROFILE = {
  agentName: '',
  email: '',
  countryCode: '+91',
  phone: '',
  address: '',
  agencyName: '',
  agencyLogo: '',
  agencyAddress: '',
  agencyEmail: '',
  agencyPhone: '',
  agencyWebsite: ''
};

const formatCityName = (c) => {
  if (!c) return '';
  const clean = c.toLowerCase().trim();
  if (clean === 'ktm' || clean === 'kathmandu') return 'Kathmandu';
  return c.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

// Human label for a route key, used when the builder has to create a route
// the master list doesn't have yet (see ensureRoutesExist).
const routeLabelFromKey = (key, airportsData = []) => {
  if (!key) return '';
  if (key.endsWith('_airport_transfer')) {
    return `${formatCityName(key.replace(/_airport_transfer$/, ''))} Airport Transfer`;
  }
  if (key.includes('_to_')) {
    // A segment may be an airport stop (`aptpkr`), which needs its real name.
    const label = (seg) => {
      const airport = airportFromKeySegment(airportsData, seg);
      return airport ? airport.name : formatCityName(seg);
    };
    const parts = key.split('_to_');
    return `${label(parts[0])} to ${label(parts[parts.length - 1])}`;
  }
  return formatCityName(key.replace(/_/g, ' '));
};

// NOTE: this file used to carry its own copy of getTransferDesc, mirroring
// the one in calculator.js. The day cards now render the engine's generated
// copy directly (see dayWiseBreakdown), so the duplicate has been removed
// rather than left to drift out of step with the priced itinerary.

function App() {
  // Routing helper
  const getRouteFromHash = () => {
    if (typeof window === 'undefined') return 'b2c';
    const hash = window.location.hash;
    if (hash.startsWith('#/b2b')) return 'b2b';
    if (hash.startsWith('#/admin')) return 'admin';
    return 'b2c';
  };

  const [currentRoute, setCurrentRoute] = useState(getRouteFromHash);

  // Navigation state
  // "b2c" (Client App), "b2b" (B2B Agent Portal), or "admin" (Admin Panel)
  const [view, setView] = useState(() => getRouteFromHash());
  // Admin tabs: "dashboard" | "hotels" | "activities" | "vehicles"
  const [activeAdminTab, setActiveAdminTab] = useState('dashboard');
  // B2C sub-views: "packages" (browse) | "customize" (builder) | "invoice" (after booking)
  const [b2cSubView, setB2cSubView] = useState('packages');
  // B2B sub-views: "dashboard" (agent portal dashboard) | "packages" | "wizard" | "customize" | "invoice"
  const [b2bSubView, setB2bSubView] = useState('dashboard');
  const [showB2bLoginPortal, setShowB2bLoginPortal] = useState(false);
  const [showB2cLoginPortal, setShowB2cLoginPortal] = useState(false);

  // ── Theme: 'dark' | 'light' — persisted in localStorage ──────────────────────
  const [themeMode, setThemeMode] = useState(() => {
    return localStorage.getItem('nepal_theme_mode') || 'dark';
  });
  const toggleTheme = () => {
    setThemeMode(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('nepal_theme_mode', next);
      return next;
    });
  };

  useEffect(() => {
    const handleHashChange = () => {
      const route = getRouteFromHash();
      setCurrentRoute(route);
      setView(route);
    };
    window.addEventListener('hashchange', handleHashChange);
    // Align view initially
    handleHashChange();
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  // DB State
  const [db, setDb] = useState(() => {
    const loaded = initializeDB() || {
      hotels: [], vehicles: [], activities: [], packages: [], settings: {}, bookings: [], routes: []
    };
    if (loaded && !loaded.routes) {
      loaded.routes = INITIAL_ROUTES;
    }
    return loaded;
  });

  // Authentication State
  //
  // Each portal (admin/b2b/b2c) is its own independent login session --
  // deliberately no fallback to a shared/legacy key here. An earlier version
  // fell back to a single shared `nepal_quote_current_user` key when the
  // route-specific one was empty, which leaked whichever portal was logged
  // into last across all three: e.g. loading #/admin fresh (no admin login
  // in this browser) would still show "logged in as System Admin" in the
  // header because a B2B or B2C login elsewhere had populated the shared
  // key. Purely a display-state bug -- the real API session was already
  // fixed to be per-portal separately (see utils/apiClient.js) -- but
  // confusing and worth closing off the same way.
  const [currentUser, setCurrentUser] = useState(() => {
    const route = typeof window !== 'undefined' ? (window.location.hash.startsWith('#/b2b') ? 'b2b' : window.location.hash.startsWith('#/admin') ? 'admin' : 'b2c') : 'b2c';
    const saved = localStorage.getItem('nepal_quote_user_' + route);
    return saved ? JSON.parse(saved) : null;
  });

  // Keep separate sessions for separate portals
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('nepal_quote_user_' + currentUser.role, JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('nepal_quote_user_' + currentRoute);
    }
  }, [currentUser, currentRoute]);


  // Admin sessions are backed by the real API now (see utils/apiClient.js),
  // not localStorage. Load fresh master data from the server whenever we
  // land on the admin route already authenticated as admin -- this covers
  // both a fresh login (handleLogin sets currentUser, which retriggers this
  // effect) and a hard refresh while already logged in (currentUser is
  // restored from localStorage on mount, see the useState below).
  // B2C/B2B stay entirely on the original localStorage-backed `db` --
  // untouched by this effect.
  useEffect(() => {
    if (currentRoute !== 'admin' || !currentUser || currentUser.role !== 'admin' || !isAdminSession()) {
      return;
    }
    let cancelled = false;
    getAdminDb()
      .then((fresh) => {
        // Frontend (Vercel) and API (Render) deploy independently, so a build
        // of this app can briefly run against an API that predates a field.
        // Keep whatever we already had for `airports` in that window rather
        // than blanking the master and silently disabling every flight leg.
        if (!cancelled) setDb((prev) => ({
          ...fresh,
          airports: fresh.airports ?? prev?.airports ?? [],
        }));
      })
      .catch((err) => {
        console.error('Failed to load admin data from the server', err);
        if (!cancelled) {
          window.alert('Could not load data from the server. Please log in again.');
          apiLogoutLocal();
          setCurrentUser(null);
        }
      });
    return () => { cancelled = true; };
  }, [currentRoute, currentUser]);

  // B2C/B2B: load real, admin-managed master data (cities/hotels/vehicles/
  // routes/activities/packages/settings) from the public API on mount and
  // whenever the route switches to b2c/b2b -- no login required, matching
  // the existing "browsing is public" UX (lead capture, not an account,
  // gates pricing visibility). Only overwrites those specific `db` keys;
  // bookings/users/leads are untouched here (bookings are fetched
  // separately once logged in, see the my-bookings effect below).
  useEffect(() => {
    if (currentRoute !== 'b2c' && currentRoute !== 'b2b') return;
    let cancelled = false;
    getPublicDb()
      .then((fresh) => {
        if (cancelled) return;
        setDb((prev) => ({
          ...prev,
          cities: fresh.cities,
          hotels: fresh.hotels,
          vehicles: fresh.vehicles,
          routes: fresh.routes,
          activities: fresh.activities,
          packages: fresh.packages,
          settings: fresh.settings,
          // ?? not ||: an API that has deployed and genuinely has no airports
          // configured returns [], which must win over stale local fixtures.
          // Only a missing field (older API) falls back to what we had.
          airports: fresh.airports ?? prev.airports ?? [],
        }));
      })
      .catch((err) => {
        // Non-fatal: keep whatever localStorage-cached fixtures are already
        // in `db` (e.g. the visitor is offline) rather than blocking the page.
        console.error('Failed to load live master data from the server', err);
      });
    return () => { cancelled = true; };
  }, [currentRoute]);

  // B2C/B2B "My Bookings": once logged in via the real API, fetch the
  // caller's own bookings (scoped server-side by agent_id/user_id).
  const [myBookings, setMyBookings] = useState([]);
  useEffect(() => {
    if ((currentRoute !== 'b2c' && currentRoute !== 'b2b') || !isApiSession()) {
      setMyBookings([]);
      return;
    }
    let cancelled = false;
    getMyBookings()
      .then((rows) => { if (!cancelled) setMyBookings(rows); })
      .catch((err) => console.error('Failed to load my bookings', err));
    return () => { cancelled = true; };
  }, [currentRoute, currentUser]);

  // B2B "My Wallet": real credit/debit history behind the wallet balance
  // card, scoped server-side to the logged-in agent. b2b only -- B2C/admin
  // have no wallet.
  const [myWallet, setMyWallet] = useState({ balance: 0, transactions: [] });
  useEffect(() => {
    if (currentRoute !== 'b2b' || !isApiSession()) {
      setMyWallet({ balance: 0, transactions: [] });
      return;
    }
    let cancelled = false;
    getMyWallet()
      .then((result) => { if (!cancelled) setMyWallet(result); })
      .catch((err) => console.error('Failed to load my wallet', err));
    return () => { cancelled = true; };
  }, [currentRoute, currentUser]);

  // Saved quotes: the caller's own work-in-progress proposals, scoped
  // server-side by agent_id/user_id exactly like bookings above. Loaded once
  // per session rather than per tab switch -- the individual handlers below
  // keep this list in step after every save/convert/delete, so refetching on
  // each navigation would only add latency.
  const [myQuotes, setMyQuotes] = useState([]);
  const [quotesLoading, setQuotesLoading] = useState(false);
  const [quotesError, setQuotesError] = useState(null);
  // Which pipeline tab is showing. Filtering happens client-side: the list is
  // one agent's own quotes, so it's small, and switching tabs instantly beats
  // a round-trip to the ?status= filter the API also offers.
  const [quoteStatusFilter, setQuoteStatusFilter] = useState('All');

  const refreshMyQuotes = React.useCallback(async () => {
    if (!isApiSession()) { setMyQuotes([]); return; }
    setQuotesLoading(true);
    try {
      const rows = await listMyQuotes();
      setMyQuotes(rows);
      setQuotesError(null);
    } catch (err) {
      console.error('Failed to load saved quotes', err);
      setQuotesError(err.message || 'Could not load your saved quotes.');
    } finally {
      setQuotesLoading(false);
    }
  }, []);

  useEffect(() => {
    if ((currentRoute !== 'b2c' && currentRoute !== 'b2b') || !isApiSession()) {
      setMyQuotes([]);
      return;
    }
    refreshMyQuotes();
  }, [currentRoute, currentUser, refreshMyQuotes]);

  // Sync active user when shifting between portal URLs (hash links)
  useEffect(() => {
    const saved = localStorage.getItem('nepal_quote_user_' + currentRoute);
    setCurrentUser(saved ? JSON.parse(saved) : null);
  }, [currentRoute]);

  // Shared post-login redirect + profile sync, used by both a fresh login
  // and an auto-login right after signup, for b2b/b2c.
  const enterPortalAsUser = (user) => {
    setCurrentUser(user);
    setIsLeadCaptured(true);

    if (user.role === 'b2b') {
      setView('b2b');
      setB2bSubView('dashboard');
      setShowB2bLoginPortal(false);
      setB2bProfile({
        agentName: user.fullName || 'B2B Partner',
        email: user.email,
        countryCode: user.countryCode || '+91',
        phone: user.phone || '',
        address: user.agencyAddress || '',
        agencyName: user.agencyName || 'Horizon Travel Partners',
        agencyLogo: user.agencyLogo || '',
        agencyAddress: user.agencyAddress || '123 Travel Street, Delhi',
        agencyEmail: user.agencyEmail || user.email,
        agencyPhone: user.agencyPhone || user.phone,
        agencyWebsite: user.agencyWebsite || ''
      });
    } else {
      setView('b2c');
      setB2cSubView('packages');
      setShowB2cLoginPortal(false);
      setB2cProfile({
        fullName: user.fullName || '',
        email: user.email,
        countryCode: user.countryCode || '+91',
        phone: user.phone || '',
        address: user.address || ''
      });
    }
  };

  // Admin, B2B, and B2C all go through the same real backend now (see
  // utils/apiClient.js) -- no more localStorage user lookup for any role.
  const handleLogin = async (email, password) => {
    try {
      const result = await apiLogin(email, password);
      const expectedRole = currentRoute; // 'admin' | 'b2b' | 'b2c'
      if (result.user.role !== expectedRole) {
        apiLogoutLocal();
        const label = expectedRole === 'admin' ? 'an Admin' : expectedRole === 'b2b' ? 'a B2B Partner Agent' : 'a Traveler';
        window.alert(`Access Denied: You must use ${label} account to access this portal.`);
        return false;
      }
      if (currentRoute === 'admin') {
        setCurrentUser(result.user);
        setIsLeadCaptured(true);
        setView('admin');
        setActiveAdminTab('dashboard');
      } else {
        enterPortalAsUser(result.user);
      }
      return true;
    } catch (err) {
      window.alert(err.message || "Invalid email or password!");
      return false;
    }
  };

  const handleSignup = async (email, password, role, profileData) => {
    try {
      const result = await apiSignup({ email: email.trim(), password, role, ...profileData });
      // Sync the real (password-free) server user to the Google Sheet CRM,
      // same as before -- syncUserToSheet never touches the password field.
      syncUserToSheet(result.user);
      enterPortalAsUser(result.user);
      return true;
    } catch (err) {
      window.alert(err.message || "Could not create your account. Please try again.");
      return false;
    }
  };

  const handleLogout = () => {
    const activeRole = currentUser ? currentUser.role : currentRoute;
    localStorage.removeItem('nepal_quote_user_' + activeRole);
    localStorage.removeItem('nepal_quote_current_user'); // stale key from before per-portal sessions; harmless no-op once cleared
    apiLogoutLocal(); // clears this portal's own bearer token slot (admin/b2b/b2c sessions are independent)

    setCurrentUser(null);
    setShowB2bLoginPortal(false);
    setShowB2cLoginPortal(false);

    // The agent profile is held separately from the auth session, so without
    // this it survived logout -- leaving the previous agent's name, agency and
    // wallet figure on screen for the next (possibly anonymous) visitor.
    if (activeRole === 'b2b') {
      localStorage.removeItem('nepal_quote_b2b_profile');
      setB2bProfile({ ...EMPTY_B2B_PROFILE });
    }
    setIsLeadCaptured(!!localStorage.getItem('nepal_quote_lead_info'));

    // Signing out leaves you on the portal you signed out of -- it must never
    // hand you to a different one. Logging out of the agent portal used to
    // drop the visitor on the traveller storefront, which both looks like a
    // fault and tells anyone watching that the three portals are one app.
    // Each portal's own signed-out screen is the correct destination:
    //   b2b   -> the agent sign-in prompt (renderB2bSignedOutPrompt)
    //   admin -> the admin sign-in gate (isAuthorizedForRoute is false with
    //            no currentUser, so renderAuthGate takes over)
    //   b2c   -> the storefront it was already on
    // The hash is deliberately left untouched; rewriting it is what caused
    // the cross-portal jump.
    if (activeRole === 'b2b') {
      setB2bSubView('dashboard');
    } else if (activeRole === 'b2c') {
      setB2cSubView('packages');
    } else if (activeRole === 'admin') {
      setActiveAdminTab('dashboard');
    }
  };

  // Profiles State and Persistence
  const [b2cProfile, setB2cProfile] = useState(() => {
    const saved = localStorage.getItem('nepal_quote_b2c_profile');
    return saved ? JSON.parse(saved) : {
      fullName: '',
      email: '',
      countryCode: '+91',
      phone: '',
      address: ''
    };
  });

  // Blank rather than seeded demo values: these fields are shown on the agent
  // dashboard and baked into white-labelled quotes, so a placeholder agency
  // ("Horizon Travel Partners") could be presented to a real visitor -- or
  // printed on a real agent's documents -- as though it were their own.
  const [b2bProfile, setB2bProfile] = useState(() => {
    const saved = localStorage.getItem('nepal_quote_b2b_profile');
    return saved ? JSON.parse(saved) : { ...EMPTY_B2B_PROFILE };
  });

  useEffect(() => {
    localStorage.setItem('nepal_quote_b2c_profile', JSON.stringify(b2cProfile));
  }, [b2cProfile]);

  useEffect(() => {
    localStorage.setItem('nepal_quote_b2b_profile', JSON.stringify(b2bProfile));
  }, [b2bProfile]);

  const [adminProfile, setAdminProfile] = useState(() => {
    const saved = localStorage.getItem('nepal_quote_admin_profile');
    return saved ? JSON.parse(saved) : {
      companyName: 'NEPAL TOUR ORGANIZER',
      companyLogo: '',
      email: 'booking@nepaltravelquote.com',
      phone: '+977 1234567890',
      website: 'www.nepaltravelquote.com',
      address: 'Kathmandu, Nepal'
    };
  });

  useEffect(() => {
    localStorage.setItem('nepal_quote_admin_profile', JSON.stringify(adminProfile));
  }, [adminProfile]);

  const [profileSuccessMessage, setProfileSuccessMessage] = useState('');



  useEffect(() => {
    if (currentRoute === 'admin') {
      setAuthRole('admin');
      setAuthTab('login');
    } else if (currentRoute === 'b2b') {
      setAuthRole('b2b');
    } else {
      setAuthRole('b2c');
    }
  }, [currentRoute]);

  // B2C Quote State — Room-based model
  // Each room: { adults: N, children: [{ age: X }, ...] }
  const [rooms, setRooms] = useState([{ adults: 2, children: [] }]);
  
  // Derive flat travelers/roomConfig from rooms for pricing engine
  const derived = deriveFromRooms(rooms);
  const travelers = derived.travelers;
  const roomConfig = derived.roomConfig;
  
  const [selectedVehicleId, setSelectedVehicleId] = useState('v-suv');
  const [selectedHotelCategory, setSelectedHotelCategory] = useState('4-Star');
  const [travelDate, setTravelDate] = useState('2026-10-15');
  const [customPackageName, setCustomPackageName] = useState('My Nepal Tour Custom');
  const [customItinerary, setCustomItinerary] = useState([]);
  const [currentPackageId, setCurrentPackageId] = useState(null);
  // Per-pax, GST-inclusive discount derived from a preset package's
  // `starting_price_override`. Kept in state (rather than recomputed from
  // currentPackageId) so it stays pinned to the package's DEFAULT
  // configuration -- if the traveller then upgrades a hotel, the price rises
  // from the offer base instead of the discount silently rescaling.
  const [offerDiscountPerPax, setOfferDiscountPerPax] = useState(0);

  // Invoice / Saved Booking State
  const [lastBookingId, setLastBookingId] = useState(null);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutForm, setCheckoutForm] = useState({
    clientName: '',
    email: '',
    phone: '',
    countryCode: '+91',
    notes: ''
  });

  useEffect(() => {
    if (showCheckoutModal && view === 'b2c') {
      setCheckoutForm(prev => ({
        ...prev,
        clientName: prev.clientName || b2cProfile.fullName || '',
        email: prev.email || b2cProfile.email || '',
        countryCode: prev.countryCode || b2cProfile.countryCode || '+91',
        phone: prev.phone || b2cProfile.phone || ''
      }));
    }
  }, [showCheckoutModal, view, b2cProfile]);

  // Signup & Login Form States
  const [authTab, setAuthTab] = useState('login');
  const [authRole, setAuthRole] = useState('b2c');
  const [authForm, setAuthForm] = useState({
    email: '',
    password: '',
    fullName: '',
    phone: '',
    countryCode: '+91',
    agencyName: '',
    agencyAddress: '',
    agencyWebsite: ''
  });

  // Admin Rate Editor States
  const [editingHotelId, setEditingHotelId] = useState(null);
  const [hotelEditState, setHotelEditState] = useState({});
  const [newHotelForm, setNewHotelForm] = useState({
    name: '', city: 'Kathmandu', category: '4-Star', description: '',
    rates: {
      single:      { CP: 5000, MAP: 6000, AP: 7000 },
      double:      { CP: 6000, MAP: 8000, AP: 10000 },
      extra_adult: { CP: 1500, MAP: 2500, AP: 3500 },
      cwb:         { CP: 1200, MAP: 2000, AP: 2800 },
      cnb:         { CP: 500,  MAP: 1000, AP: 1500 }
    }
  });
  const [showAddHotelModal, setShowAddHotelModal] = useState(false);
  const [adminFilterCity, setAdminFilterCity] = useState('All');
  const [adminFilterCategory, setAdminFilterCategory] = useState('All');

  // B2C Custom Trip Wizard States
  const [wizardDestinations, setWizardDestinations] = useState([
    { city: 'Kathmandu', nights: 2 }
  ]);
  const [wizardStartCity, setWizardStartCity] = useState('Gorakhpur');
  const [wizardEndCity, setWizardEndCity] = useState('Gorakhpur');
  const [isEndCityManuallyEdited, setIsEndCityManuallyEdited] = useState(false);
  const [wizardNationality, setWizardNationality] = useState('India');
  const [wizardLeavingOn, setWizardLeavingOn] = useState('2026-10-15');
  const [wizardStarRating, setWizardStarRating] = useState('4-Star');
  const [wizardAddTransfers, setWizardAddTransfers] = useState(true);

  // Confirmed itinerary-level start and end cities
  const [startCity, setStartCity] = useState('Gorakhpur');
  const [endCity, setEndCity] = useState('Gorakhpur');

  const [editingActivityId, setEditingActivityId] = useState(null);
  const [activityEditState, setActivityEditState] = useState({});
  const [newActivityForm, setNewActivityForm] = useState({
    name: '', city: 'Kathmandu', description: '', price_adult: 2000, price_child: 1200,
    pricing_mode: 'per_person', vehicle_rates: {}
  });
  const [showAddActivityModal, setShowAddActivityModal] = useState(false);
  const [newCityName, setNewCityName] = useState('');
  const [newAirportForm, setNewAirportForm] = useState({ name: '', code: '', cities: [] });
  const [editingAirport, setEditingAirport] = useState(null);
  const [editingCity, setEditingCity] = useState(null); // { original, name }

  const [globalRouteForm, setGlobalRouteForm] = useState({ fromCity: 'Kathmandu', toCity: 'Pokhara', prices: {} });
  const [globalRouteStops, setGlobalRouteStops] = useState(['Kathmandu', 'Pokhara']);
  const [showAddVehicleModal, setShowAddVehicleModal] = useState(false);
  const [newVehicleForm, setNewVehicleForm] = useState({ name: '', description: '', capacity: 4, copyFromId: '' });
  const [b2cMarkupInput, setB2cMarkupInput] = useState(15);
  const [b2bMarkupInput, setB2bMarkupInput] = useState(10);
  const [agentMarkupInput, setAgentMarkupInput] = useState(0);
  const [taxInput, setTaxInput] = useState(13);
  const [posterUrlInput, setPosterUrlInput] = useState('');
  const [posterActiveInput, setPosterActiveInput] = useState(false);
  const [showPosterPopup, setShowPosterPopup] = useState(false);

  const [adminWizardStartCity, setAdminWizardStartCity] = useState('Gorakhpur');
  const [adminWizardEndCity, setAdminWizardEndCity] = useState('Gorakhpur');
  const [adminWizardDestinations, setAdminWizardDestinations] = useState([
    { city: 'Kathmandu', nights: 2 }
  ]);
  const [editingDefaultWizardItinerary, setEditingDefaultWizardItinerary] = useState(false);
  const [wizardDefaultStartCity, setWizardDefaultStartCity] = useState('Gorakhpur');
  const [wizardDefaultEndCity, setWizardDefaultEndCity] = useState('Gorakhpur');
  const [wizardDefaultVehicleId, setWizardDefaultVehicleId] = useState('v-suv');
  const [wizardDefaultHotelCategory, setWizardDefaultHotelCategory] = useState('4-Star');
  const [wizardDefaultDays, setWizardDefaultDays] = useState([]);

  const [isLeadCaptured, setIsLeadCaptured] = useState(() => {
    if (typeof window === 'undefined') return false;
    // `nepal_quote_lead_info` is intentionally shared across portals (a
    // visitor's name/email/phone from the lead-capture gate) -- unlike
    // currentUser, this isn't a login session, so no per-portal leak here.
    return !!localStorage.getItem('nepal_quote_lead_info');
  });
  // A signed-in traveller has already given us their name, email and phone at
  // signup, so re-asking for them behind an "Unlock Special Rates" gate is
  // both redundant and hostile. The gate exists to capture ANONYMOUS visitors'
  // details -- once we have them, from either source, prices stay unlocked.
  const hasContactDetails = isLeadCaptured || !!currentUser;

  const [leadForm, setLeadForm] = useState({ name: '', email: '', phone: '', countryCode: '+91' });
  const [showLeadCaptureModal, setShowLeadCaptureModal] = useState(false);
  const [pendingLeadAction, setPendingLeadAction] = useState(null);
  const [leadSearchQuery, setLeadSearchQuery] = useState('');
  const [pkgSearch, setPkgSearch] = useState('');
  const [pkgDurationFilter, setPkgDurationFilter] = useState('all');
  const [pkgSortOrder, setPkgSortOrder] = useState('none');
  const [expandedFaqIndex, setExpandedFaqIndex] = useState(null);

  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [editingUser, setEditingUser] = useState(null);
  const [showAddUserModal, setShowAddUserModal] = useState(false);

  // Admin's view into one agent's wallet ledger -- set to the user row when
  // the "Wallet" action is clicked, null when the modal is closed.
  const [walletModalUser, setWalletModalUser] = useState(null);
  const [walletModalData, setWalletModalData] = useState({ balance: 0, transactions: [] });
  const [walletModalLoading, setWalletModalLoading] = useState(false);
  const [walletModalError, setWalletModalError] = useState(null);
  const [walletEntryForm, setWalletEntryForm] = useState({ type: 'credit', amount: '', reason: '' });
  const [walletEntrySubmitting, setWalletEntrySubmitting] = useState(false);

  const openWalletModal = async (user) => {
    setWalletModalUser(user);
    setWalletEntryForm({ type: 'credit', amount: '', reason: '' });
    setWalletModalError(null);
    setWalletModalLoading(true);
    try {
      const result = await getAgentWallet(user.id);
      setWalletModalData(result);
    } catch (err) {
      setWalletModalError(err.message || 'Could not load this agent\'s wallet.');
    } finally {
      setWalletModalLoading(false);
    }
  };

  const handleAddWalletEntry = async (e) => {
    if (e) e.preventDefault();
    if (!walletModalUser) return;
    const amount = Number(walletEntryForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      window.alert('Enter an amount greater than zero.');
      return;
    }
    if (!walletEntryForm.reason.trim()) {
      window.alert('Add a short note explaining this credit/debit.');
      return;
    }
    setWalletEntrySubmitting(true);
    try {
      const result = await addWalletTransaction(walletModalUser.id, {
        type: walletEntryForm.type,
        amount,
        reason: walletEntryForm.reason.trim(),
      });
      setWalletModalData((prev) => ({
        balance: result.balance,
        transactions: [result.transaction, ...prev.transactions],
      }));
      setWalletEntryForm({ type: 'credit', amount: '', reason: '' });
      // Keep the Users table's own copy of walletBalance in step so it's
      // correct if the admin reopens this modal without a full page refresh.
      setDb((prevDb) => ({
        ...prevDb,
        users: (prevDb.users || []).map((u) =>
          u.id === walletModalUser.id ? { ...u, walletBalance: result.balance } : u
        ),
      }));
    } catch (err) {
      window.alert(err.message || 'Could not save this wallet entry.');
    } finally {
      setWalletEntrySubmitting(false);
    }
  };

  const [newUserForm, setNewUserForm] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'b2c',
    phone: '',
    countryCode: '+91',
    agencyName: '',
    agencyAddress: '',
    agencyWebsite: ''
  });

  const handleLeadSubmit = (name, email, countryCode, phone) => {
    if (!name.trim() || !email.trim() || !phone.trim()) {
      window.alert("Please fill in all fields to unlock pricing.");
      return false;
    }
    const cleanPhone = phone.replace(/\D/g, '');
    if (countryCode === '+91' && cleanPhone.length < 10) {
      window.alert("Indian mobile numbers must be at least 10 digits.");
      return false;
    }
    const newLead = {
      id: 'lead-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      name: name.trim(),
      email: email.trim(),
      country_code: countryCode,
      phone: cleanPhone,
      created_at: new Date().toISOString()
    };

    const oldDb = db;
    const updatedLeads = [...(db.leads || []), newLead];
    const newDb = { ...db, leads: updatedLeads };
    setDb(newDb);
    saveDB(newDb, oldDb);

    // Sync Lead to Google Sheets
    syncLeadToSheet(newLead);
    localStorage.setItem('nepal_quote_lead_info', JSON.stringify(newLead));
    setIsLeadCaptured(true);
    return true;
  };

  const submitLeadForm = (e) => {
    if (e) e.preventDefault();
    const success = handleLeadSubmit(leadForm.name, leadForm.email, leadForm.countryCode, leadForm.phone);
    if (success) {
      setShowLeadCaptureModal(false);
      const action = pendingLeadAction;
      setPendingLeadAction(null);
      if (action) {
        if (action.type === 'customize') {
          handleSelectPresetPackage(action.pkg, true);
        } else if (action.type === 'view_book') {
          handleViewAndBookPackage(action.pkg, true);
        } else if (action.type === 'wizard') {
          handleCreateProposal(null, true);
        }
      }
    }
  };

  const exportLeadsToExcel = async () => {
    const XLSX = await requireXLSX();
    if (!XLSX) return;
    const data = (db.leads || []).map((lead, idx) => ({
      "S.No.": idx + 1,
      "Lead ID": lead.id,
      "Name": lead.name,
      "Email": lead.email,
      "Country Code": lead.country_code,
      "Phone Number": lead.phone,
      "Captured At": new Date(lead.created_at).toLocaleString()
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "B2C Leads");
    XLSX.writeFile(wb, "nepal_b2c_leads.xlsx");
  };

  const handleDeleteLead = (id) => {
    if (!window.confirm("Are you sure you want to delete this B2C lead?")) return;
    const oldDb = db;
    const updatedLeads = (db.leads || []).filter(l => l.id !== id);
    const newDb = { ...db, leads: updatedLeads };
    setDb(newDb);
    saveDB(newDb, oldDb);
  };

  const handleClearAllLeads = () => {
    if (!window.confirm("WARNING: Are you sure you want to delete ALL B2C leads? This cannot be undone.")) return;
    const oldDb = db;
    const newDb = { ...db, leads: [] };
    setDb(newDb);
    saveDB(newDb, oldDb);
  };

  const [showTransferModal, setShowTransferModal] = useState({ open: false, dayIndex: null });
  const [showActivityModal, setShowActivityModal] = useState({ open: false, dayIndex: null });

  // Admin Standard Package Editor States
  const [editingPackage, setEditingPackage] = useState(null);
  const [packageTransferModal, setPackageTransferModal] = useState({ open: false, dayIndex: null });
  const [packageActivityModal, setPackageActivityModal] = useState({ open: false, dayIndex: null });

  // B2B Preset Package Starting Price Edit States
  const [b2bEditingPkgId, setB2bEditingPkgId] = useState(null);
  const [b2bTempPriceOverride, setB2bTempPriceOverride] = useState('');

  // Sync state with LocalStorage
  const updateDBState = (newDb) => {
    const oldDb = db;
    setDb(newDb);
    saveDB(newDb, oldDb);
  };

  const handleStartEditPackage = (pkg) => {
    if (!pkg) {
      // Create new package template
      const newPkg = {
        id: `pkg-${Date.now()}`,
        name: 'New Standard Package',
        description: 'Describe the package highlights here.',
        duration_nights: 1,
        default_hotel_category: '4-Star',
        default_vehicle_id: db.vehicles?.[0]?.id || 'v-suv',
        cities: ['Kathmandu'],
        days: [
          {
            day: 1,
            city: 'Kathmandu',
            title: 'Arrival in Kathmandu',
            description: 'Airport transfer to hotel. Free evening.',
            transfer_route: 'ktm_airport_transfer',
            is_sightseeing: false,
            activity_ids: []
          },
          {
            day: 2,
            city: 'Kathmandu',
            title: 'Departure Transfer',
            description: 'Check out and transfer to airport.',
            transfer_route: 'ktm_airport_transfer',
            is_sightseeing: false,
            activity_ids: []
          }
        ]
      };
      setEditingPackage(newPkg);
    } else {
      // Clone existing package
      setEditingPackage(JSON.parse(JSON.stringify(pkg)));
    }
  };

  const handleSavePackage = () => {
    if (!editingPackage.name.trim()) {
      window.alert("Please enter a package name.");
      return;
    }
    if (!editingPackage.days || editingPackage.days.length === 0) {
      window.alert("The package must contain at least 1 day.");
      return;
    }

    // Renumber days and derive unique cities
    const cleanedDays = editingPackage.days.map((day, idx) => ({
      ...day,
      day: idx + 1
    }));

    const uniqueCities = Array.from(new Set(cleanedDays.map(d => d.city))).filter(Boolean);
    const durationNights = Math.max(1, cleanedDays.length - 1);

    const savedPackage = {
      ...editingPackage,
      days: cleanedDays,
      cities: uniqueCities,
      duration_nights: durationNights
    };

    let updatedPackages = [];
    const exists = db.packages.some(p => p.id === savedPackage.id);
    if (exists) {
      updatedPackages = db.packages.map(p => p.id === savedPackage.id ? savedPackage : p);
    } else {
      updatedPackages = [...db.packages, savedPackage];
    }

    updateDBState({ ...db, packages: updatedPackages });
    setEditingPackage(null);
  };

  const handleDuplicatePackage = (pkg) => {
    const duplicatedPkg = JSON.parse(JSON.stringify(pkg));
    duplicatedPkg.id = `pkg-${Date.now()}`;
    duplicatedPkg.name = `${pkg.name} Copy`;
    
    updateDBState({ ...db, packages: [...db.packages, duplicatedPkg] });
  };

  const handleDeletePackage = (pkgId) => {
    if (window.confirm("Are you sure you want to delete this standard package template?")) {
      const updated = db.packages.filter(p => p.id !== pkgId);
      updateDBState({ ...db, packages: updated });
    }
  };

  const handleSaveB2bPriceOverride = (pkgId) => {
    const updatedPackages = db.packages.map(p => {
      if (p.id === pkgId) {
        return {
          ...p,
          starting_price_override: b2bTempPriceOverride ? Number(b2bTempPriceOverride) : null
        };
      }
      return p;
    });
    updateDBState({ ...db, packages: updatedPackages });
    setB2bEditingPkgId(null);
  };

  const handleCopyWhatsAppMessage = (isB2BInvoice, whiteLabel, invoiceAcc, invoiceTrans, invoiceAct, displayedInvoiceTax, displayedInvoiceTotal) => {
    // Generate daywise breakdown descriptions
    const daysText = quoteCalculation.dayWiseBreakdown.map(day => {
      const isNoStay = !day.hotelId || day.hotelId === 'no_stay';
      const hotelInfo = isNoStay 
        ? (day.stay_address ? `\n• _Accommodation:_ No stay required (Address: ${day.stay_address})` : `\n• _Accommodation:_ No stay required`)
        : (day.hotelName ? `\n• _Accommodation:_ ${day.hotelName} (${selectedHotelCategory})` : '');
      const mealsInfo = day.mealPlan && day.mealPlan !== 'None' ? `\n• _Meals:_ ${day.mealPlan} Included` : '';
      const routeInfo = day.transportRoute
        ? `\n• _Route:_ ${day.transportRoute.replace(/_/g, ' ')}`
        : '';
      const activitiesInfo = day.activities.length > 0 ? `\n• _Sightseeing:_ ${day.activities.map(a => a.name).join(', ')}` : '';
      
      return `*Day ${day.day} (${day.city}): ${day.title}*${hotelInfo}${mealsInfo}${routeInfo}${activitiesInfo}\n${day.description}`;
    }).join('\n\n');

    const companyName = isB2BInvoice && whiteLabel 
      ? (whiteLabel.agencyName || "B2B TRAVEL PARTNER") 
      : (adminProfile.companyName || "NEPAL TOUR ORGANIZER");

    const contactPhone = isB2BInvoice && whiteLabel
      ? (whiteLabel.agencyPhone || "")
      : (adminProfile.phone || "");

    const msg = `*🇳🇵 HOLIDAY TRAVEL PROPOSAL & ITINERARY 🇳🇵*
------------------------------------------------
*Prepared by:* ${companyName}
*Proposal Ref:* ${lastBookingId}
*Date:* ${new Date().toLocaleDateString()}

*CLIENT & TOUR PARAMETERS:*
• *Client Name:* ${checkoutForm.clientName}
• *Destination Route:* ${startCity} to ${endCity}
• *Duration:* ${customItinerary.length} Days / ${customItinerary.length - 1} Nights
• *Date of Travel:* ${travelDate}
• *Travelers:* ${travelers.adults} Adults${travelers.cwb > 0 ? `, ${travelers.cwb} CWB` : ''}${travelers.cnb > 0 ? `, ${travelers.cnb} CNB` : ''}
• *Hotel Category:* ${selectedHotelCategory}
• *Vehicle Type:* ${db.vehicles.find(v => v.id === selectedVehicleId)?.name}

------------------------------------------------
*ITINERARY BREAKDOWN:*

${daysText}

------------------------------------------------
*INVESTMENT & PRICING DETAILS (INR ₹):*
• Accommodation & Meals: ₹${invoiceAcc.toLocaleString()}
• Private Transport: ₹${invoiceTrans.toLocaleString()}
• Activities & Entry Fees: ₹${invoiceAct.toLocaleString()}
• GST (${taxInput}%): ₹${displayedInvoiceTax.toLocaleString()}
• *GRAND TOTAL TOUR INVESTMENT:* *₹${displayedInvoiceTotal.toLocaleString()}*

${(travelers.cwb + travelers.cnb > 0) 
  ? `• *Per Adult Rate:* *₹${Math.round(quoteCalculation.totals.perAdult).toLocaleString()} / adult*\n• *Per Child Rate:* *₹${Math.round(quoteCalculation.totals.perChild).toLocaleString()} / child*`
  : `• *Per Person Rate:* *₹${Math.round(quoteCalculation.totals.perPerson).toLocaleString()} / passenger*`
}

${hasNoStayTransfer ? '⚠️ *REMARK:* Transfer cost may change at the time of final booking because the distance needs to be checked.\n\n------------------------------------------------\n' : ''}Thank you for choosing us! For custom adjustments or bookings, please contact us at ${contactPhone ? contactPhone : "our support team"}.`;

    navigator.clipboard.writeText(msg)
      .then(() => {
        window.alert("WhatsApp message copy-paste format has been copied to your clipboard!");
      })
      .catch(err => {
        console.error("Failed to copy text: ", err);
        window.alert("Failed to copy WhatsApp message. Please copy it manually.");
      });
  };

  const renderDefaultWizardItineraryEditor = () => {
    return (
      <div className="fade-in">
        <button
          type="button"
          onClick={() => {
            if (window.confirm("Discard changes and return to package list?")) {
              setEditingDefaultWizardItinerary(false);
            }
          }}
          className="btn btn-secondary btn-sm flex items-center gap-2 mb-6"
        >
          <span>← Back to Master List</span>
        </button>

        {/* Header metadata card */}
        <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900 text-white rounded-2xl p-6 mb-8 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden text-left">
          <div className="absolute right-0 top-0 opacity-5 pointer-events-none text-9xl">🇳🇵</div>
          <div className="z-10 flex-1 flex flex-col gap-3">
            <div className="text-xs text-orange-400 font-extrabold uppercase tracking-widest flex items-center gap-1.5">
              <Calendar size={16} className="text-orange-400" />
              <span>Configure Default Custom Planner Itinerary</span>
            </div>
            <h2 className="text-xl font-extrabold font-heading text-white">Default Intake Wizard Proposal Template</h2>
            <p className="text-xs text-slate-350 max-w-2xl leading-relaxed">
              This Day-by-Day template defines the starting timeline, hotels, activities, and transfers loaded automatically when a B2C traveler enters the Customizer.
            </p>
          </div>

          <div className="z-10 flex flex-col gap-4 shrink-0">
            <div className="flex flex-col gap-3 bg-slate-950/45 p-4 rounded-xl border border-white/5 backdrop-blur-md">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col">
                  <label className="text-[9px] uppercase text-slate-400 font-extrabold mb-1 tracking-wider">Start City</label>
                  <select 
                    value={wizardDefaultStartCity} 
                    onChange={(e) => setWizardDefaultStartCity(e.target.value)}
                    className="bg-slate-900 border border-slate-700 text-white rounded-lg py-1.5 px-3 text-xs w-[140px] focus:outline-none cursor-pointer font-bold"
                  >
                    {['Gorakhpur', 'Kathmandu', 'Raxaul', 'Bagdogra'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col">
                  <label className="text-[9px] uppercase text-slate-400 font-extrabold mb-1 tracking-wider">End City</label>
                  <select 
                    value={wizardDefaultEndCity} 
                    onChange={(e) => setWizardDefaultEndCity(e.target.value)}
                    className="bg-slate-900 border border-slate-700 text-white rounded-lg py-1.5 px-3 text-xs w-[140px] focus:outline-none cursor-pointer font-bold"
                  >
                    {['Gorakhpur', 'Kathmandu', 'Raxaul', 'Bagdogra'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col">
                  <label className="text-[9px] uppercase text-slate-400 font-extrabold mb-1 tracking-wider">Default Star Rating</label>
                  <select 
                    value={wizardDefaultHotelCategory} 
                    onChange={(e) => setWizardDefaultHotelCategory(e.target.value)}
                    className="bg-slate-900 border border-slate-700 text-white rounded-lg py-1.5 px-3 text-xs w-[140px] focus:outline-none cursor-pointer font-bold"
                  >
                    <option value="3-Star">3-Star</option>
                    <option value="4-Star">4-Star</option>
                    <option value="5-Star">5-Star</option>
                  </select>
                </div>
                <div className="flex flex-col">
                  <label className="text-[9px] uppercase text-slate-400 font-extrabold mb-1 tracking-wider">Default Vehicle</label>
                  <select 
                    value={wizardDefaultVehicleId} 
                    onChange={(e) => setWizardDefaultVehicleId(e.target.value)}
                    className="bg-slate-900 border border-slate-700 text-white rounded-lg py-1.5 px-3 text-xs w-[140px] focus:outline-none cursor-pointer font-bold"
                  >
                    {db.vehicles.map(v => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Days Loop */}
        <h3 className="text-base font-bold font-heading mb-4 text-slate-800 uppercase tracking-wide text-left">Itinerary Days ({wizardDefaultDays.length})</h3>
        <div className="flex flex-col gap-6 mb-8 text-left">
          {wizardDefaultDays.map((day, idx) => {
            const isFirst = idx === 0;
            const isLast = idx === wizardDefaultDays.length - 1;
            const cityHotels = db.hotels.filter(h => h.city.toLowerCase() === day.city.toLowerCase());
            const selectedActs = (day.activity_ids || [])
              .map(actId => db.activities.find(a => a.id === actId))
              .filter(Boolean);

            return (
              <div key={idx} className="premium-card bg-slate-50 border border-slate-200/60 rounded-3xl p-6 relative flex flex-col gap-6 shadow-sm hover:shadow-md transition duration-300">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/50 pb-4">
                  <div className="flex items-center gap-3">
                    <span className="bg-[#0f2942] text-white text-xs font-black px-3.5 py-1.5 rounded-xl shadow-sm tracking-wide font-heading">
                      Day {idx + 1}
                    </span>
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Destination City</span>
                      <select
                        value={day.city}
                        onChange={(e) => handlePackageDayFieldChange(idx, 'city', e.target.value)}
                        className="form-select text-xs py-1 px-3 bg-white border border-slate-250 rounded-lg outline-none font-bold text-slate-800 cursor-pointer"
                      >
                        {db.cities.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isFirst}
                      onClick={() => handlePackageMoveDay(idx, -1)}
                      className={`p-1.5 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-indigo-655 hover:border-slate-350 transition-all ${isFirst ? 'opacity-30 cursor-not-allowed' : ''}`}
                      title="Move Day Up"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      disabled={isLast}
                      onClick={() => handlePackageMoveDay(idx, 1)}
                      className={`p-1.5 rounded-lg bg-white border border-slate-200 text-slate-505 hover:text-indigo-655 hover:border-slate-355 transition-all ${isLast ? 'opacity-30 cursor-not-allowed' : ''}`}
                      title="Move Day Down"
                    >
                      ▼
                    </button>
                    <button
                      type="button"
                      disabled={wizardDefaultDays.length <= 1}
                      onClick={() => handlePackageDeleteDay(idx)}
                      className={`p-1.5 rounded-lg bg-red-50 border border-red-100 text-red-500 hover:bg-red-100 hover:text-red-700 transition ${wizardDefaultDays.length <= 1 ? 'opacity-30 cursor-not-allowed' : ''}`}
                      title="Delete Day"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] font-extrabold text-slate-455 uppercase tracking-wider">Day Itinerary Heading</label>
                      <input
                        type="text"
                        required
                        value={day.title || ''}
                        onChange={(e) => handlePackageDayFieldChange(idx, 'title', e.target.value)}
                        className="form-input text-xs font-semibold py-2 px-3 bg-white border border-slate-205 rounded-lg w-full"
                        placeholder="e.g. Guided tour of Kathmandu monuments"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] font-extrabold text-slate-455 uppercase tracking-wider">Day Itinerary Description</label>
                      <textarea
                        required
                        value={day.description || ''}
                        onChange={(e) => handlePackageDayFieldChange(idx, 'description', e.target.value)}
                        className="form-input text-xs py-2 px-3 bg-white border border-slate-205 rounded-lg w-full h-[80px] resize-none"
                        placeholder="e.g. Guided tour of Swayambhunath, Boudhanath Stupa, and Kathmandu Durbar Square."
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-extrabold text-slate-455 uppercase tracking-wider">Default Suggested Hotel</label>
                        <select
                          value={day.hotelId || 'no_stay'}
                          onChange={(e) => handlePackageDayFieldChange(idx, 'hotelId', e.target.value)}
                          className="form-select text-xs py-2 px-3 bg-white border border-slate-205 rounded-lg outline-none font-bold text-slate-800 cursor-pointer"
                        >
                          <option value="no_stay">No stay required (self-arranged)</option>
                          {cityHotels.map(h => (
                            <option key={h.id} value={h.id}>[{h.category}] {h.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-extrabold text-slate-455 uppercase tracking-wider">Default Meal Plan</label>
                        <select
                          value={day.meals || 'CP'}
                          onChange={(e) => handlePackageDayFieldChange(idx, 'meals', e.target.value)}
                          className="form-select text-xs py-2 px-3 bg-white border border-slate-205 rounded-lg outline-none font-bold text-slate-800 cursor-pointer"
                        >
                          <option value="CP">Breakfast (CP)</option>
                          <option value="MAP">Half Board (Breakfast + Dinner / MAP)</option>
                          <option value="AP">Full Board (AP)</option>
                          <option value="None">No Meals</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col justify-between gap-4">
                    {/* Transfer */}
                    <div className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col justify-between flex-1">
                      <div>
                        <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1.5">Transfer Sector Route</span>
                        {day.transfer_route && day.transfer_route !== 'local_sightseeing' ? (
                          <div className="bg-indigo-50/50 border border-indigo-100/50 rounded-xl p-2.5 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 truncate">
                              <Car size={14} className="text-indigo-600 shrink-0" />
                              <div className="flex flex-col min-w-0">
                                <span className="text-xs font-bold text-slate-800 truncate">
                                  {db.routes.find(r => r.key === day.transfer_route)?.name || day.transfer_route.replace(/_/g, ' ')}
                                </span>
                                <span className="text-[8px] text-slate-400 truncate">
                                  {db.routes.find(r => r.key === day.transfer_route)?.description}
                                </span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handlePackageDayFieldChange(idx, 'transfer_route', '')}
                              className="text-slate-400 hover:text-red-500 transition p-1"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-450 italic py-1">
                            No point-to-point transfer route (Default: Local Sightseeing).
                          </div>
                        )}
                      </div>
                      <div className="mt-2.5 flex gap-2">
                        <button
                          type="button"
                          onClick={() => setPackageTransferModal({ open: true, dayIndex: idx })}
                          className="btn btn-secondary btn-xs py-1 px-2.5 rounded-lg border border-slate-200 hover:bg-slate-100 flex items-center gap-1 text-[9px] font-bold"
                        >
                          <Plus size={10} />
                          <span>Select Route</span>
                        </button>
                        {day.transfer_route !== 'local_sightseeing' && (
                          <button
                            type="button"
                            onClick={() => handlePackageDayFieldChange(idx, 'transfer_route', 'local_sightseeing')}
                            className="btn btn-secondary btn-xs py-1 px-2.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-[9px] font-bold text-indigo-750"
                          >
                            Set Local Sightseeing
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Activities */}
                    <div className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col justify-between flex-1">
                      <div>
                        <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1.5">Sightseeing Activities ({selectedActs.length})</span>
                        {selectedActs.length > 0 ? (
                          <div className="flex flex-wrap gap-1 max-h-[80px] overflow-y-auto pr-1">
                            {selectedActs.map(act => (
                              <span key={act.id} className="bg-orange-50 text-orange-850 text-[9px] font-bold pl-2 pr-1 py-0.5 rounded-full border border-orange-100 flex items-center gap-0.5">
                                <span>{act.name}</span>
                                <button
                                  type="button"
                                  onClick={() => handlePackageToggleActivity(idx, act.id)}
                                  className="text-orange-400 hover:text-orange-700 transition p-0.5"
                                >
                                  ✕
                                </button>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-455 italic py-1">
                            No activities selected for this day.
                          </div>
                        )}
                      </div>
                      <div className="mt-2.5">
                        <button
                          type="button"
                          onClick={() => setPackageActivityModal({ open: true, dayIndex: idx })}
                          className="btn btn-secondary btn-xs py-1 px-2.5 rounded-lg border border-slate-200 hover:bg-slate-105 flex items-center gap-1 text-[9px] font-bold"
                        >
                          <Plus size={10} />
                          <span>Add Activity</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Builder actions row */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-6">
          <button
            type="button"
            onClick={handlePackageAddDay}
            className="btn btn-secondary btn-sm flex items-center gap-2 border-dashed border-2 hover:border-[#0f2942] rounded-xl font-bold text-slate-755"
          >
            <Plus size={15} />
            <span>Add New Itinerary Day</span>
          </button>
          
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (window.confirm("Discard changes and return to package list?")) {
                  setEditingDefaultWizardItinerary(false);
                }
              }}
              className="btn btn-secondary btn-sm rounded-xl font-bold"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                updateDBState({
                  ...db,
                  settings: {
                    ...db.settings,
                    wizard_default_days: wizardDefaultDays,
                    wizard_default_start_city: wizardDefaultStartCity,
                    wizard_default_end_city: wizardDefaultEndCity,
                    wizard_default_vehicle_id: wizardDefaultVehicleId,
                    wizard_default_hotel_category: wizardDefaultHotelCategory
                  }
                });
                alert("Default Wizard Itinerary Template saved successfully!");
                setEditingDefaultWizardItinerary(false);
              }}
              className="btn btn-primary btn-sm flex items-center gap-1.5 rounded-xl font-bold animate-pulse"
            >
              <Save size={15} />
              <span>Save Defaults Config</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  const handlePackageDayFieldChange = (dayIndex, field, value) => {
    // The admin package editor deliberately stays single-transfer -- flight
    // legs are a per-quote decision made in the builder, not baked into a
    // template. It still has to write through withDayTransfers so the
    // `transfers` array can't go stale against `transfer_route`; a package day
    // carrying both a leftover array and a newly picked route would price the
    // array and display the route.
    const applyChange = (day) => {
      let updatedDay = { ...day, [field]: value };
      if (field === 'city') {
        updatedDay.activity_ids = [];
        updatedDay = withDayTransfers(updatedDay, []);
      } else if (field === 'transfer_route') {
        updatedDay = withDayTransfers(updatedDay, value ? [value] : []);
      }
      return updatedDay;
    };

    if (editingPackage) {
      setEditingPackage(prev => {
        if (!prev) return prev;
        return { ...prev, days: prev.days.map((day, idx) => (idx === dayIndex ? applyChange(day) : day)) };
      });
    } else {
      setWizardDefaultDays(prev => prev.map((day, idx) => (idx === dayIndex ? applyChange(day) : day)));
    }
  };

  const handlePackageToggleActivity = (dayIndex, activityId) => {
    if (editingPackage) {
      setEditingPackage(prev => {
        if (!prev) return prev;
        const updatedDays = prev.days.map((day, idx) => {
          if (idx !== dayIndex) return day;
          const currentActs = day.activity_ids || [];
          const nextActs = currentActs.includes(activityId)
            ? currentActs.filter(id => id !== activityId)
            : [...currentActs, activityId];

          return { ...day, activity_ids: nextActs };
        });
        return { ...prev, days: updatedDays };
      });
    } else {
      setWizardDefaultDays(prev => {
        const updatedDays = prev.map((day, idx) => {
          if (idx !== dayIndex) return day;
          const currentActs = day.activity_ids || [];
          const nextActs = currentActs.includes(activityId)
            ? currentActs.filter(id => id !== activityId)
            : [...currentActs, activityId];

          return { ...day, activity_ids: nextActs };
        });
        return updatedDays;
      });
    }
  };

  const handlePackageAddDay = () => {
    if (editingPackage) {
      setEditingPackage(prev => {
        if (!prev) return prev;
        const lastDay = prev.days[prev.days.length - 1];
        const newDayIndex = prev.days.length + 1;
        const newDay = {
          day: newDayIndex,
          city: lastDay ? lastDay.city : (db.cities?.[0] || 'Kathmandu'),
          title: `Day ${newDayIndex} Itinerary`,
          description: `Enjoy sightseeing and activities in the city.`,
          transfer_route: '',
          is_sightseeing: false,
          activity_ids: []
        };
        return { ...prev, days: [...prev.days, newDay] };
      });
    } else {
      setWizardDefaultDays(prev => {
        const lastDay = prev[prev.length - 1];
        const newDayIndex = prev.length + 1;
        const newDay = {
          day: newDayIndex,
          city: lastDay ? lastDay.city : (db.cities?.[0] || 'Kathmandu'),
          title: `Day ${newDayIndex} Itinerary`,
          description: `Enjoy sightseeing and activities in the city.`,
          transfer_route: '',
          is_sightseeing: false,
          activity_ids: []
        };
        return [...prev, newDay];
      });
    }
  };

  const handlePackageDeleteDay = (dayIndex) => {
    if (editingPackage) {
      setEditingPackage(prev => {
        if (!prev) return prev;
        const filteredDays = prev.days.filter((_, idx) => idx !== dayIndex);
        const renumberedDays = filteredDays.map((day, idx) => ({
          ...day,
          day: idx + 1
        }));
        return { ...prev, days: renumberedDays };
      });
    } else {
      setWizardDefaultDays(prev => {
        const filteredDays = prev.filter((_, idx) => idx !== dayIndex);
        const renumberedDays = filteredDays.map((day, idx) => ({
          ...day,
          day: idx + 1
        }));
        return renumberedDays;
      });
    }
  };

  const handlePackageMoveDay = (dayIndex, direction) => {
    if (editingPackage) {
      setEditingPackage(prev => {
        if (!prev) return prev;
        const newDays = [...prev.days];
        const targetIndex = dayIndex + direction;
        if (targetIndex < 0 || targetIndex >= newDays.length) return prev;
        
        const temp = newDays[dayIndex];
        newDays[dayIndex] = newDays[targetIndex];
        newDays[targetIndex] = temp;
        
        const renumberedDays = newDays.map((day, idx) => ({
          ...day,
          day: idx + 1
        }));
        return { ...prev, days: renumberedDays };
      });
    } else {
      setWizardDefaultDays(prev => {
        const newDays = [...prev];
        const targetIndex = dayIndex + direction;
        if (targetIndex < 0 || targetIndex >= newDays.length) return prev;
        
        const temp = newDays[dayIndex];
        newDays[dayIndex] = newDays[targetIndex];
        newDays[targetIndex] = temp;
        
        const renumberedDays = newDays.map((day, idx) => ({
          ...day,
          day: idx + 1
        }));
        return renumberedDays;
      });
    }
  };

  useEffect(() => {
    if (db.settings) {
      setB2cMarkupInput(db.settings.b2c_markup_percent || db.settings.markup_percent || 15);
      setB2bMarkupInput(db.settings.b2b_markup_percent || 10);
      setTaxInput(db.settings.tax_percent || 13);
      setPosterUrlInput(db.settings.popup_poster_url || '');
      setPosterActiveInput(db.settings.popup_poster_active !== undefined ? db.settings.popup_poster_active : false);
      if (db.settings.wizard_default_destinations) {
        setWizardDestinations(db.settings.wizard_default_destinations);
        setAdminWizardDestinations(db.settings.wizard_default_destinations);
      }
      if (db.settings.wizard_default_start_city) {
        setWizardStartCity(db.settings.wizard_default_start_city);
        setAdminWizardStartCity(db.settings.wizard_default_start_city);
        setWizardDefaultStartCity(db.settings.wizard_default_start_city);
      }
      if (db.settings.wizard_default_end_city) {
        setWizardEndCity(db.settings.wizard_default_end_city);
        setAdminWizardEndCity(db.settings.wizard_default_end_city);
        setWizardDefaultEndCity(db.settings.wizard_default_end_city);
      }
      if (db.settings.wizard_default_vehicle_id) {
        setWizardDefaultVehicleId(db.settings.wizard_default_vehicle_id);
      }
      if (db.settings.wizard_default_hotel_category) {
        setWizardDefaultHotelCategory(db.settings.wizard_default_hotel_category);
      }
      if (db.settings.wizard_default_days) {
        setWizardDefaultDays(db.settings.wizard_default_days);
      } else {
        // Gorgeous default itinerary sequence loaded as fallback
        setWizardDefaultDays([
          { day: 1, city: 'Kathmandu', title: 'Kathmandu Arrival', description: 'Arrive in Kathmandu. Airport transfer to hotel.', hotelId: 'h-ktm-4', meals: 'CP', transfer_route: 'ktm_airport_transfer', is_sightseeing: false, activity_ids: [] },
          { day: 2, city: 'Kathmandu', title: 'Kathmandu Sightseeing', description: 'Explore historic Kathmandu heritage, ancient temples, and local markets.', hotelId: 'h-ktm-4', meals: 'CP', transfer_route: 'local_sightseeing', is_sightseeing: true, activity_ids: ['a-ktm-sightseeing'] },
          { day: 3, city: 'Pokhara', title: 'Drive to Pokhara', description: 'Scenic drive to Pokhara lakeside. Enjoy evening walking around lake.', hotelId: 'h-pok-4', meals: 'CP', transfer_route: 'ktm_to_pokhara', is_sightseeing: false, activity_ids: [] },
          { day: 4, city: 'Pokhara', title: 'Pokhara Sightseeing', description: 'Sunrise tour from Sarangkot, boating in Phewa Lake, and local stupa tour.', hotelId: 'h-pok-4', meals: 'CP', transfer_route: 'local_sightseeing', is_sightseeing: true, activity_ids: ['a-pok-boating'] },
          { day: 5, city: 'Kathmandu', title: 'Drive to Kathmandu & Depart', description: 'Scenic return drive to Kathmandu. Direct transfer to airport for final flight.', hotelId: '', meals: 'None', transfer_route: 'pokhara_to_ktm', is_sightseeing: false, activity_ids: [] }
        ]);
      }
    }
  }, [db.settings]);

  useEffect(() => {
    if (view === 'b2c' && db.settings?.popup_poster_active && db.settings?.popup_poster_url) {
      const shown = sessionStorage.getItem('nepal_quote_poster_shown');
      if (shown) return;
      // Hold the promo back until the visitor has actually seen the page.
      // Firing it immediately covered the hero before anything had rendered,
      // which reads as an interstitial ad and drives bounces. Shows on the
      // first scroll, or after a short delay if they never scroll.
      let done = false;
      const reveal = () => {
        if (done) return;
        done = true;
        setShowPosterPopup(true);
        sessionStorage.setItem('nepal_quote_poster_shown', 'true');
        window.removeEventListener('scroll', reveal);
      };
      const timer = window.setTimeout(reveal, 6000);
      window.addEventListener('scroll', reveal, { passive: true, once: true });
      return () => {
        window.clearTimeout(timer);
        window.removeEventListener('scroll', reveal);
      };
    }
  }, [view, db.settings]);

  // The undiscounted quote for a package in its default configuration
  // (2 adults, 1 double, default hotel tier + vehicle). This is the "calc"
  // figure shown struck through on the package cards, and the baseline the
  // special-offer discount is measured against. Shared by the cards and by
  // the package-open handlers so the two can never disagree.
  const getPackageDefaultQuote = (pkg) => calculateQuote({
    travelers: { adults: 2, cwb: 0, cnb: 0 },
    roomConfig: { single: 0, double: 1, extra_adult: 0, cwb: 0, cnb: 0 },
    itinerary: pkg.days.map(d => {
      const h = db.hotels.find(htl => htl.city.toLowerCase() === d.city.toLowerCase() && htl.category === pkg.default_hotel_category);
      return {
        ...d,
        hotelId: h ? h.id : '',
        meals: d.city.toLowerCase() === 'chitwan' ? 'AP' : 'CP',
        transfer_route: d.transfer_route !== undefined ? d.transfer_route : '',
        activity_ids: [...d.activity_ids]
      };
    }),
    vehicleId: pkg.default_vehicle_id,
    hotelsData: db.hotels,
    vehiclesData: db.vehicles,
    activitiesData: db.activities,
    routesData: db.routes || [],
    airportsData: db.airports || [],
    settings: {
      ...db.settings,
      markup_percent: view === 'b2b' ? 0 : undefined,
      b2b_admin_margin_percent: view === 'b2b' ? (db.settings.b2b_markup_percent || 10) : 0
    },
    startCity: 'Kathmandu',
    endCity: 'Kathmandu'
  });

  // One default quote per package, computed once per data/view change rather
  // than once per package on every render. The card display and the price sort
  // both read from here, which also makes sorting consistent with the prices
  // actually shown (the sort previously used a different B2B margin).
  const packageDefaultQuotes = useMemo(() => {
    const map = {};
    (db.packages || []).forEach(pkg => { map[pkg.id] = getPackageDefaultQuote(pkg); });
    return map;
  }, [db.packages, db.hotels, db.vehicles, db.activities, db.routes, db.settings, view]);

  // How much per pax the advertised offer price is below the calculated rate.
  // Zero when the package has no override, or when the override is at/above
  // the calculated price (never silently marks a package UP).
  const getPackageOfferDiscountPerPax = (pkg) => {
    if (!pkg?.starting_price_override) return 0;
    const calcPerPax = getPackageDefaultQuote(pkg).totals.perPerson;
    return Math.max(0, calcPerPax - Number(pkg.starting_price_override));
  };

  // Handle Preset Package Selection
  const handleSelectPresetPackage = (pkg, bypassLeadCheck = false) => {
    if (view === 'b2c' && !hasContactDetails && !bypassLeadCheck) {
      setPendingLeadAction({ type: 'customize', pkg });
      setShowLeadCaptureModal(true);
      return;
    }
    setCurrentPackageId(pkg.id);
    setOfferDiscountPerPax(getPackageOfferDiscountPerPax(pkg));
    setCustomPackageName(pkg.name);
    setSelectedHotelCategory(pkg.default_hotel_category || '4-Star');
    setSelectedVehicleId(pkg.default_vehicle_id || 'v-suv');
    setStartCity('Kathmandu');
    setEndCity('Kathmandu');

    // Generate custom itinerary based on package defaults
    const generatedItinerary = pkg.days.map(day => {
      // Find default hotel in city and category
      const cityHotels = db.hotels.filter(h => h.city.toLowerCase() === day.city.toLowerCase() && h.category === pkg.default_hotel_category);
      const defaultHotel = cityHotels.length > 0 ? cityHotels[0].id : '';

      // Rebuilt field-by-field rather than spread, so the day's transfers and
      // any flight leg have to be carried across explicitly -- dropping them
      // here would silently un-book the airport runs a package was priced with.
      return withDayTransfers({
        day: day.day,
        city: day.city,
        title: day.title,
        description: day.description,
        hotelId: defaultHotel,
        meals: day.city.toLowerCase() === 'chitwan' ? 'AP' : 'CP', // Chitwan defaults to Full Board
        is_sightseeing: day.is_sightseeing || false,
        activity_ids: [...day.activity_ids],
        travel_mode: day.travel_mode || '',
        flight_from_city: day.flight_from_city || '',
        flight_to_city: day.flight_to_city || ''
      }, getDayTransfers(day));
    });

    setCustomItinerary(generatedItinerary);
    setAgentMarkupInput(0); // Reset agent custom markup override for new trip
    if (view === 'b2b') {
      setB2bSubView('customize');
    } else {
      setB2cSubView('customize');
    }
  };

  // Handle Preset Package View & Direct Book Selection
  const handleViewAndBookPackage = (pkg, bypassLeadCheck = false) => {
    if (view === 'b2c' && !hasContactDetails && !bypassLeadCheck) {
      setPendingLeadAction({ type: 'view_book', pkg });
      setShowLeadCaptureModal(true);
      return;
    }
    setCurrentPackageId(pkg.id);
    setOfferDiscountPerPax(getPackageOfferDiscountPerPax(pkg));
    setCustomPackageName(pkg.name);
    setSelectedHotelCategory(pkg.default_hotel_category || '4-Star');
    setSelectedVehicleId(pkg.default_vehicle_id || 'v-suv');
    setStartCity('Kathmandu');
    setEndCity('Kathmandu');

    // Generate custom itinerary based on package defaults
    const generatedItinerary = pkg.days.map(day => {
      const cityHotels = db.hotels.filter(h => h.city.toLowerCase() === day.city.toLowerCase() && h.category === pkg.default_hotel_category);
      const defaultHotel = cityHotels.length > 0 ? cityHotels[0].id : '';

      // See the sibling handler above: transfers and flight legs must be
      // carried explicitly because this rebuilds the day rather than spreading.
      return withDayTransfers({
        day: day.day,
        city: day.city,
        title: day.title,
        description: day.description,
        hotelId: defaultHotel,
        meals: day.city.toLowerCase() === 'chitwan' ? 'AP' : 'CP',
        is_sightseeing: day.is_sightseeing || false,
        activity_ids: [...day.activity_ids],
        travel_mode: day.travel_mode || '',
        flight_from_city: day.flight_from_city || '',
        flight_to_city: day.flight_to_city || ''
      }, getDayTransfers(day));
    });

    setCustomItinerary(generatedItinerary);
    if (view === 'b2b') {
      setB2bSubView('customize');
    } else {
      setB2cSubView('customize');
    }
    // Land on the itinerary so the traveller can review the day-by-day plan,
    // inclusions and live price before committing. Previously this opened the
    // checkout form immediately, asking someone to confirm a six-figure
    // booking they had not yet been shown. "Book Vacation Now" in the pricing
    // sidebar is still one click away.
    if (typeof window !== 'undefined') window.scrollTo({ top: 0 });
  };

  // --- Room-Based Configuration Handlers ---
  const handleAddRoom = () => {
    setRooms(prev => [...prev, { adults: 2, children: [] }]);
  };

  const handleRemoveRoom = (roomIndex) => {
    if (rooms.length <= 1) return;
    setRooms(prev => prev.filter((_, i) => i !== roomIndex));
  };

  const handleRoomAdultsChange = (roomIndex, delta) => {
    setRooms(prev => prev.map((room, i) => {
      if (i !== roomIndex) return room;
      const newAdults = Math.max(1, Math.min(3, room.adults + delta));
      
      // Max 4 pax combined check
      if (delta > 0 && (newAdults + room.children.length > 4)) {
        window.alert("More than 4 people cannot be accommodated in 1 room");
        return room;
      }
      
      let newChildren = [...room.children];
      // If going to 3 adults, max 1 child
      if (newAdults >= 3 && newChildren.length > 1) {
        newChildren = newChildren.slice(0, 1);
      }
      return { ...room, adults: newAdults, children: newChildren };
    }));
  };

  const handleRoomChildrenChange = (roomIndex, delta) => {
    setRooms(prev => prev.map((room, i) => {
      if (i !== roomIndex) return room;
      const currentCount = room.children.length;
      const newCount = Math.max(0, currentCount + delta);
      
      // Max 4 pax combined check
      if (delta > 0 && (room.adults + newCount > 4)) {
        window.alert("More than 4 people cannot be accommodated in 1 room");
        return room;
      }
      // Also absolute max 2 children per room
      if (delta > 0 && newCount > 2) {
        return room;
      }

      let newChildren = [...room.children];
      if (newCount > currentCount) {
        // Add child with default age 8 and no explicit bed preference initially
        newChildren.push({ age: 8 });
      } else if (newCount < currentCount) {
        // Remove last child
        newChildren = newChildren.slice(0, newCount);
      }
      return { ...room, children: newChildren };
    }));
  };

  const handleChildAgeChange = (roomIndex, childIndex, age) => {
    setRooms(prev => prev.map((room, i) => {
      if (i !== roomIndex) return room;
      const newChildren = room.children.map((child, ci) => {
        if (ci !== childIndex) return child;
        return { ...child, age: Math.max(0, Math.min(11, Number(age) || 0)) };
      });
      return { ...room, children: newChildren };
    }));
  };

  const handleChildBedChange = (roomIndex, childIndex, withBed) => {
    setRooms(prev => prev.map((room, i) => {
      if (i !== roomIndex) return room;
      const newChildren = room.children.map((child, ci) => {
        if (ci !== childIndex) return child;
        return { ...child, withBed };
      });
      return { ...room, children: newChildren };
    }));
  };

  // Switch Hotel Tiers inside Customizer
  const handleCategoryChange = (newCategory) => {
    setSelectedHotelCategory(newCategory);
    
    // Automatically map hotels in the new category
    setCustomItinerary(prev => prev.map(day => {
      const cityHotelsInTier = db.hotels.filter(h => h.city.toLowerCase() === day.city.toLowerCase() && h.category === newCategory);
      return {
        ...day,
        hotelId: cityHotelsInTier.length > 0 ? cityHotelsInTier[0].id : day.hotelId
      };
    }));
  };

  // Day-wise edits in Customizer timeline
  const handleDayFieldChange = (dayIndex, field, value) => {
    setCustomItinerary(prev => {
      return prev.map((day, idx) => {
        if (idx !== dayIndex) return day;
        let updatedDay = { ...day, [field]: value };
        if (field === 'city') {
          const cityHotels = db.hotels.filter(h => h.city.toLowerCase() === value.toLowerCase() && h.category === selectedHotelCategory);
          updatedDay.hotelId = cityHotels.length > 0 ? cityHotels[0].id : '';
          updatedDay.activity_ids = [];
          // Changing the city invalidates every transfer on the day (they were
          // priced for the old city) and the flight leg it belonged to.
          updatedDay = withDayTransfers(updatedDay, []);
          updatedDay.travel_mode = '';
          updatedDay.flight_from_city = '';
        }
        return updatedDay;
      });
    });
  };

  // ---------------------------------------------------------------------
  // Day transfers (quote builder)
  // ---------------------------------------------------------------------
  // A day can hold several transfers. Flying between cities needs two on the
  // same day -- a drop at the origin airport and a pickup at the destination
  // -- and each must be removable on its own, because a client may arrange
  // one end themselves. Everything below goes through withDayTransfers() so
  // the legacy `transfer_route` string stays in step for saved quotes,
  // bookings, and the PDF/WhatsApp exports that still read it.

  const setDayTransfers = (dayIndex, nextTransfers, extraFields = {}) => {
    setCustomItinerary(prev => prev.map((day, idx) => (
      idx === dayIndex ? { ...withDayTransfers(day, nextTransfers), ...extraFields } : day
    )));
  };

  const handleRemoveDayTransfer = (dayIndex, transferIdx) => {
    setCustomItinerary(prev => prev.map((day, idx) => {
      if (idx !== dayIndex) return day;
      const next = getDayTransfers(day).filter((_, i) => i !== transferIdx);
      return withDayTransfers(day, next);
    }));
  };

  // Switches a city-transition day between driving and flying. Car mode is a
  // single point-to-point road transfer; flight mode swaps that for the two
  // airport runs and records which city they flew from, which is what the
  // itinerary text and the "airfare not included" note are built from.
  const handleSetTravelMode = (dayIndex, mode, fromCity, toCity) => {
    if (mode === TRAVEL_MODE_FLIGHT) {
      const legs = flightLegTransfers(db.routes || [], db.airports || [], fromCity, toCity);
      ensureRoutesExist(legs);
      setDayTransfers(dayIndex, legs, {
        travel_mode: TRAVEL_MODE_FLIGHT,
        flight_from_city: fromCity,
        flight_to_city: toCity,
      });
    } else {
      const roadKey = cityToCityRouteKey(fromCity, toCity);
      ensureRoutesExist([roadKey]);
      setDayTransfers(dayIndex, [roadKey], {
        travel_mode: TRAVEL_MODE_CAR,
        flight_from_city: '',
        flight_to_city: '',
      });
    }
  };

  // Re-adds one half of a flight leg the agent removed earlier.
  const handleRestoreFlightTransfer = (dayIndex, routeKey) => {
    setCustomItinerary(prev => prev.map((day, idx) => {
      if (idx !== dayIndex) return day;
      const current = getDayTransfers(day);
      if (current.includes(routeKey)) return day;
      // Keep drop-then-pickup order regardless of which one was restored.
      const dropKey = resolveAirportTransfer(db.routes || [], db.airports || [], day.flight_from_city).key;
      const next = routeKey === dropKey ? [routeKey, ...current] : [...current, routeKey];
      return withDayTransfers(day, next);
    }));
  };

  // A route the builder needs may not exist in the master list yet (a city
  // pair nobody has priced, or a newly added airport). Create it at ₹0 so it
  // shows up in Admin > Vehicles & Routes to be priced, rather than silently
  // costing nothing with no trace. Mirrors the same behaviour the wizard
  // already had for overland sectors.
  const ensureRoutesExist = (routeKeys) => {
    const missing = (routeKeys || []).filter(
      // routeExistsEitherWay, not an exact match: a sector already priced in
      // the opposite direction is priced for this one too, so creating a
      // second row for it would just be a duplicate to maintain.
      (key) => key && !routeExistsEitherWay(db.routes || [], key)
    );
    if (missing.length === 0) return;

    setDb(prev => {
      const stillMissing = missing.filter(
        (key) => !routeExistsEitherWay(prev.routes || [], key)
      );
      if (stillMissing.length === 0) return prev;

      const newRoutes = stillMissing.map((key) => ({
        key,
        name: routeLabelFromKey(key, prev.airports || []),
        description: `Private transfer: ${routeLabelFromKey(key, prev.airports || [])}.`,
      }));
      const updatedVehicles = (prev.vehicles || []).map((v) => {
        const rates = { ...v.route_rates };
        stillMissing.forEach((key) => { if (rates[key] === undefined) rates[key] = 0; });
        return { ...v, route_rates: rates };
      });
      const newDb = { ...prev, routes: [...(prev.routes || []), ...newRoutes], vehicles: updatedVehicles };
      localStorage.setItem('nepal_quote_routes_v2', JSON.stringify(newDb.routes));
      localStorage.setItem('nepal_quote_vehicles_v2', JSON.stringify(newDb.vehicles));
      return newDb;
    });
  };

  // Toggle Activity on a specific Day
  const handleToggleActivity = (dayIndex, activityId) => {
    setCustomItinerary(prev => {
      return prev.map((day, idx) => {
        if (idx !== dayIndex) return day;
        const currentActs = day.activity_ids || [];
        const nextActs = currentActs.includes(activityId)
          ? currentActs.filter(id => id !== activityId)
          : [...currentActs, activityId];

        return {
          ...day,
          activity_ids: nextActs
        };
      });
    });
  };

  // Add Day to Itinerary
  const handleAddDay = () => {
    setCustomItinerary(prev => {
      const newDayNum = prev.length + 1;
      const lastDay = prev[prev.length - 1];
      const defaultCity = lastDay ? lastDay.city : 'Kathmandu';
      const cityHotels = db.hotels.filter(h => h.city.toLowerCase() === defaultCity.toLowerCase() && h.category === selectedHotelCategory);
      
      return [
        ...prev,
        {
          day: newDayNum,
          city: defaultCity,
          title: `Explore ${defaultCity}`,
          description: `Custom activities and transfer around ${defaultCity}.`,
          hotelId: cityHotels.length > 0 ? cityHotels[0].id : '',
          meals: defaultCity.toLowerCase() === 'chitwan' ? 'AP' : 'CP',
          transfer_route: '',
          is_sightseeing: false,
          activity_ids: []
        }
      ];
    });
  };

  // Delete Day
  const handleDeleteDay = (dayIndex) => {
    if (customItinerary.length <= 1) return;
    setCustomItinerary(prev => {
      const filtered = prev.filter((_, idx) => idx !== dayIndex);
      return filtered.map((day, idx) => ({ ...day, day: idx + 1 }));
    });
  };

  // For loaded booking, retrieve its specific properties
  const currentBooking = db.bookings.find(b => b.id === lastBookingId);
  const activeB2bAdminMargin = (view === 'b2b' || (currentBooking && currentBooking.type === 'B2B'))
    ? (currentBooking && currentBooking.b2b_admin_margin_percent !== undefined ? currentBooking.b2b_admin_margin_percent : b2bMarkupInput)
    : 0;

  // Determine active markup percent based on view and custom agent override
  const activeMarkup = (view === 'b2b' || (currentBooking && currentBooking.type === 'B2B'))
    ? (currentBooking ? (currentBooking.markup_percent !== undefined ? currentBooking.markup_percent : 0) : agentMarkupInput)
    : (currentBooking ? (currentBooking.markup_percent !== undefined ? currentBooking.markup_percent : b2cMarkupInput) : b2cMarkupInput);

  // Calculate live numbers (INR).
  // Memoised because this walks the whole itinerary (hotels, routes, activities
  // per day) and previously re-ran on EVERY render of this ~9.5k-line
  // component -- including renders triggered by unrelated state such as
  // keystrokes in a form field.
  const quoteCalculation = useMemo(() => calculateQuote({
    rooms,
    itinerary: customItinerary,
    vehicleId: selectedVehicleId,
    hotelsData: db.hotels,
    vehiclesData: db.vehicles,
    activitiesData: db.activities,
    routesData: db.routes || [],
    airportsData: db.airports || [],
    settings: {
      markup_percent: activeMarkup,
      b2b_admin_margin_percent: activeB2bAdminMargin,
      tax_percent: taxInput,
      offer_discount_per_pax: offerDiscountPerPax
    },
    startCity,
    endCity
  }), [
    rooms, customItinerary, selectedVehicleId,
    db.hotels, db.vehicles, db.activities, db.routes, db.airports,
    activeMarkup, activeB2bAdminMargin, taxInput, offerDiscountPerPax,
    startCity, endCity
  ]);

  // ---------------------------------------------------------------------
  // Builder draft autosave
  // ---------------------------------------------------------------------
  // A five-day custom itinerary represents a lot of choices, and losing it to
  // an accidental refresh or a closed tab is painful. The in-progress build is
  // mirrored to localStorage and offered back on return. Draft-only: nothing
  // here is a booking, and confirming or abandoning clears it.
  // Drafts are an account feature: they're only kept for a signed-in user, and
  // the storage key is scoped to that user's id. This keeps a traveller's
  // in-progress plan off a shared or public computer once they sign out, and
  // stops two people using the same browser from seeing each other's build.
  const draftKey = currentUser ? `nepal_quote_builder_draft_${currentUser.id}` : null;
  const [resumableDraft, setResumableDraft] = useState(null);

  useEffect(() => {
    if (typeof window === 'undefined' || view === 'admin' || !draftKey) return;
    if (!customItinerary || customItinerary.length === 0) return;
    const draft = {
      savedAt: new Date().toISOString(),
      view,
      packageId: currentPackageId,
      packageName: customPackageName,
      itinerary: customItinerary,
      rooms,
      vehicleId: selectedVehicleId,
      hotelCategory: selectedHotelCategory,
      travelDate,
      startCity,
      endCity,
      offerDiscountPerPax
    };
    try {
      localStorage.setItem(draftKey, JSON.stringify(draft));
    } catch {
      // Quota or private-mode failures are non-fatal -- autosave is a
      // convenience, never a precondition for building a quote.
    }
  }, [
    draftKey,
    view, currentPackageId, customPackageName, customItinerary, rooms,
    selectedVehicleId, selectedHotelCategory, travelDate, startCity, endCity,
    offerDiscountPerPax
  ]);

  // On first load, surface any draft from a previous session.
  useEffect(() => {
    if (typeof window === 'undefined' || view === 'admin') return;
    // Signing out (draftKey -> null) must drop the prompt immediately. The
    // portal is a SPA, so there's no page reload to clear it for us, and a
    // banner naming the previous user's trip must not outlive their session.
    if (!draftKey) {
      setResumableDraft(null);
      return;
    }
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return;
      const draft = JSON.parse(raw);
      if (draft?.itinerary?.length) setResumableDraft(draft);
    } catch {
      localStorage.removeItem(draftKey);
    }
    // Runs on load and on sign-in (draftKey changes), not on every edit --
    // re-offering the draft mid-build would fight the user's current work.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey]);

  const clearBuilderDraft = () => {
    setResumableDraft(null);
    if (!draftKey) return;
    try { localStorage.removeItem(draftKey); } catch { /* no-op */ }
  };

  const resumeBuilderDraft = () => {
    const draft = resumableDraft;
    if (!draft) return;
    setCurrentPackageId(draft.packageId ?? null);
    setCustomPackageName(draft.packageName ?? 'My Nepal Tour Custom');
    setCustomItinerary(draft.itinerary || []);
    if (draft.rooms) setRooms(draft.rooms);
    if (draft.vehicleId) setSelectedVehicleId(draft.vehicleId);
    if (draft.hotelCategory) setSelectedHotelCategory(draft.hotelCategory);
    if (draft.travelDate) setTravelDate(draft.travelDate);
    if (draft.startCity) setStartCity(draft.startCity);
    if (draft.endCity) setEndCity(draft.endCity);
    setOfferDiscountPerPax(draft.offerDiscountPerPax || 0);
    if (view === 'b2b') setB2bSubView('customize'); else setB2cSubView('customize');
    setResumableDraft(null);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0 });
  };

  // ---------------------------------------------------------------------
  // Saved quotes -- builder side
  // ---------------------------------------------------------------------
  // The localStorage draft above is one implicit unfinished build, tied to
  // one browser. A saved quote is explicit and plural: an agent can keep a
  // proposal per client, come back to it on another device, send it, and
  // convert the one the client accepts. `activeQuoteId` tracks which saved
  // quote (if any) the builder is currently editing, so pressing Save again
  // updates that quote instead of piling up near-identical copies.
  const [activeQuoteId, setActiveQuoteId] = useState(null);
  const [quoteSaveState, setQuoteSaveState] = useState('idle'); // idle | saving | saved | error
  const [quoteBusyId, setQuoteBusyId] = useState(null);

  // Any edit after a save means what's on screen no longer matches what's on
  // the server, so the button goes back to offering a save.
  useEffect(() => {
    setQuoteSaveState((prev) => (prev === 'saved' ? 'idle' : prev));
    // Deliberately keyed to the builder inputs, not to quoteSaveState itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    customItinerary, rooms, selectedVehicleId, selectedHotelCategory,
    travelDate, startCity, endCity, customPackageName, offerDiscountPerPax,
    checkoutForm,
  ]);

  const buildQuotePayload = () => ({
    client_name: checkoutForm.clientName || '',
    client_email: checkoutForm.email || '',
    client_phone: checkoutForm.phone ? `${checkoutForm.countryCode} ${checkoutForm.phone}` : '',
    country_code: checkoutForm.countryCode || '+91',
    package_name: customPackageName || 'Untitled quote',
    travel_date: travelDate || '',
    total_price: Math.round(quoteCalculation.totals.total || 0),
    adults: travelers.adults,
    cwb: travelers.cwb,
    cnb: travelers.cnb,
    vehicle_id: selectedVehicleId || '',
    hotel_category: selectedHotelCategory || '',
    start_city: startCity || '',
    end_city: endCity || '',
    markup_percent: activeMarkup,
    b2b_admin_margin_percent: view === 'b2b' ? b2bMarkupInput : 0,
    offer_discount_per_pax: offerDiscountPerPax || 0,
    itinerary: customItinerary,
    rooms,
    passengers: Array.from({ length: travelers.adults }).map((_, i) => ({
      name: `${checkoutForm.clientName || 'Guest'} (Pax ${i + 1})`,
      type: 'Adult',
    })),
    notes: checkoutForm.notes || '',
  });

  const handleSaveQuote = async () => {
    if (!currentUser || !isApiSession()) {
      window.alert('Please sign in first — saved quotes are kept on your account so you can pick them up on any device.');
      return;
    }
    if (!customItinerary || customItinerary.length === 0) {
      window.alert('Add at least one day to the itinerary before saving this quote.');
      return;
    }

    setQuoteSaveState('saving');
    try {
      const payload = buildQuotePayload();
      const saved = activeQuoteId
        ? await updateQuote(activeQuoteId, payload)
        : await createQuote(payload);
      setActiveQuoteId(saved.id);
      setMyQuotes((prev) => {
        const rest = prev.filter((q) => q.id !== saved.id);
        return [saved, ...rest];
      });
      setQuoteSaveState('saved');
      // The saved quote is now the durable copy of this build, so the
      // browser-only draft has nothing left to protect.
      clearBuilderDraft();
    } catch (err) {
      console.error('Failed to save quote', err);
      setQuoteSaveState('error');
      window.alert(err.message || 'Could not save this quote. Please check your connection and try again.');
    }
  };

  // Load a saved quote back into the builder. Mirrors resumeBuilderDraft, but
  // sourced from the server rather than this browser's localStorage.
  const handleResumeQuote = (quote) => {
    setActiveQuoteId(quote.id);
    setCurrentPackageId(null);
    setCustomPackageName(quote.package_name || 'Untitled quote');
    setCustomItinerary(quote.itinerary || []);
    if (quote.rooms && quote.rooms.length) setRooms(quote.rooms);
    if (quote.vehicle_id) setSelectedVehicleId(quote.vehicle_id);
    if (quote.hotel_category) setSelectedHotelCategory(quote.hotel_category);
    if (quote.travel_date) setTravelDate(quote.travel_date);
    if (quote.start_city) setStartCity(quote.start_city);
    if (quote.end_city) setEndCity(quote.end_city);
    setOfferDiscountPerPax(quote.offer_discount_per_pax || 0);
    if (view === 'b2b' && quote.b2b_admin_margin_percent !== null && quote.b2b_admin_margin_percent !== undefined) {
      setB2bMarkupInput(quote.b2b_admin_margin_percent);
    }
    // client_phone is stored with the dialling code prefixed (as bookings are),
    // so split it back out for the two-field checkout form.
    const phone = quote.client_phone || '';
    const hasCode = phone.startsWith('+');
    setCheckoutForm({
      clientName: quote.client_name || '',
      email: quote.client_email || '',
      countryCode: hasCode ? phone.split(' ')[0] : (quote.country_code || '+91'),
      phone: hasCode ? phone.split(' ').slice(1).join(' ') : phone,
      notes: quote.notes || '',
    });
    setQuoteSaveState('saved');
    if (view === 'b2b') setB2bSubView('customize'); else setB2cSubView('customize');
    if (typeof window !== 'undefined') window.scrollTo({ top: 0 });
  };

  const handleMarkQuoteSent = async (quote) => {
    setQuoteBusyId(quote.id);
    try {
      const updated = await updateQuote(quote.id, { status: 'Sent' });
      setMyQuotes((prev) => prev.map((q) => (q.id === updated.id ? updated : q)));
    } catch (err) {
      console.error('Failed to mark quote as sent', err);
      window.alert(err.message || 'Could not update this quote.');
    } finally {
      setQuoteBusyId(null);
    }
  };

  const handleMarkQuoteLost = async (quote) => {
    if (!window.confirm(`Mark the quote for ${quote.client_name || 'this client'} as lost? You can still reopen and edit it afterwards.`)) return;
    setQuoteBusyId(quote.id);
    try {
      const updated = await updateQuote(quote.id, { status: 'Lost' });
      setMyQuotes((prev) => prev.map((q) => (q.id === updated.id ? updated : q)));
    } catch (err) {
      console.error('Failed to mark quote as lost', err);
      window.alert(err.message || 'Could not update this quote.');
    } finally {
      setQuoteBusyId(null);
    }
  };

  const handleDeleteQuote = async (quote) => {
    if (!window.confirm(`Delete the quote for ${quote.client_name || 'this client'}? This cannot be undone.`)) return;
    setQuoteBusyId(quote.id);
    try {
      await deleteQuote(quote.id);
      setMyQuotes((prev) => prev.filter((q) => q.id !== quote.id));
      if (activeQuoteId === quote.id) setActiveQuoteId(null);
    } catch (err) {
      console.error('Failed to delete quote', err);
      window.alert(err.message || 'Could not delete this quote.');
    } finally {
      setQuoteBusyId(null);
    }
  };

  // Turn an accepted quote into a real booking. The server does the work --
  // it creates the booking, recomputes commission from the stored total, and
  // marks the quote Won -- so nothing about the money is decided here.
  const handleConvertQuote = async (quote) => {
    if (!quote.client_name || !quote.client_email || !quote.client_phone) {
      window.alert("This quote needs the client's name, email and mobile number before it can be booked. Open it, fill those in on the booking form, and save it again.");
      return;
    }
    if (!window.confirm(`Convert this quote into a confirmed booking for ${quote.client_name}?`)) return;

    setQuoteBusyId(quote.id);
    try {
      const { booking, quote: updatedQuote } = await convertQuote(quote.id);
      setMyQuotes((prev) => prev.map((q) => (q.id === updatedQuote.id ? updatedQuote : q)));
      setMyBookings((prev) => (prev.some((b) => b.id === booking.id) ? prev : [booking, ...prev]));
      // Mirror into local `db` so the invoice screen can find the booking by
      // id, the same way a booking made through checkout is stored.
      updateDBState({ ...db, bookings: [booking, ...db.bookings.filter((b) => b.id !== booking.id)] });
      syncBookingToSheet(booking);
      if (activeQuoteId === quote.id) setActiveQuoteId(null);
      handleViewVoucher(booking);
    } catch (err) {
      console.error('Failed to convert quote', err);
      window.alert(err.message || 'Could not convert this quote into a booking.');
    } finally {
      setQuoteBusyId(null);
    }
  };

  const hasNoStayTransfer = quoteCalculation.dayWiseBreakdown.some(day =>
    (!day.hotelId || day.hotelId === 'no_stay') && day.transportRoute
  );

  const b2bDisplayFactor = view === 'b2b' ? (1 + b2bMarkupInput / 100) : 1;

  // Handle Checkout submission
  const handleConfirmCheckout = async (e) => {
    e.preventDefault();
    if (!checkoutForm.clientName || !checkoutForm.email || !checkoutForm.phone) {
      window.alert("Please fill in all mandatory fields (Name, Email, and Mobile Number).");
      return;
    }

    const cleanPhone = checkoutForm.phone.replace(/\D/g, '');
    if (checkoutForm.countryCode === '+91' && cleanPhone.length < 10) {
      window.alert("For India, the mobile number must be at least 10 digits long.");
      return;
    }

    // B2B bookings require a real logged-in agent -- the server rejects an
    // unauthenticated/non-b2b POST, so check here too for a clear message
    // instead of a confusing failed-request alert.
    const isB2B = view === 'b2b';
    if (isB2B && (!currentUser || currentUser.role !== 'b2b')) {
      window.alert("Please log in with your B2B Partner Agent account before confirming a booking.");
      return;
    }

    const fullPhoneNumber = `${checkoutForm.countryCode} ${checkoutForm.phone}`;

    // eslint-disable-next-line
    const newId = `qt-${Date.now().toString().slice(-4)}`;
    const totalPrice = Math.round(quoteCalculation.totals.total);
    let newBooking = {
      id: newId,
      client_name: checkoutForm.clientName,
      email: checkoutForm.email,
      phone: fullPhoneNumber,
      travel_date: travelDate,
      adults: travelers.adults,
      cwb: travelers.cwb,
      cnb: travelers.cnb,
      total_price: totalPrice,
      package_name: customPackageName,
      status: 'Confirmed',
      created_at: new Date().toISOString(),
      itinerary_summary: `${customItinerary.length} Nights, ${travelers.adults} Adults, ${travelers.cwb} CWB, ${travelers.cnb} CNB, ${selectedHotelCategory} Hotels.`,
      passengers: Array.from({ length: travelers.adults }).map((_, i) => ({ name: `${checkoutForm.clientName} (Pax ${i+1})`, type: 'Adult' })),
      type: isB2B ? 'B2B' : 'B2C',
      // agent_id/agent_commission are assigned server-side, from the real
      // logged-in agent -- never trusted from the client (fixes the old
      // hardcoded 'AGT-9021' bug). Left off here; filled in below from the
      // server's response once the booking is actually persisted.
      itinerary: customItinerary,
      vehicleId: selectedVehicleId,
      hotelCategory: selectedHotelCategory,
      rooms: rooms,
      startCity: startCity,
      endCity: endCity,
      notes: checkoutForm.notes || '',
      markup_percent: activeMarkup,
      b2b_admin_margin_percent: isB2B ? b2bMarkupInput : 0,
      b2b_white_label: isB2B ? { ...b2bProfile } : null
    };

    try {
      // Persist to the real backend (Turso) -- this is what makes a
      // booking permanent instead of living only in this browser's
      // localStorage. Sending our own `id` keeps it in sync with the
      // optimistic local state below.
      //
      // If this build came from a saved quote, book it *through* that quote
      // rather than alongside it: save the final edits, then convert. That
      // keeps one booking instead of two records for the same trip, and
      // leaves the quote marked Won with `converted_booking_id` pointing at
      // the booking -- which is what makes win rates measurable.
      if (activeQuoteId) {
        await updateQuote(activeQuoteId, buildQuotePayload());
        const { booking, quote: wonQuote } = await convertQuote(activeQuoteId);
        newBooking = { ...newBooking, ...booking };
        setMyQuotes((prev) => prev.map((q) => (q.id === wonQuote.id ? wonQuote : q)));
        setActiveQuoteId(null);
      } else {
        const serverBooking = await createBooking(newBooking);
        newBooking = { ...newBooking, ...serverBooking };
      }
    } catch (err) {
      console.error('Failed to save booking to the server', err);
      window.alert(
        (err && err.message) ||
        "Could not reach the server to save this booking. It has been recorded locally only -- please retry when back online."
      );
      // Fall through and still record it locally so the traveler/agent
      // isn't blocked -- matches pre-existing offline-friendly behavior.
    }

    const updatedBookings = [newBooking, ...db.bookings];
    updateDBState({ ...db, bookings: updatedBookings });
    setMyBookings((prev) => [newBooking, ...prev]);
    // Sync Booking to Google Sheets
    syncBookingToSheet(newBooking);

    setLastBookingId(newBooking.id);
    setShowCheckoutModal(false);
    // The build is now a real booking -- the draft has served its purpose.
    clearBuilderDraft();
    if (isB2B) {
      setB2bSubView('invoice');
    } else {
      setB2cSubView('invoice');
    }
  };

  const handleViewVoucher = (booking) => {
    setLastBookingId(booking.id);
    if (booking.itinerary) {
      setCustomItinerary(booking.itinerary);
      setSelectedVehicleId(booking.vehicleId);
      setSelectedHotelCategory(booking.hotelCategory);
      setRooms(booking.rooms || [{ adults: booking.adults || 2, children: [] }]);
      setStartCity(booking.startCity || 'Kathmandu');
      setEndCity(booking.endCity || 'Kathmandu');
      setTravelDate(booking.travel_date);
      setCustomPackageName(booking.package_name);
      setCheckoutForm({
        clientName: booking.client_name,
        email: booking.email,
        phone: booking.phone.split(' ').slice(1).join(' ') || booking.phone,
        countryCode: booking.phone.startsWith('+') ? booking.phone.split(' ')[0] : '+91',
        notes: booking.notes || ''
      });
    } else {
      // Fallback for seed bookings if they don't have full JSON itinerary:
      const stdPkg = db.packages.find(p => p.name === booking.package_name);
      if (stdPkg) {
        const defaultItin = stdPkg.days.map(d => {
          const h = db.hotels.find(htl => htl.city.toLowerCase() === d.city.toLowerCase() && htl.category === stdPkg.default_hotel_category);
          return {
            ...d,
            hotelId: h ? h.id : '',
            meals: d.city.toLowerCase() === 'chitwan' ? 'AP' : 'CP',
            transfer_route: d.transfer_route !== undefined ? d.transfer_route : '',
            activity_ids: [...d.activity_ids]
          };
        });
        setCustomItinerary(defaultItin);
        setSelectedVehicleId(stdPkg.default_vehicle_id || 'v-suv');
        setSelectedHotelCategory(stdPkg.default_hotel_category || '4-Star');
      } else {
        setCustomItinerary([]);
      }
      setRooms([{ adults: booking.adults || 2, children: [] }]);
      setStartCity('Kathmandu');
      setEndCity('Kathmandu');
      setTravelDate(booking.travel_date);
      setCustomPackageName(booking.package_name);
      setCheckoutForm({
        clientName: booking.client_name,
        email: booking.email,
        phone: booking.phone.split(' ').slice(1).join(' ') || booking.phone,
        countryCode: booking.phone.startsWith('+') ? booking.phone.split(' ')[0] : '+91',
        notes: booking.notes || ''
      });
    }
    
    // Show the voucher inside whichever portal the viewer is already in.
    // This used to switch portal based on the booking's type -- in practice a
    // B2B booking is only ever listed on the agent dashboard and a B2C one
    // only in the traveller's My Bookings, so it always resolved to the
    // portal you were on anyway. But it wrote the hash to do it, which meant
    // any mismatch would silently move someone between portals. Portals never
    // navigate to each other, so the destination comes from the current view.
    if (view === 'b2b') {
      setB2bSubView('invoice');
    } else {
      setB2cSubView('invoice');
    }

    // The markup shown on the voucher is a property of the booking itself,
    // not of the portal displaying it, so it still keys off booking.type.
    if (booking.type === 'B2B') {
      setAgentMarkupInput(booking.markup_percent !== undefined ? booking.markup_percent : 0);
    } else {
      setB2cMarkupInput(booking.markup_percent !== undefined ? booking.markup_percent : (db.settings.b2c_markup_percent || 15));
    }
  };

  // --- ADMIN FUNCTIONALITIES ---

  const handleSaveSettings = () => {
    updateDBState({
      ...db,
      settings: {
        ...db.settings,
        markup_percent: Number(b2cMarkupInput), // Fallback
        b2c_markup_percent: Number(b2cMarkupInput),
        b2b_markup_percent: Number(b2bMarkupInput),
        tax_percent: Number(taxInput),
        exchange_rate: 1.0,
        popup_poster_url: posterUrlInput,
        popup_poster_active: posterActiveInput,
        wizard_default_destinations: adminWizardDestinations,
        wizard_default_start_city: adminWizardStartCity,
        wizard_default_end_city: adminWizardEndCity
      }
    });
    alert("System settings and defaults updated!");
  };

  const handleDeleteBooking = (id) => {
    if (confirm("Delete this booking/quote inquiry?")) {
      const updated = db.bookings.filter(b => b.id !== id);
      updateDBState({ ...db, bookings: updated });
    }
  };

  // --- EXCEL IMPORT/EXPORT FUNCTIONS ---

  const exportHotels = async () => {
    const XLSX = await requireXLSX();
    if (!XLSX) return;
    
    const data = db.hotels.map(h => ({
      "ID": h.id,
      "Name": h.name,
      "City": h.city,
      "Category": h.category,
      "Description": h.description || "",
      
      "Single_CP": h.rates?.single?.CP || 0,
      "Single_MAP": h.rates?.single?.MAP || 0,
      "Single_AP": h.rates?.single?.AP || 0,
      
      "Double_CP": h.rates?.double?.CP || 0,
      "Double_MAP": h.rates?.double?.MAP || 0,
      "Double_AP": h.rates?.double?.AP || 0,
      
      "ExtraAdult_CP": h.rates?.extra_adult?.CP || 0,
      "ExtraAdult_MAP": h.rates?.extra_adult?.MAP || 0,
      "ExtraAdult_AP": h.rates?.extra_adult?.AP || 0,
      
      "CWB_CP": h.rates?.cwb?.CP || 0,
      "CWB_MAP": h.rates?.cwb?.MAP || 0,
      "CWB_AP": h.rates?.cwb?.AP || 0,
      
      "CNB_CP": h.rates?.cnb?.CP || 0,
      "CNB_MAP": h.rates?.cnb?.MAP || 0,
      "CNB_AP": h.rates?.cnb?.AP || 0
    }));
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Hotels");
    XLSX.writeFile(wb, "nepal_hotels_master.xlsx");
  };

  const importHotels = async (e) => {
    const XLSX = await requireXLSX();
    if (!XLSX) return;
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(sheet);
        
        let updatedCount = 0;
        let insertedCount = 0;
        const newHotels = [...db.hotels];
        
        json.forEach(row => {
          const id = row["ID"] ? String(row["ID"]).trim() : "";
          const name = row["Name"] ? String(row["Name"]).trim() : "";
          const city = row["City"] ? String(row["City"]).trim() : "";
          const category = row["Category"] ? String(row["Category"]).trim() : "";
          const description = row["Description"] ? String(row["Description"]).trim() : "";
          
          if (!name || !city || !category) return;
          
          const rates = {
            single: {
              CP: Number(row["Single_CP"]) || 0,
              MAP: Number(row["Single_MAP"]) || 0,
              AP: Number(row["Single_AP"]) || 0
            },
            double: {
              CP: Number(row["Double_CP"]) || 0,
              MAP: Number(row["Double_MAP"]) || 0,
              AP: Number(row["Double_AP"]) || 0
            },
            extra_adult: {
              CP: Number(row["ExtraAdult_CP"]) || 0,
              MAP: Number(row["ExtraAdult_MAP"]) || 0,
              AP: Number(row["ExtraAdult_AP"]) || 0
            },
            cwb: {
              CP: Number(row["CWB_CP"]) || 0,
              MAP: Number(row["CWB_MAP"]) || 0,
              AP: Number(row["CWB_AP"]) || 0
            },
            cnb: {
              CP: Number(row["CNB_CP"]) || 0,
              MAP: Number(row["CNB_MAP"]) || 0,
              AP: Number(row["CNB_AP"]) || 0
            }
          };
          
          const existingIdx = id ? newHotels.findIndex(h => h.id === id) : -1;
          
          if (existingIdx > -1) {
            newHotels[existingIdx] = {
              ...newHotels[existingIdx],
              name,
              city,
              category,
              description,
              rates
            };
            updatedCount++;
          } else {
            const generatedId = id || `h-${city.slice(0,3).toLowerCase()}-${Date.now()}-${Math.floor(Math.random()*1000)}`;
            newHotels.push({
              id: generatedId,
              name,
              city,
              category,
              description,
              rates
            });
            insertedCount++;
          }
        });
        
        updateDBState({ ...db, hotels: newHotels });
        alert(`Import Successful!\nProcessed Hotels Master.\nUpdated: ${updatedCount}\nCreated: ${insertedCount}`);
      } catch (err) {
        console.error(err);
        alert("Failed to parse the Excel file. Please ensure it follows the correct template.");
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  };

  const exportActivities = async () => {
    const XLSX = await requireXLSX();
    if (!XLSX) return;
    
    const data = db.activities.map(a => ({
      "ID": a.id,
      "Name": a.name,
      "City": a.city,
      "Description": a.description || "",
      "Price_Adult": a.price_adult || 0,
      "Price_Child": a.price_child || 0
    }));
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Activities");
    XLSX.writeFile(wb, "nepal_activities_master.xlsx");
  };

  const importActivities = async (e) => {
    const XLSX = await requireXLSX();
    if (!XLSX) return;
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(sheet);
        
        let updatedCount = 0;
        let insertedCount = 0;
        const newActivities = [...db.activities];
        
        json.forEach(row => {
          const id = row["ID"] ? String(row["ID"]).trim() : "";
          const name = row["Name"] ? String(row["Name"]).trim() : "";
          const city = row["City"] ? String(row["City"]).trim() : "";
          const description = row["Description"] ? String(row["Description"]).trim() : "";
          const price_adult = Number(row["Price_Adult"]) || 0;
          const price_child = Number(row["Price_Child"]) || 0;
          
          if (!name || !city) return;
          
          const existingIdx = id ? newActivities.findIndex(a => a.id === id) : -1;
          
          if (existingIdx > -1) {
            newActivities[existingIdx] = {
              ...newActivities[existingIdx],
              name,
              city,
              description,
              price_adult,
              price_child
            };
            updatedCount++;
          } else {
            const generatedId = id || `a-${city.slice(0,3).toLowerCase()}-${Date.now()}-${Math.floor(Math.random()*1000)}`;
            newActivities.push({
              id: generatedId,
              name,
              city,
              description,
              price_adult,
              price_child
            });
            insertedCount++;
          }
        });
        
        updateDBState({ ...db, activities: newActivities });
        alert(`Import Successful!\nProcessed Activities Master.\nUpdated: ${updatedCount}\nCreated: ${insertedCount}`);
      } catch (err) {
        console.error(err);
        alert("Failed to parse the Excel file. Please ensure it follows the correct template.");
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  };

  // Exported in the SAME orientation as the on-screen rate sheet: transfers
  // down the rows, vehicles across the columns. It used to come out
  // transposed -- a row per vehicle with a `Route_<key>` column each -- so the
  // spreadsheet and the screen disagreed about which way round the data was,
  // and the columns were raw keys rather than names anyone could read.
  //
  // Two sheets, because the two things have different shapes: the matrix, and
  // the per-vehicle values (capacity, full-day sightseeing) that are not
  // per-transfer.
  const exportVehicles = async () => {
    const XLSX = await requireXLSX();
    if (!XLSX) return;

    const vehicles = db.vehicles || [];
    const sheetRoutes = (db.routes || []).filter(r => r.key !== LOCAL_SIGHTSEEING_KEY);

    const rateRows = sheetRoutes.map(route => {
      const row = {
        "Transfer": route.name,
        "Key": route.key,
        "Category": routeCategory(route.key) === 'airport' ? 'Airport' : 'Inter-city',
      };
      vehicles.forEach(v => {
        // rateForRoute so a sector priced only in the opposite direction
        // exports the figure actually charged rather than a misleading 0.
        row[v.name] = rateForRoute(v, route.key) ?? 0;
      });
      row["Description"] = route.description || "";
      return row;
    });

    const vehicleRows = vehicles.map(v => ({
      "ID": v.id,
      "Name": v.name,
      "Capacity": v.capacity || 0,
      "Full_Day_Sightseeing_Rate": v.daily_sightseeing_rate || 0,
      "Description": v.description || "",
    }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rateRows), "Transfer Rates");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(vehicleRows), "Vehicles");
    XLSX.writeFile(wb, "nepal_transfer_rates.xlsx");
  };

  // Reads back what exportVehicles writes: the "Transfer Rates" matrix keyed
  // by route, with a column per vehicle NAME, plus an optional "Vehicles"
  // sheet for the per-vehicle values. Also still accepts the old transposed
  // layout (a row per vehicle with Route_<key> columns) so a spreadsheet
  // someone exported before this change keeps importing.
  const importVehicles = async (e) => {
    const XLSX = await requireXLSX();
    if (!XLSX) return;
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const workbook = XLSX.read(new Uint8Array(evt.target.result), { type: 'array' });
        const sheetJson = (name) => {
          const ws = workbook.Sheets[name];
          return ws ? XLSX.utils.sheet_to_json(ws) : null;
        };

        const newVehicles = [...(db.vehicles || [])];
        const newRoutes = [...(db.routes || [])];
        let ratesSet = 0, routesAdded = 0, vehiclesUpdated = 0, vehiclesCreated = 0;
        const unknownColumns = new Set();

        const findVehicleIdx = ({ id, name }) => {
          if (id) {
            const byId = newVehicles.findIndex(v => v.id === id);
            if (byId > -1) return byId;
          }
          if (!name) return -1;
          const target = String(name).trim().toLowerCase();
          return newVehicles.findIndex(v => String(v.name).trim().toLowerCase() === target);
        };

        // --- Sheet: Vehicles (identity + full-day sightseeing) -------------
        const vehicleRows = sheetJson('Vehicles') || [];
        vehicleRows.forEach(row => {
          const id = row["ID"] ? String(row["ID"]).trim() : "";
          const name = row["Name"] ? String(row["Name"]).trim() : "";
          if (!name) return;
          const patch = {
            name,
            capacity: Number(row["Capacity"]) || 0,
            description: row["Description"] ? String(row["Description"]).trim() : "",
          };
          const sightseeing = row["Full_Day_Sightseeing_Rate"] ?? row["Daily_Sightseeing_Rate"];
          if (sightseeing !== undefined) patch.daily_sightseeing_rate = Number(sightseeing) || 0;

          const idx = findVehicleIdx({ id, name });
          if (idx > -1) {
            newVehicles[idx] = { ...newVehicles[idx], ...patch };
            vehiclesUpdated++;
          } else {
            newVehicles.push({
              id: id || `v-${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}`,
              route_rates: {},
              daily_sightseeing_rate: 0,
              ...patch,
            });
            vehiclesCreated++;
          }
        });

        // --- Sheet: Transfer Rates (the matrix) ----------------------------
        const rateRows = sheetJson('Transfer Rates')
          || (vehicleRows.length ? [] : XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]));

        const isLegacyLayout = rateRows.some(r => Object.keys(r).some(k => k.startsWith('Route_')));

        if (isLegacyLayout) {
          // Old transposed export: one row per vehicle.
          rateRows.forEach(row => {
            const name = row["Name"] ? String(row["Name"]).trim() : "";
            if (!name) return;
            const idx = findVehicleIdx({ id: row["ID"] ? String(row["ID"]).trim() : "", name });
            if (idx < 0) return;
            const rates = { ...newVehicles[idx].route_rates };
            Object.keys(row).forEach(col => {
              if (!col.startsWith('Route_')) return;
              const key = col.slice(6);
              rates[key] = Number(row[col]) || 0;
              ratesSet++;
              if (!newRoutes.some(r => r.key === key)) {
                newRoutes.push({ key, name: routeLabelFromKey(key, db.airports || []), description: '' });
                routesAdded++;
              }
            });
            newVehicles[idx] = { ...newVehicles[idx], route_rates: rates };
          });
        } else {
          rateRows.forEach(row => {
            const key = row["Key"] ? String(row["Key"]).trim() : "";
            const label = row["Transfer"] ? String(row["Transfer"]).trim() : "";
            if (!key && !label) return;

            // Key is the stable identifier; fall back to matching the name so
            // a hand-typed sheet without the Key column still works.
            let route = key
              ? newRoutes.find(r => r.key === key)
              : newRoutes.find(r => String(r.name).trim().toLowerCase() === label.toLowerCase());

            if (!route) {
              const newKey = key || label.toLowerCase().replace(/[^a-z0-9]+/g, '_');
              route = {
                key: newKey,
                name: label || routeLabelFromKey(newKey, db.airports || []),
                description: row["Description"] ? String(row["Description"]).trim() : '',
              };
              newRoutes.push(route);
              routesAdded++;
            } else if (label && label !== route.name) {
              route.name = label;
            }

            Object.keys(row).forEach(col => {
              if (["Transfer", "Key", "Category", "Description"].includes(col)) return;
              const idx = findVehicleIdx({ name: col });
              if (idx < 0) { unknownColumns.add(col); return; }
              newVehicles[idx] = {
                ...newVehicles[idx],
                route_rates: { ...newVehicles[idx].route_rates, [route.key]: Number(row[col]) || 0 },
              };
              ratesSet++;
            });
          });
        }

        updateDBState({ ...db, vehicles: newVehicles, routes: newRoutes });

        const warn = unknownColumns.size
          ? `\n\nIgnored ${unknownColumns.size} column(s) that match no vehicle: ${[...unknownColumns].join(', ')}`
          : '';
        alert(
          `Import successful.\n\nRates set: ${ratesSet}\nTransfers added: ${routesAdded}\n` +
          `Vehicles updated: ${vehiclesUpdated}\nVehicles created: ${vehiclesCreated}${warn}`
        );
      } catch (err) {
        console.error(err);
        alert("Failed to read that spreadsheet. Export a fresh copy to see the expected layout, edit it, then import it back.");
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  };

  // Hotel inline edit helper
  const handleStartEditHotel = (h) => {
    setEditingHotelId(h.id);
    // Deep clone rates structure to prevent mutating directly
    setHotelEditState(JSON.parse(JSON.stringify(h)));
  };

  const handleSaveHotelEdit = () => {
    const updatedHotels = db.hotels.map(h => h.id === editingHotelId ? hotelEditState : h);
    updateDBState({ ...db, hotels: updatedHotels });
    setEditingHotelId(null);
  };

  const handleDeleteHotel = (hotelId) => {
    if (!window.confirm("Are you sure you want to delete this hotel?")) return;
    const updatedHotels = db.hotels.filter(h => h.id !== hotelId);
    updateDBState({ ...db, hotels: updatedHotels });
  };

  const handleNestedHotelRateChange = (paxCategory, mealPlan, val) => {
    setHotelEditState(prev => {
      const updatedRates = { ...prev.rates };
      updatedRates[paxCategory] = {
        ...updatedRates[paxCategory],
        [mealPlan]: Number(val)
      };
      return { ...prev, rates: updatedRates };
    });
  };

  const handleNewHotelNestedRateChange = (paxCategory, mealPlan, val) => {
    setNewHotelForm(prev => {
      const updatedRates = { ...prev.rates };
      updatedRates[paxCategory] = {
        ...updatedRates[paxCategory],
        [mealPlan]: Number(val)
      };
      return { ...prev, rates: updatedRates };
    });
  };

  const handleAddNewHotel = (e) => {
    e.preventDefault();
    const newId = `h-${newHotelForm.city.substring(0, 3).toLowerCase()}-${Date.now().toString().slice(-4)}`;
    const freshHotel = {
      id: newId,
      name: newHotelForm.name,
      city: newHotelForm.city,
      category: newHotelForm.category,
      description: newHotelForm.description || 'Description pending.',
      rates: JSON.parse(JSON.stringify(newHotelForm.rates))
    };

    updateDBState({ ...db, hotels: [...db.hotels, freshHotel] });
    setShowAddHotelModal(false);
    
    // Reset form
    setNewHotelForm({
      name: '', city: 'Kathmandu', category: '4-Star', description: '',
      rates: {
        single:      { CP: 5000, MAP: 6000, AP: 7000 },
        double:      { CP: 6000, MAP: 8000, AP: 10000 },
        extra_adult: { CP: 1500, MAP: 2500, AP: 3500 },
        cwb:         { CP: 1200, MAP: 2000, AP: 2800 },
        cnb:         { CP: 500,  MAP: 1000, AP: 1500 }
      }
    });
  };

  // Activity rate edit helpers
  const handleStartEditActivity = (act) => {
    setEditingActivityId(act.id);
    // Defaults so an activity created before per-vehicle pricing existed edits
    // cleanly rather than binding inputs to undefined.
    setActivityEditState({
      pricing_mode: 'per_person',
      vehicle_rates: {},
      ...act,
      vehicle_rates: { ...(act.vehicle_rates || {}) },
    });
  };

  const handleSaveActivityEdit = () => {
    if (!activityEditState.name || !String(activityEditState.name).trim()) {
      window.alert('Activity name is required.');
      return;
    }
    const isPerVehicle = activityEditState.pricing_mode === 'per_vehicle';
    // Switching an activity to per-vehicle clears the per-head prices, so a
    // stale ticket fare cannot sit behind it looking meaningful. Switching
    // back clears the vehicle rates for the same reason.
    const cleaned = {
      ...activityEditState,
      price_adult: isPerVehicle ? 0 : Number(activityEditState.price_adult) || 0,
      price_child: isPerVehicle ? 0 : Number(activityEditState.price_child) || 0,
      pricing_mode: isPerVehicle ? 'per_vehicle' : 'per_person',
      vehicle_rates: isPerVehicle ? { ...(activityEditState.vehicle_rates || {}) } : {},
    };
    const updatedActs = db.activities.map(a => a.id === editingActivityId ? cleaned : a);
    updateDBState({ ...db, activities: updatedActs });
    setEditingActivityId(null);
  };

  const handleDeleteActivity = (activityId) => {
    if (!window.confirm("Are you sure you want to delete this activity?")) return;
    const updatedActs = db.activities.filter(a => a.id !== activityId);
    updateDBState({ ...db, activities: updatedActs });
  };

  const handleAddNewActivity = (e) => {
    e.preventDefault();
    const newId = `a-${newActivityForm.city.substring(0, 3).toLowerCase()}-${Date.now().toString().slice(-4)}`;
    const isPerVehicle = newActivityForm.pricing_mode === 'per_vehicle';
    const freshAct = {
      id: newId,
      name: newActivityForm.name,
      city: newActivityForm.city,
      description: newActivityForm.description || 'Description pending.',
      // A per-vehicle activity never bills per head, so the ticket prices are
      // stored as zero rather than left at the form's defaults, where they
      // would look like a real (but unused) fare.
      price_adult: isPerVehicle ? 0 : Number(newActivityForm.price_adult),
      price_child: isPerVehicle ? 0 : Number(newActivityForm.price_child),
      pricing_mode: isPerVehicle ? 'per_vehicle' : 'per_person',
      vehicle_rates: isPerVehicle ? { ...(newActivityForm.vehicle_rates || {}) } : {},
    };

    updateDBState({ ...db, activities: [...db.activities, freshAct] });
    setShowAddActivityModal(false);
    setNewActivityForm({
      name: '', city: 'Kathmandu', description: '', price_adult: 2000, price_child: 1200,
      pricing_mode: 'per_person', vehicle_rates: {}
    });
  };

  // Cities Master Helpers
  const handleAddNewCity = (e) => {
    e.preventDefault();
    if (!newCityName.trim()) return;
    const name = newCityName.trim();
    if ((db.cities || []).some(c => c.toLowerCase() === name.toLowerCase())) {
      window.alert("City already exists");
      return;
    }
    updateDBState({ ...db, cities: [...(db.cities || []), name] });
    setNewCityName('');
  };

  const handleDeleteCity = (cityName) => {
    // Say what will be stranded, rather than letting hotels and activities go
    // quietly unreachable -- an activity in a city that no longer exists can
    // never be added to a day.
    const hotels = (db.hotels || []).filter(h => sameCity(h.city, cityName)).length;
    const acts = (db.activities || []).filter(a => sameCity(a.city, cityName)).length;
    const pkgs = (db.packages || []).filter(p => (p.cities || []).some(c => sameCity(c, cityName))).length;
    const stranded = [
      hotels && `${hotels} hotel${hotels > 1 ? 's' : ''}`,
      acts && `${acts} activit${acts > 1 ? 'ies' : 'y'}`,
      pkgs && `${pkgs} package${pkgs > 1 ? 's' : ''}`,
    ].filter(Boolean);

    const warning = stranded.length
      ? `\n\n${stranded.join(', ')} still reference ${cityName}. They will stay in the system but can no longer be used in an itinerary.`
      : '';
    if (!window.confirm(`Delete city ${cityName}?${warning}`)) return;
    updateDBState({ ...db, cities: (db.cities || []).filter(c => c !== cityName) });
  };

  // Renaming a city has to cascade. Hotels, activities, airports and packages
  // all reference a city by NAME, so changing it in one place alone would
  // strand every one of them -- 19 references for Kathmandu alone.
  //
  // Transfer route keys deliberately do NOT change: `ktm_to_pokhara` is a
  // stable identifier that vehicle rates and saved itineraries are keyed on,
  // and rewriting it would unprice every sector. Existing bookings and quotes
  // are likewise left alone -- they are the record of what was sold.
  const handleRenameCity = (oldName, rawNewName) => {
    const newName = String(rawNewName || '').trim();
    if (!newName || newName === oldName) return { ok: true };
    if ((db.cities || []).some(c => sameCity(c, newName))) {
      window.alert(`There is already a city called ${newName}.`);
      return { ok: false };
    }

    const counts = {
      hotels: (db.hotels || []).filter(h => sameCity(h.city, oldName)).length,
      activities: (db.activities || []).filter(a => sameCity(a.city, oldName)).length,
      airports: (db.airports || []).filter(a => (a.cities || []).some(c => sameCity(c, oldName))).length,
      packages: (db.packages || []).filter(p =>
        (p.cities || []).some(c => sameCity(c, oldName)) ||
        (p.days || []).some(d => sameCity(d.city, oldName))
      ).length,
    };
    const touched = Object.entries(counts).filter(([, n]) => n > 0)
      .map(([k, n]) => `${n} ${k}`).join(', ');

    if (!window.confirm(
      `Rename "${oldName}" to "${newName}"?` +
      (touched ? `\n\nThis also updates: ${touched}.` : '') +
      `\n\nExisting bookings and quotes keep the old name, and transfer route names are not changed.`
    )) return { ok: false };

    updateDBState({
      ...db,
      cities: (db.cities || []).map(c => (sameCity(c, oldName) ? newName : c)),
      hotels: (db.hotels || []).map(h => (sameCity(h.city, oldName) ? { ...h, city: newName } : h)),
      activities: (db.activities || []).map(a => (sameCity(a.city, oldName) ? { ...a, city: newName } : a)),
      airports: (db.airports || []).map(a => ({
        ...a,
        cities: (a.cities || []).map(c => (sameCity(c, oldName) ? newName : c)),
      })),
      packages: (db.packages || []).map(p => ({
        ...p,
        cities: (p.cities || []).map(c => (sameCity(c, oldName) ? newName : c)),
        days: (p.days || []).map(d => (sameCity(d.city, oldName) ? { ...d, city: newName } : d)),
      })),
    });
    return { ok: true };
  };

  // ---------------------------------------------------------------------
  // Transfer rate sheet (Admin > Vehicles)
  // ---------------------------------------------------------------------
  // The rates are a matrix -- every transfer priced for every vehicle -- so
  // they are edited as one: transfers down the rows, vehicles across the
  // columns. The previous screen showed one vehicle at a time behind an
  // "edit" mode, which meant opening four cards and scrolling to compare a
  // single sector's prices.
  //
  // Edits are held here until saved rather than written per keystroke, so a
  // mistyped figure is never live and a batch can be reviewed or discarded.
  const LOCAL_SIGHTSEEING_KEY = 'local_sightseeing';
  const [rateEdits, setRateEdits] = useState({}); // { routeKey: { vehicleId: value } }
  const [rateFilter, setRateFilter] = useState('all');
  const [rateSearch, setRateSearch] = useState('');
  const [showAddRoutePanel, setShowAddRoutePanel] = useState(false);
  const [editingVehicleDetails, setEditingVehicleDetails] = useState(null);

  // "Local Sightseeing" is not a sector -- it bills the vehicle's per-day
  // sightseeing rate, a separate column. Reading route_rates for it always
  // returned 0, so the old cards advertised sightseeing as free while the
  // engine charged thousands. The matrix reads the field actually charged.
  const rateFor = (routeKey, vehicle) => {
    const pending = rateEdits[routeKey]?.[vehicle.id];
    if (pending !== undefined) return pending;
    if (routeKey === LOCAL_SIGHTSEEING_KEY) return vehicle.daily_sightseeing_rate ?? 0;
    return rateForRoute(vehicle, routeKey) ?? 0;
  };

  // Whether this cell's figure comes from the sector priced the other way
  // round, which is worth showing rather than passing off as its own entry.
  const rateIsFromReverse = (routeKey, vehicle) => {
    if (routeKey === LOCAL_SIGHTSEEING_KEY) return false;
    if (rateEdits[routeKey]?.[vehicle.id] !== undefined) return false;
    const rates = vehicle.route_rates || {};
    if (rates[routeKey] !== undefined) return false;
    const rev = reverseRouteKey(routeKey);
    return rev !== routeKey && rates[rev] !== undefined;
  };

  const setRateCell = (routeKey, vehicleId, value) => {
    setRateEdits(prev => ({
      ...prev,
      [routeKey]: { ...(prev[routeKey] || {}), [vehicleId]: value },
    }));
  };

  const rateEditCount = Object.values(rateEdits)
    .reduce((n, byVehicle) => n + Object.keys(byVehicle).length, 0);

  const handleSaveRateEdits = () => {
    const updatedVehicles = (db.vehicles || []).map(v => {
      const next = { ...v, route_rates: { ...v.route_rates } };
      Object.entries(rateEdits).forEach(([routeKey, byVehicle]) => {
        const raw = byVehicle[v.id];
        if (raw === undefined) return;
        const num = Number(raw) || 0;
        if (routeKey === LOCAL_SIGHTSEEING_KEY) next.daily_sightseeing_rate = num;
        else next.route_rates[routeKey] = num;
      });
      return next;
    });
    updateDBState({ ...db, vehicles: updatedVehicles });
    setRateEdits({});
  };

  // Deletes by route key, never by position on screen. An earlier version of
  // this screen matched the row by walking up the DOM, which could land on the
  // container of every row and remove the first one instead -- that silently
  // destroyed two live routes.
  const handleDeleteRouteGlobally = (routeKey) => {
    const route = (db.routes || []).find(r => r.key === routeKey);
    if (!route) return;
    if (!window.confirm(
      `Delete "${route.name}"?\n\nIt will be removed from every vehicle's rates, and from any itinerary day using it.`
    )) return;

    const updatedVehicles = (db.vehicles || []).map(v => {
      const rates = { ...v.route_rates };
      delete rates[routeKey];
      return { ...v, route_rates: rates };
    });
    setRateEdits(prev => {
      const next = { ...prev };
      delete next[routeKey];
      return next;
    });
    updateDBState({
      ...db,
      routes: (db.routes || []).filter(r => r.key !== routeKey),
      vehicles: updatedVehicles,
    });
  };

  const routeCategory = (key) => {
    if (isAirportRouteKey(key)) return 'airport';
    return 'intercity';
  };

  const RATE_FILTERS = [
    { id: 'all', label: 'All' },
    { id: 'airport', label: 'Airport transfers' },
    { id: 'intercity', label: 'Inter-city' },
  ];

  // `local_sightseeing` is a full-day vehicle hire, not a sector between two
  // places, and it bills the vehicle's own daily_sightseeing_rate rather than
  // a route rate. Listing it as a transfer read as a category error, so its
  // price now sits with the vehicle where it belongs. The route key itself
  // stays in db.routes -- itinerary days still reference it -- it is only
  // hidden from this sheet.
  const rateSheetRoutes = (db.routes || []).filter(r => r.key !== LOCAL_SIGHTSEEING_KEY);

  const visibleRateRoutes = rateSheetRoutes.filter(r => {
    if (rateFilter !== 'all' && routeCategory(r.key) !== rateFilter) return false;
    const q = rateSearch.trim().toLowerCase();
    if (!q) return true;
    return `${r.name} ${r.key}`.toLowerCase().includes(q);
  });

  const handleSaveVehicleDetails = () => {
    if (!editingVehicleDetails) return;
    if (!editingVehicleDetails.name.trim()) {
      window.alert('Vehicle name is required.');
      return;
    }
    updateDBState({
      ...db,
      vehicles: (db.vehicles || []).map(v =>
        v.id === editingVehicleDetails.id ? { ...v, ...editingVehicleDetails } : v
      ),
    });
    setEditingVehicleDetails(null);
  };

  // An activity belongs to exactly one city and may only be added to a day in
  // that city -- a Kathmandu temple tour cannot be sold on a Pokhara day.
  // Compared leniently (trimmed, case-insensitive) because city names are free
  // text on the activity and picked from a list on the day, so a stray space
  // would otherwise orphan an activity with no visible reason. Null-safe: an
  // activity imported without a city must not blank the whole builder.
  const sameCity = (a, b) =>
    String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();

  const activitiesInCity = (city) =>
    (db.activities || []).filter(a => a.city && sameCity(a.city, city));

  // Options for a route-builder stop dropdown: every city, plus every airport.
  // Airports are selectable stops so a run between one city's airport and a
  // DIFFERENT city -- Pokhara Airport to Bandipur -- is something you build
  // and price in Admin, not something that needs new code each time a
  // destination is added.
  const renderRouteStopOptions = () => (
    <>
      <optgroup label="Cities">
        {(db.cities || []).filter(Boolean).map(city => (
          <option key={city} value={city}>{city}</option>
        ))}
      </optgroup>
      {(db.airports || []).length > 0 && (
        <optgroup label="Airports">
          {(db.airports || []).map(a => (
            <option key={a.id} value={airportStopValue(a)}>
              ✈ {a.name}{a.code ? ` (${a.code})` : ''}
            </option>
          ))}
        </optgroup>
      )}
    </>
  );

  const routeStopPreview = (stops) =>
    (stops || []).filter(Boolean).map(s => stopLabel(db.airports || [], s)).join(' ➔ ');

  // Airports Master helpers. An airport serves a LIST of cities -- Bhairahawa
  // is the airport for Lumbini, Butwal and Bhairahawa alike -- which is why
  // this is its own master rather than a field on a city.
  const handleAddAirport = (e) => {
    e.preventDefault();
    const name = newAirportForm.name.trim();
    if (!name) {
      window.alert('Enter the airport name.');
      return;
    }
    if (newAirportForm.cities.length === 0) {
      window.alert('Select at least one city this airport serves.');
      return;
    }
    if ((db.airports || []).some(a => a.name.toLowerCase() === name.toLowerCase())) {
      window.alert('An airport with this name already exists.');
      return;
    }

    const newAirport = {
      id: `apt-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`,
      name,
      code: newAirportForm.code.trim().toUpperCase(),
      cities: [...newAirportForm.cities],
    };

    // Each served city needs its own airport<->hotel route so it can be priced
    // per vehicle -- the drive from one shared airport differs by city. Built
    // in the airport-stop form (`aptbwa_to_lumbini`) so it reads as a normal
    // route in the builder and can be edited there like any other.
    const existingRoutes = db.routes || [];
    const missingRoutes = newAirport.cities
      .map(city => ({
        key: buildRouteKey([newAirport], [airportStopValue(newAirport), city]),
        city,
      }))
      .filter(({ key }) => key && !existingRoutes.some(r => r.key === key))
      .map(({ key, city }) => ({
        key,
        name: buildRouteName([newAirport], [airportStopValue(newAirport), city]),
        description: `Private transfer between ${newAirport.name} and your ${formatCityName(city)} hotel.`,
      }));

    const updatedVehicles = (db.vehicles || []).map(v => {
      const rates = { ...v.route_rates };
      missingRoutes.forEach(r => { if (rates[r.key] === undefined) rates[r.key] = 0; });
      return { ...v, route_rates: rates };
    });

    updateDBState({
      ...db,
      airports: [...(db.airports || []), newAirport],
      routes: [...(db.routes || []), ...missingRoutes],
      vehicles: updatedVehicles,
    });
    setNewAirportForm({ name: '', code: '', cities: [] });
  };

  const handleDeleteAirport = (airportId) => {
    const airport = (db.airports || []).find(a => a.id === airportId);
    if (!airport) return;
    if (!window.confirm(
      `Remove ${airport.name}?\n\nThe flight option will no longer be offered for ${airport.cities.join(', ')}. Existing transfer rates are kept.`
    )) return;
    updateDBState({ ...db, airports: (db.airports || []).filter(a => a.id !== airportId) });
  };

  // Editing an airport is safe to do freely: nothing is keyed on its name or
  // code. Its `cities` list is what decides where a flight leg can be offered,
  // and the airport-transfer route for each served city is created on demand
  // by resolveAirportTransfer, so adding a city here does not strand anything.
  const handleSaveAirportEdit = () => {
    if (!editingAirport) return;
    const name = String(editingAirport.name || '').trim();
    if (!name) {
      window.alert('Airport name is required.');
      return;
    }
    if ((db.airports || []).some(a => a.id !== editingAirport.id && a.name.trim().toLowerCase() === name.toLowerCase())) {
      window.alert('Another airport already has this name.');
      return;
    }
    if ((editingAirport.cities || []).length === 0) {
      window.alert('Select at least one city this airport serves.');
      return;
    }
    updateDBState({
      ...db,
      airports: (db.airports || []).map(a => a.id === editingAirport.id
        ? { ...a, name, code: String(editingAirport.code || '').trim().toUpperCase(), cities: [...editingAirport.cities] }
        : a),
    });
    setEditingAirport(null);
  };

  const handleToggleEditAirportCity = (city) => {
    setEditingAirport(prev => prev && ({
      ...prev,
      cities: (prev.cities || []).includes(city)
        ? prev.cities.filter(c => c !== city)
        : [...(prev.cities || []), city],
    }));
  };

  const handleToggleNewAirportCity = (city) => {
    setNewAirportForm(prev => ({
      ...prev,
      cities: prev.cities.includes(city)
        ? prev.cities.filter(c => c !== city)
        : [...prev.cities, city],
    }));
  };

  // NOTE: the per-vehicle edit mode that used to live here (editingVehicleId,
  // vehicleEditState, routesEditState and the inline route add/delete/rate
  // handlers) was removed with the rate-sheet rewrite. Its delete path matched
  // a route by DOM position, which once removed the wrong two routes from live
  // data; handleDeleteRouteGlobally now deletes by key instead.

  const handleGlobalRouteAdd = (e) => {
    e.preventDefault();
    if (!globalRouteStops || globalRouteStops.length < 2) {
      alert("Please configure at least 2 stops for the global route.");
      return;
    }

    // Stops may be cities or airports -- see buildRouteKey for the encoding.
    const routeName = buildRouteName(db.airports || [], globalRouteStops);
    const routeKey = buildRouteKey(db.airports || [], globalRouteStops);

    if (!routeKey || routeKey.split('_to_').length < 2) {
      alert("Please choose two different stops for the global route.");
      return;
    }
    // Either direction counts as already existing -- a sector priced one way
    // is priced both ways, so a reversed copy would only be a duplicate.
    const clash = findRoute(db.routes || [], routeKey);
    if (clash) {
      alert(
        clash.reversedFrom
          ? `"${clash.name}" already covers this sector in the opposite direction, and a transfer costs the same either way. Edit its rates instead.`
          : "A transfer route with this name or code already exists globally."
      );
      return;
    }
    // Guard against a second spelling of an airport run that already exists
    // (e.g. "Pokhara Airport Transfer" vs "Pokhara Airport to Pokhara").
    const cityStops = globalRouteStops.filter(s => s && !String(s).startsWith('apt:'));
    for (const city of cityStops) {
      const existing = resolveAirportTransfer(db.routes || [], db.airports || [], city);
      if (existing.exists && existing.key !== routeKey && globalRouteStops.some(s => String(s).startsWith('apt:'))) {
        const existingRoute = (db.routes || []).find(r => r.key === existing.key);
        if (!window.confirm(
          `There is already an airport transfer for ${city}: "${existingRoute?.name || existing.key}".\n\n` +
          `Adding this will leave two routes for the same journey. Continue anyway?`
        )) return;
        break;
      }
    }

    const newRouteObj = {
      key: routeKey,
      name: routeName,
      description: `Private transfer: ${routeName}`
    };

    const updatedVehicles = db.vehicles.map(v => {
      const price = Number(globalRouteForm.prices[v.id]) || 0;
      return {
        ...v,
        route_rates: {
          ...v.route_rates,
          [routeKey]: price
        }
      };
    });

    updateDBState({
      ...db,
      routes: [...db.routes, newRouteObj],
      vehicles: updatedVehicles
    });

    setGlobalRouteStops([db.cities?.[0] || 'Kathmandu', db.cities?.[1] || 'Pokhara']);
    setGlobalRouteForm({ fromCity: db.cities?.[0] || 'Kathmandu', toCity: db.cities?.[1] || 'Pokhara', prices: {} });
  };

  const handleAddNewVehicle = (e) => {
    e.preventDefault();
    if (!newVehicleForm.name.trim() || !newVehicleForm.copyFromId) {
      alert("Please enter a name and select a base vehicle to copy rates from.");
      return;
    }

    const baseVehicle = db.vehicles.find(v => v.id === newVehicleForm.copyFromId);
    if (!baseVehicle) return;

    const newId = `v-${newVehicleForm.name.substring(0, 3).toLowerCase()}-${Date.now().toString().slice(-4)}`;
    
    const freshVehicle = {
      id: newId,
      name: newVehicleForm.name.trim(),
      description: newVehicleForm.description.trim(),
      capacity: Number(newVehicleForm.capacity) || 4,
      route_rates: JSON.parse(JSON.stringify(baseVehicle.route_rates || {}))
    };

    updateDBState({
      ...db,
      vehicles: [...db.vehicles, freshVehicle]
    });

    setShowAddVehicleModal(false);
    setNewVehicleForm({ name: '', description: '', capacity: 4, copyFromId: '' });
  };


  // --- B2C TRIP PLANNER WIZARD HANDLERS ---
  const handleAddWizardDestination = () => {
    setWizardDestinations(prev => [...prev, { city: 'Pokhara', nights: 2 }]);
  };

  const handleDeleteWizardDestination = (index) => {
    if (wizardDestinations.length <= 1) return;
    setWizardDestinations(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleUpdateWizardDestination = (index, field, value) => {
    setWizardDestinations(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: field === 'nights' ? Number(value) : value };
      return updated;
    });
  };

  const handleMoveWizardDestination = (index, direction) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= wizardDestinations.length) return;
    setWizardDestinations(prev => {
      const updated = [...prev];
      const temp = updated[index];
      updated[index] = updated[nextIndex];
      updated[nextIndex] = temp;
      return updated;
    });
  };

  const handleCreateProposal = (e, bypassLeadCheck = false) => {
    if (e) e.preventDefault();
    if (view === 'b2c' && !hasContactDetails && !bypassLeadCheck) {
      setPendingLeadAction({ type: 'wizard' });
      setShowLeadCaptureModal(true);
      return;
    }
    // A from-scratch build carries no preset offer -- clear any discount left
    // over from a package the user opened earlier in this session.
    setOfferDiscountPerPax(0);

    const cities = wizardDestinations;
    const rating = wizardStarRating;
    const addTransfers = wizardAddTransfers;

    const itinerary = [];
    let dayCounter = 1;
    let lastCity = null;

    const getCityKey = (c) => {
      if (!c) return '';
      const name = c.toLowerCase().trim();
      return name === 'kathmandu' ? 'ktm' : name;
    };

    // Ensure all required transit routes exist in the db.routes
    const neededRoutes = [];
    const checkAndAddRoute = (fromCity, toCity, currentRoutes, newRoutesAccumulator) => {
      if (!fromCity || !toCity) return;
      const cleanFrom = fromCity.toLowerCase().trim();
      const cleanTo = toCity.toLowerCase().trim();
      if (cleanFrom === cleanTo) return;
      
      const key = `${getCityKey(fromCity)}_to_${getCityKey(toCity)}`;
      
      const exists = currentRoutes.some(r => r.key === key) || newRoutesAccumulator.some(r => r.key === key);
      if (!exists) {
        newRoutesAccumulator.push({
          key,
          name: `${formatCityName(fromCity)} to ${formatCityName(toCity)} Overland`,
          description: `Private transfer: ${formatCityName(fromCity)} to ${formatCityName(toCity)}.`
        });
      }
    };

    // An airport <-> hotel run for a city that has air access. Same purpose as
    // checkAndAddRoute above: make sure the key exists so it appears in
    // Admin > Vehicles & Routes to be priced, instead of silently costing ₹0.
    const checkAndAddAirportRoute = (city, currentRoutes, newRoutesAccumulator) => {
      if (!city) return;
      const airport = getAirportForCity(db.airports || [], city);
      if (!airport) return;
      // resolveAirportTransfer finds a route the admin already built (in
      // either direction, or the legacy per-city key) before proposing a new
      // one, so this never duplicates a run that is already priced.
      const { key, exists } = resolveAirportTransfer(currentRoutes, db.airports || [], city);
      if (!key || exists) return;
      if (newRoutesAccumulator.some(r => r.key === key)) return;
      newRoutesAccumulator.push({
        key,
        name: buildRouteName(db.airports || [], [airportStopValue(airport), city]),
        description: `Private transfer between ${airport.name} and your ${formatCityName(city)} hotel.`
      });
    };

    if (addTransfers) {
      // Day 1 Route check
      const firstCity = cities[0]?.city;
      if (firstCity && wizardStartCity.toLowerCase().trim() !== firstCity.toLowerCase().trim()) {
        checkAndAddRoute(wizardStartCity, firstCity, db.routes, neededRoutes);
      } else if (firstCity) {
        checkAndAddAirportRoute(firstCity, db.routes, neededRoutes);
      }

      // Transitions between cities route check
      let tempLastCity = null;
      cities.forEach((dest, cityIndex) => {
        if (cityIndex > 0 && tempLastCity && tempLastCity.toLowerCase().trim() !== dest.city.toLowerCase().trim()) {
          checkAndAddRoute(tempLastCity, dest.city, db.routes, neededRoutes);
        }
        tempLastCity = dest.city;
      });

      // Every city on the trip may later be switched to a flight leg in the
      // builder, which needs that city's airport run to exist and be priced.
      cities.forEach((dest) => checkAndAddAirportRoute(dest.city, db.routes, neededRoutes));

      // Departure Day route check
      if (tempLastCity && tempLastCity.toLowerCase().trim() !== wizardEndCity.toLowerCase().trim()) {
        checkAndAddRoute(tempLastCity, wizardEndCity, db.routes, neededRoutes);
      } else if (tempLastCity) {
        checkAndAddAirportRoute(tempLastCity, db.routes, neededRoutes);
      }
    }

    if (neededRoutes.length > 0) {
      setDb(prev => {
        const updatedRoutes = [...prev.routes, ...neededRoutes];
        const updatedVehicles = prev.vehicles.map(v => {
          const ratesCopy = { ...v.route_rates };
          neededRoutes.forEach(r => {
            if (ratesCopy[r.key] === undefined) {
              ratesCopy[r.key] = 0;
            }
          });
          return {
            ...v,
            route_rates: ratesCopy
          };
        });
        const newDb = {
          ...prev,
          routes: updatedRoutes,
          vehicles: updatedVehicles
        };
        localStorage.setItem("nepal_quote_routes_v2", JSON.stringify(newDb.routes));
        localStorage.setItem("nepal_quote_vehicles_v2", JSON.stringify(newDb.vehicles));
        return newDb;
      });
    }

    cities.forEach((dest, cityIndex) => {
      const isFirstCity = cityIndex === 0;

      for (let night = 1; night <= dest.nights; night++) {
        let route = '';
        
        if (dayCounter === 1) {
          if (wizardStartCity.toLowerCase().trim() !== dest.city.toLowerCase().trim()) {
            route = `${getCityKey(wizardStartCity)}_to_${getCityKey(dest.city)}`;
          } else if (cityHasAirport(db.airports || [], dest.city)) {
            // Flying straight into the first city: charge that city's airport
            // pickup. Previously hardcoded to Kathmandu, so arriving anywhere
            // else silently added no transfer and the quote came out short.
            route = resolveAirportTransfer(db.routes || [], db.airports || [], dest.city).key;
          } else {
            route = '';
          }
        }
        else if (night === 1 && lastCity) {
          if (lastCity.toLowerCase().trim() !== dest.city.toLowerCase().trim()) {
            const sectorKey = `${getCityKey(lastCity)}_to_${getCityKey(dest.city)}`;
            route = sectorKey;
          } else {
            route = '';
          }
        }
        else if (dayCounter > 1 && night === 2) {
          route = '';
        }

        const cityHotels = db.hotels.filter(h => h.city.toLowerCase() === dest.city.toLowerCase() && h.category === rating);
        const defaultHotel = cityHotels.length > 0 ? cityHotels[0].id : '';

        let activityIds = [];
        if (dest.city.toLowerCase() === 'kathmandu') {
          activityIds = ['a-ktm-sightseeing'];
        } else if (dest.city.toLowerCase() === 'pokhara') {
          activityIds = ['a-pok-boating'];
        } else if (dest.city.toLowerCase() === 'chitwan') {
          activityIds = ['a-chi-safari'];
        }

        const isTransitionDay = night === 1 && !isFirstCity;
        const assignActivity = dayCounter > 1 && night === 2;

        let title = `Explore ${dest.city}`;
        let description = `Enjoy local sightseeing and activities in ${dest.city}.`;

        if (isTransitionDay) {
          title = `Drive to ${dest.city}`;
          description = `Check out and scenic drive from ${lastCity} to ${dest.city}. Check in to your hotel.`;
        } else if (dayCounter === 1) {
          title = `Arrival in ${dest.city}`;
          description = `Arrive in ${dest.city}. Private transfer to your hotel. Rest of the day is at leisure.`;
        } else if (night > 2) {
          title = `Leisure Day in ${dest.city}`;
          description = `Enjoy your day in ${dest.city} at leisure. Explore the local markets or relax.`;
        }

        const dayRoute = addTransfers ? route : '';
        itinerary.push(withDayTransfers({
          day: dayCounter,
          city: dest.city,
          title: title,
          description: description,
          hotelId: defaultHotel,
          meals: dest.city.toLowerCase() === 'chitwan' ? 'AP' : 'CP',
          is_sightseeing: !isTransitionDay,
          activity_ids: assignActivity ? activityIds : [],
          // The wizard always generates road travel; switching a leg to a
          // flight is done later in the builder, where the agent can see the
          // whole trip. Keeping it out of the intake form was deliberate --
          // it is an operator decision, not something to ask a traveller.
          travel_mode: TRAVEL_MODE_CAR,
        }, dayRoute ? [dayRoute] : []));

        dayCounter++;
      }
      lastCity = dest.city;
    });

    let departureRoute = '';
    if (addTransfers && lastCity) {
      if (lastCity.toLowerCase().trim() !== wizardEndCity.toLowerCase().trim()) {
        departureRoute = `${getCityKey(lastCity)}_to_${getCityKey(wizardEndCity)}`;
      } else if (cityHasAirport(db.airports || [], lastCity)) {
        // Departing by air from the last city -- its own airport drop, not
        // Kathmandu's (which is what this used to assume).
        departureRoute = resolveAirportTransfer(db.routes || [], db.airports || [], lastCity).key;
      } else {
        departureRoute = '';
      }
    }

    itinerary.push(withDayTransfers({
      day: dayCounter,
      city: lastCity || 'Kathmandu',
      title: 'Departure from Nepal',
      description: `Check out from hotel. Return transfer to your international departure.`,
      hotelId: '',
      meals: 'CP',
      is_sightseeing: false,
      activity_ids: []
    }, departureRoute ? [departureRoute] : []));

    setCustomPackageName(`${cities.map(c => c.city).join(' & ')} Custom Itinerary`);
    setSelectedHotelCategory(rating);
    setTravelDate(wizardLeavingOn);
    setStartCity(wizardStartCity);
    setEndCity(wizardEndCity);
    setCustomItinerary(itinerary);

    setAgentMarkupInput(0); // Reset agent custom markup override for new trip
    if (view === 'b2b') {
      setB2bSubView('customize');
    } else {
      setB2cSubView('customize');
    }
  };

  // An agent session, not merely "the b2b route is open".
  const isB2bAuthenticated = !!currentUser && currentUser.role === 'b2b';

  // ---------------------------------------------------------------------
  // "My Quotes" -- the saved-quote pipeline, shared by B2B and B2C.
  // ---------------------------------------------------------------------
  // Laid out as status filter tabs over a card list rather than side-by-side
  // kanban columns: an agent following up on their phone gets the same view
  // as one on a laptop, and a quote's details (client, package, price, dates)
  // stay readable instead of being squeezed into a narrow column.
  const QUOTE_TABS = ['All', 'Draft', 'Sent', 'Won', 'Lost'];

  const renderMyQuotes = () => {
    if (!currentUser) {
      return (
        <div className="max-w-3xl mx-auto py-10 text-center">
          <div className="quote-empty p-10">
            <FileText size={30} className="mx-auto mb-3 opacity-60" />
            <h3 className="quote-card-title text-lg font-extrabold">Sign in to see your saved quotes</h3>
            <p className="quote-card-meta text-xs mt-2 max-w-md mx-auto leading-relaxed">
              Saved quotes are kept on your account, so a proposal you start on one device is
              waiting for you on the next.
            </p>
            <button
              onClick={() => (view === 'b2b' ? setShowB2bLoginPortal(true) : setShowB2cLoginPortal(true))}
              className="btn btn-primary btn-sm mt-5"
            >
              Sign In
            </button>
          </div>
        </div>
      );
    }

    const counts = QUOTE_TABS.reduce((acc, tab) => {
      acc[tab] = tab === 'All' ? myQuotes.length : myQuotes.filter((q) => q.status === tab).length;
      return acc;
    }, {});
    const visible = quoteStatusFilter === 'All'
      ? myQuotes
      : myQuotes.filter((q) => q.status === quoteStatusFilter);

    const pipClass = (status) => `quote-pip quote-pip-${(status || 'draft').toLowerCase()}`;
    const paxLabel = (q) => {
      const bits = [];
      if (q.adults) bits.push(`${q.adults} adult${q.adults > 1 ? 's' : ''}`);
      const kids = (q.cwb || 0) + (q.cnb || 0);
      if (kids) bits.push(`${kids} child${kids > 1 ? 'ren' : ''}`);
      return bits.join(', ') || '—';
    };
    const when = (iso) => {
      if (!iso) return '—';
      const d = new Date(iso);
      return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    return (
      <div className="max-w-5xl mx-auto py-6 fade-in">
        <div className="mb-6">
          <h2 className="quote-card-title text-2xl font-extrabold">My Quotes</h2>
          <p className="quote-card-meta text-xs mt-1.5 leading-relaxed max-w-2xl">
            Proposals you've saved but not booked yet. Reopen one to keep editing it, mark it sent
            once the client has it, and convert it the moment they say yes.
          </p>
        </div>

        <div className="quote-tabs mb-5">
          {QUOTE_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setQuoteStatusFilter(tab)}
              className={`quote-tab ${quoteStatusFilter === tab ? 'is-active' : ''}`}
            >
              {tab}
              <span className="quote-tab-count">{counts[tab]}</span>
            </button>
          ))}
        </div>

        {quotesError && (
          <div className="quote-empty p-4 mb-4 text-xs flex items-center gap-2">
            <AlertTriangle size={14} /> {quotesError}
            <button onClick={refreshMyQuotes} className="btn btn-secondary btn-sm ml-auto">Retry</button>
          </div>
        )}

        {quotesLoading && myQuotes.length === 0 ? (
          <div className="quote-empty p-10 text-center text-xs">Loading your saved quotes…</div>
        ) : visible.length === 0 ? (
          <div className="quote-empty p-10 text-center">
            <Layers size={26} className="mx-auto mb-3 opacity-60" />
            <p className="text-sm font-bold quote-card-title">
              {myQuotes.length === 0 ? 'No saved quotes yet' : `Nothing in ${quoteStatusFilter}`}
            </p>
            <p className="quote-card-meta text-xs mt-2 max-w-md mx-auto leading-relaxed">
              {myQuotes.length === 0
                ? 'Build an itinerary in the Custom Planner or from a preset package, then choose "Save Quote for Later".'
                : 'Try another tab, or build a new quote from the planner.'}
            </p>
            {myQuotes.length === 0 && (
              <button
                onClick={() => (view === 'b2b' ? setB2bSubView('wizard') : setB2cSubView('wizard'))}
                className="btn btn-primary btn-sm mt-5"
              >
                Build a quote
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {visible.map((q) => {
              const busy = quoteBusyId === q.id;
              const locked = !!q.converted_booking_id;
              return (
                <div key={q.id} className="quote-card">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="quote-card-title text-base font-extrabold truncate">
                          {q.client_name || q.package_name || 'Untitled quote'}
                        </h3>
                        <span className={pipClass(q.status)}>{q.status}</span>
                        {q.id === activeQuoteId && (
                          <span className="quote-pip quote-pip-sent">Open in planner</span>
                        )}
                      </div>
                      <p className="quote-card-meta text-xs mt-1 truncate">
                        {q.package_name || 'Custom itinerary'}
                        {q.itinerary?.length ? ` · ${q.itinerary.length} days` : ''} · {paxLabel(q)}
                      </p>
                      <p className="quote-card-meta text-[11px] mt-1.5">
                        Travel {q.travel_date || 'not set'} · Updated {when(q.updated_at)}
                        {q.last_sent_at ? ` · Sent ${when(q.last_sent_at)}` : ''}
                      </p>
                      {/* Convert refuses without these, so say so here rather
                          than letting the agent find out at the last step. */}
                      {!locked && !(q.client_name && q.client_email && q.client_phone) && (
                        <p className="quote-card-meta text-[11px] mt-1.5 flex items-center gap-1.5">
                          <AlertTriangle size={11} />
                          Add the client's name, email and mobile before this can be booked.
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="quote-card-price text-xl font-extrabold">
                        ₹{Number(q.total_price || 0).toLocaleString('en-IN')}
                      </div>
                      <div className="quote-card-meta text-[10px] uppercase tracking-wider font-bold">Total</div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-4 pt-3.5 border-t" style={{ borderColor: 'var(--border-color)' }}>
                    {locked ? (
                      <div className="quote-locked-note text-[11px] flex items-center gap-1.5">
                        <CheckCircle size={13} />
                        Booked as <strong>{q.converted_booking_id}</strong> — this quote is now the
                        record of what the client agreed to, so it can't be changed.
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => handleResumeQuote(q)}
                          disabled={busy}
                          className="btn btn-secondary btn-sm flex items-center gap-1.5 text-[11px]"
                        >
                          <Edit3 size={12} /> Open &amp; Edit
                        </button>
                        {q.status !== 'Sent' && (
                          <button
                            onClick={() => handleMarkQuoteSent(q)}
                            disabled={busy}
                            className="btn btn-secondary btn-sm flex items-center gap-1.5 text-[11px]"
                          >
                            <MessageSquare size={12} /> Mark as Sent
                          </button>
                        )}
                        <button
                          onClick={() => handleConvertQuote(q)}
                          disabled={busy}
                          className="btn btn-primary btn-sm flex items-center gap-1.5 text-[11px]"
                        >
                          <CheckCircle size={12} /> {busy ? 'Working…' : 'Convert to Booking'}
                        </button>
                        {q.status !== 'Lost' && (
                          <button
                            onClick={() => handleMarkQuoteLost(q)}
                            disabled={busy}
                            className="btn btn-secondary btn-sm flex items-center gap-1.5 text-[11px]"
                          >
                            <X size={12} /> Mark Lost
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteQuote(q)}
                          disabled={busy}
                          className="btn btn-secondary btn-sm flex items-center gap-1.5 text-[11px] ml-auto"
                        >
                          <Trash2 size={12} /> Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderB2bWallet = () => {
    const when = (iso) => {
      if (!iso) return '—';
      const d = new Date(iso);
      return Number.isNaN(d.getTime())
        ? '—'
        : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    return (
      <div className="max-w-4xl mx-auto py-6 fade-in">
        <div className="mb-6">
          <h2 className="quote-card-title text-2xl font-extrabold">My Wallet</h2>
          <p className="quote-card-meta text-xs mt-1.5 leading-relaxed max-w-2xl">
            Every credit and debit TripGuru has logged against your account. Balances are added by
            the TripGuru team once a commission payout is actually made — not automatically when a
            booking is created.
          </p>
        </div>

        <div className="wallet-balance-card mb-6">
          <span className="wallet-balance-label">Current Balance</span>
          <strong className="wallet-balance-amount">₹{(myWallet.balance || 0).toLocaleString()}</strong>
        </div>

        {myWallet.transactions.length === 0 ? (
          <div className="quote-empty p-10 text-center">
            <Wallet size={26} className="mx-auto mb-3 opacity-60" />
            <p className="text-sm font-bold quote-card-title">No wallet activity yet</p>
            <p className="quote-card-meta text-xs mt-2 max-w-md mx-auto leading-relaxed">
              Once TripGuru pays out a commission, it'll show up here with a note explaining what it's for.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {myWallet.transactions.map((t) => (
              <div key={t.id} className="quote-card flex items-center gap-4">
                {t.type === 'credit' ? (
                  <ArrowUpCircle size={22} className="wallet-icon-credit shrink-0" />
                ) : (
                  <ArrowDownCircle size={22} className="wallet-icon-debit shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="quote-card-title text-sm font-bold truncate">{t.reason}</p>
                  <p className="quote-card-meta text-[11px] mt-0.5">{when(t.createdAt)}</p>
                </div>
                <div className={`quote-pip ${t.type === 'credit' ? 'quote-pip-won' : 'quote-pip-lost'}`}>
                  {t.type === 'credit' ? '+' : '−'}₹{Number(t.amount || 0).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderB2bSignedOutPrompt = () => (
    <div className="max-w-6xl mx-auto py-6">
      <div className="bg-gradient-to-r from-emerald-800 to-indigo-950 rounded-3xl p-8 shadow-lg text-center">
        <span className="bg-emerald-600 text-xs px-3 py-1 rounded-full uppercase tracking-wider font-semibold">B2B Partner Portal</span>
        <h2 className="text-3xl font-extrabold mt-4 font-heading leading-tight">Sign in to your agent account</h2>
        <p className="mt-3 text-sm leading-relaxed max-w-lg mx-auto">
          Your dashboard, commission rates, wallet balance and booking history are available once you sign in.
        </p>
        <button
          onClick={() => setShowB2bLoginPortal(true)}
          className="mt-6 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs uppercase tracking-wider py-3 px-6 rounded-xl transition"
        >
          Partner Sign In / Register
        </button>
      </div>
    </div>
  );

  const renderB2bDashboard = () => {
    // Server-scoped to the logged-in agent's own bookings (GET /bookings/mine
    // filters by agent_id) -- previously read db.bookings.filter(type==='B2B'),
    // which showed every agent's bookings once any admin session had loaded
    // the full bookings table into shared app state. Fall back to a locally
    // filtered view only if the API list hasn't loaded yet (e.g. offline).
    const b2bBookings = isApiSession()
      ? myBookings
      : db.bookings.filter(b => b.type === 'B2B' && b.agent_id === currentUser?.id);
    const totalSales = b2bBookings.reduce((sum, b) => sum + (b.total_price || 0), 0);
    const totalCommission = b2bBookings.reduce((sum, b) => sum + (b.agent_commission || 0), 0);
    // "Open" = still winnable. Won quotes are already counted as bookings
    // above, and Lost ones are closed, so neither belongs in a follow-up count.
    const openQuoteCount = myQuotes.filter((q) => q.status === 'Draft' || q.status === 'Sent').length;
    const wonQuoteCount = myQuotes.filter((q) => q.status === 'Won').length;

    return (
      <div className="max-w-6xl mx-auto py-6">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-emerald-800 to-indigo-950 text-white rounded-3xl p-8 mb-8 shadow-lg relative overflow-hidden">
          <div className="absolute right-0 bottom-0 opacity-10 text-[180px] pointer-events-none select-none">💼</div>
          <span className="bg-emerald-600 text-xs px-3 py-1 rounded-full uppercase tracking-wider font-semibold">B2B Agent Account</span>
          <h2 className="text-3xl font-extrabold mt-3 font-heading leading-tight text-white">
            Welcome back, {b2bProfile.agentName || "Travel Partner"}! 👋
          </h2>
          <p className="text-slate-300 mt-2 max-w-xl text-sm leading-relaxed">
            Manage your customer inquiries, generate live customized itineraries, check B2B commission rates, and track your wallet balances directly.
          </p>
          
          <div className="flex flex-wrap gap-4 mt-6 border-t border-emerald-700/50 pt-6 text-xs text-slate-300">
            <div>Agency: <strong className="text-white font-semibold">{b2bProfile.agencyName || "Horizon Travel Partners"}</strong></div>
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 self-center"></div>
            <div>Agent ID: <strong className="text-white font-semibold">{currentUser?.id}</strong></div>
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 self-center"></div>
            <div>Partner Status: <strong className="text-emerald-400 font-semibold">Gold Tier (10% Comm.)</strong></div>
          </div>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {/* Card 1: Total Bookings */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex items-center gap-4 hover:shadow-md transition duration-300">
            <div className="bg-emerald-100 text-emerald-600 p-4 rounded-2xl">
              <Briefcase size={24} />
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-extrabold tracking-wider block">Total Bookings</span>
              <strong className="text-2xl font-bold text-slate-800">{b2bBookings.length}</strong>
            </div>
          </div>

          {/* Card 2: Sales Volume */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex items-center gap-4 hover:shadow-md transition duration-300">
            <div className="bg-blue-100 text-blue-600 p-4 rounded-2xl">
              <TrendingUp size={24} />
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-extrabold tracking-wider block">Sales Volume (INR)</span>
              <strong className="text-2xl font-bold text-slate-800">₹{totalSales.toLocaleString()}</strong>
            </div>
          </div>

          {/* Card 3: Earned Commission */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex items-center gap-4 hover:shadow-md transition duration-300">
            <div className="bg-indigo-100 text-indigo-600 p-4 rounded-2xl">
              <ShieldCheck size={24} />
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-extrabold tracking-wider block">Commissions (10%)</span>
              <strong className="text-2xl font-bold text-slate-800">₹{totalCommission.toLocaleString()}</strong>
            </div>
          </div>

          {/* Card 4: Wallet Balance */}
          <div
            onClick={() => setB2bSubView('wallet')}
            className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex items-center gap-4 hover:shadow-md transition duration-300 cursor-pointer"
          >
            <div className="bg-purple-100 text-purple-600 p-4 rounded-2xl">
              <Wallet size={24} />
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-extrabold tracking-wider block">Active Wallet</span>
              <strong className="text-2xl font-bold text-slate-800">₹{(myWallet.balance || 0).toLocaleString()}</strong>
            </div>
          </div>
        </div>

        {/* Quick Actions & Partner Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div
            onClick={() => setB2bSubView('quotes')}
            className="group cursor-pointer quote-card flex items-start gap-4"
          >
            <div className="bg-emerald-600 text-white p-3 rounded-2xl group-hover:scale-105 transition-transform duration-300">
              <FileText size={24} />
            </div>
            <div>
              <h3 className="quote-card-title font-extrabold text-base">My Quotes</h3>
              <p className="quote-card-meta text-xs mt-1 leading-relaxed">
                {openQuoteCount > 0
                  ? `${openQuoteCount} quote${openQuoteCount > 1 ? 's' : ''} still open${wonQuoteCount ? `, ${wonQuoteCount} won so far` : ''}.`
                  : wonQuoteCount > 0
                    ? `All followed up — ${wonQuoteCount} quote${wonQuoteCount > 1 ? 's' : ''} won so far.`
                    : 'Save a proposal instead of losing it, then follow it up here.'}
              </p>
              <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 font-bold mt-4">
                Open Quote Pipeline <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </span>
            </div>
          </div>

          <div
            onClick={() => setB2bSubView('packages')}
            className="group cursor-pointer bg-gradient-to-br from-emerald-50 to-teal-50/50 border border-emerald-100/75 rounded-3xl p-6 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all duration-300 flex items-start gap-4"
          >
            <div className="bg-emerald-600 text-white p-3 rounded-2xl group-hover:scale-105 transition-transform duration-300">
              <Compass size={24} />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-800 font-heading">Book Preset Package</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Select from our pre-defined tour options (Kathmandu, Pokhara, Chitwan) and customize them to fit your guest's requirements.
              </p>
              <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 font-bold mt-4">
                Launch Package Booking <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </span>
            </div>
          </div>

          <div 
            onClick={() => setB2bSubView('wizard')}
            className="group cursor-pointer bg-gradient-to-br from-indigo-50 to-blue-50/50 border border-indigo-100/75 rounded-3xl p-6 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all duration-300 flex items-start gap-4"
          >
            <div className="bg-indigo-600 text-white p-3 rounded-2xl group-hover:scale-105 transition-transform duration-300">
              <Layers size={24} />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-800 font-heading">Custom Itinerary Wizard</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Build a new package from scratch, setting exact cities, night durations, routing transfers, and day-by-day activities.
              </p>
              <span className="inline-flex items-center gap-1.5 text-xs text-indigo-600 font-bold mt-4">
                Open Custom Planner Wizard <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </span>
            </div>
          </div>
        </div>

        {/* B2B Booking History Table */}
        <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h3 className="font-extrabold text-base text-slate-805 font-heading flex items-center gap-2">
              <Briefcase className="text-emerald-600" size={18} />
              B2B Partner Booking & Inquiry History
            </h3>
            <span className="text-xs bg-slate-100 text-slate-600 font-semibold px-3 py-1 rounded-full">
              {b2bBookings.length} bookings found
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-500 font-bold uppercase text-[9px] tracking-wider">
                  <th className="p-4">Reference</th>
                  <th className="p-4">Traveler Name</th>
                  <th className="p-4">Package & Duration</th>
                  <th className="p-4">Travel Date</th>
                  <th className="p-4 text-right">Gross Cost</th>
                  <th className="p-4 text-right">Commission (10%)</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {b2bBookings.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="p-8 text-center text-slate-400">
                      No partner bookings recorded yet. Launch a package to make a reservation.
                    </td>
                  </tr>
                ) : (
                  b2bBookings.map(booking => (
                    <tr key={booking.id} className="hover:bg-slate-50/50 transition">
                      <td className="p-4 font-bold text-slate-800">{booking.id}</td>
                      <td className="p-4">
                        <div className="font-semibold text-slate-800">{booking.client_name}</div>
                        <div className="text-[10px] text-slate-400">{booking.email}</div>
                      </td>
                      <td className="p-4">
                        <div className="font-medium text-slate-800">{booking.package_name}</div>
                        <div className="text-[10px] text-slate-500">{booking.itinerary_summary}</div>
                      </td>
                      <td className="p-4 text-slate-600">{booking.travel_date}</td>
                      <td className="p-4 text-right font-semibold text-slate-800">
                        ₹{booking.total_price.toLocaleString()}
                      </td>
                      <td className="p-4 text-right font-bold text-emerald-600">
                        ₹{(booking.agent_commission || Math.round(booking.total_price * 0.1)).toLocaleString()}
                      </td>
                      <td className="p-4 text-center">
                        <span className="bg-green-50 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-green-200">
                          {booking.status}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => handleViewVoucher(booking)}
                          className="btn btn-secondary py-1 px-3 text-[10px] rounded flex items-center justify-center gap-1 mx-auto"
                        >
                          <FileText size={11} /> View Voucher
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // B2C "My Bookings" -- lists the logged-in traveler's own past bookings
  // (fetched server-side via GET /bookings/mine, scoped by user_id). Gated
  // behind login since anonymous/guest checkout has no account to scope to.
  const renderB2cMyBookings = () => {
    if (!currentUser) {
      return (
        <div className="max-w-xl mx-auto py-16 text-center">
          <div className="bg-orange-100 text-orange-600 p-4 rounded-2xl inline-flex mb-4">
            <FileText size={28} />
          </div>
          <h2 className="text-xl font-extrabold text-slate-800 font-heading mb-2">Log in to see your bookings</h2>
          <p className="text-xs text-slate-500 mb-6 max-w-sm mx-auto">
            Sign in to your traveler account to view your past quotes and confirmed bookings, or check out as a guest to get started.
          </p>
          <button
            type="button"
            onClick={() => {
              setShowB2cLoginPortal(true);
              setAuthRole('b2c');
              setAuthTab('login');
            }}
            className="text-xs bg-orange-600 hover:bg-orange-700 text-white font-extrabold px-4 py-2 rounded-xl border border-orange-700 shadow-sm transition active:scale-95"
          >
            Sign In / Register
          </button>
        </div>
      );
    }

    return (
      <div className="max-w-6xl mx-auto py-6">
        <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h3 className="font-extrabold text-base text-slate-805 font-heading flex items-center gap-2">
              <FileText className="text-orange-600" size={18} />
              My Bookings & Quotes
            </h3>
            <span className="text-xs bg-slate-100 text-slate-600 font-semibold px-3 py-1 rounded-full">
              {myBookings.length} bookings found
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-500 font-bold uppercase text-[9px] tracking-wider">
                  <th className="p-4">Reference</th>
                  <th className="p-4">Package & Duration</th>
                  <th className="p-4">Travel Date</th>
                  <th className="p-4 text-right">Total (INR)</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {myBookings.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-8 text-center text-slate-400">
                      No bookings yet. Browse our packages or build a custom itinerary to get started.
                    </td>
                  </tr>
                ) : (
                  myBookings.map(booking => (
                    <tr key={booking.id} className="hover:bg-slate-50/50 transition">
                      <td className="p-4 font-bold text-slate-800">{booking.id}</td>
                      <td className="p-4">
                        <div className="font-medium text-slate-800">{booking.package_name}</div>
                        <div className="text-[10px] text-slate-500">{booking.itinerary_summary}</div>
                      </td>
                      <td className="p-4 text-slate-600">{booking.travel_date}</td>
                      <td className="p-4 text-right font-semibold text-slate-800">
                        ₹{(booking.total_price || 0).toLocaleString()}
                      </td>
                      <td className="p-4 text-center">
                        <span className="bg-green-50 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-green-200">
                          {booking.status}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => handleViewVoucher(booking)}
                          className="btn btn-secondary py-1 px-3 text-[10px] rounded flex items-center justify-center gap-1 mx-auto"
                        >
                          <FileText size={11} /> View Voucher
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderB2cProfile = () => {
    return (
      <div className="max-w-xl mx-auto py-6">
        <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-lg">
          <div className="flex items-center gap-4 mb-6 border-b border-slate-100 pb-4">
            <div className="bg-orange-100 text-orange-600 p-3.5 rounded-2xl">
              <User size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-extrabold text-slate-805 font-heading">My Profile</h2>
              <p className="text-xs text-slate-400">Manage your profile details for fast B2C checkout and quotation autofill.</p>
            </div>
          </div>

          {profileSuccessMessage && (
            <div className="bg-green-50 border border-green-200 text-green-800 text-xs px-4 py-3 rounded-xl mb-6 flex justify-between items-center animate-fade-in">
              <span>{profileSuccessMessage}</span>
              <button onClick={() => setProfileSuccessMessage('')} className="font-bold text-slate-400 hover:text-slate-600">✕</button>
            </div>
          )}

          <div className="flex flex-col gap-5">
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5 block">Full Name</label>
              <div className="relative">
                <span className="absolute left-3.5 top-3.5 text-slate-400"><User size={16} /></span>
                <input 
                  type="text"
                  value={b2cProfile.fullName}
                  onChange={(e) => setB2cProfile({ ...b2cProfile, fullName: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all font-medium text-slate-800"
                  placeholder="E.g. Rahul Sharma"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5 block">Email Address</label>
              <div className="relative">
                <span className="absolute left-3.5 top-3.5 text-slate-400"><Mail size={16} /></span>
                <input 
                  type="email"
                  value={b2cProfile.email}
                  onChange={(e) => setB2cProfile({ ...b2cProfile, email: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all font-medium text-slate-800"
                  placeholder="E.g. rahul@example.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5 block">Country Code</label>
                <select
                  value={b2cProfile.countryCode}
                  onChange={(e) => setB2cProfile({ ...b2cProfile, countryCode: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs outline-none focus:border-orange-500 font-medium text-slate-800"
                >
                  <option value="+91">🇮🇳 +91</option>
                  <option value="+977">🇳🇵 +977</option>
                  <option value="+1">🇺🇸 +1</option>
                  <option value="+44">🇬🇧 +44</option>
                  <option value="+61">🇦🇺 +61</option>
                  <option value="+65">🇸🇬 +65</option>
                  <option value="+971">🇦🇪 +971</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5 block">Phone Number</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3.5 text-slate-400"><Phone size={16} /></span>
                  <input 
                    type="tel"
                    value={b2cProfile.phone}
                    onChange={(e) => setB2cProfile({ ...b2cProfile, phone: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all font-medium text-slate-800"
                    placeholder="E.g. 9876543210"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5 block">Billing Address</label>
              <textarea 
                value={b2cProfile.address}
                onChange={(e) => setB2cProfile({ ...b2cProfile, address: e.target.value })}
                rows="3"
                className="w-full px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all font-medium text-slate-800 resize-none"
                placeholder="E.g. Sector 5, Salt Lake, Kolkata, West Bengal"
              />
            </div>

            <button 
              onClick={() => {
                setProfileSuccessMessage('Profile saved successfully! Details will auto-fill next checkout.');
                setTimeout(() => setProfileSuccessMessage(''), 4000);
              }}
              className="mt-2 w-full bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs uppercase tracking-wider py-3 px-6 rounded-xl shadow-md transition hover:-translate-y-0.5 active:translate-y-0"
            >
              Save Profile Changes
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderB2bProfile = () => {
    const handleLogoUpload = (e) => {
      const file = e.target.files[0];
      if (file) {
        if (file.size > 2000000) {
          window.alert("Logo size must be less than 2MB.");
          return;
        }
        const reader = new FileReader();
        reader.onload = (event) => {
          setB2bProfile(prev => ({
            ...prev,
            agencyLogo: event.target.result
          }));
        };
        reader.readAsDataURL(file);
      }
    };

    return (
      <div className="max-w-5xl mx-auto py-6 animate-fade-in">
        <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-lg">
          <div className="flex items-center gap-4 mb-6 border-b border-slate-100 pb-4">
            <div className="bg-emerald-100 text-emerald-600 p-3.5 rounded-2xl">
              <Briefcase size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-extrabold text-slate-805 font-heading">Agent Partner Profile</h2>
              <p className="text-xs text-slate-400">Configure your personal information and agency branding to white-label generated invoices/quotes.</p>
            </div>
          </div>

          {profileSuccessMessage && (
            <div className="bg-green-50 border border-green-200 text-green-800 text-xs px-4 py-3 rounded-xl mb-6 flex justify-between items-center animate-fade-in">
              <span>{profileSuccessMessage}</span>
              <button onClick={() => setProfileSuccessMessage('')} className="font-bold text-slate-400 hover:text-slate-600">✕</button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left Column: Personal Agent Information */}
            <div className="flex flex-col gap-5 border-r border-slate-100 pr-0 md:pr-8">
              <h3 className="font-extrabold text-sm uppercase text-slate-500 tracking-wider border-b border-slate-100 pb-2">
                Agent Account Details
              </h3>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5 block">Full Name</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3.5 text-slate-400"><User size={16} /></span>
                  <input 
                    type="text"
                    value={b2bProfile.agentName}
                    onChange={(e) => setB2bProfile({ ...b2bProfile, agentName: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all font-medium text-slate-800"
                    placeholder="Horizon Travel Agent"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5 block">Contact Email</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3.5 text-slate-400"><Mail size={16} /></span>
                  <input 
                    type="email"
                    value={b2bProfile.email}
                    onChange={(e) => setB2bProfile({ ...b2bProfile, email: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all font-medium text-slate-800"
                    placeholder="agent@horizontravel.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5 block">Country Code</label>
                  <select
                    value={b2bProfile.countryCode}
                    onChange={(e) => setB2bProfile({ ...b2bProfile, countryCode: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs outline-none focus:border-emerald-500 font-medium text-slate-800"
                  >
                    <option value="+91">🇮🇳 +91</option>
                    <option value="+977">🇳🇵 +977</option>
                    <option value="+1">🇺🇸 +1</option>
                    <option value="+44">🇬🇧 +44</option>
                    <option value="+61">🇦🇺 +61</option>
                    <option value="+65">🇸🇬 +65</option>
                    <option value="+971">🇦🇪 +971</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5 block">Phone Number</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-3.5 text-slate-400"><Phone size={16} /></span>
                    <input 
                      type="tel"
                      value={b2bProfile.phone}
                      onChange={(e) => setB2bProfile({ ...b2bProfile, phone: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all font-medium text-slate-800"
                      placeholder="9876543210"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5 block">Contact Address</label>
                <textarea 
                  value={b2bProfile.address}
                  onChange={(e) => setB2bProfile({ ...b2bProfile, address: e.target.value })}
                  rows="2"
                  className="w-full px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all font-medium text-slate-800 resize-none"
                  placeholder="123 Travel Street, Delhi"
                />
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col gap-3">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Account Credentials (Read-only)</span>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-500">Agent ID:</span>
                    <strong className="block text-slate-800 font-extrabold mt-0.5">{currentUser?.id}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Partner Status:</span>
                    <strong className="block text-emerald-600 font-extrabold mt-0.5">Gold Tier (10% Comm.)</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Custom Agency Branding (White-Label details) */}
            <div className="flex flex-col gap-5">
              <h3 className="font-extrabold text-sm uppercase text-slate-500 tracking-wider border-b border-slate-100 pb-2">
                White-Label Agency Branding
              </h3>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5 block">Agency Name</label>
                <input 
                  type="text"
                  value={b2bProfile.agencyName}
                  onChange={(e) => setB2bProfile({ ...b2bProfile, agencyName: e.target.value })}
                  className="w-full px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all font-medium text-slate-800"
                  placeholder="E.g. Horizon Travel Partners"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5 block">Agency Email (for Voucher Header)</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3.5 text-slate-400"><Mail size={16} /></span>
                  <input 
                    type="email"
                    value={b2bProfile.agencyEmail}
                    onChange={(e) => setB2bProfile({ ...b2bProfile, agencyEmail: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all font-medium text-slate-800"
                    placeholder="booking@horizontravel.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5 block">Agency Phone</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-3.5 text-slate-400"><Phone size={16} /></span>
                    <input 
                      type="tel"
                      value={b2bProfile.agencyPhone}
                      onChange={(e) => setB2bProfile({ ...b2bProfile, agencyPhone: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all font-medium text-slate-800"
                      placeholder="9876543210"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5 block">Agency Website</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-3.5 text-slate-400"><Globe size={16} /></span>
                    <input 
                      type="text"
                      value={b2bProfile.agencyWebsite}
                      onChange={(e) => setB2bProfile({ ...b2bProfile, agencyWebsite: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all font-medium text-slate-800"
                      placeholder="www.horizontravel.com"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5 block">Agency Address</label>
                <textarea 
                  value={b2bProfile.agencyAddress}
                  onChange={(e) => setB2bProfile({ ...b2bProfile, agencyAddress: e.target.value })}
                  rows="2"
                  className="w-full px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all font-medium text-slate-800 resize-none"
                  placeholder="123 Travel Street, Delhi"
                />
              </div>

              <div className="border border-dashed border-slate-200 p-4 rounded-2xl flex flex-col gap-3">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Custom Agency Logo</span>
                
                {/* Logo Preview Block */}
                <div className="flex items-center gap-4">
                  <div className="w-24 h-16 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center overflow-hidden p-2">
                    {b2bProfile.agencyLogo ? (
                      <img src={b2bProfile.agencyLogo} alt="Preview" className="max-w-full max-h-full object-contain" />
                    ) : (
                      <span className="text-[10px] text-slate-400 font-bold">No Custom Logo</span>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5 flex-1">
                    <div className="flex gap-2">
                      <label className="cursor-pointer bg-slate-100 hover:bg-slate-205 text-slate-700 text-[10px] font-bold py-1.5 px-3 rounded-lg flex items-center gap-1 transition">
                        <Upload size={12} />
                        Upload File
                        <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                      </label>
                      {b2bProfile.agencyLogo && (
                        <button 
                          onClick={() => setB2bProfile(prev => ({ ...prev, agencyLogo: '' }))}
                          className="bg-red-50 hover:bg-red-100 text-red-600 text-[10px] font-bold py-1.5 px-3 rounded-lg flex items-center gap-1 transition"
                        >
                          <Trash2 size={12} />
                          Remove
                        </button>
                      )}
                    </div>
                    <span className="text-[9px] text-slate-400">Supports PNG, JPEG under 2MB. Converts to client-side storage.</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Or Logo Image URL</label>
                  <input 
                    type="text"
                    value={b2bProfile.agencyLogo || ''}
                    onChange={(e) => setB2bProfile(prev => ({ ...prev, agencyLogo: e.target.value }))}
                    className="w-full px-3 py-1.5 text-[10px] bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 transition-all font-medium text-slate-800"
                    placeholder="https://example.com/logo.png"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 mt-8 pt-6 flex justify-end">
            <button 
              onClick={() => {
                setProfileSuccessMessage('Partner branding and agent details saved successfully!');
                setTimeout(() => setProfileSuccessMessage(''), 4000);
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs uppercase tracking-wider py-3 px-8 rounded-xl shadow-md transition hover:-translate-y-0.5 active:translate-y-0"
            >
              Save Changes & Apply Branding
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderAdminProfile = () => {
    const handleAdminLogoUpload = (e) => {
      const file = e.target.files[0];
      if (file) {
        if (file.size > 2000000) {
          window.alert("Logo size must be less than 2MB.");
          return;
        }
        const reader = new FileReader();
        reader.onload = (event) => {
          setAdminProfile(prev => ({
            ...prev,
            companyLogo: event.target.result
          }));
        };
        reader.readAsDataURL(file);
      }
    };

    return (
      <div className="max-w-5xl mx-auto py-6 animate-fade-in">
        <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-lg">
          <div className="flex items-center gap-4 mb-6 border-b border-slate-100 pb-4">
            <div className="bg-orange-100 text-orange-600 p-3.5 rounded-2xl">
              <User size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-extrabold text-slate-800 font-heading">Company Profile Settings</h2>
              <p className="text-xs text-slate-400">Configure your company identity and default branding used on all B2C client quotes and invoices.</p>
            </div>
          </div>

          {profileSuccessMessage && (
            <div className="bg-green-50 border border-green-200 text-green-800 text-xs px-4 py-3 rounded-xl mb-6 flex justify-between items-center animate-fade-in">
              <span>{profileSuccessMessage}</span>
              <button onClick={() => setProfileSuccessMessage('')} className="font-bold text-slate-400 hover:text-slate-600">✕</button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left Column: Company Details */}
            <div className="flex flex-col gap-5 border-r border-slate-100 pr-0 md:pr-8">
              <h3 className="font-extrabold text-sm uppercase text-slate-500 tracking-wider border-b border-slate-100 pb-2">
                Company Details
              </h3>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5 block">Company Name</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3.5 text-slate-400"><Briefcase size={16} /></span>
                  <input 
                    type="text"
                    value={adminProfile.companyName}
                    onChange={(e) => setAdminProfile({ ...adminProfile, companyName: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all font-medium text-slate-800"
                    placeholder="E.g. Nepal Tour Organizer"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5 block">Contact Email</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3.5 text-slate-400"><Mail size={16} /></span>
                  <input 
                    type="email"
                    value={adminProfile.email}
                    onChange={(e) => setAdminProfile({ ...adminProfile, email: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all font-medium text-slate-800"
                    placeholder="booking@nepaltravelquote.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5 block">Phone Number</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-3.5 text-slate-400"><Phone size={16} /></span>
                    <input 
                      type="tel"
                      value={adminProfile.phone}
                      onChange={(e) => setAdminProfile({ ...adminProfile, phone: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all font-medium text-slate-800"
                      placeholder="+977 1234567890"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5 block">Website</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-3.5 text-slate-400"><Globe size={16} /></span>
                    <input 
                      type="text"
                      value={adminProfile.website}
                      onChange={(e) => setAdminProfile({ ...adminProfile, website: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all font-medium text-slate-800"
                      placeholder="www.nepaltravelquote.com"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5 block">Office Address</label>
                <textarea 
                  value={adminProfile.address}
                  onChange={(e) => setAdminProfile({ ...adminProfile, address: e.target.value })}
                  rows="3"
                  className="w-full px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all font-medium text-slate-800 resize-none"
                  placeholder="Kathmandu, Nepal"
                />
              </div>
            </div>

            {/* Right Column: Custom Branding (Logo) */}
            <div className="flex flex-col gap-5">
              <h3 className="font-extrabold text-sm uppercase text-slate-500 tracking-wider border-b border-slate-100 pb-2">
                Company Branding (Logo)
              </h3>

              <div className="border border-dashed border-slate-200 p-6 rounded-2xl flex flex-col gap-4">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Default Company Logo</span>
                
                {/* Logo Preview Block */}
                <div className="flex items-center gap-4">
                  <div className="w-32 h-20 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center overflow-hidden p-2">
                    {adminProfile.companyLogo ? (
                      <img src={adminProfile.companyLogo} alt="Preview" className="max-w-full max-h-full object-contain" />
                    ) : (
                      <span className="text-[10px] text-slate-400 font-bold">No Custom Logo</span>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 flex-1">
                    <div className="flex gap-2">
                      <label className="cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold py-2 px-4 rounded-lg flex items-center gap-1.5 transition">
                        <Upload size={14} />
                        Upload Logo
                        <input type="file" accept="image/*" onChange={handleAdminLogoUpload} className="hidden" />
                      </label>
                      {adminProfile.companyLogo && (
                        <button 
                          onClick={() => setAdminProfile(prev => ({ ...prev, companyLogo: '' }))}
                          className="bg-red-50 hover:bg-red-100 text-red-600 text-[10px] font-bold py-2 px-4 rounded-lg flex items-center gap-1.5 transition"
                        >
                          <Trash2 size={14} />
                          Remove
                        </button>
                      )}
                    </div>
                    <span className="text-[9px] text-slate-400">Supports PNG, JPEG under 2MB.</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 mt-2">
                  <label className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Or Logo Image URL</label>
                  <input 
                    type="text"
                    value={adminProfile.companyLogo || ''}
                    onChange={(e) => setAdminProfile(prev => ({ ...prev, companyLogo: e.target.value }))}
                    className="w-full px-3 py-2 text-[10px] bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-orange-500 transition-all font-medium text-slate-800"
                    placeholder="https://example.com/logo.png"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 mt-8 pt-6 flex justify-end">
            <button 
              onClick={() => {
                setProfileSuccessMessage('Company details and branding saved successfully!');
                setTimeout(() => setProfileSuccessMessage(''), 4000);
              }}
              className="bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs uppercase tracking-wider py-3 px-8 rounded-xl shadow-md transition hover:-translate-y-0.5 active:translate-y-0"
            >
              Save Changes & Apply Branding
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Admin User Management handlers -- these always run in an admin session
  // (Platform Users Master is an admin-only tab), so they call the real
  // backend directly rather than routing through updateDBState/saveDB.
  // Passwords are never stored or displayed client-side anymore; see
  // handleResetUserPassword for the dedicated reset-password action.
  const handleDeleteUser = async (userId) => {
    if (userId === currentUser?.id) {
      window.alert("You cannot delete your own logged-in administrator account!");
      return;
    }
    if (!window.confirm("Are you sure you want to delete this user account?")) return;
    try {
      await deleteUser(userId);
      const updatedUsers = (db.users || []).filter(u => u.id !== userId);
      setDb({ ...db, users: updatedUsers });
    } catch (err) {
      window.alert("Failed to delete user: " + (err.message || "Unknown error"));
    }
  };

  const handleEditUserSave = async (updatedUser) => {
    if (!updatedUser.fullName || !updatedUser.email) {
      window.alert("Name and Email/Login ID are required fields.");
      return;
    }
    const exists = (db.users || []).some(u => u.id !== updatedUser.id && u.email.toLowerCase() === updatedUser.email.toLowerCase());
    if (exists) {
      window.alert("Another account with this email/Login ID already exists!");
      return;
    }

    try {
      const savedUser = await updateUser(updatedUser.id, updatedUser);
      const updatedUsers = (db.users || []).map(u => u.id === updatedUser.id ? savedUser : u);
      setDb({ ...db, users: updatedUsers });
      setEditingUser(null);
    } catch (err) {
      window.alert("Failed to save user: " + (err.message || "Unknown error"));
    }
  };

  const handleResetUserPassword = async (user) => {
    const newPassword = window.prompt(
      `Enter a new password for ${user.fullName || user.email} (min 6 characters, at least one letter and one number):`
    );
    if (!newPassword) return;
    try {
      await resetUserPassword(user.id, newPassword);
      window.alert("Password reset successfully.");
    } catch (err) {
      window.alert("Failed to reset password: " + (err.message || "Unknown error"));
    }
  };

  const handleAddUserSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!newUserForm.fullName || !newUserForm.email || !newUserForm.password) {
      window.alert("Name, Email/Login ID, and Password are required.");
      return;
    }
    const emailLower = newUserForm.email.toLowerCase().trim();
    const exists = (db.users || []).some(u => u.email.toLowerCase() === emailLower);
    if (exists) {
      window.alert("An account with this email/Login ID already exists!");
      return;
    }

    const newUserPayload = {
      email: emailLower,
      password: newUserForm.password,
      role: newUserForm.role,
      fullName: newUserForm.fullName.trim(),
      phone: newUserForm.phone.trim() || '9999999999',
      countryCode: newUserForm.countryCode,
      ...(newUserForm.role === 'b2b' ? {
        agencyName: newUserForm.agencyName || 'Horizon Travel Partners',
        agencyAddress: newUserForm.agencyAddress || 'New Delhi, India',
        agencyWebsite: newUserForm.agencyWebsite || ''
      } : {})
    };

    try {
      const createdUser = await createUser(newUserPayload);
      setDb({ ...db, users: [...(db.users || []), createdUser] });
      setShowAddUserModal(false);
      setNewUserForm({
        fullName: '',
        email: '',
        password: '',
        role: 'b2c',
        phone: '',
        countryCode: '+91',
        agencyName: '',
        agencyAddress: '',
        agencyWebsite: ''
      });
    } catch (err) {
      window.alert("Failed to create user: " + (err.message || "Unknown error"));
    }
  };

  const renderUsersMaster = () => {
    const filteredUsers = (db.users || []).filter(u => {
      const query = userSearchQuery.toLowerCase().trim();
      if (!query) return true;
      return (
        (u.fullName || '').toLowerCase().includes(query) ||
        (u.email || '').toLowerCase().includes(query) ||
        (u.phone || '').toLowerCase().includes(query) ||
        (u.role || '').toLowerCase().includes(query) ||
        (u.agencyName || '').toLowerCase().includes(query)
      );
    });

    return (
      <div className="flex flex-col gap-6 text-left">
        {/* Header Title block */}
        <div className="flex flex-col md:flex-row justify-between md:items-center bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm gap-4">
          <div>
            <h2 className="text-2xl font-bold font-heading text-[#0f2942]">Platform Users Master</h2>
            <p className="text-slate-500 text-sm mt-1">Manage B2C travelers, B2B agents, and admin accounts. Edit login credentials, reset passwords, or create new logins.</p>
          </div>
          <div>
            <button
              onClick={() => setShowAddUserModal(true)}
              className="bg-orange-650 hover:bg-orange-700 text-white font-extrabold text-xs uppercase tracking-wider py-2.5 px-5 rounded-xl shadow-md transition flex items-center gap-1.5"
            >
              + Create New User
            </button>
          </div>
        </div>

        {/* Search bar */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1 max-w-md relative">
            <input 
              type="text" 
              value={userSearchQuery}
              onChange={(e) => setUserSearchQuery(e.target.value)}
              placeholder="Search users by name, email, role, agency..."
              className="w-full text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded-xl py-2.5 pl-4 pr-10 outline-none focus:border-indigo-500 transition"
            />
            {userSearchQuery && (
              <button 
                onClick={() => setUserSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-650 text-sm"
              >
                ✕
              </button>
            )}
          </div>
          <div className="text-xs text-slate-400 font-bold tracking-wide">
            Showing {filteredUsers.length} of {(db.users || []).length} users
          </div>
        </div>

        {/* User Table container */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-450 uppercase text-[9px] font-extrabold tracking-wider">
                  <th className="py-3 px-6 text-center w-12">#</th>
                  <th className="py-3 px-6">Full Name</th>
                  <th className="py-3 px-6">Login ID (Email)</th>
                  <th className="py-3 px-6">Password</th>
                  <th className="py-3 px-6">Role</th>
                  <th className="py-3 px-6">Phone</th>
                  <th className="py-3 px-6">Metadata</th>
                  <th className="py-3 px-6 text-center w-28">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((user, idx) => (
                  <tr key={user.id} className="hover:bg-slate-50/50 transition">
                    <td className="py-3.5 px-6 text-xs text-slate-450 font-bold text-center">{idx + 1}</td>
                    <td className="py-3.5 px-6 text-xs font-bold text-slate-800">{user.fullName}</td>
                    <td className="py-3.5 px-6 text-xs text-indigo-650 font-semibold">{user.email}</td>
                    <td className="py-3.5 px-6 text-xs">
                      <button
                        type="button"
                        onClick={() => handleResetUserPassword(user)}
                        className="text-[10px] font-bold uppercase tracking-wide text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 hover:bg-amber-100 transition"
                        title="Set a new password for this user"
                      >
                        Reset Password
                      </button>
                    </td>
                    <td className="py-3.5 px-6 text-xs">
                      {user.role === 'admin' && (
                        <span className="inline-block px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-700 border border-indigo-200">
                          Admin
                        </span>
                      )}
                      {user.role === 'b2b' && (
                        <span className="inline-block px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-700 border border-emerald-200">
                          B2B Agent
                        </span>
                      )}
                      {user.role === 'b2c' && (
                        <span className="inline-block px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-orange-100 text-orange-705 border border-orange-200">
                          Traveler
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-6 text-xs text-slate-600 font-mono">
                      <span className="text-slate-400 font-bold mr-1">{user.countryCode}</span>
                      {user.phone}
                    </td>
                    <td className="py-3.5 px-6 text-[10px] text-slate-550 leading-snug">
                      {user.role === 'b2b' ? (
                        <div>
                          <strong>Agency:</strong> {user.agencyName} <br />
                          <strong>Addr:</strong> {user.agencyAddress} <br />
                          <strong>Wallet:</strong> ₹{Number(user.walletBalance || 0).toLocaleString()}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">None</span>
                      )}
                    </td>
                    <td className="py-3.5 px-6 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => setEditingUser({ ...user })}
                          className="bg-transparent text-blue-600 hover:text-blue-800 p-2 hover:bg-blue-50 rounded-xl transition"
                          title="Edit Credentials & Password"
                        >
                          <Edit3 size={14} />
                        </button>
                        {user.role === 'b2b' && (
                          <button
                            type="button"
                            onClick={() => openWalletModal(user)}
                            className="bg-transparent text-purple-600 hover:text-purple-800 p-2 hover:bg-purple-50 rounded-xl transition"
                            title="View Wallet / Add Credit or Debit"
                          >
                            <Wallet size={14} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteUser(user.id)}
                          className="bg-transparent text-red-500 hover:text-red-750 p-2 hover:bg-red-50 rounded-xl transition"
                          title="Delete User Account"
                          disabled={user.id === currentUser?.id}
                          style={{ opacity: user.id === currentUser?.id ? 0.35 : 1 }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderAuthGate = () => {
    const handleFormChange = (field, val) => {
      setAuthForm(prev => ({ ...prev, [field]: val }));
    };

    const handleFormSubmit = async (e) => {
      if (e) e.preventDefault();
      if (authTab === 'login') {
        if (!authForm.email || !authForm.password) {
          window.alert("Please enter both email and password.");
          return;
        }
        await handleLogin(authForm.email, authForm.password);
      } else if (authTab === 'forgot_password') {
        if (!authForm.email) {
          window.alert("Please enter your email address.");
          return;
        }
        // Real accounts now live on the server (see utils/apiClient.js),
        // not in local `db.users` -- there's no public "does this email
        // exist" check, so this stays a generic message rather than
        // falsely claiming an account doesn't exist.
        window.alert(`Your password reset request has been received. Please contact the System Administrator to retrieve your password, or reset it directly from the Users Master tab.`);
        setAuthTab('login');
      } else {
        // Sign up
        if (!authForm.fullName || !authForm.email || !authForm.password || !authForm.phone) {
          window.alert("Please fill in all required fields (Name, Email, Password, Phone).");
          return;
        }
        
        // Agency details check if role is b2b
        if (authRole === 'b2b' && (!authForm.agencyName || !authForm.agencyAddress)) {
          window.alert("Please enter Agency Name and Agency Address for B2B Partner registration.");
          return;
        }
        
        const profileData = {
          fullName: authForm.fullName,
          phone: authForm.phone,
          countryCode: authForm.countryCode,
          role: authRole,
          ...(authRole === 'b2b' ? {
            agencyName: authForm.agencyName,
            agencyAddress: authForm.agencyAddress,
            agencyWebsite: authForm.agencyWebsite || ''
          } : {})
        };
        
        await handleSignup(authForm.email, authForm.password, authRole, profileData);
      }
    };

    const routeConfig = {
      admin: {
        title: "Admin Panel",
        subtitle: "Management Backend",
        allowRegister: false,
        defaultRole: "admin",
        quickLogins: [
          { label: "Admin", email: "admin@nepaltravel.com", pass: "admin", bg: "bg-indigo-950/40 hover:bg-indigo-900/60 border border-indigo-800/40 text-indigo-300", sub: "admin/admin" }
        ]
      },
      b2b: {
        title: "B2B Agent Portal",
        subtitle: "Partner Agency Workspace",
        allowRegister: true,
        defaultRole: "b2b",
        quickLogins: [
          { label: "B2B Agent", email: "agent@horizon.com", pass: "agent", bg: "bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-800/40 text-emerald-300", sub: "agent/agent" }
        ]
      },
      b2c: {
        title: "Traveler Portal",
        subtitle: "Custom Quote Generator",
        allowRegister: true,
        defaultRole: "b2c",
        quickLogins: [
          { label: "Traveler", email: "client@test.com", pass: "client", bg: "bg-orange-950/40 hover:bg-orange-900/60 border border-orange-800/40 text-orange-300", sub: "client/client" }
        ]
      }
    };

    const config = routeConfig[currentRoute] || routeConfig.b2c;

    const isPopup = currentRoute === 'b2c' || currentRoute === 'b2b';
    const backdropClass = isPopup 
      ? "fixed inset-0 w-full h-full flex items-center justify-center bg-slate-900/60 backdrop-blur-md z-[9999] overflow-y-auto px-4 py-8"
      : "fixed inset-0 w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-950 via-slate-900 to-[#0c1a30] z-[9999] overflow-y-auto px-4 py-8";

    return (
      <div className="nepal-portal-root" data-theme={themeMode}>
        <div className={backdropClass}>
          <div className="bg-slate-950/90 border border-slate-800/80 backdrop-blur-xl rounded-3xl shadow-2xl p-6 sm:p-8 max-w-md w-full flex flex-col my-auto relative transition-all duration-300">
            {/* Close button for public users */}
            {isPopup && (
              <button
                type="button"
                onClick={() => {
                  if (currentRoute === 'b2c') setShowB2cLoginPortal(false);
                  if (currentRoute === 'b2b') setShowB2bLoginPortal(false);
                }}
                className="absolute top-4 right-4 text-slate-400 hover:text-white transition font-bold text-lg select-none cursor-pointer"
              >
                ✕
              </button>
            )}
            {/* Theme toggle — top-left corner for admin login */}
            {!isPopup && (
              <div className="absolute top-4 left-4">
                <button
                  type="button"
                  onClick={toggleTheme}
                  title={themeMode === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm border border-amber-700/40 bg-[#1A1710]/80 text-amber-300 hover:bg-[#221E14] hover:border-amber-500 transition-all duration-300 shadow-md"
                >
                  {themeMode === 'dark' ? '☀️' : '🌙'}
                </button>
              </div>
            )}
          
          {/* Brand Header */}
          <div className="text-center mb-6">
            <span className="inline-block text-4xl mb-2 select-none">🇳🇵</span>
            <h2 className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-amber-300 tracking-wider uppercase">
              {config.title}
            </h2>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1 font-bold">
              {config.subtitle}
            </p>
          </div>

          {/* Access Denied / Switch Account Banner */}
          {currentUser && (
            <div className="bg-red-950/40 border border-red-800/40 text-red-300 rounded-2xl p-3 mb-6 text-center text-xs">
              <p className="font-semibold mb-1">Access Denied</p>
              <p className="text-[10px] text-red-400 mb-2">
                You are currently signed in as <span className="font-bold">{currentUser.fullName}</span> ({currentUser.role === 'admin' ? 'Admin' : currentUser.role === 'b2b' ? 'B2B Partner' : 'Traveler'}), which is not authorized for this page.
              </p>
              <button
                type="button"
                onClick={handleLogout}
                className="bg-red-800/40 hover:bg-red-700/60 text-white font-bold py-1 px-3 rounded-lg text-[10px] transition"
              >
                Log Out to Switch Account
              </button>
            </div>
          )}

          {/* Tab Switcher */}
          {authTab === 'forgot_password' ? (
            <div className="text-center py-2.5 mb-6 bg-orange-950/20 border border-orange-900/30 rounded-2xl">
              <span className="text-[10px] text-orange-400 font-extrabold uppercase tracking-widest">Password Recovery Request</span>
            </div>
          ) : config.allowRegister ? (
            <div className="flex bg-slate-900/80 p-1.5 rounded-2xl mb-6 border border-slate-800/40">
              <button 
                type="button"
                onClick={() => {
                  setAuthTab('login');
                  setAuthForm(prev => ({ ...prev, email: '', password: '' }));
                }}
                className={`flex-1 text-center py-2.5 text-xs font-black uppercase tracking-wider rounded-xl transition duration-200 ${
                  authTab === 'login' 
                    ? 'bg-gradient-to-r from-orange-600 to-amber-500 text-white shadow-lg' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
                }`}
              >
                Sign In
              </button>
              <button 
                type="button"
                onClick={() => {
                  setAuthTab('register');
                  setAuthForm(prev => ({ 
                    ...prev, 
                    email: '', 
                    password: '', 
                    fullName: '', 
                    phone: '', 
                    agencyName: '', 
                    agencyAddress: '', 
                    agencyWebsite: '' 
                  }));
                }}
                className={`flex-1 text-center py-2.5 text-xs font-black uppercase tracking-wider rounded-xl transition duration-200 ${
                  authTab === 'register' 
                    ? 'bg-gradient-to-r from-orange-600 to-amber-500 text-white shadow-lg' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
                }`}
              >
                Register
              </button>
            </div>
          ) : (
            <div className="text-center py-2.5 mb-6 bg-slate-900/40 border border-slate-850/50 rounded-2xl">
              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">Administrator Sign In Only</span>
            </div>
          )}

          <form onSubmit={handleFormSubmit} className="flex flex-col gap-4">
            {authTab === 'register' && (
              <>
                {/* Name */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={authForm.fullName}
                    onChange={(e) => handleFormChange('fullName', e.target.value)}
                    className="w-full px-4 py-2.5 text-xs bg-slate-900/80 border border-slate-800 rounded-xl outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition text-slate-100"
                    placeholder="Enter your name"
                  />
                </div>

                {/* Phone */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Phone Number *</label>
                  <div className="flex gap-2">
                    <select
                      value={authForm.countryCode}
                      onChange={(e) => handleFormChange('countryCode', e.target.value)}
                      className="px-2.5 py-2.5 text-xs bg-slate-900/80 border border-slate-800 rounded-xl outline-none focus:border-orange-500 text-slate-300"
                    >
                      <option value="+91">+91 (IN)</option>
                      <option value="+977">+977 (NP)</option>
                      <option value="+1">+1 (US)</option>
                      <option value="+44">+44 (UK)</option>
                    </select>
                    <input
                      type="tel"
                      required
                      value={authForm.phone}
                      onChange={(e) => handleFormChange('phone', e.target.value)}
                      className="flex-1 px-4 py-2.5 text-xs bg-slate-900/80 border border-slate-800 rounded-xl outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition text-slate-100"
                      placeholder="Enter phone number"
                    />
                  </div>
                </div>

                {/* B2B Specific Fields */}
                {authRole === 'b2b' && (
                  <div className="border-t border-slate-800/85 mt-2 pt-3 flex flex-col gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Agency Name *</label>
                      <input
                        type="text"
                        required
                        value={authForm.agencyName}
                        onChange={(e) => handleFormChange('agencyName', e.target.value)}
                        className="w-full px-4 py-2.5 text-xs bg-slate-900/80 border border-slate-800 rounded-xl outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition text-slate-100"
                        placeholder="Agency Name Ltd"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Agency Address *</label>
                      <input
                        type="text"
                        required
                        value={authForm.agencyAddress}
                        onChange={(e) => handleFormChange('agencyAddress', e.target.value)}
                        className="w-full px-4 py-2.5 text-xs bg-slate-900/80 border border-slate-800 rounded-xl outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition text-slate-100"
                        placeholder="City, Country"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Agency Website (Optional)</label>
                      <input
                        type="text"
                        value={authForm.agencyWebsite}
                        onChange={(e) => handleFormChange('agencyWebsite', e.target.value)}
                        className="w-full px-4 py-2.5 text-xs bg-slate-900/80 border border-slate-800 rounded-xl outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition text-slate-100"
                        placeholder="www.agency.com"
                      />
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Email */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Email Address *</label>
              <input
                type="email"
                required
                value={authForm.email}
                onChange={(e) => handleFormChange('email', e.target.value)}
                className="w-full px-4 py-2.5 text-xs bg-slate-900/80 border border-slate-800 rounded-xl outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition text-slate-100"
                placeholder="name@domain.com"
              />
            </div>

            {/* Password */}
            {authTab !== 'forgot_password' && (
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Password *</label>
                <input
                  type="password"
                  required
                  value={authForm.password}
                  onChange={(e) => handleFormChange('password', e.target.value)}
                  className="w-full px-4 py-2.5 text-xs bg-slate-900/80 border border-slate-800 rounded-xl outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition text-slate-100"
                  placeholder="••••••••"
                />
              </div>
            )}

            {authTab === 'login' && (
              <div className="text-right -mt-1 bg-transparent">
                <button
                  type="button"
                  onClick={() => setAuthTab('forgot_password')}
                  className="text-[10px] text-orange-400 hover:text-orange-300 font-bold uppercase tracking-wider transition bg-transparent"
                >
                  Forgot Password?
                </button>
              </div>
            )}

            <button
              type="submit"
              className="w-full mt-2 bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-extrabold text-xs uppercase tracking-wider py-3 rounded-xl shadow-lg transition duration-200 hover:-translate-y-0.5 active:translate-y-0"
            >
              {authTab === 'login' ? 'Sign In to Portal' : authTab === 'forgot_password' ? 'Request Password Reset' : 'Create Account'}
            </button>

            {authTab === 'forgot_password' && (
              <div className="text-center mt-1">
                <button
                  type="button"
                  onClick={() => setAuthTab('login')}
                  className="text-[10px] text-slate-400 hover:text-slate-200 font-bold uppercase tracking-wider transition bg-transparent"
                >
                  ← Back to Sign In
                </button>
              </div>
            )}
          </form>

          {isPopup && (
            <div className="text-center mt-3">
              <button
                type="button"
                onClick={() => {
                  if (currentRoute === 'b2c') setShowB2cLoginPortal(false);
                  if (currentRoute === 'b2b') setShowB2bLoginPortal(false);
                  setAuthForm({
                    email: '', password: '', fullName: '', phone: '', countryCode: '+91',
                    agencyName: '', agencyAddress: '', agencyWebsite: ''
                  });
                }}
                className="w-full text-center text-xs text-slate-400 hover:text-white border border-slate-800 rounded-xl py-2 hover:bg-slate-900 transition font-bold cursor-pointer"
              >
                Cancel and Return to Portal
              </button>
            </div>
          )}

          {/* Quick-Login Evaluator Section -- LOCAL DEVELOPMENT ONLY.
              These buttons print a working email and password on the page and
              log you straight in on one click. On the admin gate that was a
              full administrator account advertised on a public URL: anyone who
              reached #/admin could read the credentials and click through.
              Kept for local demos, where the host is localhost/127.0.0.1, and
              never rendered on the live site. */}
          {isLocalDevHost && (
            <div className="border-t border-slate-800/80 mt-6 pt-5">
              <h4 className="text-[9px] uppercase font-extrabold text-amber-500 tracking-widest mb-3 text-center">
                Evaluator Quick-Logins (Local Dev Only)
              </h4>
              <div className="flex flex-col gap-2">
                {config.quickLogins.map((ql, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleLogin(ql.email, ql.pass)}
                    className={`${ql.bg} rounded-xl p-2.5 text-center transition flex flex-col items-center gap-0.5 w-full`}
                  >
                    <span className="text-[9px] font-black uppercase tracking-wider">{ql.label}</span>
                    <span className="text-[7px] opacity-80">{ql.email} / {ql.pass}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
      </div>
    );
  };

  // ── Route Authorization ───────────────────────────────────────────────────────
  const isAuthorizedForRoute = () => {
    if (currentRoute === 'b2c') return true; // B2C is public layout, auth gate is modal
    if (currentRoute === 'b2b') return true; // B2B is public layout, auth gate is modal
    if (!currentUser) return false;
    if (currentUser.role === 'admin') return true;
    return currentUser.role === currentRoute;
  };

  // Real admin auth (see handleLogin) is now the only gate before the
  // Admin Panel -- the old hardcoded 4-digit PIN screen has been removed.
  if (!isAuthorizedForRoute()) return renderAuthGate();

  // ── Theme Toggle Button (reusable) ──────────────────────────────────────────
  const ThemeToggle = ({ className = '' }) => (
    <button
      type="button"
      onClick={toggleTheme}
      title={themeMode === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      className={`w-9 h-9 rounded-full flex items-center justify-center text-base border transition-all duration-300 ${
        themeMode === 'dark'
          ? 'bg-[#221E14] border-amber-700/40 text-amber-300 hover:bg-[#2d2819] hover:border-amber-500'
          : 'bg-white border-amber-300 text-amber-600 hover:bg-amber-50 hover:border-amber-500'
      } shadow-md ${className}`}
    >
      {themeMode === 'dark' ? '☀️' : '🌙'}
    </button>
  );

  return (
    <div className="nepal-portal-root" data-theme={themeMode}>
      <div className="app-container">
      {/* Sidebar Navigation */}
      {view !== 'b2c' && (
        <aside className="sidebar no-print">
        <div className="sidebar-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="logo-icon">🇳🇵</div>
            <div>
              <h1 className="brand-name">NEPAL TOUR</h1>
              <div className="brand-sub font-semibold tracking-wider">
                {view === 'admin' ? 'Admin Backend' : view === 'b2b' ? 'B2B Partner' : 'Traveler Portal'}
              </div>
            </div>
          </div>
          {/* Dark / Light theme toggle */}
          <ThemeToggle />
        </div>

        {view === 'b2c' && (
          <div className="px-4 py-2 mt-4 border-t border-slate-800">
            <div className="text-[10px] text-slate-500 font-semibold tracking-wider uppercase mb-2">Client Navigation</div>
            <ul className="list-none flex flex-col gap-1">
              {[
                { tab: 'packages', label: 'Preset Packages', icon: <Layers size={12} /> },
                { tab: 'wizard', label: 'Custom Planner', icon: <Compass size={12} /> },
                { tab: 'profile', label: 'My Profile', icon: <User size={12} /> }
              ].map(item => (
                <li key={item.tab}>
                  <button
                    onClick={() => setB2cSubView(item.tab)}
                    className={`w-full text-left text-xs py-1.5 px-3 rounded flex items-center gap-2 ${b2cSubView === item.tab ? 'bg-orange-700 text-white font-medium' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {view === 'b2b' && (
          <div className="px-4 py-2 mt-4 border-t border-slate-800">
            <div className="text-[10px] text-slate-500 font-semibold tracking-wider uppercase mb-2">Agent Navigation</div>
            <ul className="list-none flex flex-col gap-1">
              {[
                { tab: 'dashboard', label: 'Agent Dashboard', icon: <TrendingUp size={12} /> },
                { tab: 'quotes', label: 'My Quotes', icon: <FileText size={12} /> },
                { tab: 'wallet', label: 'My Wallet', icon: <Wallet size={12} /> },
                { tab: 'packages', label: 'Preset Packages', icon: <Layers size={12} /> },
                { tab: 'wizard', label: 'Custom Planner', icon: <Compass size={12} /> },
                { tab: 'profile', label: 'My Profile', icon: <User size={12} /> }
              ].map(item => (
                <li key={item.tab}>
                  <button 
                    onClick={() => setB2bSubView(item.tab)}
                    className={`w-full text-left text-xs py-1.5 px-3 rounded flex items-center gap-2 ${b2bSubView === item.tab ? 'bg-emerald-700 text-white font-medium' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {view === 'admin' && (
          <div className="px-4 py-2 mt-4 border-t border-slate-800">
            <div className="text-[10px] text-slate-500 font-semibold tracking-wider uppercase mb-2">Admin Sheets (INR)</div>
            <ul className="list-none flex flex-col gap-1">
              {['dashboard', 'cities', 'hotels', 'activities', 'vehicles', 'packages', 'leads', 'users', 'profile'].map(tab => (
                <li key={tab}>
                  <button 
                    onClick={() => setActiveAdminTab(tab)}
                    className={`w-full text-left text-xs py-1.5 px-3 rounded flex items-center gap-2 ${activeAdminTab === tab ? 'bg-orange-700 text-white font-medium' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                  >
                    {tab === 'dashboard' && <TrendingUp size={12} />}
                    {tab === 'cities' && <Compass size={12} />}
                    {tab === 'hotels' && <Hotel size={12} />}
                    {tab === 'activities' && <Compass size={12} />}
                    {tab === 'vehicles' && <Car size={12} />}
                    {tab === 'packages' && <Layers size={12} />}
                    {tab === 'leads' && <Users size={12} />}
                    {tab === 'users' && <Users size={12} />}
                    {tab === 'profile' && <User size={12} />}
                    <span className="capitalize">{tab === 'leads' ? 'B2C Leads' : tab === 'users' ? 'Users Master' : tab === 'profile' ? 'My Profile' : `${tab} ${tab === 'dashboard' ? '' : 'Editor'}`}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {view === 'b2c' && b2cSubView === 'customize' && (
          <div className="p-4 mt-auto flex flex-col gap-2">
            <button 
              onClick={() => setB2cSubView('wizard')}
              className="w-full btn btn-secondary btn-sm flex items-center justify-center gap-2"
            >
              ← Trip Intake Wizard
            </button>
            <button 
              onClick={() => setB2cSubView('packages')}
              className="w-full btn btn-secondary btn-sm flex items-center justify-center gap-2 animate-pulse"
            >
              ← Preset Packages
            </button>
          </div>
        )}

        {view === 'b2b' && b2bSubView === 'customize' && (
          <div className="p-4 mt-auto flex flex-col gap-2">
            <button 
              onClick={() => setB2bSubView('wizard')}
              className="w-full btn btn-secondary btn-sm flex items-center justify-center gap-2"
            >
              ← Trip Intake Wizard
            </button>
            <button 
              onClick={() => setB2bSubView('packages')}
              className="w-full btn btn-secondary btn-sm flex items-center justify-center gap-2"
            >
              ← Preset Packages
            </button>
            <button 
              onClick={() => setB2bSubView('dashboard')}
              className="w-full btn btn-secondary btn-sm flex items-center justify-center gap-2"
            >
              ← Agent Dashboard
            </button>
          </div>
        )}

        <div className="sidebar-footer border-t border-slate-800/80 pt-4 mt-auto flex flex-col gap-3">
          {currentUser && (
            <div className="flex items-center gap-3 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/40">
              {/* User Avatar */}
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center font-black text-xs text-white uppercase shrink-0 shadow-md">
                {currentUser.fullName ? currentUser.fullName.charAt(0) : (currentUser.email ? currentUser.email.charAt(0) : 'U')}
              </div>
              {/* Name and Role Badge */}
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-slate-200 truncate leading-tight">
                  {currentUser.fullName || 'User'}
                </div>
                <div className="mt-1">
                  {currentUser.role === 'admin' && (
                    <span className="inline-block px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-indigo-950 text-indigo-400 border border-indigo-800/50">
                      System Admin
                    </span>
                  )}
                  {currentUser.role === 'b2b' && (
                    <span className="inline-block px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-emerald-950 text-emerald-400 border border-emerald-800/50">
                      Partner Agent
                    </span>
                  )}
                  {currentUser.role === 'b2c' && (
                    <span className="inline-block px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-orange-950 text-orange-400 border border-orange-800/50">
                      Traveler
                    </span>
                  )}
                </div>
              </div>
              {/* Logout Button */}
              <button 
                type="button"
                onClick={handleLogout}
                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-red-950/60 border border-slate-750 hover:border-red-800/50 flex items-center justify-center text-slate-400 hover:text-red-400 transition"
                title="Log Out"
              >
                <LogOut size={13} />
              </button>
            </div>
          )}
          {view === 'b2b' ? (
            <div className="text-[9px] text-slate-500 flex justify-between px-1">
              <span>B2B Portal</span>
              <span className="text-emerald-450 font-bold">Comm: 10%</span>
            </div>
          ) : (
            <div className="text-[9px] text-slate-500 text-center px-1">
              Nepal Quote Platform v2.1
            </div>
          )}
        </div>
      </aside>
      )}

      {/* Main Content Workspace */}
      <main className="main-content">
        
        {/* Top Navbar */}
        <header className="top-nav no-print">
          {view === 'b2c' ? (
            <div className="w-full flex items-center justify-between gap-4">
              {/* Left Side: Brand Logo & Title */}
              <div 
                onClick={() => setB2cSubView('packages')}
                className="flex items-center gap-3 cursor-pointer select-none hover:opacity-90 active:scale-95 transition"
                title="Go to Home Page"
              >
                <div className="logo-icon bg-orange-650 text-white font-black px-2 py-1 rounded text-xs">🇳🇵</div>
                <div className="text-left">
                  <h1 className="brand-name text-xs md:text-sm font-extrabold text-slate-800 tracking-tight leading-none font-heading">NEPAL TOUR</h1>
                  <span className="text-[9px] uppercase tracking-wider font-extrabold text-orange-600 block mt-0.5">Traveler Portal</span>
                </div>
              </div>



              {/* Right Side: Account Details & Logout */}
              <div className="flex items-center gap-4">
                <span className="hidden sm:inline-block text-xs bg-orange-100 text-orange-850 font-bold px-2.5 py-1 rounded-full border border-orange-200/40">
                  Live Pricing (INR ₹)
                </span>

                {!currentUser && (
                  <button 
                    type="button"
                    onClick={() => {
                      setShowB2cLoginPortal(true);
                      setAuthRole('b2c');
                      setAuthTab('login');
                    }}
                    className="text-xs bg-orange-600 hover:bg-orange-700 text-white font-extrabold px-3 py-1.5 rounded-xl border border-orange-700 shadow-sm transition active:scale-95 cursor-pointer"
                  >
                    Sign In / Register
                  </button>
                )}
                
                {/* The B2C portal has no sidebar (see `view !== 'b2c'` on the
                    <aside> above), so its navigation lives in this header. */}
                {currentUser && (
                  <button
                    type="button"
                    onClick={() => setB2cSubView('quotes')}
                    className={`hidden sm:flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border transition ${
                      b2cSubView === 'quotes'
                        ? 'bg-orange-50 border-orange-200 text-orange-700 shadow-inner'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Save size={12} /> My Quotes
                  </button>
                )}

                {currentUser && (
                  <button
                    type="button"
                    onClick={() => setB2cSubView('bookings')}
                    className={`hidden sm:flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border transition ${
                      b2cSubView === 'bookings'
                        ? 'bg-orange-50 border-orange-200 text-orange-700 shadow-inner'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <FileText size={12} /> My Bookings
                  </button>
                )}

                {currentUser && (
                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/65 p-1 rounded-xl pr-3">
                    {/* Clickable Profile Badge */}
                    <div
                      onClick={() => setB2cSubView('profile')}
                      className={`flex items-center gap-2 p-0.5 rounded-lg transition cursor-pointer select-none ${
                        b2cSubView === 'profile'
                          ? 'bg-orange-50 border border-orange-200/50 shadow-inner'
                          : 'hover:bg-slate-200/50'
                      }`}
                      title="Edit Profile Settings"
                    >
                      {/* User Avatar */}
                      <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center font-black text-xs text-white uppercase shadow-sm">
                        {currentUser.fullName ? currentUser.fullName.charAt(0) : (currentUser.email ? currentUser.email.charAt(0) : 'U')}
                      </div>
                      {/* User Name */}
                      <div className="text-left hidden lg:block pr-1">
                        <div className="text-xs font-extrabold text-slate-800 leading-none">
                          {currentUser.fullName || 'Traveler'}
                        </div>
                        <span className="text-[8px] uppercase tracking-wider font-extrabold text-orange-600 block mt-0.5">Edit Profile</span>
                      </div>
                    </div>
                    
                    {/* Logout Button */}
                    <button 
                      type="button"
                      onClick={handleLogout}
                      className="w-6 h-6 rounded-lg bg-white hover:bg-red-50 border border-slate-200 hover:border-red-200 flex items-center justify-center text-slate-450 hover:text-red-500 transition shadow-sm ml-1"
                      title="Log Out"
                    >
                      <LogOut size={12} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="page-title flex items-center gap-2">
                {view === 'b2b' ? (
                  <>
                    <Briefcase className="text-emerald-600" />
                    <span>Nepal Travel B2B Agent Partner Portal (INR ₹)</span>
                  </>
                ) : (
                  <>
                    {activeAdminTab === 'dashboard' && (
                      <>
                        <TrendingUp className="text-blue-600" />
                        <span>Admin Dashboard (INR ₹)</span>
                      </>
                    )}
                    {activeAdminTab === 'cities' && (
                      <>
                        <MapPin className="text-blue-600" />
                        <span>Admin Cities Master (INR ₹)</span>
                      </>
                    )}
                    {activeAdminTab === 'hotels' && (
                      <>
                        <Hotel className="text-blue-600" />
                        <span>Admin Hotels Matrix Editor (INR ₹)</span>
                      </>
                    )}
                    {activeAdminTab === 'activities' && (
                      <>
                        <Compass className="text-blue-600" />
                        <span>Admin Excursions & Activities Master (INR ₹)</span>
                      </>
                    )}
                    {activeAdminTab === 'vehicles' && (
                      <>
                        <Car className="text-blue-600" />
                        <span>Admin Vehicles & Routes Editor (INR ₹)</span>
                      </>
                    )}
                    {activeAdminTab === 'packages' && (
                      <>
                        <Layers className="text-blue-600" />
                        <span>Admin Preset Packages Editor (INR ₹)</span>
                      </>
                    )}
                    {activeAdminTab === 'leads' && (
                      <>
                        <Users className="text-blue-600" />
                        <span>Admin B2C Leads Database (INR ₹)</span>
                      </>
                    )}
                    {activeAdminTab === 'profile' && (
                      <>
                        <User className="text-blue-600" />
                        <span>Admin Company Profile Settings (INR ₹)</span>
                      </>
                    )}
                  </>
                )}
              </div>
              
              <div className="flex items-center gap-4">
                {view === 'admin' ? null : (
                  view === 'b2b' ? (
                    <div className="flex items-center gap-3">
                      {!currentUser ? (
                        <button 
                          type="button"
                          onClick={() => {
                            setShowB2bLoginPortal(true);
                            setAuthRole('b2b');
                            setAuthTab('login');
                          }}
                          className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-3 py-1.5 rounded-xl border border-emerald-700 shadow-sm transition active:scale-95 cursor-pointer animate-pulse"
                        >
                          Partner Sign In / Register
                        </button>
                      ) : (
                        <>
                          <span className="text-xs bg-emerald-100 text-emerald-800 font-semibold px-2.5 py-1 rounded">
                            Agent: {currentUser.agencyName || currentUser.fullName}
                          </span>
                          <button 
                            type="button"
                            onClick={handleLogout}
                            className="w-6 h-6 rounded-lg bg-white hover:bg-red-50 border border-slate-200 hover:border-red-200 flex items-center justify-center text-slate-450 hover:text-red-500 transition shadow-sm cursor-pointer"
                            title="Log Out"
                          >
                            <LogOut size={12} />
                          </button>
                        </>
                      )}
                    </div>
                  ) : null
                )}
              </div>
            </>
          )}
        </header>

        {/* Central Canvas Screen */}
        <div className="workspace">
          
          {/* B2C and B2B View Screens */}
          {(view === 'b2c' || view === 'b2b') && (() => {
            const isB2B = view === 'b2b';
            const isB2C = !isB2B;
            const currentSubView = isB2B ? b2bSubView : b2cSubView;
            const setSubView = isB2B ? setB2bSubView : setB2cSubView;
            const themeColor = isB2B ? 'emerald' : 'orange';

            const displayedTax = Math.round(quoteCalculation.totals.tax);
            const displayedTotal = Math.round(quoteCalculation.totals.total);
            const displayedOfferDiscount = Math.round(quoteCalculation.totals.offerDiscount || 0);
            // Component rows (accommodation / transport / activities) describe
            // the trip's gross cost, so they're derived from the pre-discount
            // total. The offer then appears as its own line above the total
            // rather than being silently buried in one of the components.
            const displayedGrossTotal = Math.round(quoteCalculation.totals.grossTotal ?? quoteCalculation.totals.total);
            const subtotalWithMarkupRounded = displayedGrossTotal - displayedTax;

            let sidebarAcc = Math.round(quoteCalculation.totals.accommodation);
            let sidebarTrans = Math.round(quoteCalculation.totals.transport);
            let sidebarAct = Math.round(quoteCalculation.totals.activities);

            if (isB2C) {
              sidebarAcc = Math.round(quoteCalculation.totals.accommodation * (1 + b2cMarkupInput / 100));
              sidebarTrans = Math.round(quoteCalculation.totals.transport * (1 + b2cMarkupInput / 100));
              sidebarAct = subtotalWithMarkupRounded - sidebarAcc - sidebarTrans;
            }

            return (
              <div className="fade-in">
                {/* The dashboard shows agent-identifying data (agency, agent id,
                    commission tier, wallet balance) and must never render to a
                    visitor without an authenticated agent session. */}
                {isB2B && b2bSubView === 'dashboard' && (
                  isB2bAuthenticated ? renderB2bDashboard() : renderB2bSignedOutPrompt()
                )}

                {/* Wallet ledger -- same "must be signed in" rule as the dashboard above. */}
                {isB2B && b2bSubView === 'wallet' && (
                  isB2bAuthenticated ? renderB2bWallet() : renderB2bSignedOutPrompt()
                )}

                {/* Saved-quote pipeline. Same screen for both portals -- the
                    server scopes the list to the caller either way. */}
                {currentSubView === 'quotes' && renderMyQuotes()}

                {/* SUBVIEW 1: Preset Standard Packages Explorer or Custom Planner Intake Form */}
                {currentSubView === 'dashboard' ? null : (currentSubView === 'packages' || currentSubView === 'wizard') && (
                <div className="max-w-6xl mx-auto py-4">

                  {/* Resume an unfinished build from a previous session. */}
                  {resumableDraft && (
                    <div className="draft-resume-banner mb-6 no-print border rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
                      <div className="text-left">
                        <span className="draft-resume-eyebrow text-[9px] uppercase font-black tracking-widest block">Unfinished quote</span>
                        <p className="draft-resume-copy text-xs mt-1">
                          You have a saved draft
                          {resumableDraft.packageName ? <strong> — {resumableDraft.packageName}</strong> : null}
                          {' '}({resumableDraft.itinerary.length} days), last edited{' '}
                          {new Date(resumableDraft.savedAt).toLocaleDateString()}.
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={resumeBuilderDraft}
                          className="draft-resume-primary font-extrabold text-[10px] uppercase tracking-wider py-2 px-4 rounded-xl transition"
                        >
                          Resume
                        </button>
                        <button
                          onClick={clearBuilderDraft}
                          className="draft-resume-secondary font-bold text-[10px] uppercase tracking-wider py-2 px-3 transition"
                        >
                          Discard
                        </button>
                      </div>
                    </div>
                  )}

                  {currentSubView === 'packages' && (
                    <div className="fade-in">
                      {/* Hero Intro */}
                      <div className="b2c-hero-container mb-10 shadow-2xl relative no-print">
                        <div className="b2c-hero-overlay p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8">
                          <div className="flex-1 text-left">
                            <span className="bg-white/15 backdrop-blur-md border border-white/20 text-white text-[10px] px-3 py-1 rounded-full uppercase tracking-wider font-extrabold shadow-sm inline-block mb-4">
                              🇳🇵 Discover Nepal Heritage & Adventure
                            </span>
                            <h2 className="text-3xl md:text-5xl font-black text-white font-serif-title leading-tight max-w-2xl">
                              Craft Your Dream Nepal Journey
                            </h2>
                            <p className="text-slate-200 mt-4 max-w-xl text-xs md:text-sm leading-relaxed font-medium">
                              Explore majestic peaks, ancient temple heritage, and wild jungles. Customize accommodations, activities, and private vehicles day-by-day with instant pricing transparency.
                            </p>
                            
                            {/* Animated Mini Stats Bar */}
                            <div className="flex flex-wrap gap-4 mt-6 pt-6 border-t border-white/10 text-white/90">
                              <div className="flex items-center gap-1.5 text-[11px] font-extrabold">
                                <span className="text-orange-500">✦</span> 5,000+ Travelers
                              </div>
                              <div className="w-1 h-1 bg-white/20 rounded-full my-auto hidden sm:block"></div>
                              <div className="flex items-center gap-1.5 text-[11px] font-extrabold">
                                <span className="text-orange-500">✦</span> 100% Customizable
                              </div>
                              <div className="w-1 h-1 bg-white/20 rounded-full my-auto hidden sm:block"></div>
                              <div className="flex items-center gap-1.5 text-[11px] font-extrabold">
                                <span className="text-orange-500">✦</span> Real-Time Pricing
                              </div>
                            </div>
                          </div>
                          
                          {/* Interactive floating card in Hero */}
                          <div className="w-full md:w-auto shrink-0 bg-white/10 backdrop-blur-md border border-white/15 p-6 rounded-2xl shadow-xl animate-float max-w-xs text-left">
                            <span className="text-[10px] uppercase text-orange-400 font-extrabold tracking-wider block">Featured Destination</span>
                            <h4 className="text-md font-extrabold text-white mt-1 font-heading">Pokhara Valley</h4>
                            <p className="text-slate-200 text-[11px] mt-1.5 leading-relaxed font-medium">
                              Experience the serenity of Fewa Lake beneath the reflection of the majestic Fishtail Peak (Machapuchare).
                            </p>
                            <button 
                              onClick={() => setSubView('wizard')}
                              className="w-full bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-[10px] uppercase tracking-wider py-2.5 px-4 rounded-lg shadow-md transition-all duration-200 glow-hover btn-shimmer mt-4 text-center block"
                            >
                              Start Free Planner
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Interactive Search & Filter Bar */}
                      {isB2C && (
                        <div className="bg-slate-900/5 backdrop-blur-md border border-slate-200/60 p-4.5 rounded-2xl shadow-sm mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 text-left no-print">
                          <div className="flex-1 max-w-sm relative">
                            <input 
                              type="text" 
                              value={pkgSearch}
                              onChange={(e) => setPkgSearch(e.target.value)}
                              placeholder="Search destinations (e.g. Pokhara, Chitwan)..."
                              className="w-full text-xs font-semibold text-slate-800 bg-white border border-slate-205 rounded-xl py-2.5 pl-4 pr-10 outline-none focus:border-orange-550 focus:ring-2 focus:ring-orange-500/10 transition"
                            />
                            {pkgSearch && (
                              <button 
                                onClick={() => setPkgSearch('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-650 text-xs"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] uppercase font-extrabold text-slate-405 tracking-wider">Duration:</span>
                              <select
                                value={pkgDurationFilter}
                                onChange={(e) => setPkgDurationFilter(e.target.value)}
                                className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl outline-none text-slate-700 font-bold transition focus:border-orange-555"
                              >
                                <option value="all">All Durations</option>
                                <option value="short">Short Trips (≤ 5 Nights)</option>
                                <option value="long">Longer Escapes (&gt; 5 Nights)</option>
                              </select>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="text-[10px] uppercase font-extrabold text-slate-405 tracking-wider">Sort Price:</span>
                              <select
                                value={pkgSortOrder}
                                onChange={(e) => setPkgSortOrder(e.target.value)}
                                className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl outline-none text-slate-700 font-bold transition focus:border-orange-555"
                              >
                                <option value="none">Default Sort</option>
                                <option value="price-asc">Price: Low to High</option>
                                <option value="price-desc">Price: High to Low</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="text-left mb-6">
                        <h3 className="text-xl font-black font-heading flex items-center gap-2 text-slate-800">
                          <Layers className="text-orange-655" /> Explore Handcrafted Itinerary Templates
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">Select a curated starting itinerary to customize your dream Nepal tour.</p>
                      </div>

                      {/* Standard Package Templates Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {(() => {
                          const filteredPackages = db.packages.filter(pkg => {
                            if (pkgSearch) {
                              const query = pkgSearch.toLowerCase().trim();
                              const matchesName = (pkg.name || '').toLowerCase().includes(query);
                              const matchesDesc = (pkg.description || '').toLowerCase().includes(query);
                              const matchesCities = (pkg.cities || []).some(c => c.toLowerCase().includes(query));
                              if (!matchesName && !matchesDesc && !matchesCities) return false;
                            }
                            if (pkgDurationFilter === 'short') {
                              if (pkg.duration_nights > 5) return false;
                            } else if (pkgDurationFilter === 'long') {
                              if (pkg.duration_nights <= 5) return false;
                            }
                            return true;
                          });

                          if (pkgSortOrder !== 'none') {
                            filteredPackages.sort((a, b) => {
                              const getPrice = (p) => {
                                if (p.starting_price_override) return Number(p.starting_price_override);
                                return (packageDefaultQuotes[p.id] || getPackageDefaultQuote(p)).totals.perPerson;
                              };
                              const priceA = getPrice(a);
                              const priceB = getPrice(b);
                              return pkgSortOrder === 'price-asc' ? priceA - priceB : priceB - priceA;
                            });
                          }

                          if (filteredPackages.length === 0) {
                            return (
                              <div className="col-span-full py-12 text-center text-xs text-slate-450 italic bg-slate-50 border border-slate-205 rounded-2xl">
                                No packages matched your search filters. Try selecting "All Durations" or clearing your query!
                              </div>
                            );
                          }

                          return filteredPackages.map(pkg => {
                          // Default approximate price for cards in INR (2 pax
                          // default), read from the memoised map above.
                          const defaultQuote = packageDefaultQuotes[pkg.id] || getPackageDefaultQuote(pkg);

                          return (
                            <div key={pkg.id} className="premium-card bg-white flex flex-col justify-between min-h-[520px] md:h-[520px] relative border border-slate-200 rounded-2xl overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                              {/* Card Banner Cover */}
                              <div className="img-zoom-container h-[160px] relative overflow-hidden shrink-0">
                                <img 
                                  src={
                                    pkg.id === 'pkg-glimpse' ? '/nepal_glimpse.png' :
                                    pkg.id === 'pkg-heritage-wildlife' ? '/nepal_safari.png' :
                                    pkg.id === 'pkg-escape' ? '/nepal_nagarkot.png' :
                                    '/nepal_hero.png'
                                  } 
                                  alt={pkg.name}
                                  className="w-full h-full object-cover"
                                />
                                {/* Overlay gradient on the image */}
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent flex flex-col justify-end p-5 text-left">
                                  <span className="absolute left-5 top-5 glass-badge text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider text-white">
                                    {pkg.duration_nights} Nights / {pkg.duration_nights + 1} Days
                                  </span>
                                  <h4 className="text-md font-extrabold text-white tracking-tight line-clamp-1 drop-shadow-sm font-heading">{pkg.name}</h4>
                                </div>
                              </div>

                              {/* Card Content */}
                              <div className="p-6 flex-1 flex flex-col justify-between">
                                <p className="text-xs text-slate-500 leading-relaxed line-clamp-3 mb-4">{pkg.description}</p>
                                
                                <div className="flex flex-col gap-2.5 pt-4 border-t border-slate-100/80">
                                  <div className="flex items-center gap-2.5 text-xs text-slate-600">
                                    <MapPin size={14} className="text-orange-500 shrink-0" />
                                    <span>Cities: <strong className="text-slate-800 font-semibold">{pkg.cities.join(', ')}</strong></span>
                                  </div>
                                  <div className="flex items-center gap-2.5 text-xs text-slate-600">
                                    <Hotel size={14} className="text-blue-600 shrink-0" />
                                    <span>Hotel Tier: <strong className="text-slate-800 font-semibold">{pkg.default_hotel_category}</strong> (Default)</span>
                                  </div>
                                  <div className="flex items-center gap-2.5 text-xs text-slate-600">
                                    <Car size={14} className="text-indigo-600 shrink-0" />
                                    <span>Vehicle: <strong className="text-slate-800 font-semibold">{db.vehicles.find(v => v.id === pkg.default_vehicle_id)?.name}</strong></span>
                                  </div>
                                </div>

                                {/* Premium Starting Price block inside card body */}
                                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/50 mt-3 flex items-center justify-between">
                                  {view === 'b2c' && !hasContactDetails ? (
                                    <div className="w-full flex items-center justify-between">
                                      {/* Anonymous visitors see the headline "from" rate openly --
                                          hiding every price behind a form is a heavy first
                                          impression and gives no basis to compare packages.
                                          The day-wise breakdown stays gated. */}
                                      <div>
                                        <span className="text-[8px] text-slate-405 uppercase font-extrabold tracking-wider block">
                                          From {pkg.starting_price_override ? "(Special Offer)" : ""}
                                        </span>
                                        <span className="text-base font-black text-[#0f2942] font-heading">
                                          ₹{Math.round(
                                            pkg.starting_price_override
                                              ? Number(pkg.starting_price_override)
                                              : defaultQuote.totals.perPerson
                                          ).toLocaleString()}
                                          <span className="text-[9px] text-slate-500 font-medium ml-0.5">/ pax</span>
                                        </span>
                                        <span className="text-[8px] text-slate-405 flex items-center gap-1 mt-0.5">
                                          <Lock size={10} className="text-orange-600" /> Full breakdown locked
                                        </span>
                                      </div>
                                      <button 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setPendingLeadAction({ type: 'customize', pkg });
                                          setShowLeadCaptureModal(true);
                                        }}
                                        className="bg-orange-650 hover:bg-orange-700 text-white font-extrabold text-[9px] uppercase tracking-wider py-1.5 px-3 rounded-lg shadow-sm transition shrink-0"
                                      >
                                        See Details
                                      </button>
                                    </div>
                                  ) : (
                                    <>
                                      {view === 'b2b' && b2bEditingPkgId === pkg.id ? (
                                        <div className="w-full flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                          <div className="flex-1">
                                            <span className="text-[8px] text-slate-400 uppercase font-extrabold tracking-wider block">B2B Price Override (INR)</span>

                                            <input 
                                              type="number"
                                              className="w-full text-xs font-bold bg-white border border-slate-350 rounded px-2 py-1 outline-none text-slate-800 focus:border-emerald-600"
                                              placeholder="Calculated price if empty"
                                              value={b2bTempPriceOverride}
                                              onChange={(e) => setB2bTempPriceOverride(e.target.value)}
                                            />
                                          </div>
                                          <div className="flex items-center gap-1 mt-3.5 shrink-0">
                                            <button 
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleSaveB2bPriceOverride(pkg.id);
                                              }}
                                              className="p-1 bg-emerald-600 text-white rounded hover:bg-emerald-700 transition"
                                              title="Save"
                                            >
                                              <Check size={12} />
                                            </button>
                                            <button 
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setB2bEditingPkgId(null);
                                              }}
                                              className="p-1 bg-slate-200 text-slate-650 rounded hover:bg-slate-300 transition"
                                              title="Cancel"
                                            >
                                              <X size={12} />
                                            </button>
                                          </div>
                                        </div>
                                      ) : (
                                        <>
                                          <div className="flex-1">
                                            <span className="text-[8px] text-slate-400 uppercase font-extrabold tracking-wider block">
                                              Starting price {pkg.starting_price_override ? "(Special Offer)" : ""}
                                            </span>
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                              <span className="text-base font-black text-[#0f2942] font-heading">
                                                ₹{pkg.starting_price_override 
                                                  ? Math.round(Number(pkg.starting_price_override)).toLocaleString()
                                                  : Math.round(defaultQuote.totals.perPerson).toLocaleString()
                                                }
                                                <span className="text-[9px] text-slate-500 font-medium ml-0.5">/ pax</span>
                                              </span>
                                              {view === 'b2b' && (
                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    setB2bEditingPkgId(pkg.id);
                                                    setB2bTempPriceOverride(pkg.starting_price_override || '');
                                                  }}
                                                  className="p-1 text-slate-400 hover:text-emerald-600 transition"
                                                  title="Edit Starting Price"
                                                >
                                                  <Edit3 size={11} />
                                                </button>
                                              )}
                                            </div>
                                            {pkg.starting_price_override && (
                                              <span className="text-[8px] text-slate-400 block line-through">
                                                Calc: ₹{Math.round(defaultQuote.totals.perPerson).toLocaleString()}
                                              </span>
                                            )}
                                          </div>
                                          <div className="text-right shrink-0">
                                            <span className="text-[8px] text-slate-405 leading-tight block">
                                              Total: ₹{pkg.starting_price_override 
                                                ? Math.round(Number(pkg.starting_price_override) * 2).toLocaleString()
                                                : Math.round(defaultQuote.totals.total).toLocaleString()
                                              } <br/> (2 pax, CP)
                                            </span>
                                          </div>
                                        </>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>

                              {/* Card Footer with Two Buttons */}
                              <div className="bg-slate-50/70 p-4 border-t border-slate-100 flex gap-2">
                                <button 
                                  onClick={() => handleViewAndBookPackage(pkg)}
                                  className="flex-1 bg-[#0f2942] hover:bg-orange-600 hover:text-white text-white font-extrabold text-[10px] uppercase tracking-wider py-2.5 rounded-xl shadow-sm transition-all duration-300 flex items-center justify-center gap-1"
                                >
                                  <span>View Itinerary</span>
                                  <CheckCircle size={12} />
                                </button>
                                <button 
                                  onClick={() => handleSelectPresetPackage(pkg)}
                                  className="flex-1 bg-white hover:bg-slate-100 text-[#0f2942] border border-slate-205 font-extrabold text-[10px] uppercase tracking-wider py-2.5 rounded-xl transition-all duration-300 flex items-center justify-center gap-1"
                                >
                                  <span>Customize</span>
                                  <ArrowRight size={12} />
                                </button>
                              </div>
                            </div>
                          );
                        }) })() }
                      </div>
                      
                      {/* Rich B2C Extra Sections */}
                      {isB2C && (
                        <div className="mt-16 no-print flex flex-col gap-16 text-left">
                          
                          {/* Section: Featured Hotels */}
                          <div className="bg-white border border-slate-200/80 rounded-3xl p-8 shadow-sm">
                            <div className="text-center max-w-xl mx-auto mb-10">
                              <span className="text-[9px] uppercase font-black tracking-widest text-[#0f2942] bg-slate-100 px-3 py-1 rounded-full">Bespoke Stays</span>
                              <h3 className="text-xl md:text-2xl font-black text-[#0f2942] font-heading mt-3">Our Featured Nepal Accommodations</h3>
                              <p className="text-xs text-slate-500 mt-2">Discover the comfort levels and premium settings of our contracted properties.</p>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                              
                              {/* Hotel 1: Marriott Kathmandu */}
                              <div className="premium-card bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col justify-between min-h-[360px] md:h-[360px] group">
                                <div className="h-[140px] relative overflow-hidden shrink-0">
                                  <img 
                                    src="/hotel_marriott.png" 
                                    alt="Kathmandu Marriott Hotel"
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                  />
                                  <span className="absolute left-4 top-4 bg-orange-600 text-white text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-wider">
                                    5★ Luxury
                                  </span>
                                </div>
                                <div className="p-5 flex-1 flex flex-col justify-between text-left">
                                  <div>
                                    <h4 className="text-xs font-black uppercase text-[#0f2942] tracking-wider mb-1">Kathmandu Marriott Hotel</h4>
                                    <span className="text-[9px] text-slate-400 font-bold block mb-2">📍 Kathmandu Valley</span>
                                    <p className="text-[10px] text-slate-505 leading-relaxed">Experience ultimate convenience and modern luxury in Kathmandu. Offering gourmet international restaurants, an outdoor pool, and rooms overlooking the beautiful Himalayan city skyline.</p>
                                  </div>
                                  <div className="flex items-center gap-1.5 pt-3 border-t border-slate-100 text-[9px] font-bold text-slate-400">
                                    <span>Pool</span> • <span>Full Spa</span> • <span>Fine Dining</span> • <span>Bar & Lounge</span>
                                  </div>
                                </div>
                              </div>

                              {/* Hotel 2: Temple Tree Resort & Spa */}
                              <div className="premium-card bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col justify-between min-h-[360px] md:h-[360px] group">
                                <div className="h-[140px] relative overflow-hidden shrink-0">
                                  <img 
                                    src="/hotel_templetree.png" 
                                    alt="Temple Tree Resort & Spa"
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                  />
                                  <span className="absolute left-4 top-4 bg-blue-605 text-white text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-wider">
                                    4★ Deluxe
                                  </span>
                                </div>
                                <div className="p-5 flex-1 flex flex-col justify-between text-left">
                                  <div>
                                    <h4 className="text-xs font-black uppercase text-[#0f2942] tracking-wider mb-1">Temple Tree Resort & Spa</h4>
                                    <span className="text-[9px] text-slate-400 font-bold block mb-2">📍 Pokhara Lakeside</span>
                                    <p className="text-[10px] text-slate-505 leading-relaxed">A boutique resort in Lakeside Pokhara designed with traditional stone architecture, tropical gardens, and an infinity pool reflecting the majestic Machapuchare peak.</p>
                                  </div>
                                  <div className="flex items-center gap-1.5 pt-3 border-t border-slate-100 text-[9px] font-bold text-slate-400">
                                    <span>Lakeside</span> • <span>Infinity Pool</span> • <span>Organic Spa</span> • <span>AC Cottages</span>
                                  </div>
                                </div>
                              </div>

                              {/* Hotel 3: Barahi Jungle Lodge */}
                              <div className="premium-card bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col justify-between min-h-[360px] md:h-[360px] group">
                                <div className="h-[140px] relative overflow-hidden shrink-0">
                                  <img 
                                    src="/hotel_barahi.png" 
                                    alt="Barahi Jungle Lodge"
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                  />
                                  <span className="absolute left-4 top-4 bg-emerald-600 text-white text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-wider">
                                    5★ Jungle Luxury
                                  </span>
                                </div>
                                <div className="p-5 flex-1 flex flex-col justify-between text-left">
                                  <div>
                                    <h4 className="text-xs font-black uppercase text-[#0f2942] tracking-wider mb-1">Barahi Jungle Lodge</h4>
                                    <span className="text-[9px] text-slate-400 font-bold block mb-2">📍 Chitwan Wilderness</span>
                                    <p className="text-[10px] text-slate-505 leading-relaxed">A stunning riverfront sanctuary on the edge of Chitwan. Traditional thatch cottages blend with jungle surrounds, complete with an infinity pool and direct safari crossings.</p>
                                  </div>
                                  <div className="flex items-center gap-1.5 pt-3 border-t border-slate-100 text-[9px] font-bold text-slate-400">
                                    <span>River View</span> • <span>Jeep Safari</span> • <span>Infinity Pool</span> • <span>Naturalists</span>
                                  </div>
                                </div>
                              </div>

                            </div>
                          </div>
                          
                          {/* Section A: Value Propositions */}
                          <div className="bg-slate-50 border border-slate-200/60 rounded-3xl p-8 shadow-sm">
                            <div className="text-center max-w-xl mx-auto mb-10">
                              <span className="text-[9px] uppercase font-black tracking-widest text-orange-600 bg-orange-100/60 px-3 py-1 rounded-full">Platform Integrity</span>
                              <h3 className="text-xl md:text-2xl font-black text-[#0f2942] font-heading mt-3">Why Travelers Choose Our Platform</h3>
                              <p className="text-xs text-slate-500 mt-2">We combine local travel operational expertise with instant real-time digital transparency.</p>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                              <div className="bg-white border border-slate-150 p-5 rounded-2xl shadow-sm hover:shadow-md transition">
                                <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600 font-bold mb-4">✦</div>
                                <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">100% Customization</h4>
                                <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">Swap hotels, add/remove sightseeing, toggle car classes, or skip lodging to fit your specific budget dynamically.</p>
                              </div>
                              <div className="bg-white border border-slate-150 p-5 rounded-2xl shadow-sm hover:shadow-md transition">
                                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 font-bold mb-4">✓</div>
                                <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">Verified Hotel Matrices</h4>
                                <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">We contract with handpicked 3★, 4★, and 5★ properties in Kathmandu, Pokhara, Nagarkot, and Chitwan.</p>
                              </div>
                              <div className="bg-white border border-slate-150 p-5 rounded-2xl shadow-sm hover:shadow-md transition">
                                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-650 font-bold mb-4">🚗</div>
                                <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">Private Vehicle Fleet</h4>
                                <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">Enjoy private transfers in comfortable Sedans, Scorpio SUVs, or Hiace microbuses with skilled, courteous mountain drivers.</p>
                              </div>
                              <div className="bg-white border border-slate-150 p-5 rounded-2xl shadow-sm hover:shadow-md transition">
                                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 font-bold mb-4">₹</div>
                                <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">Live Quotations</h4>
                                <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">No back-and-forth emails. Watch your tour cost calculate instantly in INR based on live seasonal tariff sheets.</p>
                              </div>
                            </div>
                          </div>

                          {/* Section B: How it Works */}
                          <div>
                            <div className="text-center max-w-xl mx-auto mb-10">
                              <span className="text-[9px] uppercase font-black tracking-widest text-blue-600 bg-blue-50 px-3 py-1 rounded-full">Simple Stepper</span>
                              <h3 className="text-xl md:text-2xl font-black text-[#0f2942] font-heading mt-3">Your Journey In Four Simple Steps</h3>
                              <p className="text-xs text-slate-500 mt-2">Design, price, share, and lock your Nepal holiday in minutes.</p>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
                              {/* Horizontal connector line on desktop */}
                              <div className="hidden md:block absolute top-9 left-16 right-16 h-0.5 bg-slate-100 z-0"></div>
                              
                              <div className="relative bg-white p-5 rounded-2xl border border-slate-200 text-center flex flex-col items-center z-10">
                                <span className="w-8 h-8 rounded-full bg-[#0f2942] text-white flex items-center justify-center text-xs font-black shadow mb-3">1</span>
                                <h5 className="text-xs font-black uppercase tracking-wider text-slate-800">Select Template</h5>
                                <p className="text-[11px] text-slate-500 mt-1.5 leading-normal">Choose one of our preset templates or begin with a custom tour build.</p>
                              </div>
                              
                              <div className="relative bg-white p-5 rounded-2xl border border-slate-200 text-center flex flex-col items-center z-10">
                                <span className="w-8 h-8 rounded-full bg-[#0f2942] text-white flex items-center justify-center text-xs font-black shadow mb-3">2</span>
                                <h5 className="text-xs font-black uppercase tracking-wider text-slate-800">Day-Wise Edit</h5>
                                <p className="text-[11px] text-slate-500 mt-1.5 leading-normal">Customize hotels, add sightseeing, or change routes for each day.</p>
                              </div>
                              
                              <div className="relative bg-white p-5 rounded-2xl border border-slate-200 text-center flex flex-col items-center z-10">
                                <span className="w-8 h-8 rounded-full bg-[#0f2942] text-white flex items-center justify-center text-xs font-black shadow mb-3">3</span>
                                <h5 className="text-xs font-black uppercase tracking-wider text-slate-800">Real-Time Quote</h5>
                                <p className="text-[11px] text-slate-500 mt-1.5 leading-normal">Watch live rates adjust on the pricing sidebar as you refine choices.</p>
                              </div>
                              
                              <div className="relative bg-white p-5 rounded-2xl border border-slate-200 text-center flex flex-col items-center z-10">
                                <span className="w-8 h-8 rounded-full bg-[#0f2942] text-white flex items-center justify-center text-xs font-black shadow mb-3">4</span>
                                <h5 className="text-xs font-black uppercase tracking-wider text-slate-800">Lock & Share</h5>
                                <p className="text-[11px] text-slate-500 mt-1.5 leading-normal">Download a professional PDF invoice or copy a clipboard message to share on WhatsApp.</p>
                              </div>
                            </div>
                          </div>

                          {/* Section C: Verified Reviews */}
                          <div>
                            <div className="text-center max-w-xl mx-auto mb-10">
                              <span className="text-[9px] uppercase font-black tracking-widest text-orange-655 bg-orange-50 px-3 py-1 rounded-full">Testimonials</span>
                              <h3 className="text-xl md:text-2xl font-black text-[#0f2942] font-heading mt-3">Verified Traveler Reviews</h3>
                              <p className="text-xs text-slate-500 mt-2">Hear what our travelers have to say about their custom Nepal tours.</p>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                              <div className="bg-white border border-slate-205 p-6 rounded-2xl flex flex-col justify-between shadow-sm">
                                <div>
                                  <div className="text-amber-400 text-sm mb-3">★★★★★</div>
                                  <p className="text-xs text-slate-600 leading-relaxed italic">"We loved being able to swap our Pokhara hotel category to 5-star Luxury while keeping Kathmandu at 4-star Deluxe. Being able to visualize the pricing change instantly was amazing!"</p>
                                </div>
                                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center gap-3 text-left">
                                  <div className="w-8 h-8 rounded-full bg-slate-200 font-extrabold text-[11px] text-[#0f2942] flex items-center justify-center">RS</div>
                                  <div>
                                    <h6 className="text-[11px] font-black text-slate-800 uppercase tracking-wide">Rahul Sharma</h6>
                                    <span className="text-[9px] text-slate-400">Delhi • 5 Nights Glimpse Tour</span>
                                  </div>
                                </div>
                              </div>

                              <div className="bg-white border border-slate-205 p-6 rounded-2xl flex flex-col justify-between shadow-sm">
                                <div>
                                  <div className="text-amber-400 text-sm mb-3">★★★★★</div>
                                  <p className="text-xs text-slate-600 leading-relaxed italic">"Since we had booked our own jungle lodge in Chitwan, we chose 'No Stay Required' for those days. The transfers to and from Kathmandu were calculated automatically and were super reliable."</p>
                                </div>
                                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center gap-3 text-left">
                                  <div className="w-8 h-8 rounded-full bg-slate-200 font-extrabold text-[11px] text-[#0f2942] flex items-center justify-center">AK</div>
                                  <div>
                                    <h6 className="text-[11px] font-black text-slate-800 uppercase tracking-wide">Ananya Krishnan</h6>
                                    <span className="text-[9px] text-slate-400">Mumbai • 7 Nights Wildlife & Heritage</span>
                                  </div>
                                </div>
                              </div>

                              <div className="bg-white border border-slate-205 p-6 rounded-2xl flex flex-col justify-between shadow-sm">
                                <div>
                                  <div className="text-amber-400 text-sm mb-3">★★★★★</div>
                                  <p className="text-xs text-slate-600 leading-relaxed italic">"No hidden agent markup, live GST calculator, and direct WhatsApp sharing. We planned our entire honeymoon custom itinerary within 15 minutes. Great platform!"</p>
                                </div>
                                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center gap-3 text-left">
                                  <div className="w-8 h-8 rounded-full bg-slate-200 font-extrabold text-[11px] text-[#0f2942] flex items-center justify-center">VS</div>
                                  <div>
                                    <h6 className="text-[11px] font-black text-slate-800 uppercase tracking-wide">Vikram Singh</h6>
                                    <span className="text-[9px] text-slate-400">Ahmedabad • 4 Nights Valley Escape</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Section D: Accordion FAQs */}
                          <div>
                            <div className="text-center max-w-xl mx-auto mb-10">
                              <span className="text-[9px] uppercase font-black tracking-widest text-[#0f2942] bg-slate-105 px-3 py-1 rounded-full">Faq</span>
                              <h3 className="text-xl md:text-2xl font-black text-[#0f2942] font-heading mt-3">Frequently Asked Questions</h3>
                              <p className="text-xs text-slate-500 mt-2">Get answers to critical travel requirements and policies for Nepal trips.</p>
                            </div>
                            
                            <div className="max-w-3xl mx-auto flex flex-col gap-3">
                              {[
                                {
                                  q: "Do Indian citizens need a visa or passport for Nepal?",
                                  a: "No, Indian citizens do not need a visa to enter Nepal. Under the bilateral treaty, you can travel freely with either a valid Indian Passport or an original Voter Identity Card. Please note that Adhar Cards, driving licenses, or PAN Cards are not accepted at airport customs."
                                },
                                {
                                  q: "Can I pay in Indian Rupees (INR) during the trip?",
                                  a: "Yes, Indian currency is widely accepted in Nepal. However, carrying smaller denominations like ₹100 is highly recommended. High-denomination notes like ₹500 may face local restrictions, so carrying smaller cash or transferring via bank drafts is best."
                                },
                                {
                                  q: "How does the 'No Stay Required' option work for transfers?",
                                  a: "If you select 'No Stay Required', you arrange your own hotel lodging. You must provide the accommodation address so we can coordinate your private transfer pickups and drops. Please note that transfer rates may vary slightly depending on the exact location of your lodging."
                                },
                                {
                                  q: "What is included in the package quote price?",
                                  a: "The starting quote covers: private AC vehicle transfers for all customized routes, daily breakfast (CP basis) or all meals (AP basis in Chitwan), fuel charges, highway tolls, parking costs, and driver allowances. Entrance fees to monuments are paid directly on-site unless explicitly added."
                                },
                                {
                                  q: "Can I add child occupancy and extra beds?",
                                  a: "Yes! Our customizer interface allows you to enter the number of child travelers (Child With Bed or Child No Bed) and select Triple/Extra beds under room configuration. The pricing engine automatically calculates the correct hotel supplements."
                                }
                              ].map((faq, fIdx) => {
                                const isExpanded = expandedFaqIndex === fIdx;
                                return (
                                  <div key={fIdx} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                                    <button
                                      type="button"
                                      onClick={() => setExpandedFaqIndex(isExpanded ? null : fIdx)}
                                      className="w-full text-left p-4 flex items-center justify-between font-bold text-xs text-[#0f2942] hover:bg-slate-50 transition"
                                    >
                                      <span>{faq.q}</span>
                                      <span className="text-orange-555 text-sm font-extrabold">{isExpanded ? '−' : '+'}</span>
                                    </button>
                                    {isExpanded && (
                                      <div className="p-4 border-t border-slate-105 text-[11px] text-slate-500 leading-relaxed bg-slate-50/50">
                                        {faq.a}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Section E: Modern Footer */}
                          <div className="border-t border-slate-200 pt-12 pb-6 mt-6">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10 text-xs">
                              <div className="flex flex-col gap-3">
                                <h5 className="font-extrabold text-[#0f2942] uppercase tracking-wider text-[10px]">🇳🇵 Nepal Quote</h5>
                                <p className="text-slate-500 leading-relaxed text-[11px]">Handcrafted custom holiday planners utilizing direct hotel tariffs and verified private vehicle sheets. Experience transparency in travel planning.</p>
                              </div>
                              <div className="flex flex-col gap-2.5">
                                <h5 className="font-extrabold text-[#0f2942] uppercase tracking-wider text-[10px]">Customizer Routes</h5>
                                <span className="text-slate-500">Kathmandu Heritage Drive</span>
                                <span className="text-slate-500">Pokhara Lakeside Retreat</span>
                                <span className="text-slate-500">Chitwan Wildlife Jeep Safari</span>
                                <span className="text-slate-500">Nagarkot Sunrise Escape</span>
                              </div>
                              <div className="flex flex-col gap-2.5">
                                <h5 className="font-extrabold text-[#0f2942] uppercase tracking-wider text-[10px]">Contact Us</h5>
                                <span className="text-slate-500">📍 Thamel Chowk, Kathmandu, Nepal</span>
                                <span className="text-slate-500">📞 +977 1-4200000</span>
                                <span className="text-slate-500">✉️ booking@nepalquote.com</span>
                              </div>
                              <div className="flex flex-col gap-2.5">
                                <h5 className="font-extrabold text-[#0f2942] uppercase tracking-wider text-[10px]">Accreditations</h5>
                                <div className="flex flex-wrap gap-2 mt-1">
                                  <span className="px-2.5 py-1 rounded bg-[#0f2942] text-white text-[8px] font-black tracking-widest uppercase">NTB Member</span>
                                  <span className="px-2.5 py-1 rounded bg-orange-600 text-white text-[8px] font-black tracking-widest uppercase">PATA Registered</span>
                                  <span className="px-2.5 py-1 rounded bg-slate-650 text-white text-[8px] font-black tracking-widest uppercase">TAAN Nepal</span>
                                </div>
                              </div>
                            </div>
                            <div className="border-t border-slate-100 pt-6 text-center text-[10px] text-slate-400">
                              © {new Date().getFullYear()} Nepal Quote Platform. All rights reserved. Direct Operator Pricing with zero middleman commissions.
                            </div>
                          </div>

                        </div>
                      )}

                      </div>
                    )}

                  {currentSubView === 'wizard' && (
                    <div className="max-w-3xl mx-auto bg-white border border-slate-200/80 rounded-2xl p-8 shadow-xl fade-in text-left">
                      <button 
                        type="button"
                        onClick={() => setSubView('packages')}
                        className="group mb-6 inline-flex items-center gap-2 bg-slate-50 hover:bg-slate-105 text-slate-700 border border-slate-200 px-3.5 py-1.5 rounded-xl font-bold text-xs shadow-sm hover:shadow transition-all duration-200 cursor-pointer select-none"
                      >
                        <ArrowLeft size={13} className="text-slate-500 group-hover:-translate-x-0.5 transition-transform" />
                        <span>Back to Packages</span>
                      </button>
                      <div className="border-b border-slate-100 pb-4 mb-6 flex items-center justify-between">
                        <div>
                          <h2 className="text-2xl font-extrabold text-slate-855 font-heading">Design Custom Itinerary</h2>
                          <p className="text-xs text-slate-400 mt-1">Configure your destination timeline to get suggested hotels, meals, activities, and transport.</p>
                        </div>
                        <span className={`bg-${themeColor}-105 text-${themeColor}-700 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider`}>
                          Wizard
                        </span>
                      </div>

                      <form onSubmit={handleCreateProposal} className="flex flex-col gap-8">
                        
                        {/* DESTINATIONS INPUT BLOCK */}
                        <div>
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider text-left">Destinations</h4>
                            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                              <button 
                                type="button"
                                onClick={() => {
                                  const defaultItin = db.settings.wizard_default_days || [
                                    { day: 1, city: 'Kathmandu', title: 'Kathmandu Arrival', description: 'Arrive in Kathmandu. Airport transfer to hotel.', hotelId: 'h-ktm-4', meals: 'CP', transfer_route: 'ktm_airport_transfer', is_sightseeing: false, activity_ids: [] },
                                    { day: 2, city: 'Kathmandu', title: 'Kathmandu Sightseeing', description: 'Explore historic Kathmandu heritage, ancient temples, and local markets.', hotelId: 'h-ktm-4', meals: 'CP', transfer_route: 'local_sightseeing', is_sightseeing: true, activity_ids: ['a-ktm-sightseeing'] },
                                    { day: 3, city: 'Pokhara', title: 'Drive to Pokhara', description: 'Scenic drive to Pokhara lakeside. Enjoy evening walking around lake.', hotelId: 'h-pok-4', meals: 'CP', transfer_route: 'ktm_to_pokhara', is_sightseeing: false, activity_ids: [] },
                                    { day: 4, city: 'Pokhara', title: 'Pokhara Sightseeing', description: 'Sunrise tour from Sarangkot, boating in Phewa Lake, and local stupa tour.', hotelId: 'h-pok-4', meals: 'CP', transfer_route: 'local_sightseeing', is_sightseeing: true, activity_ids: ['a-pok-boating'] },
                                    { day: 5, city: 'Kathmandu', title: 'Drive to Kathmandu & Depart', description: 'Scenic return drive to Kathmandu. Direct transfer to airport for final flight.', hotelId: '', meals: 'None', transfer_route: 'pokhara_to_ktm', is_sightseeing: false, activity_ids: [] }
                                  ];
                                  
                                  const rating = db.settings.wizard_default_hotel_category || '4-Star';
                                  const resolved = defaultItin.map(d => {
                                    if (d.hotelId && d.hotelId !== 'no_stay') return d;
                                    if (d.hotelId === 'no_stay') return d;
                                    const h = db.hotels.find(htl => htl.city.toLowerCase() === d.city.toLowerCase() && htl.category === rating);
                                    return { ...d, hotelId: h ? h.id : '' };
                                  });

                                  setCustomItinerary(resolved);
                                  setStartCity(db.settings.wizard_default_start_city || 'Gorakhpur');
                                  setEndCity(db.settings.wizard_default_end_city || 'Gorakhpur');
                                  setSelectedVehicleId(db.settings.wizard_default_vehicle_id || 'v-suv');
                                  setSelectedHotelCategory(rating);
                                  setCustomPackageName("Custom Itinerary (Default Template)");
                                  setAgentMarkupInput(0);
                                  
                                  if (view === 'b2b') {
                                    setB2bSubView('customize');
                                  } else {
                                    setB2cSubView('customize');
                                  }
                                }}
                                className="w-full sm:w-auto bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-extrabold py-2 px-3.5 rounded-xl text-xs transition border border-indigo-200 flex items-center justify-center gap-1.5 shadow-sm cursor-pointer select-none"
                              >
                                <Compass size={13} className="text-indigo-655" />
                                <span>Customize Recommended Itinerary</span>
                              </button>
                              <button 
                                type="submit"
                                className={`w-full sm:w-auto bg-${themeColor === 'emerald' ? 'emerald-600 hover:bg-emerald-700' : 'orange-600 hover:bg-orange-700'} text-white font-extrabold py-2 px-4 rounded-xl text-xs transition-all duration-200 shadow-md flex items-center justify-center gap-1.5 glow-hover btn-shimmer cursor-pointer select-none`}
                              >
                                <span>Build From Scratch</span>
                              </button>
                            </div>
                          </div>
                          <p className="text-xs text-slate-500 mb-6">Enter the cities below in the order in which they will be visited for the itinerary:</p>

                          <div className="flex flex-col gap-4">
                            {wizardDestinations.map((dest, index) => (
                              <div key={index} className="flex items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-sm relative">
                                
                                {/* Up/Down reordering handler */}
                                <div className="flex flex-col gap-2 text-slate-400 select-none">
                                  <button 
                                    type="button" 
                                    onClick={() => handleMoveWizardDestination(index, -1)} 
                                    disabled={index === 0}
                                    className="hover:text-slate-800 disabled:opacity-30 disabled:hover:text-slate-400 font-bold text-sm px-1.5"
                                    title="Move Up"
                                  >
                                    ▲
                                  </button>
                                  <button 
                                    type="button" 
                                    onClick={() => handleMoveWizardDestination(index, 1)} 
                                    disabled={index === wizardDestinations.length - 1}
                                    className="hover:text-slate-800 disabled:opacity-30 disabled:hover:text-slate-400 font-bold text-sm px-1.5"
                                    title="Move Down"
                                  >
                                    ▼
                                  </button>
                                </div>

                                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                  <div>
                                    <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">City Name</label>
                                    <select
                                      value={dest.city}
                                      onChange={(e) => handleUpdateWizardDestination(index, 'city', e.target.value)}
                                      className="form-select text-xs py-2 px-3 bg-white w-full border border-slate-300 rounded-lg shadow-inner"
                                    >
                                      {(db.cities || []).map(city => (
                                        <option key={city} value={city}>{city}</option>
                                      ))}
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Nights</label>
                                    <select
                                      value={dest.nights}
                                      onChange={(e) => handleUpdateWizardDestination(index, 'nights', e.target.value)}
                                      className="form-select text-xs py-2 px-3 bg-white w-full border border-slate-300 rounded-lg shadow-inner"
                                    >
                                      {[1, 2, 3, 4, 5, 6, 7].map(n => (
                                        <option key={n} value={n}>{n} {n === 1 ? 'night' : 'nights'}</option>
                                      ))}
                                    </select>
                                  </div>
                                </div>

                                <button 
                                  type="button" 
                                  onClick={() => handleDeleteWizardDestination(index)}
                                  disabled={wizardDestinations.length <= 1}
                                  className="text-slate-400 hover:text-red-600 disabled:opacity-30 disabled:hover:text-slate-400 p-2 mt-4"
                                  title="Remove City"
                                >
                                  ✕
                                </button>
                              </div>
                            ))}
                          </div>

                          <button 
                            type="button" 
                            onClick={handleAddWizardDestination}
                            className="text-xs text-blue-900 hover:text-blue-950 font-bold mt-4 flex items-center gap-1 border border-slate-300 py-1.5 px-3 rounded-lg hover:bg-slate-50"
                          >
                            + Add Another City
                          </button>
                        </div>

                        {/* TRIP DETAILS INPUT BLOCK */}
                        <div className="border-t border-slate-200 pt-6">
                          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-5">Trip Details</h4>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1.5">Start City</label>
                              <input 
                                type="text"
                                value={wizardStartCity}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setWizardStartCity(val);
                                  if (!isEndCityManuallyEdited) {
                                    setWizardEndCity(val);
                                  }
                                }}
                                className="form-input text-xs py-2 px-3 w-full border border-slate-300 rounded-lg shadow-sm"
                                placeholder="Gorakhpur"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1.5">End City</label>
                              <input 
                                type="text"
                                value={wizardEndCity}
                                onChange={(e) => {
                                  setWizardEndCity(e.target.value);
                                  setIsEndCityManuallyEdited(true);
                                }}
                                className="form-input text-xs py-2 px-3 w-full border border-slate-300 rounded-lg shadow-sm"
                                placeholder="Gorakhpur"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1.5">Nationality *</label>
                              <select 
                                value={wizardNationality}
                                onChange={(e) => setWizardNationality(e.target.value)}
                                className="form-select text-xs py-2 px-3 w-full border border-slate-300 rounded-lg bg-white shadow-sm"
                              >
                                <option value="India">India</option>
                                <option value="SAARC">SAARC Countries</option>
                                <option value="International">International</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1.5">Leaving on *</label>
                              <input 
                                type="date"
                                required
                                value={wizardLeavingOn}
                                onChange={(e) => setWizardLeavingOn(e.target.value)}
                                className="form-input text-xs py-2 px-3 w-full border border-slate-300 rounded-lg shadow-sm"
                              />
                            </div>

                            <div className="md:col-span-2">
                              <label className="block text-xs font-bold text-slate-700 mb-2">Number of Travelers *</label>
                              
                              {/* Room Configurator Panel */}
                              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                                {/* Rooms Header */}
                                <div className="flex items-center justify-between mb-4">
                                  <div className="flex items-center gap-3">
                                    <span className="text-xs font-extrabold text-slate-700 uppercase">Rooms</span>
                                    <div className="pax-counter">
                                      <button type="button" onClick={() => handleRemoveRoom(rooms.length - 1)} className="pax-btn" disabled={rooms.length <= 1}>-</button>
                                      <span className="pax-value">{rooms.length}</span>
                                      <button type="button" onClick={handleAddRoom} className="pax-btn">+</button>
                                    </div>
                                  </div>
                                  <span className="text-[10px] text-slate-400 font-medium">
                                    {derived.totalPax} traveler{derived.totalPax !== 1 ? 's' : ''} total
                                  </span>
                                </div>
                                
                                {/* Per-Room Configuration */}
                                <div className="flex flex-col gap-3">
                                  {rooms.map((room, roomIdx) => {
                                    const maxChildren = room.adults >= 3 ? 1 : 2;
                                    return (
                                      <div key={roomIdx} className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm">
                                        <div className="flex items-center justify-between mb-2">
                                          <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Room {roomIdx + 1}</span>
                                          {rooms.length > 1 && (
                                            <button
                                              type="button"
                                              onClick={() => handleRemoveRoom(roomIdx)}
                                              className="text-[10px] text-red-400 hover:text-red-600 font-bold"
                                            >
                                              Remove
                                            </button>
                                          )}
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-4">
                                          {/* Adults Counter */}
                                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                            <div>
                                              <div className="text-xs font-semibold text-slate-700">Adults <span className="text-[10px] text-slate-400">(12+)</span></div>
                                            </div>
                                            <div className="pax-counter">
                                              <button type="button" onClick={() => handleRoomAdultsChange(roomIdx, -1)} className="pax-btn" disabled={room.adults <= 1}>-</button>
                                              <span className="pax-value">{room.adults}</span>
                                              <button type="button" onClick={() => handleRoomAdultsChange(roomIdx, 1)} className="pax-btn" disabled={room.adults >= 3}>+</button>
                                            </div>
                                          </div>
                                          
                                          {/* Children Counter */}
                                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                            <div>
                                              <div className="text-xs font-semibold text-slate-700">Children <span className="text-[10px] text-slate-400">(&lt;12)</span></div>
                                            </div>
                                            <div className="pax-counter">
                                              <button type="button" onClick={() => handleRoomChildrenChange(roomIdx, -1)} className="pax-btn" disabled={room.children.length <= 0}>-</button>
                                              <span className="pax-value">{room.children.length}</span>
                                              <button type="button" onClick={() => handleRoomChildrenChange(roomIdx, 1)} className="pax-btn" disabled={room.children.length >= maxChildren}>+</button>
                                            </div>
                                          </div>
                                        </div>
                                        
                                        {/* Child Age Inputs */}
                                        {room.children.length > 0 && (
                                          <div className="mt-3 pt-2 border-t border-slate-100 flex flex-wrap gap-3">
                                            {room.children.map((child, childIdx) => {
                                              // Determine bed status and editability
                                              let isCwb = false;
                                              let isEditable = false;
                                              
                                              if (room.adults === 2 && room.children.length === 1) {
                                                isEditable = true;
                                                isCwb = child.withBed !== undefined ? child.withBed : true; // Default to true if undefined
                                              } else if (room.adults >= 3) {
                                                isCwb = false;
                                              } else {
                                                isCwb = childIdx === 0;
                                              }
                                              
                                              return (
                                                <div key={childIdx} className="flex items-center gap-2">
                                                  <label className="text-[10px] font-semibold text-slate-500 whitespace-nowrap">
                                                    Child {childIdx + 1} age:
                                                  </label>
                                                  <select
                                                    value={child.age}
                                                    onChange={(e) => handleChildAgeChange(roomIdx, childIdx, e.target.value)}
                                                    className="form-select text-xs py-1 px-2 border border-slate-300 rounded-md bg-white w-[60px] shadow-inner"
                                                  >
                                                    {Array.from({ length: 12 }, (_, a) => (
                                                      <option key={a} value={a}>{a} yr{a !== 1 ? 's' : ''}</option>
                                                    ))}
                                                  </select>
                                                  
                                                  <label className={`flex items-center gap-1.5 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border cursor-pointer ${
                                                    isCwb ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-slate-50 text-slate-500 border-slate-200'
                                                  } ${!isEditable && 'opacity-75 cursor-not-allowed'}`}>
                                                    <input 
                                                      type="checkbox"
                                                      checked={isCwb}
                                                      onChange={(e) => isEditable && handleChildBedChange(roomIdx, childIdx, e.target.checked)}
                                                      disabled={!isEditable}
                                                      className="w-3 h-3 text-blue-600 rounded border-slate-300 focus:ring-blue-500 disabled:opacity-50 cursor-inherit"
                                                    />
                                                    {isCwb ? 'With Bed' : 'No Bed'}
                                                  </label>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                                
                                <p className="text-[10px] text-slate-500 mt-2 italic flex items-start gap-1">
                                  <Info size={12} className="shrink-0 mt-0.5" />
                                  If a child is 12 and above as on date of travel he has to be put in adult.
                                </p>
                                
                                {/* Derived Summary */}
                                <div className="mt-3 pt-3 border-t border-slate-200 text-[10px] text-slate-500 font-medium flex flex-wrap gap-x-4 gap-y-1">
                                  <span>{rooms.length} room{rooms.length !== 1 ? 's' : ''}</span>
                                  <span>{travelers.adults} adult{travelers.adults !== 1 ? 's' : ''}</span>
                                  {travelers.cwb > 0 && <span>{travelers.cwb} child w/bed</span>}
                                  {travelers.cnb > 0 && <span>{travelers.cnb} child no bed</span>}
                                  <span className="ml-auto text-slate-400">
                                    {roomConfig.double > 0 && `${roomConfig.double} dbl`}
                                    {roomConfig.single > 0 && ` ${roomConfig.single} sgl`}
                                    {roomConfig.extra_adult > 0 && ` ${roomConfig.extra_adult} extra`}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1.5">Star rating</label>
                              <select 
                                value={wizardStarRating}
                                onChange={(e) => setWizardStarRating(e.target.value)}
                                className="form-select text-xs py-2 px-3 w-full border border-slate-300 rounded-lg bg-white shadow-sm"
                              >
                                <option value="3-Star">3-Star Budget</option>
                                <option value="4-Star">4-Star Deluxe</option>
                                <option value="5-Star">5-Star Luxury</option>
                              </select>
                            </div>

                            <div className="flex items-center mt-6">
                              <label className="flex items-center gap-2.5 text-xs text-slate-700 font-semibold cursor-pointer select-none">
                                <input 
                                  type="checkbox"
                                  checked={wizardAddTransfers}
                                  onChange={(e) => setWizardAddTransfers(e.target.checked)}
                                  className="w-4 h-4 rounded border-slate-300 text-blue-900 focus:ring-blue-500"
                                />
                                <span>Add transfers (Dont select in case you are driving by own vehicle)</span>
                              </label>
                            </div>
                          </div>
                        </div>

                        <div className="border-t border-slate-200 pt-6 flex justify-end">
                          <button 
                            type="submit" 
                            className={`bg-${themeColor === 'emerald' ? 'emerald-600 hover:bg-emerald-700' : '[#0f2942] hover:bg-[#1a3d5e]'} text-white font-extrabold py-3 px-8 rounded-lg shadow-md transition-colors uppercase tracking-wider text-xs`}
                          >
                            Create Proposal
                          </button>
                        </div>
                      </form>
                    </div>
                  )}
                </div>
              )}

                  {/* SUBVIEW 2: Customizer & Quote Builder Workspace */}
                  {currentSubView === 'customize' && (
                    <div className="max-w-7xl mx-auto py-4">
                      
                      {/* Customizer Details header */}
                      <div className="bg-gradient-to-r from-slate-900 via-[#132c44] to-[#0f2942] text-white rounded-2xl p-6 mb-8 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden text-left">
                        <div className="absolute right-0 top-0 opacity-5 pointer-events-none text-9xl">🇳🇵</div>
                        <div className="z-10 flex-1">
                          {isB2C && (
                            <div className="flex gap-2 mb-3.5 no-print">
                              <button 
                                onClick={() => setB2cSubView('packages')}
                                className="bg-white/10 hover:bg-white/20 text-white border border-white/10 px-3 py-1.5 rounded-xl text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1 transition"
                              >
                                ← Preset Packages
                              </button>
                              <button 
                                onClick={() => setB2cSubView('wizard')}
                                className="bg-white/10 hover:bg-white/20 text-white border border-white/10 px-3 py-1.5 rounded-xl text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1 transition"
                              >
                                ← Custom Planner
                              </button>
                            </div>
                          )}
                          <div className={`text-xs text-${themeColor}-400 font-extrabold uppercase tracking-widest flex items-center gap-1.5 mb-1`}>
                            <span className={`w-2 h-2 rounded-full bg-${themeColor}-400 animate-pulse`}></span>
                            Itinerary Customizer & Builder
                          </div>
                          <input 
                            type="text" 
                            value={customPackageName}
                            onChange={(e) => setCustomPackageName(e.target.value)}
                            className={`text-2xl font-extrabold font-heading bg-transparent border-b-2 border-transparent hover:border-slate-500 focus:border-${themeColor}-400 outline-none w-full max-w-xl transition-all duration-200 py-1 text-white`}
                          />
                          <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                            Customize daily schedules, update your hotels, and select local sightseeing options in Indian Rupees (₹).
                          </p>
                        </div>

                        <div className="z-10 flex flex-col gap-4 w-full md:w-auto">
                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 bg-slate-950/45 p-4 rounded-xl border border-white/5 backdrop-blur-md w-full">
                            {/* Date selection */}
                            <div className="flex flex-col w-full sm:w-auto">
                              <label className="text-[10px] uppercase text-slate-400 font-extrabold mb-1 tracking-wider">Travel Date</label>
                              <input 
                                type="date"
                                value={travelDate}
                                onChange={(e) => setTravelDate(e.target.value)}
                                className={`bg-slate-900 border border-slate-700 text-white rounded-lg py-1.5 px-3 text-xs w-full sm:w-[135px] focus:outline-none focus:border-${themeColor}-400 transition`}
                              />
                            </div>
                            
                            {/* Hotel Category Selector */}
                            <div className="flex flex-col w-full sm:w-auto">
                              <label className="text-[10px] uppercase text-slate-400 font-extrabold mb-1 tracking-wider">Hotel Tier</label>
                              <select 
                                value={selectedHotelCategory} 
                                onChange={(e) => handleCategoryChange(e.target.value)}
                                className={`bg-slate-900 border border-slate-700 text-white rounded-lg py-1.5 px-3 text-xs w-full sm:w-[125px] focus:outline-none focus:border-${themeColor}-400 transition cursor-pointer`}
                              >
                                <option value="3-Star">3-Star Budget</option>
                                <option value="4-Star">4-Star Deluxe</option>
                                <option value="5-Star">5-Star Luxury</option>
                              </select>
                            </div>

                            {/* Vehicle Tier Selector */}
                            <div className="flex flex-col w-full sm:w-auto">
                              <label className="text-[10px] uppercase text-slate-400 font-extrabold mb-1 tracking-wider">Private Transport</label>
                              <select 
                                value={selectedVehicleId} 
                                onChange={(e) => setSelectedVehicleId(e.target.value)}
                                className={`bg-slate-900 border border-slate-700 text-white rounded-lg py-1.5 px-3 text-xs w-full sm:w-[160px] focus:outline-none focus:border-${themeColor}-400 transition cursor-pointer`}
                              >
                                {db.vehicles.map(v => (
                                  <option key={v.id} value={v.id}>{v.name} (Max {v.capacity} pax)</option>
                                ))}
                              </select>
                            </div>
                          </div>
                          
                          {/* Room Configuration integrated into header */}
                          <div className="flex justify-end w-full">
                            <div className="bg-slate-950/45 border border-white/5 p-4 w-full flex flex-col gap-3 shadow-sm rounded-xl backdrop-blur-md">
                              <div className="flex items-center justify-between border-b border-slate-700/50 pb-2">
                                <h4 className="text-xs font-extrabold font-heading uppercase text-slate-200 flex items-center gap-1.5">
                                  <Users size={15} className={`text-${themeColor}-400`} />
                                  <span>Room Configuration</span>
                                </h4>
                                <button
                                  onClick={() => setSubView('wizard')}
                                  className={`text-[10px] font-extrabold uppercase text-${themeColor}-400 hover:text-${themeColor}-300 bg-${themeColor}-500/10 hover:bg-${themeColor}-500/20 border border-${themeColor}-500/20 px-2 py-1 rounded-lg transition`}
                                >
                                  Edit Rooms
                                </button>
                              </div>
                              
                              {/* Room-by-room summary */}
                              <div className="flex flex-col gap-2">
                                {rooms.map((room, ri) => (
                                  <div key={ri} className="bg-slate-900/60 border border-slate-700/50 rounded-lg px-3 py-2 text-xs">
                                    <span className="text-[9px] font-extrabold text-slate-400 uppercase">Room {ri + 1}</span>
                                    <div className="text-slate-200 font-medium mt-0.5">
                                      {room.adults} Adult{room.adults !== 1 ? 's' : ''}
                                      {room.children.length > 0 && (
                                        <span className="text-slate-400">
                                          {' + '}{room.children.length} Child{room.children.length !== 1 ? 'ren' : ''}
                                          <span className="text-slate-500 text-[10px]">
                                            {' ('}
                                            {room.children.map((c, ci) => {
                                              const bed = room.adults >= 3 ? 'NB' : (ci === 0 ? 'WB' : 'NB');
                                              return `${c.age}yr ${bed}`;
                                            }).join(', ')}
                                            {')'}
                                          </span>
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                              
                              {/* Totals summary */}
                              <div className="text-[10px] text-slate-400 font-medium border-t border-slate-700/50 pt-2">
                                {derived.totalPax} total pax • {roomConfig.double > 0 && `${roomConfig.double} dbl`}{roomConfig.single > 0 && ` ${roomConfig.single} sgl`}{roomConfig.extra_adult > 0 && ` ${roomConfig.extra_adult} extra bed`}
                              </div>
                              
                              {/* Validation badge */}
                              {(() => {
                                const validation = validateRoomCapacity(rooms);
                                if (validation.message) {
                                  return (
                                    <div className={`px-2.5 py-1.5 rounded-lg text-[10px] font-semibold flex items-start gap-1.5 ${
                                      validation.isValid ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'
                                    }`}>
                                      <Info size={12} className="shrink-0 mt-0.5" />
                                      <span>{validation.message}</span>
                                    </div>
                                  );
                                }
                                return (
                                  <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold flex items-center gap-1.5">
                                    <CheckCircle size={12} className="shrink-0" />
                                    <span>Rooms validated</span>
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                        </div>
                      </div>



                      {/* Main Grid Layout: Central Itinerary | Sidebar Price/Guest Calculations */}
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        
                        {/* Left & Middle: Day-by-Day Timeline Customizer */}
                        <div className="lg:col-span-2">
                          <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold font-heading text-slate-800 flex items-center gap-2">
                              <Layers size={18} className={`text-${themeColor}-600`} />
                              <span>Day-Wise Customizer ({customItinerary.length} Days)</span>
                            </h3>

                          </div>

                          {/* Timeline */}
                          <div className="itinerary-timeline">
                            {customItinerary.map((day, idx) => {
                              const isLast = idx === customItinerary.length - 1;
                              
                              // Get hotels matching current day city and selected category
                              const availableHotels = db.hotels.filter(
                                h => h.city.toLowerCase() === day.city.toLowerCase() && h.category === selectedHotelCategory
                              );

                              // Get activities in the current city
                              const cityActivities = activitiesInCity(day.city);

                              // Get selected hotel details
                              const hotel = db.hotels.find(h => h.id === day.hotelId);

                              return (
                                <div key={day.day} className="timeline-day-card bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300">
                                  <div className="timeline-node"></div>
                                  
                                  {/* Day Card Header */}
                                  <div className="day-header border-b border-slate-100 bg-slate-50/50 rounded-t-2xl py-3.5 px-5">
                                    <div className="flex items-center gap-3">
                                      <span className="bg-[#0f2942] text-white font-extrabold px-3 py-1 rounded-lg text-xs">
                                        Day {day.day}
                                      </span>
                                      <div className="flex items-center gap-2">
                                        <span className="font-extrabold text-slate-800 text-sm py-0.5">
                                          {day.city}
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Day Card Body */}
                                  <div className="day-body p-5 flex flex-col gap-5">
                                    
                                    {/* Top: Details & Description */}
                                    <div className="bg-slate-50/70 border border-slate-200/80 p-4 rounded-xl flex flex-col gap-3 shadow-inner">
                                      <div>
                                        <label className="text-[10px] font-extrabold text-indigo-650 uppercase tracking-wider block mb-1">Generated Tour Day Heading</label>
                                        <div className="text-xs font-black text-slate-800 leading-snug font-heading bg-white py-2 px-3 border border-slate-200/60 rounded-lg select-all">
                                          {/* Read straight from the pricing engine's own output
                                              rather than recomputing here -- this preview and the
                                              exported itinerary must never word a day differently
                                              (flight days especially, which narrate drop, flight
                                              and pickup as one story). */}
                                          {quoteCalculation.dayWiseBreakdown?.[idx]?.title || ''}
                                        </div>
                                      </div>

                                      <div>
                                        <label className="text-[10px] font-extrabold text-indigo-650 uppercase tracking-wider block mb-1">Generated Tour Day Description</label>
                                        <div className="text-[11px] text-slate-600 leading-relaxed bg-white py-2.5 px-3 border border-slate-200/60 rounded-lg min-h-[75px] select-all whitespace-pre-line">
                                          {/* Same source as the heading above: the engine's own
                                              generated copy, so preview and export always agree. */}
                                          {quoteCalculation.dayWiseBreakdown?.[idx]?.description || ''}
                                        </div>
                                        <span className="text-[9px] text-slate-450 mt-1.5 block italic leading-normal">★ Title & description generate automatically from selected hotel, transfers, and activities. Edit core descriptions in Admin panel.</span>
                                      </div>
                                    </div>

                                    {/* Middle: Hotel & Meals */}
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
                                      <div className="flex items-center gap-3 w-full md:w-auto flex-1">
                                        <div className="flex flex-col gap-1 w-full max-w-sm">
                                          <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1.5">
                                            <Hotel size={13} className="text-indigo-600" />
                                            <span>Night stay hotel</span>
                                          </label>
                                          {isLast ? (
                                            <div className={`bg-${themeColor}-50 border border-${themeColor}-200/50 text-${themeColor}-800 text-xs p-2 rounded-lg font-medium flex items-center gap-2`}>
                                              <Info size={14} className={`text-${themeColor}-600 shrink-0`} /> Checkout day
                                            </div>
                                          ) : (
                                            <div className="flex flex-col gap-2 w-full">
                                              <select
                                                value={day.hotelId || ''}
                                                onChange={(e) => handleDayFieldChange(idx, 'hotelId', e.target.value)}
                                                className="form-select text-xs py-2 px-3 bg-white border border-slate-200 rounded-lg w-full focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition cursor-pointer"
                                              >
                                                <option value="">No stay required</option>
                                                {availableHotels.map(h => {
                                                  const rateText = view === 'b2c' && !hasContactDetails ? '🔒 Locked' : `₹${Math.round(h.rates.double.CP * b2bDisplayFactor).toLocaleString()}`;
                                                  return (
                                                    <option key={h.id} value={h.id}>{h.name} (CP: {rateText})</option>
                                                  );
                                                })}
                                              </select>

                                              {(!day.hotelId || day.hotelId === 'no_stay') && (
                                                <div className="flex flex-col gap-1.5 mt-1 bg-white border border-slate-200/60 p-3 rounded-lg w-full">
                                                  <label className="text-[10px] font-bold text-slate-500 uppercase">
                                                    Staying Place Address (Self-Arranged)
                                                  </label>
                                                  <input
                                                    type="text"
                                                    value={day.stay_address || ''}
                                                    onChange={(e) => handleDayFieldChange(idx, 'stay_address', e.target.value)}
                                                    placeholder="Enter address for transfers..."
                                                    className="text-xs py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded focus:ring-2 focus:ring-blue-500/15 focus:bg-white outline-none w-full transition"
                                                  />
                                                  {getDayTransfers(day).length > 0 && (
                                                    <div className="text-[9px] text-amber-600 bg-amber-50 border border-amber-100 p-1.5 rounded flex items-start gap-1 leading-normal font-medium mt-1">
                                                      <AlertTriangle size={11} className="shrink-0 text-amber-500 mt-0.5" />
                                                      <span>Remark: Transfer cost may change at the time of final booking because the distance needs to be checked.</span>
                                                    </div>
                                                  )}
                                                </div>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      </div>

                                      {!isLast && hotel && (
                                        <div className="flex items-center justify-between md:justify-start gap-4 bg-white border border-slate-200/50 p-2.5 rounded-lg w-full md:w-auto shrink-0">
                                          <div className="flex items-center gap-1.5">
                                            <span className="text-[10px] font-extrabold text-slate-500 uppercase">Meals:</span>
                                            <select
                                              value={day.meals || 'CP'}
                                              onChange={(e) => handleDayFieldChange(idx, 'meals', e.target.value)}
                                              className="form-select py-1 px-2.5 text-[11px] font-bold w-[90px] bg-white border border-slate-200 rounded-md cursor-pointer outline-none focus:border-blue-500"
                                            >
                                              <option value="CP">CP (B&B)</option>
                                              <option value="MAP">MAP (HB)</option>
                                              <option value="AP">AP (FB)</option>
                                            </select>
                                          </div>
                                          <div className="text-[10px] text-slate-500">
                                            Double: <strong className="text-slate-800">
                                              {view === 'b2c' && !hasContactDetails 
                                                ? '🔒 Locked' 
                                                : `₹${Math.round(hotel.rates.double[day.meals || 'CP'] * b2bDisplayFactor).toLocaleString()}`
                                              }
                                            </strong>
                                          </div>
                                        </div>
                                      )}
                                    </div>

                                    {/* Bottom: Transfers & Activities Buttons and Selections */}
                                    <div className="flex flex-col gap-3">
                                      {/* How the traveller moves between cities on this day.
                                          Only rendered on a day where the city actually changes
                                          AND both cities have (different) airports -- otherwise
                                          there is no choice to make and the road transfer below
                                          stands on its own. Deliberately lives here in the final
                                          builder rather than the intake wizard: it is an
                                          operator decision, and putting it up front confused
                                          travellers filling in the initial form. */}
                                      {(() => {
                                        const fromCity = isLast
                                          ? day.city
                                          : (idx === 0 ? startCity : customItinerary[idx - 1]?.city);
                                        const toCity = isLast ? endCity : day.city;
                                        if (!fromCity || !toCity) return null;
                                        if (String(fromCity).toLowerCase().trim() === String(toCity).toLowerCase().trim()) return null;
                                        if (!canFlyBetween(db.airports || [], fromCity, toCity)) return null;

                                        const isFlight = day.travel_mode === TRAVEL_MODE_FLIGHT;
                                        const fromAirport = getAirportForCity(db.airports || [], fromCity);
                                        const toAirport = getAirportForCity(db.airports || [], toCity);
                                        const currentTransfers = getDayTransfers(day);
                                        // Resolved, not generated: a city served by another town's
                                        // airport (Bandipur via Pokhara) uses the hand-built
                                        // "Pokhara Airport to Bandipur" route.
                                        const dropKey = resolveAirportTransfer(db.routes || [], db.airports || [], fromCity).key;
                                        const pickupKey = resolveAirportTransfer(db.routes || [], db.airports || [], toCity).key;

                                        return (
                                          <div className="travel-mode-box p-3.5 flex flex-col gap-3">
                                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                                              <span className="travel-mode-label text-[10px] font-extrabold uppercase tracking-wider shrink-0">
                                                {fromCity} ➔ {toCity} by
                                              </span>
                                              <div className="flex gap-2">
                                                <button
                                                  type="button"
                                                  onClick={() => handleSetTravelMode(idx, TRAVEL_MODE_CAR, fromCity, toCity)}
                                                  className={`travel-mode-btn ${!isFlight ? 'is-active' : ''} text-[11px] font-extrabold uppercase tracking-wide py-1.5 px-3.5 rounded-lg flex items-center gap-1.5`}
                                                >
                                                  <Car size={13} /> Road
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => handleSetTravelMode(idx, TRAVEL_MODE_FLIGHT, fromCity, toCity)}
                                                  className={`travel-mode-btn ${isFlight ? 'is-active' : ''} text-[11px] font-extrabold uppercase tracking-wide py-1.5 px-3.5 rounded-lg flex items-center gap-1.5`}
                                                >
                                                  <Plane size={13} /> Flight
                                                </button>
                                              </div>
                                            </div>

                                            {isFlight && (
                                              <div className="flex flex-col gap-2">
                                                <p className="travel-mode-note text-[10px] leading-relaxed">
                                                  Airport transfers below are charged. <strong>The airfare itself is not
                                                  included</strong> in this quote — it appears on the itinerary as a note
                                                  to the client. Remove either transfer if the client arranges that end
                                                  themselves.
                                                </p>
                                                {/* Re-add either half if it was removed. */}
                                                <div className="flex flex-wrap gap-2">
                                                  {!currentTransfers.includes(dropKey) && (
                                                    <button
                                                      type="button"
                                                      onClick={() => handleRestoreFlightTransfer(idx, dropKey)}
                                                      className="travel-mode-restore text-[10px] font-bold rounded-lg py-1 px-2.5 transition flex items-center gap-1"
                                                    >
                                                      <Plus size={11} /> Add {fromCity} airport drop
                                                    </button>
                                                  )}
                                                  {!currentTransfers.includes(pickupKey) && (
                                                    <button
                                                      type="button"
                                                      onClick={() => handleRestoreFlightTransfer(idx, pickupKey)}
                                                      className="travel-mode-restore text-[10px] font-bold rounded-lg py-1 px-2.5 transition flex items-center gap-1"
                                                    >
                                                      <Plus size={11} /> Add {toCity} airport pickup
                                                    </button>
                                                  )}
                                                </div>
                                                <p className="travel-mode-airports text-[9px] italic">
                                                  Flying {fromAirport ? `${fromAirport.name} (${fromAirport.code})` : `${fromCity} airport`}
                                                  {' ➔ '}
                                                  {toAirport ? `${toAirport.name} (${toAirport.code})` : `${toCity} airport`}
                                                </p>
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })()}

                                      {/* Selected transfers for the day. A flight day carries two
                                          (origin drop + destination pickup); every other day
                                          normally carries one. Each is removable on its own. */}
                                      {getDayTransfers(day).map((routeKey, transferIdx) => {
                                        // Full-day sightseeing has its own control below -- it
                                        // is a vehicle hire, not a sector, and is no longer a
                                        // route in the master list.
                                        if (routeKey === LOCAL_SIGHTSEEING_KEY) return null;
                                        // findRoute so a sector defined only in
                                        // the opposite direction still shows.
                                        const routeObj = findRoute(db.routes || [], routeKey);
                                        if (!routeObj) return null;
                                        const isAirportRun = isAirportRouteKey(routeKey);
                                        return (
                                          <div key={`${routeKey}-${transferIdx}`} className="flex items-center justify-between gap-2 w-full min-w-0 bg-white border border-slate-200 p-2.5 rounded-lg shadow-sm">
                                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 flex-1 min-w-0 pr-2">
                                              <span className={`${isAirportRun ? 'transfer-pip-airport' : 'bg-indigo-100 text-indigo-700'} text-[10px] font-bold px-2 py-0.5 rounded uppercase shrink-0`}>
                                                {isAirportRun ? 'Airport' : 'Transfer'}
                                              </span>
                                              <span className="text-xs text-slate-700 font-medium break-words text-left min-w-0">{routeObj.name} - {routeObj.description}</span>
                                            </div>
                                            <button type="button" onClick={() => handleRemoveDayTransfer(idx, transferIdx)} className="text-slate-400 hover:text-red-500 p-1 shrink-0">
                                              <Trash2 size={14}/>
                                            </button>
                                          </div>
                                        );
                                      })}

                                      {/* Display selected activities */}
                                      {(() => {
                                        const selectedActs = (day.activity_ids || [])
                                          .map(actId => db.activities.find(a => a.id === actId))
                                          .filter(Boolean);
                                        return selectedActs.map(act => {
                                          // A whole-vehicle activity is billed once for the
                                          // vehicle, so showing price_adult would read as a
                                          // per-head charge it is not.
                                          const isPerVehicle = act.pricing_mode === 'per_vehicle';
                                          const amount = isPerVehicle
                                            ? Number((act.vehicle_rates || {})[selectedVehicleId] || 0)
                                            : Number(act.price_adult || 0);
                                          return (
                                          <div key={act.id} className="flex items-center justify-between gap-2 w-full min-w-0 bg-white border border-slate-200 p-2.5 rounded-lg shadow-sm">
                                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 flex-1 min-w-0 pr-2">
                                              <span className={`${isPerVehicle ? 'sightseeing-pip' : `bg-${themeColor}-100 text-${themeColor}-700`} text-[10px] font-bold px-2 py-0.5 rounded uppercase shrink-0`}>
                                                {isPerVehicle ? 'Vehicle Day' : 'Activity'}
                                              </span>
                                              <span className="text-xs text-slate-700 font-medium break-words text-left min-w-0">{act.name}</span>
                                            </div>
                                            <div className="flex items-center gap-3 shrink-0">
                                              <strong className="text-xs text-brand-navy font-bold whitespace-nowrap">
                                                {view === 'b2c' && !hasContactDetails
                                                  ? '🔒 Locked'
                                                  : `₹${Math.round(amount * b2bDisplayFactor).toLocaleString()}${isPerVehicle ? ' / vehicle' : ' / pax'}`
                                                }
                                              </strong>
                                              <button type="button" onClick={() => handleToggleActivity(idx, act.id)} className="text-slate-400 hover:text-red-500 p-1">
                                                <Trash2 size={14}/>
                                              </button>
                                            </div>
                                          </div>
                                          );
                                        });
                                      })()}

                                      <div className="flex flex-col sm:flex-row gap-2 mt-1">
                                        <button 
                                          type="button" 
                                          onClick={() => setShowTransferModal({ open: true, dayIndex: idx })}
                                          className="flex-1 w-full bg-white border border-dashed border-slate-300 hover:border-indigo-400 hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 font-bold text-[11px] uppercase tracking-wider py-2 rounded-lg transition flex items-center justify-center gap-2"
                                        >
                                          <Plus size={14} /> Add Transfer
                                        </button>
                                        <button 
                                          type="button" 
                                          onClick={() => setShowActivityModal({ open: true, dayIndex: idx })}
                                          className={`flex-1 w-full bg-white border border-dashed border-slate-300 hover:border-${themeColor}-400 hover:bg-${themeColor}-50 text-slate-600 hover:text-${themeColor}-700 font-bold text-[11px] uppercase tracking-wider py-2 rounded-lg transition flex items-center justify-center gap-2`}
                                        >
                                          <Plus size={14} /> Add Activity
                                        </button>
                                      </div>
                                    </div>
                                    
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Right Side: Configuration Sidebar */}
                        <div className="lg:col-span-1">
                          
                          {/* Room config was moved to header */}

                      {/* Sticky Quote Sidebar */}
                      <div className="quote-sidebar">
                        <h3 className="text-lg font-bold font-heading flex items-center justify-between">
                          <span>Live Pricing Quote</span>
                          <span className={`text-xs bg-${themeColor}-650 text-white font-bold px-2 py-0.5 rounded`}>INR (₹)</span>
                        </h3>
                        
                        {view === 'b2c' && !hasContactDetails ? (
                          <div className="mt-4 bg-slate-800 p-5 rounded-2xl border border-slate-700 text-left">
                            <h4 className="text-sm font-bold text-orange-400 mb-2 flex items-center gap-1.5">
                              <Lock size={16} className="text-orange-400" /> Pricing is Locked
                            </h4>
                            <p className="text-[11px] text-slate-300 leading-relaxed mb-4">
                              Submit your details below to unlock live package rates, day-wise component pricing, and finalize your booking.
                            </p>
                            <form onSubmit={submitLeadForm} className="flex flex-col gap-3.5">
                              <div>
                                <label className="text-[9px] uppercase font-bold text-slate-400 tracking-wider mb-1 block">Full Name</label>
                                <input 
                                  type="text" 
                                  required 
                                  value={leadForm.name}
                                  onChange={(e) => setLeadForm({ ...leadForm, name: e.target.value })}
                                  className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg outline-none focus:border-orange-500 transition-all font-medium text-white" 
                                  placeholder="John Doe" 
                                />
                              </div>
                              <div>
                                <label className="text-[9px] uppercase font-bold text-slate-400 tracking-wider mb-1 block">Email Address</label>
                                <input 
                                  type="email" 
                                  required 
                                  value={leadForm.email}
                                  onChange={(e) => setLeadForm({ ...leadForm, email: e.target.value })}
                                  className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg outline-none focus:border-orange-500 transition-all font-medium text-white" 
                                  placeholder="john@example.com" 
                                />
                              </div>
                              <div>
                                <label className="text-[9px] uppercase font-bold text-slate-400 tracking-wider mb-1 block">Mobile Number</label>
                                <div className="flex gap-1.5">
                                  <select
                                    value={leadForm.countryCode}
                                    onChange={(e) => setLeadForm({ ...leadForm, countryCode: e.target.value })}
                                    className="px-2 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg outline-none focus:border-orange-500 transition-all font-bold text-slate-300"
                                  >
                                    <option value="+91">🇮🇳 +91</option>
                                    <option value="+977">🇳🇵 +977</option>
                                    <option value="+1">🇺🇸 +1</option>
                                    <option value="+44">🇬🇧 +44</option>
                                    <option value="+61">🇦🇺 +61</option>
                                    <option value="+65">🇸🇬 +65</option>
                                    <option value="+971">🇦🇪 +971</option>
                                  </select>
                                  <input 
                                    type="tel" 
                                    required 
                                    value={leadForm.phone}
                                    onChange={(e) => setLeadForm({ ...leadForm, phone: e.target.value })}
                                    className="flex-1 min-w-0 px-2.5 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg outline-none focus:border-orange-500 transition-all font-medium text-white" 
                                    placeholder={leadForm.countryCode === '+91' ? "10-digit mobile" : "Mobile number"} 
                                  />
                                </div>
                              </div>
                              <button 
                                type="submit" 
                                className="w-full bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs uppercase tracking-wider py-2.5 rounded-lg shadow-md transition mt-2 flex items-center justify-center gap-1.5"
                              >
                                <Unlock size={14} /> Unlock Prices
                              </button>
                            </form>
                          </div>
                        ) : (
                          <>
                            <div className="flex flex-col gap-3">
                              <div className="cost-row">
                                <span>Accommodation & Meals:</span>
                                <strong>₹{sidebarAcc.toLocaleString()}</strong>
                              </div>
                              <div className="cost-row">
                                <span>Vehicle & Transfers:</span>
                                <strong>₹{sidebarTrans.toLocaleString()}</strong>
                              </div>
                              <div className="cost-row">
                                <span>Sightseeing & Activities:</span>
                                <strong>₹{sidebarAct.toLocaleString()}</strong>
                              </div>

                              {isB2B ? (
                                <div className="border-t border-slate-800 pt-3 flex flex-col gap-2">
                                  <div className="cost-row text-xs">
                                    <span>Agency Subtotal:</span>
                                    <strong>₹{Math.round(quoteCalculation.totals.subtotal).toLocaleString()}</strong>
                                  </div>
                                  <div className={`cost-row text-xs text-${themeColor}-400 flex items-center justify-between`}>
                                    <span>Markup:</span>
                                    <div className="flex items-center gap-1">
                                      <input 
                                        type="number"
                                        min="0"
                                        value={agentMarkupInput}
                                        onChange={(e) => setAgentMarkupInput(Math.max(0, Number(e.target.value)))}
                                        className="w-14 px-1 py-0.5 text-xs bg-slate-900 border border-slate-700 rounded text-right outline-none focus:border-emerald-500 font-semibold text-white"
                                      />
                                      <span>%</span>
                                    </div>
                                  </div>
                                  <div className={`cost-row text-xs text-${themeColor}-400`}>
                                    <span>Markup Amount:</span>
                                    <strong>+₹{Math.round(quoteCalculation.totals.markup).toLocaleString()}</strong>
                                  </div>
                                  <div className="cost-row text-xs text-slate-400">
                                    <span>GST ({taxInput}%):</span>
                                    <strong>+₹{displayedTax.toLocaleString()}</strong>
                                  </div>
                                </div>
                              ) : (
                                <div className="border-t border-slate-800 pt-3 flex flex-col gap-2">
                                  <div className="cost-row text-xs text-slate-400">
                                    <span>GST ({taxInput}%):</span>
                                    <strong>+₹{displayedTax.toLocaleString()}</strong>
                                  </div>
                                </div>
                              )}

                              {displayedOfferDiscount > 0 && (
                                <div className="cost-row text-xs text-emerald-400">
                                  <span>Special Offer:</span>
                                  <strong>−₹{displayedOfferDiscount.toLocaleString()}</strong>
                                </div>
                              )}

                              <div className="cost-row total">
                                <span>Total Price:</span>
                                <span>₹{displayedTotal.toLocaleString()}</span>
                              </div>

                              {(travelers.cwb + travelers.cnb > 0) ? (
                                <div className="bg-slate-800 p-3 rounded border border-slate-700 mt-2 flex flex-col gap-2">
                                  <div className="flex justify-between items-center pb-2 border-b border-slate-700/50 text-left">
                                    <div>
                                      <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-0.5">Per Adult Rate</div>
                                      <div className={`text-xl font-extrabold text-${themeColor}-400 font-heading`}>
                                        ₹{Math.round(quoteCalculation.totals.perAdult).toLocaleString()}
                                        <span className="text-xs text-slate-300 font-medium"> / adult</span>
                                      </div>
                                    </div>
                                    <div className="text-[10px] text-slate-400 bg-slate-750 px-2 py-0.5 rounded font-semibold">{travelers.adults} {travelers.adults > 1 ? 'Adults' : 'Adult'}</div>
                                  </div>
                                  <div className="flex justify-between items-center text-left">
                                    <div>
                                      <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-0.5">Per Child Rate</div>
                                      <div className={`text-xl font-extrabold text-${themeColor}-400 font-heading`}>
                                        ₹{Math.round(quoteCalculation.totals.perChild).toLocaleString()}
                                        <span className="text-xs text-slate-300 font-medium"> / child</span>
                                      </div>
                                    </div>
                                    <div className="text-[10px] text-slate-400 bg-slate-750 px-2 py-0.5 rounded font-semibold">{travelers.cwb + travelers.cnb} {travelers.cwb + travelers.cnb > 1 ? 'Children' : 'Child'}</div>
                                  </div>
                                </div>
                              ) : (
                                <div className="bg-slate-800 p-3 rounded border border-slate-700 text-center mt-2">
                                  <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Per Person rate</div>
                                  <div className={`text-xl font-extrabold text-${themeColor}-400 font-heading`}>
                                    ₹{Math.round(quoteCalculation.totals.perPerson).toLocaleString()}
                                    <span className="text-xs text-slate-300 font-medium"> / pax</span>
                                  </div>
                                  <div className="text-[9px] text-slate-500 mt-1">Based on {travelers.adults + travelers.cwb + travelers.cnb} travelers</div>
                                </div>
                              )}

                              {hasNoStayTransfer && (
                                <div className="bg-amber-950/40 border border-amber-900/60 p-2.5 rounded text-amber-300 text-[10px] leading-relaxed mt-2 flex gap-1.5 items-start text-left">
                                  <AlertTriangle size={12} className="shrink-0 text-amber-500 mt-0.5" />
                                  <span>
                                    <strong>Remark:</strong> Transfer cost may change at the time of final booking because the distance needs to be checked.
                                  </span>
                                </div>
                              )}
                            </div>

                            <button
                              onClick={() => setShowCheckoutModal(true)}
                              className={`w-full bg-${themeColor === 'emerald' ? 'emerald-600 hover:bg-emerald-700' : '[#0f2942] hover:bg-[#1a3d5e]'} text-white py-3 rounded shadow-md mt-4 flex items-center justify-center gap-2 font-bold uppercase tracking-wider transition`}
                              disabled={!quoteCalculation.roomValidation.isValid}
                            >
                              <CheckCircle size={18} /> Book Vacation Now
                            </button>

                            {/* Keep the build without booking it. Only offered
                                to a signed-in account, because that's what a
                                saved quote is scoped to -- and it's what lets
                                the same quote reopen on another device. */}
                            {currentUser && (
                              <>
                                <button
                                  onClick={handleSaveQuote}
                                  disabled={quoteSaveState === 'saving' || !customItinerary.length}
                                  className="btn btn-secondary w-full mt-2 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider disabled:opacity-50"
                                >
                                  <Save size={15} />
                                  {quoteSaveState === 'saving'
                                    ? 'Saving…'
                                    : activeQuoteId ? 'Update Saved Quote' : 'Save Quote for Later'}
                                </button>
                                <div className="quote-save-hint text-[10px] text-center mt-1.5 leading-relaxed">
                                  {quoteSaveState === 'saved'
                                    ? 'Saved to your account — open it any time from My Quotes.'
                                    : activeQuoteId
                                      ? 'You have unsaved changes to this quote.'
                                      : 'Keep this itinerary and come back to it later, on any device.'}
                                </div>
                              </>
                            )}
                          </>
                        )}
                      </div>

                    </div>
                  </div>
                </div>
              )}

              {/* SUBVIEW 3: Printable Quotation / Invoice */}
              {currentSubView === 'invoice' && (() => {
                const currentBooking = db.bookings.find(b => b.id === lastBookingId);
                const isB2BInvoice = currentBooking ? currentBooking.type === 'B2B' : isB2B;
                const whiteLabel = currentBooking?.b2b_white_label || (isB2BInvoice ? b2bProfile : null);

                const displayedInvoiceTax = Math.round(quoteCalculation.totals.tax);
                const displayedInvoiceTotal = Math.round(quoteCalculation.totals.total);
                const subtotalWithMarkupRoundedInvoice = displayedInvoiceTotal - displayedInvoiceTax;

                let invoiceAcc = Math.round(quoteCalculation.totals.accommodation);
                let invoiceTrans = Math.round(quoteCalculation.totals.transport);
                let invoiceAct = Math.round(quoteCalculation.totals.activities);

                if (!isB2BInvoice) {
                  invoiceAcc = Math.round(quoteCalculation.totals.accommodation * (1 + b2cMarkupInput / 100));
                  invoiceTrans = Math.round(quoteCalculation.totals.transport * (1 + b2cMarkupInput / 100));
                  invoiceAct = subtotalWithMarkupRoundedInvoice - invoiceAcc - invoiceTrans;
                }

                return (
                  <div className="max-w-4xl mx-auto py-2">
                    
                    <div className="bg-white border border-slate-200 p-4 rounded-xl mb-6 flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center no-print">
                      <div className="flex items-center justify-center sm:justify-start gap-2 text-green-700 text-xs sm:text-sm font-semibold text-center sm:text-left">
                        <ShieldCheck /> {isB2BInvoice ? "B2B Partner Voucher Generated & Confirmed" : "Quote Generated & Confirmed"} (Ref ID: {lastBookingId})
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                        <button 
                          onClick={() => handleCopyWhatsAppMessage(isB2BInvoice, whiteLabel, invoiceAcc, invoiceTrans, invoiceAct, displayedInvoiceTax, displayedInvoiceTotal)}
                          className="btn btn-secondary btn-sm w-full sm:w-auto flex items-center justify-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-250 font-bold"
                          title="Copy message formatted for WhatsApp"
                        >
                          <MessageSquare size={13} className="text-emerald-600" /> Copy WhatsApp Msg
                        </button>
                        <button 
                          onClick={() => window.print()}
                          className="btn btn-secondary btn-sm w-full sm:w-auto flex items-center justify-center gap-1.5"
                        >
                          <Printer size={13} /> Print Quote / Save PDF
                        </button>
                        <button 
                          onClick={() => setSubView('packages')}
                          className="btn btn-primary btn-sm w-full sm:w-auto rounded flex items-center justify-center"
                        >
                          {isB2BInvoice ? "Create New Booking" : "Create Another Quote"}
                        </button>
                      </div>
                    </div>
                    
                    {/* Print Canvas Sheet */}
                    <div className="bg-white border border-slate-200 p-4 sm:p-8 md:p-12 rounded-3xl shadow-lg relative text-slate-800" id="print-sheet">
                      {/* Top Accent Line */}
                      <div className={`absolute top-0 left-0 right-0 h-2 bg-${isB2BInvoice ? 'emerald' : 'orange'}-600 rounded-t-3xl`}></div>

                      {/* Title Banner */}
                      <div className="text-center mb-8 mt-2">
                        <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold uppercase tracking-tight text-slate-900 font-heading">
                          Holiday Travel Proposal
                        </h1>
                        <p className={`text-xs md:text-sm font-bold tracking-wider uppercase text-${isB2BInvoice ? 'emerald' : 'orange'}-600 mt-1`}>
                          Customized Nepal Tour Experience
                        </p>
                        <div className="w-16 h-1 bg-slate-300 mx-auto mt-3 rounded"></div>
                      </div>

                      {/* Header: Centered Company Logo & Name */}
                      <div className="flex flex-col items-center justify-center text-center mb-6 pb-6 border-b border-slate-100">
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                          {isB2BInvoice && whiteLabel ? (
                            whiteLabel.agencyLogo ? (
                              <img src={whiteLabel.agencyLogo} alt={whiteLabel.agencyName || "Agency Logo"} className="max-h-16 object-contain w-auto block rounded-lg" />
                            ) : (
                              <div className="text-2xl font-bold text-slate-800 font-heading">💼</div>
                            )
                          ) : (
                            adminProfile.companyLogo ? (
                              <img src={adminProfile.companyLogo} alt={adminProfile.companyName || "Company Logo"} className="max-h-16 object-contain w-auto block rounded-lg" />
                            ) : (
                              <div className="text-2xl font-bold text-slate-800 font-heading">🇳🇵</div>
                            )
                          )}
                          
                          <div className="text-left">
                            <h2 className="text-xl md:text-2xl font-extrabold tracking-tight text-slate-900 font-heading leading-tight">
                              {isB2BInvoice && whiteLabel ? (whiteLabel.agencyName || "B2B TRAVEL PARTNER") : (adminProfile.companyName || "NEPAL TOUR ORGANIZER")}
                            </h2>
                            <div className={`text-[10px] uppercase font-extrabold tracking-wider mt-0.5 text-${isB2BInvoice ? 'emerald' : 'orange'}-600`}>
                              {isB2BInvoice ? "B2B Travel Partner" : "Nepal Holiday Experts"}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Header Details: Left side Company details, Right side Ref Details */}
                      <div className="flex flex-col md:flex-row print:flex-row justify-between items-start border-b border-slate-200 pb-6 mb-8 gap-6">
                        {/* Left Side: Company Details */}
                        <div className="text-xs text-slate-500 max-w-md leading-relaxed text-left">
                          {isB2BInvoice && whiteLabel ? (
                            <>
                              <div className="font-semibold text-slate-700">{whiteLabel.agencyName || "B2B Travel Partner"}</div>
                              <div>{whiteLabel.agencyAddress || "Travel Partner Address"}</div>
                              <div className="mt-0.5">Email: <span className="text-slate-700 font-semibold">{whiteLabel.agencyEmail || "booking@agency.com"}</span> | Phone: <span className="text-slate-700 font-semibold">{whiteLabel.agencyPhone || ""}</span></div>
                              {whiteLabel.agencyWebsite && <div className="mt-0.5">Website: <span className="text-slate-700 font-semibold">{whiteLabel.agencyWebsite}</span></div>}
                            </>
                          ) : (
                            <>
                              <div className="font-semibold text-slate-700">{adminProfile.companyName || "NEPAL TOUR ORGANIZER"}</div>
                              <div>{adminProfile.address || "Kathmandu, Nepal"}</div>
                              <div className="mt-0.5">Email: <span className="text-slate-700 font-semibold">{adminProfile.email ? adminProfile.email : "info@nepaltravel.com"}</span> | Phone: <span className="text-slate-700 font-semibold">{adminProfile.phone ? adminProfile.phone : ""}</span></div>
                              {adminProfile.website && <div className="mt-0.5">Website: <span className="text-slate-700 font-semibold">{adminProfile.website}</span></div>}
                            </>
                          )}
                        </div>

                        {/* Right Side: Quote Metadata */}
                        <div className="flex flex-col items-start md:items-end print:items-end gap-1.5 text-xs text-slate-500 md:text-right print:text-right">
                          <span className={`bg-${isB2BInvoice ? 'emerald' : 'blue'}-50 text-${isB2BInvoice ? 'emerald' : 'blue'}-700 text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider border border-${isB2BInvoice ? 'emerald' : 'blue'}-200/50`}>
                            {isB2BInvoice ? "B2B Partner Voucher" : "Official Quotation"}
                          </span>
                          {isB2BInvoice && whiteLabel && (
                            <div className="text-[10px] text-emerald-700 font-bold">
                              Booking Agent: {whiteLabel.agentName || "Horizon Travel Partners"}
                            </div>
                          )}
                          <div className="mt-1">
                            <span className="text-slate-400 font-medium">Ref Number:</span>{" "}
                            <strong className="text-slate-800 font-bold">{lastBookingId}</strong>
                          </div>
                          <div>
                            <span className="text-slate-400 font-medium">Date:</span>{" "}
                            <strong className="text-slate-800 font-bold">{new Date().toLocaleDateString()}</strong>
                          </div>
                        </div>
                      </div>

                      {/* Summary Info Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-6 mb-8">
                        {/* Client Card */}
                        <div className="bg-slate-50/50 border border-slate-100 p-5 rounded-2xl flex flex-col justify-between">
                          <div>
                            <h4 className={`text-[10px] uppercase text-${isB2BInvoice ? 'emerald' : 'orange'}-600 font-extrabold tracking-wider mb-2`}>Prepared For</h4>
                            <div className="text-lg font-bold text-slate-900 font-heading">{checkoutForm.clientName}</div>
                            <div className="text-xs text-slate-600 mt-2 flex flex-col gap-1">
                              <div><span className="text-slate-400 font-medium font-sans">Email:</span> {checkoutForm.email}</div>
                              <div><span className="text-slate-400 font-medium font-sans">Phone:</span> {checkoutForm.countryCode} {checkoutForm.phone}</div>
                            </div>
                          </div>
                          {checkoutForm.notes && (
                            <div className="text-xs text-slate-500 italic mt-3 pt-3 border-t border-slate-200/60 leading-relaxed">
                              <span className="font-semibold text-slate-700 not-italic">Special Notes: </span>
                              "{checkoutForm.notes}"
                            </div>
                          )}
                        </div>

                        {/* Package Card */}
                        <div className="bg-slate-50/50 border border-slate-100 p-5 rounded-2xl">
                          <h4 className={`text-[10px] uppercase text-${isB2BInvoice ? 'emerald' : 'orange'}-600 font-extrabold tracking-wider mb-2`}>Itinerary Parameters</h4>
                          <div className="text-sm font-bold text-slate-900 mb-2 font-heading">{customPackageName}</div>
                          <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-xs text-slate-600">
                            <div><span className="text-slate-400 font-medium">Route:</span></div>
                            <div className="font-semibold text-slate-800">{startCity} to {endCity}</div>
                            
                            <div><span className="text-slate-400 font-medium">Departure Date:</span></div>
                            <div className="font-semibold text-slate-800">{travelDate}</div>
                            
                            <div><span className="text-slate-400 font-medium">Duration:</span></div>
                            <div className="font-semibold text-slate-800">{customItinerary.length} Days</div>
                            
                            <div><span className="text-slate-400 font-medium">Travelers:</span></div>
                            <div className="font-semibold text-slate-800">{travelers.adults} Adults {travelers.cwb > 0 ? `, ${travelers.cwb} CWB` : ''} {travelers.cnb > 0 ? `, ${travelers.cnb} CNB` : ''}</div>
                            
                            <div><span className="text-slate-400 font-medium">Vehicle Charter:</span></div>
                            <div className="font-semibold text-slate-800">{db.vehicles.find(v => v.id === selectedVehicleId)?.name}</div>
                          </div>
                        </div>
                      </div>

                      {/* Section I: Day-by-day Itinerary */}
                      <div className="mb-10">
                        <h3 className="text-sm font-bold font-heading uppercase text-slate-800 border-b border-slate-200 pb-2 mb-6 tracking-wide flex items-center gap-2">
                          <span className={`bg-${isB2BInvoice ? 'emerald' : 'orange'}-650 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-bold`}>1</span>
                          <span>Complete Day-By-Day Journey</span>
                        </h3>
                        
                        <div className="relative border-l-2 border-slate-200 ml-3 pl-6 flex flex-col gap-8 my-4">
                          {quoteCalculation.dayWiseBreakdown.map((day, idx) => {
                            return (
                              <div key={day.day} className="relative">
                                {/* Timeline dot */}
                                <div className="absolute -left-[33px] top-1.5 w-4 h-4 rounded-full border-2 border-slate-200 bg-white flex items-center justify-center">
                                  <div className={`w-1.5 h-1.5 rounded-full bg-${isB2BInvoice ? 'emerald' : 'orange'}-600`}></div>
                                </div>
                                
                                <div className="bg-slate-50/40 border border-slate-200/60 p-4 rounded-2xl hover:border-slate-300 transition-colors shadow-sm">
                                  <div className="flex flex-col sm:flex-row print:flex-row sm:items-center print:items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-100">
                                    <div className="flex items-center gap-2">
                                      <span className={`font-extrabold text-[10px] bg-${isB2BInvoice ? 'emerald' : 'orange'}-600 text-white px-2 py-0.5 rounded uppercase tracking-wider`}>
                                        Day {day.day}
                                      </span>
                                      <span className="font-extrabold text-sm text-slate-850 font-heading">
                                        {day.title}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                                      <MapPin size={11} className={`text-${isB2BInvoice ? 'emerald' : 'orange'}-600`} />
                                      <span>{day.city}</span>
                                    </div>
                                  </div>
                                  
                                  <p className="text-xs text-slate-650 leading-relaxed mb-4 whitespace-pre-line">
                                    {day.description}
                                  </p>
                                  
                                  <div className="grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-3 text-[10px] text-slate-600 font-medium">
                                    <div className="flex items-center gap-2 bg-white border border-slate-100 p-2 rounded-xl">
                                      <Hotel size={12} className="text-indigo-500 shrink-0" />
                                      <span className="truncate">
                                        {(!day.hotelId || day.hotelId === 'no_stay') ? (
                                          <span>Hotel: <strong className="text-slate-800 font-semibold">No stay required</strong>{day.stay_address ? ` (Address: ${day.stay_address})` : ''}</span>
                                        ) : (
                                          <span>Hotel: <strong className="text-slate-800 font-semibold">{day.hotelName}</strong> ({selectedHotelCategory})</span>
                                        )}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2 bg-white border border-slate-100 p-2 rounded-xl">
                                      <Coffee size={12} className="text-indigo-500 shrink-0" />
                                      <span>
                                        Meals: <strong className="text-slate-800 font-semibold">{day.mealPlan === 'None' ? 'None' : `${day.mealPlan} Included`}</strong>
                                      </span>
                                    </div>
                                    {day.transportRoute && (
                                      <div className="flex items-center gap-2 bg-white border border-slate-100 p-2 rounded-xl sm:col-span-2 print:col-span-2">
                                        <Car size={12} className="text-indigo-500 shrink-0" />
                                        <span className="truncate">
                                          Route: <strong className="text-slate-800 font-semibold">{day.transportRoute.replace(/_/g, ' ')}</strong>
                                        </span>
                                      </div>
                                    )}
                                    {day.activities.length > 0 && (
                                      <div className="flex items-center gap-2 bg-white border border-slate-100 p-2 rounded-xl sm:col-span-2 print:col-span-2">
                                        <Compass size={12} className="text-emerald-500 shrink-0" />
                                        <span className="whitespace-normal">
                                          Sightseeing: <strong className="text-slate-800 font-semibold">{day.activities.map(a => a.name).join(', ')}</strong>
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Section II: Investment & Cost Details */}
                      <div className="mb-8 page-break-inside-avoid">
                        <h3 className="text-sm font-bold font-heading uppercase text-slate-800 border-b border-slate-200 pb-2 mb-4 tracking-wide flex items-center gap-2">
                          <span className={`bg-${isB2BInvoice ? 'emerald' : 'orange'}-650 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-bold`}>2</span>
                          <span>Tour Investment & Cost Details</span>
                        </h3>

                        <div className="border border-slate-200 rounded-2xl overflow-hidden mb-6 shadow-sm">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-200 text-slate-700">
                                <th className="p-4 font-bold uppercase text-[10px] text-slate-500 tracking-wider">Service Description</th>
                                <th className="p-4 text-right font-bold uppercase text-[10px] text-slate-500 tracking-wider">Cost (INR)</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              <tr>
                                <td className="p-4">
                                  <div className="font-semibold text-slate-800 text-xs">Accommodation & Meal Plan Package</div>
                                  <div className="text-slate-550 text-[10px] mt-0.5">{selectedHotelCategory} Hotels (Rooms: {roomConfig.double} Double, {roomConfig.single} Single, {roomConfig.extra_adult} Extra Adult, {roomConfig.cwb} CWB, {roomConfig.cnb} CNB)</div>
                                </td>
                                <td className="p-4 text-right font-bold text-slate-855 text-xs">₹{invoiceAcc.toLocaleString()}</td>
                              </tr>
                              <tr>
                                <td className="p-4">
                                  <div className="font-semibold text-slate-800 text-xs">Private Vehicle Charter & Route Transfers</div>
                                  <div className="text-slate-550 text-[10px] mt-0.5">Vehicle model: {db.vehicles.find(v => v.id === selectedVehicleId)?.name}. Includes local sightseeing and standard transfers.</div>
                                </td>
                                <td className="p-4 text-right font-bold text-slate-855 text-xs">₹{invoiceTrans.toLocaleString()}</td>
                              </tr>
                              <tr>
                                <td className="p-4">
                                  <div className="font-semibold text-slate-800 text-xs">Sightseeing, Activity Fees & Entries</div>
                                  <div className="text-slate-550 text-[10px] mt-0.5">Tickets, entrance fees, and activity bookings across destinations.</div>
                                </td>
                                <td className="p-4 text-right font-bold text-slate-855 text-xs">₹{invoiceAct.toLocaleString()}</td>
                              </tr>
                              {isB2BInvoice && (
                                <tr className="bg-slate-50/30 font-semibold text-slate-700">
                                  <td className="p-4 text-right">Agency Subtotal + Markup ({activeMarkup}%):</td>
                                  <td className="p-4 text-right font-bold text-slate-855">₹{Math.round(quoteCalculation.totals.subtotal + quoteCalculation.totals.markup).toLocaleString()}</td>
                                </tr>
                              )}
                              <tr className="bg-slate-50/30 font-semibold text-slate-700">
                                <td className="p-4 text-right">GST ({taxInput}%):</td>
                                <td className="p-4 text-right font-bold text-slate-855">₹{displayedInvoiceTax.toLocaleString()}</td>
                              </tr>
                              <tr className={`bg-${isB2BInvoice ? 'emerald' : 'slate-900'} text-white font-extrabold`}>
                                <td className="p-4 text-right text-xs uppercase tracking-wider font-heading">Grand Total Tour Investment:</td>
                                <td className="p-4 text-right text-sm font-heading">₹{displayedInvoiceTotal.toLocaleString()}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        {/* Dynamic Rate highlight block */}
                        <div className={`p-5 bg-${isB2BInvoice ? 'emerald' : 'orange'}-50/60 border border-${isB2BInvoice ? 'emerald' : 'orange'}-100 rounded-2xl shadow-sm`}>
                          {(travelers.cwb + travelers.cnb > 0) ? (
                            <div className="flex flex-col sm:flex-row print:flex-row justify-between items-start sm:items-center print:items-center gap-4 w-full">
                              <div className="flex-1 text-left">
                                <div className="text-[10px] uppercase text-slate-400 font-extrabold tracking-wider">Per Adult Rate</div>
                                <div className={`text-xl font-extrabold text-${isB2BInvoice ? 'emerald' : 'orange'}-700 font-heading mt-0.5`}>
                                  ₹{Math.round(quoteCalculation.totals.perAdult).toLocaleString()}
                                  <span className="text-[10px] text-slate-500 font-medium"> / adult</span>
                                </div>
                                <div className="text-[9px] text-slate-500 mt-0.5">Based on {travelers.adults} adults</div>
                              </div>
                              <div className="hidden sm:block print:block w-px h-10 bg-slate-200"></div>
                              <div className="flex-1 text-left">
                                <div className="text-[10px] uppercase text-slate-400 font-extrabold tracking-wider">Per Child Rate</div>
                                <div className={`text-xl font-extrabold text-${isB2BInvoice ? 'emerald' : 'orange'}-700 font-heading mt-0.5`}>
                                  ₹{Math.round(quoteCalculation.totals.perChild).toLocaleString()}
                                  <span className="text-[10px] text-slate-500 font-medium"> / child</span>
                                </div>
                                <div className="text-[9px] text-slate-500 mt-0.5">Based on {travelers.cwb + travelers.cnb} children</div>
                              </div>
                            </div>
                          ) : (
                            <div className="text-center py-2">
                              <div className="text-[10px] uppercase text-slate-400 font-extrabold tracking-wider">Per Person Rate</div>
                              <div className={`text-2xl font-extrabold text-${isB2BInvoice ? 'emerald' : 'orange'}-700 font-heading mt-0.5`}>
                                ₹{Math.round(quoteCalculation.totals.perPerson).toLocaleString()}
                                <span className="text-xs text-slate-500 font-medium"> / passenger</span>
                              </div>
                              <div className="text-[9px] text-slate-500 mt-0.5">Based on {travelers.adults} passengers</div>
                            </div>
                          )}
                        </div>
                      </div>

                      {hasNoStayTransfer && (
                        <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-3.5 mb-4 text-amber-800 text-[11px] leading-relaxed flex gap-2 items-start text-left">
                          <AlertTriangle size={14} className="shrink-0 text-amber-600 mt-0.5" />
                          <div>
                            <strong>Remark:</strong> Transfer cost may change at the time of final booking because the distance needs to be checked.
                          </div>
                        </div>
                      )}

                      {/* Section III: Inclusions & Terms */}
                      <div className="mb-6 page-break-inside-avoid">
                        <h3 className="text-sm font-bold font-heading uppercase text-slate-800 border-b border-slate-200 pb-2 mb-4 tracking-wide flex items-center gap-2">
                          <span className={`bg-${isB2BInvoice ? 'emerald' : 'orange'}-650 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-bold`}>3</span>
                          <span>Proposal Terms & Conditions</span>
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-6 text-[11px] text-slate-600 leading-relaxed">
                          <div className="bg-slate-50/40 border border-slate-200/60 p-4 rounded-xl">
                            <h4 className="font-extrabold text-slate-855 mb-2 uppercase tracking-wider text-[10px] text-green-700 flex items-center gap-1">
                              <span>✓</span> Inclusions
                            </h4>
                            <ul className="list-disc pl-4 space-y-1">
                              <li>All hotel accommodations with specified meal plans on twin/single sharing basis.</li>
                              <li>Private vehicle charter for transfers and sightseeing as mentioned in the itinerary.</li>
                              <li>Experienced driver, fuel, tolls, parking charges, and road taxes in Nepal.</li>
                              <li>Excursion entry fees, sightseeing transfers, and local coordination support.</li>
                            </ul>
                          </div>
                          
                          <div className="bg-slate-55/40 border border-slate-200/60 p-4 rounded-xl">
                            <h4 className="font-extrabold text-slate-855 mb-2 uppercase tracking-wider text-[10px] text-red-700 flex items-center gap-1">
                              <span>✗</span> Exclusions
                            </h4>
                            <ul className="list-disc pl-4 space-y-1">
                              <li>Airfare / train tickets or internal transits not listed in itinerary.</li>
                              <li>Meals and drinks not explicitly stated in inclusions.</li>
                              <li>Personal expenses like laundry, telephone calls, tipping, and guide fee.</li>
                              <li>Travel insurance, visa coordination fee, and medical evacuation cost.</li>
                            </ul>
                          </div>
                        </div>
                      </div>

                      {/* Footer / Thank you */}
                      <div className="border-t border-slate-200 mt-10 pt-6 text-center text-[10px] text-slate-400 flex flex-col gap-1">
                        <div>Thank you for choosing us as your travel partner. We look forward to welcoming you to Nepal!</div>
                        <div className="font-bold text-slate-500 mt-0.5">Nepal Holiday Proposal in Indian Rupees (INR) | Official Quote Copy</div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {currentSubView === 'profile' && (isB2B ? renderB2bProfile() : renderB2cProfile())}

              {isB2C && currentSubView === 'bookings' && renderB2cMyBookings()}

              </div>
            );
          })()}

          {/* Admin Panels View Screen */}
          {view === 'admin' && (
            <div className="fade-in max-w-6xl mx-auto">

              {/* TAB 1: Dashboard overview */}
              {activeAdminTab === 'dashboard' && (
                <div className="flex flex-col gap-6">
                  
                  {/* Dashboard metrics */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    
                    {/* Card 1: Total Inquiries */}
                    <div className="bg-blue-50/60 border border-blue-100 rounded-3xl p-4 shadow-sm flex items-center gap-3 hover:shadow-md transition duration-305">
                      <div className="bg-blue-600/10 text-blue-600 p-3 rounded-xl shrink-0">
                        <FileText size={20} />
                      </div>
                      <div>
                        <div className="text-[9px] uppercase text-slate-400 font-extrabold tracking-wider">Total Inquiries</div>
                        <div className="text-2xl font-extrabold text-slate-800 font-heading mt-0.5">{db.bookings.length}</div>
                      </div>
                    </div>
                    
                    {/* Card 2: Confirmed */}
                    <div className="bg-emerald-50/60 border border-emerald-100 rounded-3xl p-4 shadow-sm flex items-center gap-3 hover:shadow-md transition duration-305">
                      <div className="bg-emerald-600/10 text-emerald-600 p-3 rounded-xl shrink-0">
                        <CheckCircle size={20} />
                      </div>
                      <div>
                        <div className="text-[9px] uppercase text-slate-400 font-extrabold tracking-wider">Confirmed</div>
                        <div className="text-2xl font-extrabold text-slate-800 font-heading mt-0.5">
                          {db.bookings.filter(b => b.status === 'Confirmed').length}
                        </div>
                      </div>
                    </div>

                    {/* Card 3: Pending */}
                    <div className="bg-amber-50/60 border border-amber-100 rounded-3xl p-4 shadow-sm flex items-center gap-3 hover:shadow-md transition duration-305">
                      <div className="bg-amber-600/10 text-amber-600 p-3 rounded-xl shrink-0">
                        <Clock size={20} />
                      </div>
                      <div>
                        <div className="text-[9px] uppercase text-slate-400 font-extrabold tracking-wider">Pending</div>
                        <div className="text-2xl font-extrabold text-slate-800 font-heading mt-0.5">
                          {db.bookings.filter(b => b.status === 'Pending').length}
                        </div>
                      </div>
                    </div>

                    {/* Card 4: Pipeline (INR) */}
                    <div className="bg-indigo-50/60 border border-indigo-100 rounded-3xl p-4 shadow-sm flex items-center gap-3 hover:shadow-md transition duration-305">
                      <div className="bg-indigo-600/10 text-indigo-600 p-3 rounded-xl shrink-0">
                        <TrendingUp size={20} />
                      </div>
                      <div>
                        <div className="text-[9px] uppercase text-slate-400 font-extrabold tracking-wider">Pipeline (INR)</div>
                        <div className="text-xl font-extrabold text-slate-800 font-heading mt-0.5 truncate">
                          ₹{db.bookings.reduce((sum, b) => sum + b.total_price, 0).toLocaleString()}
                        </div>
                      </div>
                    </div>

                    {/* Card 5: B2C Leads */}
                    <div 
                      onClick={() => setActiveAdminTab('leads')}
                      className="bg-orange-50/60 border border-orange-100 rounded-3xl p-4 shadow-sm flex items-center gap-3 hover:shadow-md hover:scale-[1.02] cursor-pointer transition duration-305"
                    >
                      <div className="bg-orange-600/10 text-orange-600 p-3 rounded-xl shrink-0">
                        <Users size={20} />
                      </div>
                      <div>
                        <div className="text-[9px] uppercase text-slate-400 font-extrabold tracking-wider">B2C Leads</div>
                        <div className="text-2xl font-extrabold text-slate-800 font-heading mt-0.5">
                          {(db.leads || []).length}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Pricing markup configurations */}
                  <div className="bg-white p-6 border border-slate-200 rounded-3xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                      <h4 className="text-sm font-extrabold uppercase text-slate-800 mb-1 flex items-center gap-2">
                        <Settings size={16} className="text-indigo-650" /> <span>Global Pricing Formulas (INR)</span>
                      </h4>
                      <p className="text-xs text-slate-500">
                        Markups and government GST are calculated dynamically on B2C client checkout.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                      <div className="w-[130px]">
                        <label className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block mb-1.5">B2C Client Markup (%)</label>
                        <input 
                          type="number"
                          value={b2cMarkupInput}
                          onChange={(e) => setB2cMarkupInput(Number(e.target.value))}
                          className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-semibold text-slate-800"
                          min="0"
                        />
                      </div>
                      <div className="w-[130px]">
                        <label className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block mb-1.5">B2B Partner Markup (%)</label>
                        <input 
                          type="number"
                          value={b2bMarkupInput}
                          onChange={(e) => setB2bMarkupInput(Number(e.target.value))}
                          className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-semibold text-slate-800"
                          min="0"
                        />
                      </div>
                      <div className="w-[130px]">
                        <label className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block mb-1.5">Nepal GST (%)</label>
                        <input 
                          type="number"
                          value={taxInput}
                          onChange={(e) => setTaxInput(Number(e.target.value))}
                          className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-semibold text-slate-800"
                          min="0"
                        />
                      </div>
                      <button 
                        onClick={handleSaveSettings}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs uppercase tracking-wider py-2.5 px-5 rounded-xl shadow-md transition hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-1.5 mt-4 md:mt-0"
                      >
                        <Save size={13} /> <span>Save Settings</span>
                      </button>
                    </div>
                  </div>

                  {/* Promo Poster Popup Settings Card */}
                  <div className="bg-white p-6 border border-slate-200 rounded-3xl shadow-sm mt-6 text-left">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-100 pb-5 mb-5">
                      <div>
                        <h4 className="text-sm font-extrabold uppercase text-slate-800 mb-1 flex items-center gap-2">
                          <Image size={16} className="text-indigo-650" /> <span>On-Load Promotional Popup Poster</span>
                        </h4>
                        <p className="text-xs text-slate-500">
                          Upload or paste a poster URL that displays as a modal to B2C travelers once per session.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-semibold text-slate-700 flex items-center gap-2 cursor-pointer bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 hover:bg-slate-100 transition">
                          <input 
                            type="checkbox" 
                            checked={posterActiveInput}
                            onChange={(e) => setPosterActiveInput(e.target.checked)}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span>Toggle Popup Active</span>
                        </label>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                      <div className="flex flex-col gap-4">
                        <div>
                          <label className="text-[9px] uppercase font-bold text-slate-405 tracking-wider block mb-1.5">Paste Poster Image URL</label>
                          <input 
                            type="text"
                            value={posterUrlInput}
                            onChange={(e) => setPosterUrlInput(e.target.value)}
                            placeholder="https://example.com/promo-poster.jpg"
                            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 transition-all font-semibold text-slate-800"
                          />
                        </div>

                        <div>
                          <label className="text-[9px] uppercase font-bold text-slate-405 tracking-wider block mb-1.5">Or Upload Poster Image file</label>
                          <input 
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  setPosterUrlInput(reader.result);
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                            className="w-full text-xs text-slate-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:uppercase file:bg-indigo-50 file:text-indigo-750 hover:file:bg-indigo-100 cursor-pointer"
                          />
                        </div>

                        <div className="flex gap-2">
                          <button 
                            onClick={handleSaveSettings}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs uppercase tracking-wider py-2 px-5 rounded-xl shadow-md transition"
                          >
                            Save Poster Config
                          </button>
                          <button 
                            onClick={() => {
                              setPosterUrlInput('/nepal_hero.png'); // Setting a default fallback poster
                              alert("Poster URL set to default fallback image! Save settings to apply.");
                            }}
                            className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs py-2 px-4 rounded-xl transition animate-pulse"
                          >
                            Set Default Poster
                          </button>
                        </div>
                      </div>

                      {/* Poster Preview Block */}
                      <div className="bg-slate-50/50 border border-slate-200/60 p-4 rounded-2xl flex flex-col items-center justify-center min-h-[160px]">
                        {posterUrlInput ? (
                          <div className="text-center w-full">
                            <span className="text-[9px] uppercase font-bold text-slate-405 tracking-wider block mb-2">Live Live Preview</span>
                            <div className="max-h-[150px] overflow-hidden rounded-xl border border-slate-200 inline-block bg-white shadow-sm">
                              <img 
                                src={posterUrlInput} 
                                alt="Poster Preview" 
                                className="max-h-[150px] w-auto object-contain block"
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="text-center text-[10px] text-slate-400 italic">
                            No poster image configured yet. Upload a file or paste a URL above.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>




                  {/* Bookings/Quotes list table */}
                  <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-5 border-b border-slate-105 bg-slate-50/50 flex items-center justify-between">
                      <h4 className="text-xs font-extrabold uppercase text-slate-800 tracking-wider">
                        B2C Bookings & Quote Inquiries Log
                      </h4>
                      <span className="bg-indigo-50 text-indigo-700 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-indigo-100 uppercase tracking-wider">
                        {db.bookings.length} entries
                      </span>
                    </div>

                    {db.bookings.length === 0 ? (
                      <div className="p-12 text-center text-xs text-slate-450 italic leading-relaxed">
                        No B2C bookings or quote inquiries found. Try booking a Nepal tour package in B2C view.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-550 font-extrabold uppercase text-[9px] tracking-wider">
                              <th className="py-3.5 px-6">Quote ID</th>
                              <th className="py-3.5 px-4">Customer details</th>
                              <th className="py-3.5 px-4">Package / Tour name</th>
                              <th className="py-3.5 px-4">Travel date</th>
                              <th className="py-3.5 px-4">Status</th>
                              <th className="py-3.5 px-4">Quote price</th>
                              <th className="py-3.5 px-6 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {db.bookings.map(b => (
                              <tr key={b.id} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/40 transition-colors">
                                <td className="py-4 px-6 font-extrabold text-indigo-700">
                                  <div>#{b.id}</div>
                                  <div className="mt-1">
                                    {b.type === 'B2B' ? (
                                      <span className="inline-block bg-emerald-100 text-emerald-800 text-[9px] font-extrabold px-2 py-0.5 rounded border border-emerald-250 uppercase">
                                        B2B Agent
                                      </span>
                                    ) : (
                                      <span className="inline-block bg-orange-100 text-orange-800 text-[9px] font-extrabold px-2 py-0.5 rounded border border-orange-200 uppercase">
                                        B2C Client
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-4 px-4">
                                  <div className="font-bold text-slate-800">{b.client_name}</div>
                                  <div className="text-[10px] text-slate-500 mt-0.5">{b.email} | {b.phone}</div>
                                </td>
                                <td className="py-4 px-4">
                                  <div className="font-bold text-slate-800">{b.package_name}</div>
                                  <div className="text-[10px] text-slate-400 italic leading-relaxed mt-0.5">{b.itinerary_summary}</div>
                                </td>
                                <td className="py-4 px-4 font-semibold text-slate-600">{b.travel_date}</td>
                                <td className="py-4 px-4">
                                  <span className={`inline-block font-extrabold text-[10px] px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${
                                    b.status === 'Confirmed' 
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                                      : 'bg-amber-50 text-amber-700 border-amber-100'
                                  }`}>
                                    {b.status}
                                  </span>
                                </td>
                                <td className="py-4 px-4 font-extrabold text-slate-800 text-sm">
                                  <div>₹{b.total_price.toLocaleString()}</div>
                                  {b.type === 'B2B' && (
                                    <div className="text-[10px] text-emerald-600 font-bold mt-0.5">
                                      Comm: ₹{(b.agent_commission || Math.round(b.total_price * 0.1)).toLocaleString()}
                                    </div>
                                  )}
                                </td>
                                <td className="py-4 px-6 text-right">
                                  <button 
                                    onClick={() => handleDeleteBooking(b.id)}
                                    className="bg-transparent text-red-500 hover:text-red-750 p-2 hover:bg-red-50 rounded-xl transition"
                                    title="Delete Inquiry Log"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                </div>
              )}

              {activeAdminTab === 'cities' && (
                <div className="flex flex-col gap-6">
                  {/* Title and Form */}
                  <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm mt-8">
                    <div>
                      <h2 className="text-2xl font-bold font-heading text-[#0f2942]">Cities Master</h2>
                      <p className="text-slate-500 text-sm mt-1">Manage standard cities available across the platform.</p>
                    </div>
                  </div>

                  {/* Add City Form */}
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6">
                    <form onSubmit={handleAddNewCity} className="flex items-end gap-4 max-w-md">
                      <div className="flex-1">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Add New City</label>
                        <input
                          type="text"
                          value={newCityName}
                          onChange={(e) => setNewCityName(e.target.value)}
                          placeholder="e.g. Pokhara"
                          className="form-input text-sm py-2.5 px-4 w-full border border-slate-300 rounded-xl"
                          required
                        />
                      </div>
                      <button type="submit" className="btn btn-primary whitespace-nowrap h-[42px] px-6">
                        Add City
                      </button>
                    </form>
                  </div>

                  {/* Cities List */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {(db.cities || []).map(city => {
                      const airport = getAirportForCity(db.airports || [], city);
                      return (
                        <div key={city} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between group hover:border-indigo-200 transition-colors">
                          <div className="min-w-0">
                            <span className="font-semibold text-slate-800 block truncate">{city}</span>
                            {airport && (
                              <span className="text-[10px] text-sky-700 font-bold flex items-center gap-1 mt-0.5">
                                <Plane size={10} /> {airport.code || 'Air'}
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => setEditingCity({ original: city, name: city })}
                            className="text-slate-300 hover:text-indigo-500 p-1 opacity-0 group-hover:opacity-100 transition shrink-0"
                            title="Rename City"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteCity(city)}
                            className="text-slate-300 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition shrink-0"
                            title="Delete City"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {/* Airports Master. Separate from cities because one airport
                      can serve several of them (Bhairahawa covers Lumbini,
                      Butwal and Bhairahawa) and its name often differs from
                      the city it serves (Chitwan flies via Bharatpur). */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm mt-4">
                    <h3 className="text-xl font-bold font-heading text-slate-800 flex items-center gap-2">
                      <Plane size={18} className="text-sky-600" /> Airports
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed max-w-3xl">
                      Which cities can be reached by air, and through which airport. The quote builder
                      offers a <strong>Flight</strong> option between two cities only when both appear
                      here under <em>different</em> airports. One airport can serve several cities —
                      each still gets its own airport transfer price under Vehicles &amp; Routes,
                      because the drive from the airport differs per city.
                    </p>

                    <form onSubmit={handleAddAirport} className="mt-5 bg-sky-50/50 border border-sky-100 rounded-xl p-4 flex flex-col gap-3">
                      <div className="flex flex-col md:flex-row gap-3">
                        <div className="flex-1">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Airport Name</label>
                          <input
                            type="text"
                            value={newAirportForm.name}
                            onChange={(e) => setNewAirportForm({ ...newAirportForm, name: e.target.value })}
                            placeholder="e.g. Pokhara International Airport"
                            className="form-input text-xs py-2 px-3 w-full border border-slate-300 rounded-lg"
                          />
                        </div>
                        <div className="w-full md:w-32">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Code</label>
                          <input
                            type="text"
                            value={newAirportForm.code}
                            onChange={(e) => setNewAirportForm({ ...newAirportForm, code: e.target.value })}
                            placeholder="PKR"
                            maxLength={5}
                            className="form-input text-xs py-2 px-3 w-full border border-slate-300 rounded-lg uppercase"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Cities This Airport Serves</label>
                        <div className="flex flex-wrap gap-2">
                          {(db.cities || []).map(city => {
                            const selected = newAirportForm.cities.includes(city);
                            return (
                              <button
                                key={city}
                                type="button"
                                onClick={() => handleToggleNewAirportCity(city)}
                                className={`text-[11px] font-bold py-1.5 px-3 rounded-lg border transition ${
                                  selected
                                    ? 'bg-sky-600 border-sky-600 text-white shadow-sm'
                                    : 'bg-white border-slate-300 text-slate-600 hover:border-sky-400'
                                }`}
                              >
                                {city}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <button type="submit" className="btn btn-primary text-xs py-2 px-5">Add Airport</button>
                      </div>
                    </form>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-5">
                      {(db.airports || []).length === 0 ? (
                        <p className="text-xs text-slate-400 italic col-span-full">
                          No airports configured yet — every city pair will be road-only.
                        </p>
                      ) : (
                        (db.airports || []).map(airport => (
                          <div key={airport.id} className="bg-white border border-slate-200 rounded-xl p-4 flex items-start justify-between gap-3 group hover:border-sky-200 transition-colors">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-800 text-sm break-words">{airport.name}</span>
                                {airport.code && (
                                  <span className="bg-sky-100 text-sky-700 text-[10px] font-black px-1.5 py-0.5 rounded shrink-0">{airport.code}</span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 mt-1">
                                Serves: <strong className="text-slate-700">{(airport.cities || []).join(', ') || '—'}</strong>
                              </p>
                            </div>
                            <button
                              onClick={() => setEditingAirport({ ...airport, cities: [...(airport.cities || [])] })}
                              className="text-slate-300 hover:text-indigo-500 p-1 opacity-0 group-hover:opacity-100 transition shrink-0"
                              title="Edit Airport"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteAirport(airport.id)}
                              className="text-slate-300 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition shrink-0"
                              title="Remove Airport"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeAdminTab === 'hotels' && (
                <div className="flex flex-col gap-6">
                  
                  {/* Title and Add New Button */}
                  <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm mt-8">
                    <div>
                      <h3 className="text-xl font-bold font-heading text-slate-800">Hotel Master Matrix Editor (INR ₹)</h3>
                      <p className="text-xs text-slate-500 mt-1">Manage 15-cell tariff rates (Single, Double, Extra Adult, CWB, and CNB across CP, MAP, AP meal packages).</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={exportHotels}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs uppercase tracking-wider py-2.5 px-4 rounded-xl shadow-md transition hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-1.5"
                      >
                        <Download size={14} /> <span>Export Excel</span>
                      </button>
                      
                      <label className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs uppercase tracking-wider py-2.5 px-4 rounded-xl shadow-md cursor-pointer transition hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-1.5">
                        <Upload size={14} /> <span>Import Excel</span>
                        <input 
                          type="file" 
                          accept=".xlsx, .xls, .csv" 
                          onChange={importHotels} 
                          className="hidden" 
                        />
                      </label>

                      <button 
                        onClick={() => setShowAddHotelModal(true)}
                        className="bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs uppercase tracking-wider py-2.5 px-5 rounded-xl shadow-md transition hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-1.5"
                      >
                        <Plus size={14} /> <span>Add New Hotel</span>
                      </button>
                    </div>
                  </div>

                  {/* Filter Controls */}
                  <div className="bg-slate-50 border border-slate-200/80 p-5 rounded-2xl flex flex-wrap items-center gap-6 text-xs text-slate-700 shadow-sm">
                    <div className="flex items-center gap-2.5">
                      <span className="font-extrabold uppercase text-[10px] text-slate-400 tracking-wider">City Location:</span>
                      <select 
                        value={adminFilterCity} 
                        onChange={(e) => setAdminFilterCity(e.target.value)}
                        className="py-2 px-3 text-xs w-[150px] bg-white border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 font-semibold text-slate-700 transition"
                      >
                        <option value="All">All Cities</option>
                        {(db.cities || []).map(city => (
                          <option key={city} value={city}>{city}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <span className="font-extrabold uppercase text-[10px] text-slate-400 tracking-wider">Hotel Tier:</span>
                      <select 
                        value={adminFilterCategory} 
                        onChange={(e) => setAdminFilterCategory(e.target.value)}
                        className="py-2 px-3 text-xs w-[150px] bg-white border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 font-semibold text-slate-700 transition"
                      >
                        <option value="All">All Categories</option>
                        <option value="3-Star">3-Star</option>
                        <option value="4-Star">4-Star</option>
                        <option value="5-Star">5-Star</option>
                      </select>
                    </div>

                    {(adminFilterCity !== 'All' || adminFilterCategory !== 'All') && (
                      <button 
                        onClick={() => { setAdminFilterCity('All'); setAdminFilterCategory('All'); }}
                        className="text-xs text-orange-650 hover:text-orange-700 underline font-bold ml-auto transition"
                      >
                        Clear Filters
                      </button>
                    )}
                  </div>

                  {/* Hotels List with Rate Grids */}
                  <div className="flex flex-col gap-6">
                    {db.hotels
                      .filter(h => {
                        const matchesCity = adminFilterCity === 'All' || h.city.toLowerCase() === adminFilterCity.toLowerCase();
                        const matchesCategory = adminFilterCategory === 'All' || h.category === adminFilterCategory;
                        return matchesCity && matchesCategory;
                      })
                      .map(h => {
                        const isEditing = editingHotelId === h.id;
                        const activeH = isEditing ? hotelEditState : h;

                        return (
                          <div key={h.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition duration-300">
                            
                            {/* Hotel Header Block */}
                            <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                              {isEditing ? (
                                <div className="flex-1 space-y-2.5">
                                  <div className="flex flex-wrap items-center gap-2.5">
                                    <input 
                                      type="text" 
                                      value={hotelEditState.name} 
                                      onChange={(e) => setHotelEditState(prev => ({ ...prev, name: e.target.value }))} 
                                      className="form-input text-xs font-bold py-1.5 px-3 border border-slate-300 rounded-xl w-[220px] focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" 
                                      placeholder="Hotel Name"
                                    />
                                    <select 
                                      value={hotelEditState.category} 
                                      onChange={(e) => setHotelEditState(prev => ({ ...prev, category: e.target.value }))} 
                                      className="py-1.5 px-3 text-xs border border-slate-300 rounded-xl bg-white font-semibold text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                    >
                                      <option value="3-Star">3-Star</option>
                                      <option value="4-Star">4-Star</option>
                                      <option value="5-Star">5-Star</option>
                                    </select>
                                    <select 
                                      value={hotelEditState.city} 
                                      onChange={(e) => setHotelEditState(prev => ({ ...prev, city: e.target.value }))} 
                                      className="py-1.5 px-3 text-xs border border-slate-300 rounded-xl bg-white font-semibold text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                    >
                                      {(db.cities || []).map(city => (
                                        <option key={city} value={city}>{city}</option>
                                      ))}
                                    </select>
                                  </div>
                                  <textarea 
                                    value={hotelEditState.description} 
                                    onChange={(e) => setHotelEditState(prev => ({ ...prev, description: e.target.value }))} 
                                    className="form-input text-xs py-1.5 px-3 border border-slate-300 rounded-xl w-full resize-y min-h-[40px] focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" 
                                    rows={1} 
                                    placeholder="Hotel Description"
                                  />
                                </div>
                              ) : (
                                <div>
                                  <div className="flex items-center gap-2.5">
                                    <h4 className="text-base font-extrabold text-slate-800 tracking-tight font-heading">{h.name}</h4>
                                    <span className="bg-blue-50 text-blue-700 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-blue-100 uppercase tracking-wider">
                                      {h.category}
                                    </span>
                                    <span className="bg-indigo-50 text-indigo-700 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-indigo-100 uppercase tracking-wider">
                                      {h.city}
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{h.description}</p>
                                </div>
                              )}
                              
                              <div className="shrink-0">
                                {isEditing ? (
                                  <div className="flex items-center gap-2">
                                    <button 
                                      onClick={handleSaveHotelEdit}
                                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs uppercase tracking-wider py-2 px-4 rounded-xl shadow-md transition hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-1.5"
                                    >
                                      <Save size={13} /> <span>Save Hotel</span>
                                    </button>
                                    <button 
                                      onClick={() => setEditingHotelId(null)}
                                      className="px-4 py-2 text-xs text-slate-500 hover:text-slate-700 bg-transparent font-bold transition"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <button 
                                      onClick={() => handleStartEditHotel(h)}
                                      className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-extrabold text-xs uppercase tracking-wider py-2 px-4 rounded-xl shadow-sm transition hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-1.5"
                                    >
                                      <Edit3 size={13} className="text-indigo-600" /> <span>Edit Details & Rates</span>
                                    </button>
                                    <button 
                                      onClick={() => handleDeleteHotel(h.id)}
                                      className="bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 font-extrabold text-xs uppercase tracking-wider py-2.5 px-3 rounded-xl transition hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center"
                                      title="Delete Hotel"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Rates Grid Table */}
                            <div className="p-6 overflow-x-auto">
                              <table className="min-w-full text-xs text-left border-collapse rounded-2xl overflow-hidden border border-slate-200">
                                <thead>
                                  <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-550">
                                    <th className="py-3 px-4 font-bold uppercase text-[9px] tracking-wider text-slate-500">Occupant Category</th>
                                    <th className="py-3 px-4 font-bold uppercase text-center bg-slate-50 border-x border-slate-200 text-[9px] tracking-wider text-slate-500">CP Rate (₹)</th>
                                    <th className="py-3 px-4 font-bold uppercase text-center border-r border-slate-200 text-[9px] tracking-wider text-slate-500">MAP Rate (₹)</th>
                                    <th className="py-3 px-4 font-bold uppercase text-center text-[9px] tracking-wider text-slate-500">AP Rate (₹)</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {['single', 'double', 'extra_adult', 'cwb', 'cnb'].map(category => {
                                    const displayLabel = {
                                      single: 'Single Room occupancy',
                                      double: 'Double Room occupancy',
                                      extra_adult: 'Extra Adult (with Bed)',
                                      cwb: 'Child with Bed (CWB)',
                                      cnb: 'Child without Bed (CNB)'
                                    }[category];

                                    return (
                                      <tr key={category} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/40 transition-colors">
                                        <td className="py-3 px-4 font-bold text-slate-700 capitalize">{displayLabel}</td>
                                        
                                        {/* CP Rate Cell */}
                                        <td className="py-2.5 px-4 text-center bg-slate-50/50 border-x border-slate-200">
                                          {isEditing ? (
                                            <input 
                                              type="number"
                                              value={activeH.rates[category]?.CP || 0}
                                              onChange={(e) => handleNestedHotelRateChange(category, 'CP', e.target.value)}
                                              className="w-28 px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-semibold text-center text-slate-800"
                                              min="0"
                                            />
                                          ) : (
                                            <span className="font-extrabold text-slate-850 text-sm">₹{(activeH.rates[category]?.CP || 0).toLocaleString()}</span>
                                          )}
                                        </td>

                                        {/* MAP Rate Cell */}
                                        <td className="py-2.5 px-4 text-center border-r border-slate-200">
                                          {isEditing ? (
                                            <input 
                                              type="number"
                                              value={activeH.rates[category]?.MAP || 0}
                                              onChange={(e) => handleNestedHotelRateChange(category, 'MAP', e.target.value)}
                                              className="w-28 px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-semibold text-center text-slate-800"
                                              min="0"
                                            />
                                          ) : (
                                            <span className="font-extrabold text-slate-850 text-sm">₹{(activeH.rates[category]?.MAP || 0).toLocaleString()}</span>
                                          )}
                                        </td>

                                        {/* AP Rate Cell */}
                                        <td className="py-2.5 px-4 text-center">
                                          {isEditing ? (
                                            <input 
                                              type="number"
                                              value={activeH.rates[category]?.AP || 0}
                                              onChange={(e) => handleNestedHotelRateChange(category, 'AP', e.target.value)}
                                              className="w-28 px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-semibold text-center text-slate-800"
                                              min="0"
                                            />
                                          ) : (
                                            <span className="font-extrabold text-slate-850 text-sm">₹{(activeH.rates[category]?.AP || 0).toLocaleString()}</span>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
              {/* TAB 3: Activities Rate Sheet */}
              {activeAdminTab === 'activities' && (
                <div className="flex flex-col gap-6">
                  
                  {/* Title and Add Button */}
                  <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
                    <div>
                      <h3 className="text-xl font-bold font-heading text-slate-800">Excursion & Ticket Tariffs (INR)</h3>
                      <p className="text-xs text-slate-500 mt-1">Edit tickets, flight and safari pricing by age configurations.</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={exportActivities}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs uppercase tracking-wider py-2.5 px-4 rounded-xl shadow-md transition hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-1.5"
                      >
                        <Download size={14} /> <span>Export Excel</span>
                      </button>
                      
                      <label className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs uppercase tracking-wider py-2.5 px-4 rounded-xl shadow-md cursor-pointer transition hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-1.5">
                        <Upload size={14} /> <span>Import Excel</span>
                        <input 
                          type="file" 
                          accept=".xlsx, .xls, .csv" 
                          onChange={importActivities} 
                          className="hidden" 
                        />
                      </label>

                      <button 
                        onClick={() => setShowAddActivityModal(true)}
                        className="bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs uppercase tracking-wider py-2.5 px-5 rounded-xl shadow-md transition hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-1.5"
                      >
                        <Plus size={14} /> <span>Add New Activity</span>
                      </button>
                    </div>
                  </div>

                  {/* Activity Table Container */}
                  <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-500 font-extrabold uppercase text-[9px] tracking-wider">
                            <th className="py-3.5 px-6">Activity name</th>
                            <th className="py-3.5 px-4">City Location</th>
                            <th className="py-3.5 px-4">Adult cost (₹)</th>
                            <th className="py-3.5 px-4">Child cost (₹)</th>
                            <th className="py-3.5 px-6">Brief description</th>
                            <th className="py-3.5 px-6 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {db.activities.map(act => {
                            return (
                              <tr key={act.id} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/40 transition-colors">
                                    <td className="py-3.5 px-6 font-extrabold text-slate-805">
                                      <span className="flex items-center gap-1.5">
                                        {act.pricing_mode === 'per_vehicle' && (
                                          <span className="sightseeing-pip text-[9px] font-bold px-1.5 py-0.5 rounded uppercase shrink-0">Per vehicle</span>
                                        )}
                                        {act.name}
                                      </span>
                                    </td>
                                    {/* An activity is only offerable on a day in its own city, so
                                        one pointing at a city that no longer exists is invisible
                                        in the builder with nothing to explain why. Flag it here
                                        rather than let it sit unreachable. */}
                                    <td className="py-3.5 px-4 font-semibold text-slate-600">
                                      {act.city}
                                      {!(db.cities || []).some(c => sameCity(c, act.city)) && (
                                        <span
                                          className="activity-city-warning text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ml-1.5 whitespace-nowrap"
                                          title="This city is not in the Cities master, so this activity cannot be added to any day. Fix the city, or add it under Cities."
                                        >
                                          Unknown city
                                        </span>
                                      )}
                                    </td>
                                    {act.pricing_mode === 'per_vehicle' ? (
                                      // One vehicle for one day: a per-head price would be
                                      // meaningless, so the two per-person columns give way to
                                      // the rate for each vehicle.
                                      <td className="py-3.5 px-4" colSpan={2}>
                                        <div className="flex flex-wrap gap-1.5">
                                          {(db.vehicles || []).map(v => (
                                            <span key={v.id} className="text-[10px] font-bold bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5">
                                              {v.name.split(' ')[0]} ₹{Number((act.vehicle_rates || {})[v.id] || 0).toLocaleString()}
                                            </span>
                                          ))}
                                        </div>
                                      </td>
                                    ) : (
                                      <>
                                        <td className="py-3.5 px-4 font-bold text-slate-850">₹{act.price_adult.toLocaleString()}</td>
                                        <td className="py-3.5 px-4 font-bold text-slate-850">₹{act.price_child.toLocaleString()}</td>
                                      </>
                                    )}
                                    <td className="py-3.5 px-6 text-xs text-slate-500 leading-relaxed">{act.description}</td>
                                    <td className="py-3.5 px-6 text-right">
                                      <div className="flex gap-2 justify-end">
                                        <button 
                                          onClick={() => handleStartEditActivity(act)} 
                                          className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-650 hover:text-indigo-650 py-1.5 px-3 rounded-lg shadow-sm transition inline-flex items-center gap-1" 
                                          title="Edit Activity Details"
                                        >
                                          <Edit3 size={12} /> <span>Edit</span>
                                        </button>
                                        <button 
                                          onClick={() => handleDeleteActivity(act.id)}
                                          className="bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 font-extrabold text-xs uppercase tracking-wider py-1.5 px-2.5 rounded-lg transition inline-flex items-center justify-center"
                                          title="Delete Activity"
                                        >
                                          <Trash2 size={13} />
                                        </button>
                                      </div>
                                    </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: Vehicle Route rates */}
              {activeAdminTab === 'vehicles' && (
                <div className="flex flex-col gap-5">

                  {/* Title + top actions */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-bold font-heading text-slate-800">Transfer Rate Sheet (INR)</h3>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed max-w-2xl">
                        One row per transfer, one column per vehicle — edit any price directly.
                        A sector costs the same in both directions, so entering it once is enough.
                        Full-day sightseeing is priced on the vehicle itself, not here — click a
                        vehicle above to set it.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 shrink-0">
                      <button
                        onClick={() => setShowAddRoutePanel(v => !v)}
                        className="bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-[11px] uppercase tracking-wider py-2.5 px-4 rounded-xl shadow-md transition flex items-center gap-1.5"
                      >
                        <Plus size={14} /> <span>Add Transfer</span>
                      </button>
                      <button
                        onClick={() => setShowAddVehicleModal(true)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[11px] uppercase tracking-wider py-2.5 px-4 rounded-xl shadow-md transition flex items-center gap-1.5"
                      >
                        <Plus size={14} /> <span>Add Vehicle</span>
                      </button>
                      <button
                        onClick={exportVehicles}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[11px] uppercase tracking-wider py-2.5 px-4 rounded-xl shadow-md transition flex items-center gap-1.5"
                      >
                        <Download size={14} /> <span>Export</span>
                      </button>
                      <label className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-[11px] uppercase tracking-wider py-2.5 px-4 rounded-xl shadow-md cursor-pointer transition flex items-center gap-1.5">
                        <Upload size={14} /> <span>Import</span>
                        <input type="file" accept=".xlsx, .xls, .csv" onChange={importVehicles} className="hidden" />
                      </label>
                    </div>
                  </div>

                  {/* Vehicle strip. Identity only -- prices live in the grid
                      below, so this stays a compact reference rather than four
                      long cards you have to scroll past to reach the rates. */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {(db.vehicles || []).map(v => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setEditingVehicleDetails({ ...v })}
                        className="rate-vehicle-card text-left p-3.5 rounded-xl transition"
                        title="Edit this vehicle's details"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="rate-vehicle-name text-xs font-extrabold truncate">{v.name}</span>
                          <Edit3 size={12} className="opacity-50 shrink-0" />
                        </div>
                        <span className="rate-vehicle-meta text-[10px] block mt-1">
                          Up to {v.capacity || '—'} pax · Sightseeing ₹{Number(v.daily_sightseeing_rate || 0).toLocaleString()}/day
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* Add Transfer panel -- collapsed by default so the rate
                      sheet is what you land on. */}
                  {showAddRoutePanel && (
                    <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
                      <form onSubmit={(e) => { handleGlobalRouteAdd(e); }} className="flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <h6 className="text-xs font-extrabold uppercase text-orange-800 tracking-wider flex items-center gap-1.5">
                            <Plus size={14} className="text-orange-600" /> Add New Transfer
                          </h6>
                          <button type="button" onClick={() => setShowAddRoutePanel(false)} className="text-slate-400 hover:text-slate-600 text-xs font-bold">Close</button>
                        </div>

                        <div className="space-y-2">
                          <label className="block text-[9px] uppercase font-bold text-slate-400">Route Stops Sequence (cities &amp; airports)</label>
                          <div className="flex flex-wrap items-center gap-2 bg-white p-2.5 rounded-xl border border-slate-200">
                            {globalRouteStops.filter(Boolean).map((stop, idx) => (
                              <React.Fragment key={idx}>
                                {idx > 0 && (
                                  <div className="flex items-center gap-1 mx-1">
                                    <span className="text-slate-300 font-bold text-xs">➔</span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const newStops = [...globalRouteStops];
                                        newStops.splice(idx, 0, db.cities?.[0] || 'Kathmandu');
                                        setGlobalRouteStops(newStops);
                                      }}
                                      className="w-4.5 h-4.5 flex items-center justify-center bg-orange-100 hover:bg-orange-600 text-orange-600 hover:text-white rounded-full text-[10px] font-extrabold transition cursor-pointer shadow-sm"
                                      title="Insert Stop in Between"
                                    >
                                      +
                                    </button>
                                    <span className="text-slate-300 font-bold text-xs">➔</span>
                                  </div>
                                )}
                                <div className="flex items-center bg-orange-55 border border-orange-100 rounded-lg px-2.5 py-1 shadow-sm">
                                  <select
                                    value={stop}
                                    onChange={(e) => {
                                      const newStops = [...globalRouteStops];
                                      newStops[idx] = e.target.value;
                                      setGlobalRouteStops(newStops);
                                    }}
                                    className="bg-transparent text-xs font-bold text-orange-900 focus:outline-none cursor-pointer pr-1 max-w-[240px]"
                                  >
                                    {renderRouteStopOptions()}
                                  </select>
                                  {globalRouteStops.filter(Boolean).length > 2 && (
                                    <button
                                      type="button"
                                      onClick={() => setGlobalRouteStops(prev => prev.filter((_, i) => i !== idx))}
                                      className="text-orange-400 hover:text-red-655 transition font-extrabold text-[10px] cursor-pointer ml-1"
                                      title="Remove Stop"
                                    >
                                      ✕
                                    </button>
                                  )}
                                </div>
                              </React.Fragment>
                            ))}
                          </div>
                          <p className="text-[10px] text-slate-505 font-bold italic">
                            Preview: <span className="text-orange-700 font-extrabold">{routeStopPreview(globalRouteStops)}</span>
                            <span className="rate-reverse-hint font-normal not-italic"> — the reverse direction is priced automatically.</span>
                          </p>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2 border-t border-orange-100">
                          {(db.vehicles || []).map(v => (
                            <div key={v.id}>
                              <label className="block text-[9px] uppercase font-bold text-slate-500 mb-0.5 truncate" title={v.name}>{v.name} (₹)</label>
                              <input
                                type="number"
                                placeholder="0"
                                value={globalRouteForm.prices[v.id] || ''}
                                onChange={(e) => setGlobalRouteForm({
                                  ...globalRouteForm,
                                  prices: { ...globalRouteForm.prices, [v.id]: e.target.value }
                                })}
                                className="form-input text-xs py-1.5 px-2 w-full border border-slate-300 rounded-lg"
                              />
                            </div>
                          ))}
                        </div>

                        <div className="flex justify-end mt-1">
                          <button type="submit" className="bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-[10px] uppercase tracking-wider py-2 px-4 rounded-lg shadow transition">
                            Add Transfer
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* Toolbar: search, category filter, and the save bar */}
                  <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col lg:flex-row lg:items-center gap-3 justify-between">
                    <div className="flex flex-wrap items-center gap-2">
                      {RATE_FILTERS.map(f => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => setRateFilter(f.id)}
                          className={`rate-chip ${rateFilter === f.id ? 'is-active' : ''} text-[11px] font-extrabold uppercase tracking-wide py-1.5 px-3 rounded-lg`}
                        >
                          {f.label}
                          <span className="rate-chip-count ml-1.5">
                            {f.id === 'all'
                              ? rateSheetRoutes.length
                              : rateSheetRoutes.filter(r => routeCategory(r.key) === f.id).length}
                          </span>
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-2 flex-1 lg:justify-end">
                      <input
                        type="text"
                        value={rateSearch}
                        onChange={(e) => setRateSearch(e.target.value)}
                        placeholder="Search transfers…"
                        className="form-input text-xs py-2 px-3 border border-slate-300 rounded-lg w-full lg:max-w-[220px]"
                      />
                      {rateEditCount > 0 && (
                        <>
                          <button
                            type="button"
                            onClick={() => setRateEdits({})}
                            className="text-[11px] font-bold text-slate-500 hover:text-slate-700 px-2 shrink-0"
                          >
                            Discard
                          </button>
                          <button
                            type="button"
                            onClick={handleSaveRateEdits}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[11px] uppercase tracking-wider py-2 px-4 rounded-lg shadow transition shrink-0 flex items-center gap-1.5"
                          >
                            <Save size={13} /> Save {rateEditCount} change{rateEditCount === 1 ? '' : 's'}
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* The rate matrix */}
                  <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                    <div className="rate-matrix-scroll overflow-x-auto">
                      <table className="rate-matrix w-full border-collapse">
                        <thead>
                          <tr>
                            <th className="rate-col-name text-left py-3 px-4 text-[9px] uppercase font-extrabold tracking-wider">Transfer</th>
                            {(db.vehicles || []).map(v => (
                              <th key={v.id} className="py-3 px-3 text-[9px] uppercase font-extrabold tracking-wider text-center whitespace-nowrap">
                                {v.name}
                              </th>
                            ))}
                            <th className="py-3 px-3 w-10"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {visibleRateRoutes.length === 0 ? (
                            <tr>
                              <td colSpan={(db.vehicles || []).length + 2} className="py-10 text-center text-xs rate-empty">
                                No transfers match this filter.
                              </td>
                            </tr>
                          ) : visibleRateRoutes.map(route => {
                            const cat = routeCategory(route.key);
                            return (
                              <tr key={route.key} className="rate-row">
                                <th scope="row" className="rate-col-name text-left py-2.5 px-4 font-normal">
                                  <div className="flex items-center gap-2">
                                    <span className={`rate-pip rate-pip-${cat}`}>
                                      {cat === 'airport' ? 'Airport' : 'Sector'}
                                    </span>
                                    <span className="rate-route-name text-xs font-bold">{route.name}</span>
                                  </div>
                                </th>

                                {(db.vehicles || []).map(v => {
                                  const isDirty = rateEdits[route.key]?.[v.id] !== undefined;
                                  const fromReverse = rateIsFromReverse(route.key, v);
                                  return (
                                    <td key={v.id} className="py-2 px-3 text-center">
                                      <input
                                        type="number"
                                        min="0"
                                        value={rateFor(route.key, v)}
                                        onChange={(e) => setRateCell(route.key, v.id, e.target.value)}
                                        className={`rate-cell ${isDirty ? 'is-dirty' : ''} ${fromReverse ? 'is-reverse' : ''}`}
                                        title={fromReverse ? 'Taken from the same sector priced in the opposite direction' : undefined}
                                      />
                                    </td>
                                  );
                                })}

                                <td className="py-2 px-3 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteRouteGlobally(route.key)}
                                    className="rate-delete p-1.5 rounded-lg transition"
                                    title={`Delete ${route.name}`}
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-450 italic px-1">
                    Showing {visibleRateRoutes.length} of {rateSheetRoutes.length} transfers
                    {rateEditCount > 0 && ` · ${rateEditCount} unsaved change${rateEditCount === 1 ? '' : 's'}`}
                  </p>
                </div>
              )}

              {activeAdminTab === 'packages' && (
                <div className="fade-in flex flex-col gap-6">
                  
                  {editingPackage === null && !editingDefaultWizardItinerary ? (
                    // 1. List View
                    <div className="fade-in">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-6">
                        <div>
                          <h2 className="text-xl font-bold font-heading text-slate-800">Master Standard Packages</h2>
                          <p className="text-xs text-slate-400 mt-1">Configure preset package templates that clients browse and customize on B2C portal.</p>
                        </div>
                        <div className="flex gap-2.5">
                          <button
                            type="button"
                            onClick={() => setEditingDefaultWizardItinerary(true)}
                            className="bg-indigo-50 hover:bg-indigo-100 text-indigo-750 font-bold border border-indigo-200 text-xs py-2 px-4 rounded-xl flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                          >
                            <Calendar size={14} />
                            <span>Edit Default Custom Planner Itinerary</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStartEditPackage(null)}
                            className="btn btn-primary btn-sm flex items-center gap-2 rounded-xl"
                          >
                            <Plus size={16} />
                            <span>Add New Standard Package</span>
                          </button>
                        </div>
                      </div>

                      {/* Package Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {db.packages.map(pkg => {
                          const defaultQuote = calculateQuote({
                            travelers: { adults: 2, cwb: 0, cnb: 0 },
                            roomConfig: { single: 0, double: 1, extra_adult: 0, cwb: 0, cnb: 0 },
                            itinerary: pkg.days.map(d => {
                              const h = db.hotels.find(htl => htl.city.toLowerCase() === d.city.toLowerCase() && htl.category === pkg.default_hotel_category);
                              return {
                                ...d,
                                hotelId: h ? h.id : '',
                                meals: d.city.toLowerCase() === 'chitwan' ? 'AP' : 'CP',
                                transfer_route: d.transfer_route !== undefined ? d.transfer_route : '',
                                activity_ids: [...d.activity_ids]
                              };
                            }),
                            vehicleId: pkg.default_vehicle_id,
                            hotelsData: db.hotels,
                            vehiclesData: db.vehicles,
                            activitiesData: db.activities,
                            settings: db.settings,
                            startCity: 'Kathmandu',
                            endCity: 'Kathmandu'
                          });

                          return (
                            <div key={pkg.id} className="premium-card bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col justify-between hover:shadow-md transition duration-300">
                              <div className="bg-slate-900 px-5 py-4 text-white">
                                <span className="text-[9px] bg-orange-650/90 text-white font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                                  {pkg.duration_nights} Nights / {pkg.duration_nights + 1} Days
                                </span>
                                <h4 className="text-base font-extrabold text-white mt-1.5 font-heading truncate">{pkg.name}</h4>
                              </div>

                              <div className="p-5 flex-1 flex flex-col justify-between">
                                <p className="text-xs text-slate-500 leading-relaxed line-clamp-3 mb-4">{pkg.description}</p>
                                
                                <div className="flex flex-col gap-2 pt-3 border-t border-slate-100 text-xs text-slate-650">
                                  <div className="truncate"><strong className="text-slate-700">Cities:</strong> {pkg.cities.join(', ')}</div>
                                  <div><strong className="text-slate-700">Default Hotel Category:</strong> {pkg.default_hotel_category}</div>
                                  <div><strong className="text-slate-700">Default Vehicle:</strong> {db.vehicles.find(v => v.id === pkg.default_vehicle_id)?.name || pkg.default_vehicle_id}</div>
                                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/50 mt-2">
                                    <div className="text-[10px] text-slate-400 uppercase font-extrabold tracking-wider">
                                      Starting price estimation (2 pax) {pkg.starting_price_override ? "(Manual Override)" : ""}
                                    </div>
                                    <div className="text-lg font-black text-[#0f2942] font-heading mt-0.5">
                                      ₹{pkg.starting_price_override 
                                        ? Math.round(Number(pkg.starting_price_override)).toLocaleString()
                                        : Math.round(defaultQuote.totals.perPerson).toLocaleString()
                                      }
                                      <span className="text-[10px] text-slate-500 font-medium ml-1">/ pax</span>
                                    </div>
                                    {pkg.starting_price_override && (
                                      <div className="text-[9px] text-slate-400 line-through">
                                        Calculated: ₹{Math.round(defaultQuote.totals.perPerson).toLocaleString()}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="bg-slate-50 p-4 border-t border-slate-100 flex items-center justify-between gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleStartEditPackage(pkg)}
                                  className="flex-1 btn btn-secondary btn-xs py-2 px-3 rounded-lg text-slate-750 hover:text-[#0f2942] hover:bg-slate-100 border border-slate-200 flex items-center justify-center gap-1 text-[10px] font-bold"
                                >
                                  <Edit3 size={12} />
                                  <span>Edit Itinerary</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDuplicatePackage(pkg)}
                                  className="btn btn-secondary btn-xs py-2 px-2.5 rounded-lg text-slate-650 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 flex items-center justify-center"
                                  title="Duplicate Package"
                                >
                                  <Layers size={12} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeletePackage(pkg.id)}
                                  className="btn btn-secondary btn-xs py-2 px-2.5 rounded-lg text-red-500 hover:text-red-750 hover:bg-red-50 border border-slate-200 hover:border-red-150 flex items-center justify-center"
                                  title="Delete Package"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : editingDefaultWizardItinerary ? (
                    renderDefaultWizardItineraryEditor()
                  ) : (
                    // 2. Visual Package Builder / Customizer View
                    <div className="fade-in max-w-5xl mx-auto">
                      
                      {/* Back Button */}
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm("Any unsaved changes to this package template will be lost. Return to package list?")) {
                            setEditingPackage(null);
                          }
                        }}
                        className="btn btn-secondary btn-sm flex items-center gap-2 mb-6"
                      >
                        <span>← Back to Master List</span>
                      </button>

                      {/* Header metadata card */}
                      <div className="bg-gradient-to-r from-slate-900 via-[#132c44] to-[#0f2942] text-white rounded-2xl p-6 mb-8 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
                        <div className="absolute right-0 top-0 opacity-5 pointer-events-none text-9xl">🇳🇵</div>
                        <div className="z-10 flex-1 flex flex-col gap-4">
                          <div className="text-xs text-orange-400 font-extrabold uppercase tracking-widest flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse"></span>
                            Configure Package Template
                          </div>
                          
                          <div className="flex flex-col gap-1 w-full max-w-xl">
                            <label className="text-[10px] text-slate-300 font-extrabold uppercase tracking-wider">Package Name</label>
                            <input 
                              type="text" 
                              required
                              value={editingPackage.name}
                              onChange={(e) => setEditingPackage({ ...editingPackage, name: e.target.value })}
                              className="text-lg font-extrabold font-heading bg-slate-900/60 border border-slate-700/80 hover:border-slate-500 focus:border-orange-400 rounded-lg outline-none w-full px-3 py-2 text-white"
                              placeholder="e.g. Kathmandu & Pokhara Bliss Tour"
                            />
                          </div>

                          <div className="flex flex-col gap-1 w-full max-w-xl">
                            <label className="text-[10px] text-slate-300 font-extrabold uppercase tracking-wider">Short Package Description</label>
                            <textarea 
                              required
                              value={editingPackage.description}
                              onChange={(e) => setEditingPackage({ ...editingPackage, description: e.target.value })}
                              className="text-xs bg-slate-900/60 border border-slate-700/80 hover:border-slate-500 focus:border-orange-400 rounded-lg outline-none w-full px-3 py-2 text-slate-200 h-[60px] resize-none"
                              placeholder="Brief itinerary highlights or theme."
                            />
                          </div>
                        </div>

                        <div className="z-10 flex flex-col gap-4 shrink-0">
                          <div className="flex flex-col gap-3 bg-slate-950/45 p-4 rounded-xl border border-white/5 backdrop-blur-md">
                            
                            {/* Default Hotel Category */}
                            <div className="flex flex-col">
                              <label className="text-[10px] uppercase text-slate-400 font-extrabold mb-1 tracking-wider">Default Hotel Category</label>
                              <select 
                                value={editingPackage.default_hotel_category} 
                                onChange={(e) => setEditingPackage({ ...editingPackage, default_hotel_category: e.target.value })}
                                className="bg-slate-900 border border-slate-700 text-white rounded-lg py-1.5 px-3 text-xs w-[160px] focus:outline-none focus:border-orange-400 transition cursor-pointer font-semibold"
                              >
                                <option value="3-Star">3-Star Budget</option>
                                <option value="4-Star">4-Star Deluxe</option>
                                <option value="5-Star">5-Star Luxury</option>
                              </select>
                            </div>

                            {/* Default Vehicle */}
                            <div className="flex flex-col">
                              <label className="text-[10px] uppercase text-slate-400 font-extrabold mb-1 tracking-wider">Default Vehicle Type</label>
                              <select 
                                value={editingPackage.default_vehicle_id} 
                                onChange={(e) => setEditingPackage({ ...editingPackage, default_vehicle_id: e.target.value })}
                                className="bg-slate-900 border border-slate-700 text-white rounded-lg py-1.5 px-3 text-xs w-[160px] focus:outline-none focus:border-orange-400 transition cursor-pointer font-semibold"
                              >
                                {db.vehicles.map(v => (
                                  <option key={v.id} value={v.id}>{v.name}</option>
                                ))}
                              </select>
                            </div>

                            {/* Starting Price Override */}
                            <div className="flex flex-col">
                              <label className="text-[10px] uppercase text-slate-400 font-extrabold mb-1 tracking-wider">Price Override (INR)</label>
                              <input 
                                type="number"
                                value={editingPackage.starting_price_override || ''} 
                                onChange={(e) => setEditingPackage({ ...editingPackage, starting_price_override: e.target.value ? Number(e.target.value) : null })}
                                className="bg-slate-900 border border-slate-700 text-white rounded-lg py-1 px-3 text-xs w-[160px] focus:outline-none focus:border-orange-400 transition font-semibold"
                                placeholder="Calculated if blank"
                              />
                            </div>
                          </div>

                          {/* Starting price estimator inside builder */}
                          {(() => {
                            try {
                              const liveQuote = calculateQuote({
                                travelers: { adults: 2, cwb: 0, cnb: 0 },
                                roomConfig: { single: 0, double: 1, extra_adult: 0, cwb: 0, cnb: 0 },
                                itinerary: editingPackage.days.map(d => {
                                  const h = db.hotels.find(htl => htl.city.toLowerCase() === d.city.toLowerCase() && htl.category === editingPackage.default_hotel_category);
                                  return {
                                    ...d,
                                    hotelId: h ? h.id : '',
                                    meals: d.city.toLowerCase() === 'chitwan' ? 'AP' : 'CP',
                                    transfer_route: d.transfer_route !== undefined ? d.transfer_route : '',
                                    activity_ids: [...d.activity_ids]
                                  };
                                }),
                                vehicleId: editingPackage.default_vehicle_id,
                                hotelsData: db.hotels,
                                vehiclesData: db.vehicles,
                                activitiesData: db.activities,
                                settings: db.settings,
                                startCity: 'Kathmandu',
                                endCity: 'Kathmandu'
                              });

                              const hasOverride = !!editingPackage.starting_price_override;
                              const startingPrice = hasOverride 
                                ? Number(editingPackage.starting_price_override) 
                                : liveQuote.totals.perPerson;
                              const totalPackagePrice = hasOverride
                                ? Number(editingPackage.starting_price_override) * 2
                                : liveQuote.totals.total;

                              return (
                                <div className="bg-orange-600 text-white p-3.5 rounded-xl border border-orange-500/30 flex flex-col justify-center">
                                  <div className="text-[9px] uppercase font-extrabold tracking-wider text-orange-200">
                                    Starting price (2 pax) {hasOverride ? "(Override Active)" : ""}
                                  </div>
                                  <div className="text-xl font-black font-heading mt-0.5">
                                    ₹{Math.round(startingPrice).toLocaleString()} 
                                    <span className="text-[10px] font-normal text-orange-100"> / pax</span>
                                  </div>
                                  {hasOverride && (
                                    <div className="text-[8px] text-orange-100/70">Calculated: ₹{Math.round(liveQuote.totals.perPerson).toLocaleString()} / pax</div>
                                  )}
                                  <div className="text-[9px] text-orange-100/80 mt-0.5">Total Package: ₹{Math.round(totalPackagePrice).toLocaleString()}</div>
                                </div>
                              );
                            } catch (err) {
                              return (
                                <div className="bg-red-950 text-red-200 text-[10px] p-3 rounded-xl border border-red-900">
                                  Price Estimation Error. Check Day configurations.
                                </div>
                              );
                            }
                          })()}
                        </div>
                      </div>

                      {/* Itinerary Days timeline builder */}
                      <h3 className="text-base font-bold font-heading mb-4 text-slate-800 uppercase tracking-wide">Day-by-Day Itinerary Template</h3>
                      
                      <div className="flex flex-col gap-6 mb-8">
                        {editingPackage.days.map((day, idx) => {
                          const isFirst = idx === 0;
                          const isLast = idx === editingPackage.days.length - 1;
                          const selectedActs = (day.activity_ids || [])
                            .map(actId => db.activities.find(a => a.id === actId))
                            .filter(Boolean);

                          return (
                            <div key={idx} className="premium-card bg-slate-50 border border-slate-200/60 rounded-3xl p-6 relative flex flex-col gap-6 shadow-sm hover:shadow-md transition duration-300">
                              
                              {/* Day Top Bar */}
                              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/50 pb-4">
                                <div className="flex items-center gap-3">
                                  <span className="bg-[#0f2942] text-white text-xs font-black px-3.5 py-1.5 rounded-xl shadow-sm tracking-wide font-heading">
                                    Day {idx + 1}
                                  </span>
                                  <div className="flex flex-col gap-1">
                                    <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Destination City</span>
                                    <select
                                      value={day.city}
                                      onChange={(e) => handlePackageDayFieldChange(idx, 'city', e.target.value)}
                                      className="form-select text-xs py-1 px-3 bg-white border border-slate-250 rounded-lg outline-none font-bold text-slate-800"
                                    >
                                      {(db.cities || []).map(city => (
                                        <option key={city} value={city}>{city}</option>
                                      ))}
                                    </select>
                                  </div>
                                </div>

                                {/* Day Reorder / Delete Controls */}
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    disabled={isFirst}
                                    onClick={() => handlePackageMoveDay(idx, -1)}
                                    className={`p-1.5 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-indigo-650 hover:border-slate-350 transition-all ${isFirst ? 'opacity-30 cursor-not-allowed' : ''}`}
                                    title="Move Day Up"
                                  >
                                    <span className="text-[10px] font-extrabold">▲</span>
                                  </button>
                                  <button
                                    type="button"
                                    disabled={isLast}
                                    onClick={() => handlePackageMoveDay(idx, 1)}
                                    className={`p-1.5 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-indigo-650 hover:border-slate-350 transition-all ${isLast ? 'opacity-30 cursor-not-allowed' : ''}`}
                                    title="Move Day Down"
                                  >
                                    <span className="text-[10px] font-extrabold">▼</span>
                                  </button>
                                  <button
                                    type="button"
                                    disabled={editingPackage.days.length <= 1}
                                    onClick={() => handlePackageDeleteDay(idx)}
                                    className={`p-1.5 rounded-lg bg-red-50 border border-red-100 text-red-500 hover:bg-red-100 hover:text-red-700 transition ${editingPackage.days.length <= 1 ? 'opacity-30 cursor-not-allowed' : ''}`}
                                    title="Delete Day"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </div>

                              {/* Main Grid: Title & Description */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="flex flex-col gap-4">
                                  <div className="flex flex-col gap-1">
                                    <label className="text-[9px] font-extrabold text-slate-455 uppercase tracking-wider">Day Itinerary Heading</label>
                                    <input
                                      type="text"
                                      required
                                      value={day.title || ''}
                                      onChange={(e) => handlePackageDayFieldChange(idx, 'title', e.target.value)}
                                      className="form-input text-xs font-semibold py-2 px-3 bg-white border border-slate-205 rounded-lg w-full"
                                      placeholder="e.g. Guided tour of Kathmandu monuments"
                                    />
                                  </div>
                                  <div className="flex flex-col gap-1">
                                    <label className="text-[9px] font-extrabold text-slate-455 uppercase tracking-wider">Day Itinerary Description</label>
                                    <textarea
                                      required
                                      value={day.description || ''}
                                      onChange={(e) => handlePackageDayFieldChange(idx, 'description', e.target.value)}
                                      className="form-input text-xs py-2 px-3 bg-white border border-slate-205 rounded-lg w-full h-[100px] resize-none"
                                      placeholder="e.g. Guided tour of Swayambhunath, Boudhanath Stupa, and Kathmandu Durbar Square."
                                    />
                                  </div>
                                </div>

                                {/* Transfer and Activities */}
                                <div className="flex flex-col justify-between gap-4">
                                  {/* Transfer */}
                                  <div className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col justify-between flex-1">
                                    <div>
                                      <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1.5">Transfer Sector Route</span>
                                      {day.transfer_route && day.transfer_route !== 'local_sightseeing' ? (
                                        <div className="bg-indigo-50/50 border border-indigo-100/50 rounded-xl p-2.5 flex items-center justify-between gap-3">
                                          <div className="flex items-center gap-2 truncate">
                                            <Car size={14} className="text-indigo-600 shrink-0" />
                                            <div className="flex flex-col min-w-0">
                                              <span className="text-xs font-bold text-slate-800 truncate">
                                                {db.routes.find(r => r.key === day.transfer_route)?.name || day.transfer_route.replace(/_/g, ' ')}
                                              </span>
                                              <span className="text-[8px] text-slate-400 truncate">
                                                {db.routes.find(r => r.key === day.transfer_route)?.description}
                                              </span>
                                            </div>
                                          </div>
                                          <button
                                            type="button"
                                            onClick={() => handlePackageDayFieldChange(idx, 'transfer_route', '')}
                                            className="text-slate-400 hover:text-red-500 transition p-1"
                                          >
                                            <Trash2 size={13} />
                                          </button>
                                        </div>
                                      ) : (
                                        <div className="text-[10px] text-slate-450 italic py-1">
                                          No point-to-point transfer route (Default: Local Sightseeing).
                                        </div>
                                      )}
                                    </div>
                                    <div className="mt-2.5 flex gap-2">
                                      <button
                                        type="button"
                                        onClick={() => setPackageTransferModal({ open: true, dayIndex: idx })}
                                        className="btn btn-secondary btn-xs py-1 px-2.5 rounded-lg border border-slate-200 hover:bg-slate-100 flex items-center gap-1 text-[9px] font-bold"
                                      >
                                        <Plus size={10} />
                                        <span>Select Route</span>
                                      </button>
                                      {day.transfer_route !== 'local_sightseeing' && (
                                        <button
                                          type="button"
                                          onClick={() => handlePackageDayFieldChange(idx, 'transfer_route', 'local_sightseeing')}
                                          className="btn btn-secondary btn-xs py-1 px-2.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-[9px] font-bold text-indigo-750"
                                        >
                                          Set Local Sightseeing
                                        </button>
                                      )}
                                    </div>
                                  </div>

                                  {/* Activities */}
                                  <div className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col justify-between flex-1">
                                    <div>
                                      <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1.5">Sightseeing Activities ({selectedActs.length})</span>
                                      {selectedActs.length > 0 ? (
                                        <div className="flex flex-wrap gap-1 max-h-[80px] overflow-y-auto pr-1">
                                          {selectedActs.map(act => (
                                            <span key={act.id} className="bg-orange-50 text-orange-850 text-[9px] font-bold pl-2 pr-1 py-0.5 rounded-full border border-orange-100 flex items-center gap-0.5">
                                              <span>{act.name}</span>
                                              <button
                                                type="button"
                                                onClick={() => handlePackageToggleActivity(idx, act.id)}
                                                className="text-orange-400 hover:text-orange-700 transition p-0.5"
                                              >
                                                ✕
                                              </button>
                                            </span>
                                          ))}
                                        </div>
                                      ) : (
                                        <div className="text-[10px] text-slate-455 italic py-1">
                                          No activities selected for this day.
                                        </div>
                                      )}
                                    </div>
                                    <div className="mt-2.5">
                                      <button
                                        type="button"
                                        onClick={() => setPackageActivityModal({ open: true, dayIndex: idx })}
                                        className="btn btn-secondary btn-xs py-1 px-2.5 rounded-lg border border-slate-200 hover:bg-slate-100 flex items-center gap-1 text-[9px] font-bold"
                                      >
                                        <Plus size={10} />
                                        <span>Add Activity</span>
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>

                            </div>
                          );
                        })}
                      </div>

                      {/* Builder actions row */}
                      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-6">
                        <button
                          type="button"
                          onClick={handlePackageAddDay}
                          className="btn btn-secondary btn-sm flex items-center gap-2 border-dashed border-2 hover:border-[#0f2942] rounded-xl font-bold text-slate-750"
                        >
                          <Plus size={15} />
                          <span>Add New Itinerary Day</span>
                        </button>
                        
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm("Discard changes and return to package list?")) {
                                setEditingPackage(null);
                              }
                            }}
                            className="btn btn-secondary btn-sm rounded-xl font-bold"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleSavePackage}
                            className="btn btn-primary btn-sm flex items-center gap-1.5 rounded-xl font-bold"
                          >
                            <Save size={15} />
                            <span>Save & Publish Package</span>
                          </button>
                        </div>
                      </div>

                    </div>
                  )}

                </div>
              )}

              {/* TAB 7: Leads Database */}
              {activeAdminTab === 'leads' && (() => {
                const filteredLeads = (db.leads || []).filter(lead => {
                  const query = leadSearchQuery.toLowerCase().trim();
                  if (!query) return true;
                  return (
                    (lead.name || '').toLowerCase().includes(query) ||
                    (lead.email || '').toLowerCase().includes(query) ||
                    (lead.phone || '').toLowerCase().includes(query) ||
                    (lead.country_code || '').toLowerCase().includes(query)
                  );
                });

                return (
                  <div className="flex flex-col gap-6">
                    {/* Title and Global Actions */}
                    <div className="flex flex-col md:flex-row justify-between md:items-center bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm gap-4">
                      <div>
                        <h2 className="text-2xl font-bold font-heading text-[#0f2942]">B2C Leads Database</h2>
                        <p className="text-slate-500 text-sm mt-1">View and manage B2C client contact details captured via the Lead Wall.</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        {db.leads && db.leads.length > 0 && (
                          <button 
                            onClick={handleClearAllLeads}
                            className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-extrabold text-xs uppercase tracking-wider py-2.5 px-4 rounded-xl transition flex items-center gap-1.5"
                          >
                            <Trash2 size={14} /> Clear All
                          </button>
                        )}
                        <button 
                          onClick={exportLeadsToExcel}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs uppercase tracking-wider py-2.5 px-4 rounded-xl shadow-md transition flex items-center gap-1.5"
                        >
                          <Download size={14} /> Export Excel
                        </button>
                      </div>
                    </div>

                    {/* Search and Filters */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1 max-w-md relative">
                        <input 
                          type="text" 
                          value={leadSearchQuery}
                          onChange={(e) => setLeadSearchQuery(e.target.value)}
                          placeholder="Search leads by name, email, or phone..."
                          className="w-full text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded-xl py-2.5 pl-4 pr-10 outline-none focus:border-indigo-500 transition"
                        />
                        {leadSearchQuery && (
                          <button 
                            onClick={() => setLeadSearchQuery('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-650 text-sm"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 font-bold tracking-wide">
                        Showing {filteredLeads.length} of {(db.leads || []).length} leads
                      </div>
                    </div>

                    {/* Leads Data Table */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                      {filteredLeads.length === 0 ? (
                        <div className="p-12 text-center text-xs text-slate-450 italic leading-relaxed">
                          {leadSearchQuery ? "No leads matched your search query." : "No B2C leads captured yet."}
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 uppercase text-[9px] font-extrabold tracking-wider">
                                <th className="py-3 px-6 text-center w-12">#</th>
                                <th className="py-3 px-6">Name</th>
                                <th className="py-3 px-6">Email Address</th>
                                <th className="py-3 px-6">Mobile Number</th>
                                <th className="py-3 px-6">Captured At</th>
                                <th className="py-3 px-6 text-center w-24">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {filteredLeads.map((lead, idx) => (
                                <tr key={lead.id} className="hover:bg-slate-50/50 transition">
                                  <td className="py-3.5 px-6 text-xs text-slate-450 font-bold text-center">{idx + 1}</td>
                                  <td className="py-3.5 px-6 text-xs font-bold text-slate-800">{lead.name}</td>
                                  <td className="py-3.5 px-6 text-xs text-indigo-650 font-semibold">{lead.email}</td>
                                  <td className="py-3.5 px-6 text-xs text-slate-700 font-mono font-medium">
                                    <span className="text-slate-400 font-bold mr-1">{lead.country_code}</span>
                                    {lead.phone}
                                  </td>
                                  <td className="py-3.5 px-6 text-xs text-slate-500">
                                    {new Date(lead.created_at).toLocaleString()}
                                  </td>
                                  <td className="py-3.5 px-6 text-center">
                                    <button 
                                      onClick={() => handleDeleteLead(lead.id)}
                                      className="bg-transparent text-red-500 hover:text-red-750 p-2 hover:bg-red-50 rounded-xl transition"
                                      title="Delete Lead"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* TAB 9: Platform Users Master */}
              {activeAdminTab === 'users' && renderUsersMaster()}

              {/* TAB 8: Company Profile Settings */}
              {activeAdminTab === 'profile' && renderAdminProfile()}

            </div>
          )}

        </div>
      </main>

      {/* MODALS */}

      {/* 1. Add Hotel Modal (with 5x3 rates input matrix) */}
      {showAddHotelModal && (
        <div className="modal-overlay">
          <div className="modal-content max-w-2xl">
            <div className="modal-header">
              <h3 className="text-lg font-bold font-heading">Add New Hotel Matrix (INR ₹)</h3>
              <button onClick={() => setShowAddHotelModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handleAddNewHotel}>
              <div className="modal-body flex flex-col gap-4">
                <div className="form-group mb-0">
                  <label className="form-label text-xs">Hotel Name</label>
                  <input 
                    type="text" 
                    required 
                    value={newHotelForm.name} 
                    onChange={(e) => setNewHotelForm({ ...newHotelForm, name: e.target.value })} 
                    className="form-input text-xs" 
                    placeholder="e.g. Landmark Forest Lodge"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="form-label text-[10px]">City Location</label>
                    <select 
                      value={newHotelForm.city} 
                      onChange={(e) => setNewHotelForm({ ...newHotelForm, city: e.target.value })} 
                      className="form-select text-xs"
                    >
                      {(db.cities || []).map(city => (
                        <option key={city} value={city}>{city}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="form-label text-[10px]">Hotel Category</label>
                    <select 
                      value={newHotelForm.category} 
                      onChange={(e) => setNewHotelForm({ ...newHotelForm, category: e.target.value })} 
                      className="form-select text-xs"
                    >
                      <option value="3-Star">3-Star</option>
                      <option value="4-Star">4-Star</option>
                      <option value="5-Star">5-Star</option>
                    </select>
                  </div>
                </div>

                <div className="form-group mb-0">
                  <label className="form-label text-xs">Brief Description</label>
                  <input 
                    type="text" 
                    value={newHotelForm.description} 
                    onChange={(e) => setNewHotelForm({ ...newHotelForm, description: e.target.value })} 
                    className="form-input text-xs" 
                    placeholder="Short description of rooms or views."
                  />
                </div>

                {/* Grid Inputs for 15 pricing cells */}
                <div className="border-t border-slate-100 pt-3">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Set 15-Cell Rate Matrix (INR)</span>
                  <div className="overflow-x-auto">
                    <table className="w-full text-[11px] text-left">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500">
                          <th className="pb-1.5 font-bold">Category</th>
                          <th className="pb-1.5 text-center bg-slate-50">CP (₹)</th>
                          <th className="pb-1.5 text-center">MAP (₹)</th>
                          <th className="pb-1.5 text-center">AP (₹)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {['single', 'double', 'extra_adult', 'cwb', 'cnb'].map(category => (
                          <tr key={category} className="border-b border-slate-100 last:border-b-0">
                            <td className="py-1.5 font-semibold text-slate-700 capitalize">{category.replace(/_/g, ' ')}</td>
                            <td className="py-1 bg-slate-50 text-center">
                              <input 
                                type="number" 
                                required
                                value={newHotelForm.rates[category].CP} 
                                onChange={(e) => handleNewHotelNestedRateChange(category, 'CP', e.target.value)} 
                                className="w-20 form-input text-center text-xs py-0.5" 
                                min="0" 
                              />
                            </td>
                            <td className="py-1 text-center">
                              <input 
                                type="number" 
                                required
                                value={newHotelForm.rates[category].MAP} 
                                onChange={(e) => handleNewHotelNestedRateChange(category, 'MAP', e.target.value)} 
                                className="w-20 form-input text-center text-xs py-0.5" 
                                min="0" 
                              />
                            </td>
                            <td className="py-1 text-center">
                              <input 
                                type="number" 
                                required
                                value={newHotelForm.rates[category].AP} 
                                onChange={(e) => handleNewHotelNestedRateChange(category, 'AP', e.target.value)} 
                                className="w-20 form-input text-center text-xs py-0.5" 
                                min="0" 
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowAddHotelModal(false)} className="btn btn-secondary btn-sm">Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm rounded">Save Hotel Matrix</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Add Activity Modal */}
      {showAddActivityModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="text-lg font-bold font-heading">Add New Sightseeing/Activity</h3>
              <button onClick={() => setShowAddActivityModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handleAddNewActivity}>
              <div className="modal-body flex flex-col gap-3">
                <div className="form-group mb-0">
                  <label className="form-label">Activity Name</label>
                  <input 
                    type="text" 
                    required 
                    value={newActivityForm.name} 
                    onChange={(e) => setNewActivityForm({ ...newActivityForm, name: e.target.value })} 
                    className="form-input text-xs" 
                    placeholder="e.g. Paragliding flight in Pokhara"
                  />
                </div>
                
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="form-label text-[10px]">City Location</label>
                    <select 
                      value={newActivityForm.city} 
                      onChange={(e) => setNewActivityForm({ ...newActivityForm, city: e.target.value })} 
                      className="form-select text-xs"
                    >
                      {(db.cities || []).map(city => (
                        <option key={city} value={city}>{city}</option>
                      ))}
                    </select>
                  </div>
                  {newActivityForm.pricing_mode !== 'per_vehicle' && (
                    <>
                      <div>
                        <label className="form-label text-[10px]">Adult Ticket (₹)</label>
                        <input type="number" required value={newActivityForm.price_adult} onChange={(e) => setNewActivityForm({ ...newActivityForm, price_adult: e.target.value })} className="form-input text-xs" min="0" />
                      </div>
                      <div>
                        <label className="form-label text-[10px]">Child Ticket (₹)</label>
                        <input type="number" required value={newActivityForm.price_child} onChange={(e) => setNewActivityForm({ ...newActivityForm, price_child: e.target.value })} className="form-input text-xs" min="0" />
                      </div>
                    </>
                  )}
                </div>

                {/* How this activity is billed. A full-day vehicle hire costs
                    the same whatever the party size, so it cannot be entered
                    as a per-head ticket. */}
                <div className="form-group mb-0">
                  <label className="form-label text-[10px]">Charged</label>
                  <select
                    value={newActivityForm.pricing_mode || 'per_person'}
                    onChange={(e) => setNewActivityForm({ ...newActivityForm, pricing_mode: e.target.value })}
                    className="form-input text-xs"
                  >
                    <option value="per_person">Per person (× party size)</option>
                    <option value="per_vehicle">Per vehicle (once per day)</option>
                  </select>
                </div>

                {newActivityForm.pricing_mode === 'per_vehicle' && (
                  <div className="form-group mb-0">
                    <label className="form-label text-[10px]">Rate Per Vehicle (₹ per day)</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(db.vehicles || []).map(v => (
                        <label key={v.id} className="flex flex-col gap-0.5">
                          <span className="text-[9px] uppercase font-bold text-slate-500 truncate" title={v.name}>{v.name}</span>
                          <input
                            type="number"
                            min="0"
                            value={(newActivityForm.vehicle_rates || {})[v.id] ?? 0}
                            onChange={(e) => setNewActivityForm({
                              ...newActivityForm,
                              vehicle_rates: { ...(newActivityForm.vehicle_rates || {}), [v.id]: Number(e.target.value) || 0 },
                            })}
                            className="form-input text-xs"
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <div className="form-group mb-0">
                  <label className="form-label text-xs">Description</label>
                  <input 
                    type="text" 
                    value={newActivityForm.description} 
                    onChange={(e) => setNewActivityForm({ ...newActivityForm, description: e.target.value })} 
                    className="form-input text-xs" 
                    placeholder="Short description of activity details."
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowAddActivityModal(false)} className="btn btn-secondary btn-sm">Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm rounded">Save Activity Rate</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transfer Selection Modal */}
      {showTransferModal.open && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[80vh]">
            <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800">Add Transfer</h3>
              <button onClick={() => setShowTransferModal({ open: false, dayIndex: null })} className="text-slate-400 hover:text-slate-700 transition">✕</button>
            </div>
            <div className="p-2 flex-1 overflow-y-auto">
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => {
                    // Clears every transfer on the day, and the flight leg with
                    // them -- leaving travel_mode set would show a Flight
                    // toggle with nothing behind it.
                    setDayTransfers(showTransferModal.dayIndex, [], {
                      travel_mode: '',
                      flight_from_city: '',
                      flight_to_city: '',
                    });
                    setShowTransferModal({ open: false, dayIndex: null });
                  }}
                  className="w-full text-left px-4 py-3 text-xs rounded-lg hover:bg-slate-50 transition text-slate-600 border border-transparent hover:border-slate-200"
                >
                  No Vehicle Transfer (Free Day)
                </button>
                {db.routes.map(r => (
                  <button
                    key={r.key}
                    type="button"
                    onClick={() => {
                      // Appends rather than replaces: a day can legitimately
                      // hold more than one transfer (see the flight legs).
                      const dayIdx = showTransferModal.dayIndex;
                      const current = getDayTransfers(customItinerary[dayIdx]);
                      if (!current.includes(r.key)) {
                        setDayTransfers(dayIdx, [...current, r.key]);
                      }
                      setShowTransferModal({ open: false, dayIndex: null });
                    }}
                    className="w-full text-left px-4 py-3 rounded-lg hover:bg-slate-50 transition border border-transparent hover:border-slate-200 flex flex-col gap-1"
                  >
                    <span className="text-xs font-bold text-slate-800">{r.name}</span>
                    <span className="text-[10px] text-slate-500 line-clamp-1">{r.description}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Activity Selection Modal */}
      {showActivityModal.open && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[80vh]">
            <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800">Add Activity</h3>
              <button onClick={() => setShowActivityModal({ open: false, dayIndex: null })} className="text-slate-400 hover:text-slate-700 transition">✕</button>
            </div>
            <div className="p-2 flex-1 overflow-y-auto">
              {(() => {
                const day = customItinerary[showActivityModal.dayIndex];
                if (!day) return null;
                const cityActs = activitiesInCity(day.city);
                if (cityActs.length === 0) return <div className="p-4 text-xs text-slate-400 italic text-center">No activities available in {day.city}</div>;
                
                return (
                  <div className="flex flex-col gap-1">
                    {cityActs.map(act => {
                      const isSelected = (day.activity_ids || []).includes(act.id);
                      if (isSelected) return null; // Only show unselected acts
                      return (
                        <button
                          key={act.id}
                          type="button"
                          onClick={() => {
                            handleToggleActivity(showActivityModal.dayIndex, act.id);
                            setShowActivityModal({ open: false, dayIndex: null });
                          }}
                          className="w-full text-left px-4 py-3 rounded-lg hover:bg-slate-50 transition border border-transparent hover:border-slate-200 flex items-center justify-between gap-3"
                        >
                          <div className="flex flex-col flex-1 gap-1">
                            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                              {act.pricing_mode === 'per_vehicle' && (
                                <span className="sightseeing-pip text-[9px] font-bold px-1.5 py-0.5 rounded uppercase shrink-0">Vehicle Day</span>
                              )}
                              {act.name}
                            </span>
                            <span className="text-[10px] text-slate-500 line-clamp-1">{act.description}</span>
                          </div>
                          <strong className="text-xs text-brand-navy shrink-0 whitespace-nowrap">
                            {view === 'b2c' && !hasContactDetails
                              ? '🔒 Locked'
                              : act.pricing_mode === 'per_vehicle'
                                ? `₹${Math.round(Number((act.vehicle_rates || {})[selectedVehicleId] || 0) * b2bDisplayFactor).toLocaleString()} / vehicle`
                                : `₹${Math.round(act.price_adult * b2bDisplayFactor).toLocaleString()} / pax`}
                          </strong>
                        </button>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Add Vehicle Modal */}
      {showAddVehicleModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-md overflow-hidden transform transition-all duration-300 scale-100">
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-lg font-bold font-heading text-slate-800">Add New Vehicle Type</h3>
              <button onClick={() => setShowAddVehicleModal(false)} className="text-slate-400 hover:text-slate-650 transition font-bold text-sm">✕</button>
            </div>
            <form onSubmit={handleAddNewVehicle}>
              <div className="p-6 flex flex-col gap-4">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1 tracking-wider">Vehicle Name</label>
                  <input 
                    type="text" 
                    required 
                    value={newVehicleForm.name} 
                    onChange={(e) => setNewVehicleForm({ ...newVehicleForm, name: e.target.value })} 
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:border-indigo-500 font-semibold text-slate-800" 
                    placeholder="e.g. Innova Crysta"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1 tracking-wider">Description</label>
                  <input 
                    type="text" 
                    required 
                    value={newVehicleForm.description} 
                    onChange={(e) => setNewVehicleForm({ ...newVehicleForm, description: e.target.value })} 
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:border-indigo-500 font-semibold text-slate-800" 
                    placeholder="e.g. Premium SUV, AC"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1 tracking-wider">Max Capacity (Pax)</label>
                  <input 
                    type="number" 
                    required 
                    value={newVehicleForm.capacity} 
                    onChange={(e) => setNewVehicleForm({ ...newVehicleForm, capacity: e.target.value })} 
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:border-indigo-500 font-semibold text-slate-800" 
                    min="1"
                    max="50"
                  />
                </div>
                <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 mt-2">
                  <label className="block text-[10px] uppercase font-bold text-indigo-500 mb-1 tracking-wider">Copy Rates From</label>
                  <select 
                    required 
                    value={newVehicleForm.copyFromId} 
                    onChange={(e) => setNewVehicleForm({ ...newVehicleForm, copyFromId: e.target.value })} 
                    className="w-full px-3 py-2 text-xs bg-white border border-indigo-200 rounded-lg outline-none focus:border-indigo-500 font-semibold text-slate-800"
                  >
                    <option value="" disabled>Select a base vehicle to duplicate rates...</option>
                    {db.vehicles.map(v => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                  <p className="text-[9px] text-indigo-400 mt-1.5 leading-tight">This will duplicate all existing transfer sector rates from the selected vehicle to your new one.</p>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                <button type="button" onClick={() => setShowAddVehicleModal(false)} className="px-4 py-2 text-xs text-slate-500 hover:text-slate-700 bg-transparent font-bold transition">Cancel</button>
                <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs uppercase tracking-wider py-2 px-5 rounded-xl shadow-md transition">Create Vehicle</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Promotional Poster Popup Modal */}
      {showPosterPopup && db.settings?.popup_poster_active && db.settings?.popup_poster_url && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fade-in no-print">
          <div className="relative bg-transparent rounded-3xl max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col items-center">
            {/* Close Button */}
            <button 
              onClick={() => setShowPosterPopup(false)}
              className="absolute right-3 top-3 bg-black/60 hover:bg-black/85 text-white font-extrabold text-xs w-8 h-8 rounded-full flex items-center justify-center z-10 transition border border-white/20 shadow-md"
              title="Close Promotion"
            >
              ✕
            </button>
            <div className="w-full overflow-y-auto rounded-3xl shadow-2xl border border-white/10">
              <img 
                src={db.settings.popup_poster_url} 
                alt="Nepal Tour Promotion" 
                className="w-full h-auto object-contain max-h-[80vh] block rounded-3xl"
              />
            </div>
          </div>
        </div>
      )}

      {/* Lead Capture Modal */}
      {showLeadCaptureModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-md overflow-hidden transform transition-all duration-300 scale-100">
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-lg font-bold font-heading text-slate-800 flex items-center gap-2">
                <Lock className="text-orange-500" size={20} />
                Unlock Special Rates
              </h3>
              <button 
                onClick={() => {
                  setShowLeadCaptureModal(false);
                  setPendingLeadAction(null);
                }} 
                className="text-slate-400 hover:text-slate-650 transition font-bold text-sm"
              >
                ✕
              </button>
            </div>
            <form onSubmit={submitLeadForm}>
              <div className="p-6 flex flex-col gap-4">
                <p className="text-xs text-slate-500 leading-relaxed mb-1">
                  Enter your details below to unlock pricing for all packages, day-wise hotel and activity rates, and customizer details.
                </p>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1 tracking-wider">Full Name *</label>
                  <input 
                    type="text" 
                    required 
                    value={leadForm.name} 
                    onChange={(e) => setLeadForm({ ...leadForm, name: e.target.value })} 
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:border-orange-500 font-semibold text-slate-800" 
                    placeholder="e.g. John Doe"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1 tracking-wider">Email Address *</label>
                  <input 
                    type="email" 
                    required 
                    value={leadForm.email} 
                    onChange={(e) => setLeadForm({ ...leadForm, email: e.target.value })} 
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:border-orange-500 font-semibold text-slate-800" 
                    placeholder="e.g. john@example.com"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1 tracking-wider">Mobile Number *</label>
                  <div className="flex gap-2">
                    <select 
                      value={leadForm.countryCode} 
                      onChange={(e) => setLeadForm({ ...leadForm, countryCode: e.target.value })} 
                      className="px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:border-orange-500 font-bold text-slate-700 cursor-pointer"
                    >
                      <option value="+91">🇮🇳 +91</option>
                      <option value="+977">🇳🇵 +977</option>
                      <option value="+1">🇺🇸 +1</option>
                      <option value="+44">🇬🇧 +44</option>
                      <option value="+61">🇦🇺 +61</option>
                      <option value="+65">🇸🇬 +65</option>
                      <option value="+971">🇦🇪 +971</option>
                    </select>
                    <input 
                      type="tel" 
                      required 
                      value={leadForm.phone} 
                      onChange={(e) => setLeadForm({ ...leadForm, phone: e.target.value })} 
                      className="flex-1 min-w-0 px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:border-orange-500 font-semibold text-slate-800" 
                      placeholder={leadForm.countryCode === '+91' ? "10-digit mobile" : "Mobile number"}
                    />
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => {
                    setShowLeadCaptureModal(false);
                    setPendingLeadAction(null);
                  }} 
                  className="px-4 py-2 text-xs text-slate-500 hover:text-slate-700 bg-transparent font-bold transition"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs uppercase tracking-wider py-2 px-5 rounded-xl shadow-md transition flex items-center gap-1.5"
                >
                  <Unlock size={14} />
                  Unlock Prices
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. B2C Booking Checkout Modal */}
      {showCheckoutModal && (() => {
        const isB2B = view === 'b2b';
        const checkoutColor = isB2B ? 'emerald' : 'orange';

        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-lg overflow-hidden transform transition-all duration-300 scale-100">
              <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="text-lg font-bold font-heading text-slate-800">
                  {isB2B ? "Finalize B2B Partner Booking" : "Finalize Custom Quote Reservation"}
                </h3>
                <button onClick={() => setShowCheckoutModal(false)} className="text-slate-400 hover:text-slate-650 transition font-bold text-sm">✕</button>
              </div>
              <form onSubmit={handleConfirmCheckout}>
                <div className="p-6 flex flex-col gap-4 max-h-[70vh] overflow-y-auto">
                  
                  {/* Brief Cost Info */}
                  <div className={`bg-${checkoutColor}-50 border border-${checkoutColor}-100/80 p-5 rounded-2xl flex justify-between items-center text-xs shadow-sm`}>
                    <div>
                      <span className={`text-[10px] text-${checkoutColor}-600 uppercase block font-extrabold tracking-wider mb-0.5`}>Custom Package</span>
                      <strong className="text-slate-800 text-sm font-bold">{customPackageName}</strong>
                    </div>
                    <div className="text-right">
                      <span className={`text-[10px] text-${checkoutColor}-600 uppercase block font-extrabold tracking-wider mb-0.5`}>Total price (incl. GST)</span>
                      <strong className="text-xl text-[#0f2942] font-heading font-black">₹{Math.round(quoteCalculation.totals.total).toLocaleString()}</strong>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5 block">
                      Primary Traveler Name <span className="text-red-500 font-extrabold">*</span>
                    </label>
                    <input 
                      type="text" 
                      required 
                      value={checkoutForm.clientName}
                      onChange={(e) => setCheckoutForm({ ...checkoutForm, clientName: e.target.value })}
                      className={`w-full px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-${checkoutColor}-500 focus:ring-4 focus:ring-${checkoutColor}-500/10 transition-all font-medium text-slate-800`} 
                      placeholder="Rahul Sharma" 
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5 block">
                        Email Address <span className="text-red-500 font-extrabold">*</span>
                      </label>
                      <input 
                        type="email" 
                        required 
                        value={checkoutForm.email}
                        onChange={(e) => setCheckoutForm({ ...checkoutForm, email: e.target.value })}
                        className={`w-full px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-${checkoutColor}-500 focus:ring-4 focus:ring-${checkoutColor}-500/10 transition-all font-medium text-slate-800`} 
                        placeholder="rahul@example.com" 
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5 block">
                        Mobile Number <span className="text-red-500 font-extrabold">*</span>
                      </label>
                      <div className="flex gap-1.5">
                        <select
                          value={checkoutForm.countryCode}
                          onChange={(e) => setCheckoutForm({ ...checkoutForm, countryCode: e.target.value })}
                          className={`bg-slate-50 border border-slate-200 rounded-xl px-2 py-2.5 text-[10px] outline-none focus:border-${checkoutColor}-500 font-medium text-slate-800 w-[85px] shrink-0`}
                        >
                          <option value="+91">🇮🇳 +91</option>
                          <option value="+977">🇳🇵 +977</option>
                          <option value="+1">🇺🇸 +1</option>
                          <option value="+44">🇬🇧 +44</option>
                          <option value="+61">🇦🇺 +61</option>
                          <option value="+65">🇸🇬 +65</option>
                          <option value="+971">🇦🇪 +971</option>
                        </select>
                        <input 
                          type="tel" 
                          required 
                          value={checkoutForm.phone}
                          onChange={(e) => setCheckoutForm({ ...checkoutForm, phone: e.target.value })}
                          className={`flex-1 min-w-0 px-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-${checkoutColor}-500 focus:ring-4 focus:ring-${checkoutColor}-500/10 transition-all font-medium text-slate-800`} 
                          placeholder={checkoutForm.countryCode === '+91' ? "10-digit number" : "Mobile number"} 
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5 block">Special Requests / Remarks</label>
                    <textarea 
                      value={checkoutForm.notes}
                      onChange={(e) => setCheckoutForm({ ...checkoutForm, notes: e.target.value })}
                      rows="3"
                      className={`w-full px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-${checkoutColor}-500 focus:ring-4 focus:ring-${checkoutColor}-500/10 transition-all font-medium resize-none text-slate-800`} 
                      placeholder="Dietary requirements, physical limitations, bed arrangements..." 
                    />
                  </div>

                  <div className={`bg-${checkoutColor}-50 border border-${checkoutColor}-100 text-${checkoutColor}-800 text-[10px] p-3.5 rounded-xl leading-relaxed flex items-start gap-2 shadow-sm`}>
                    <Info size={14} className={`shrink-0 mt-0.5 text-${checkoutColor}-600`} />
                    <span>By clicking Confirm, this quote will be saved. You will be immediately redirected to print a copy of your customized travel voucher/quotation invoice.</span>
                  </div>
                </div>
                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3 items-center">
                  <button type="button" onClick={() => setShowCheckoutModal(false)} className="px-4 py-2 text-xs text-slate-500 hover:text-slate-700 bg-transparent font-bold transition">Cancel</button>
                  <button type="submit" className={`bg-${checkoutColor}-600 hover:bg-${checkoutColor}-700 text-white font-extrabold text-xs uppercase tracking-wider py-2.5 px-6 rounded-xl shadow-md transition hover:-translate-y-0.5 active:translate-y-0`}>
                    Confirm Booking
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* Admin Package Transfer Selection Modal */}
      {packageTransferModal.open && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[80vh]">
            <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800">Select Transfer for Package</h3>
              <button onClick={() => setPackageTransferModal({ open: false, dayIndex: null })} className="text-slate-400 hover:text-slate-700 transition">✕</button>
            </div>
            <div className="p-2 flex-1 overflow-y-auto">
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => {
                    handlePackageDayFieldChange(packageTransferModal.dayIndex, 'transfer_route', 'local_sightseeing');
                    setPackageTransferModal({ open: false, dayIndex: null });
                  }}
                  className="w-full text-left px-4 py-3 text-xs rounded-lg hover:bg-slate-50 transition text-slate-650 border border-transparent hover:border-slate-200"
                >
                  Local Sightseeing (Default)
                </button>
                {db.routes.map(r => (
                  <button
                    key={r.key}
                    type="button"
                    onClick={() => {
                      handlePackageDayFieldChange(packageTransferModal.dayIndex, 'transfer_route', r.key);
                      setPackageTransferModal({ open: false, dayIndex: null });
                    }}
                    className="w-full text-left px-4 py-3 rounded-lg hover:bg-slate-50 transition border border-transparent hover:border-slate-200 flex flex-col gap-1"
                  >
                    <span className="text-xs font-bold text-slate-800">{r.name}</span>
                    <span className="text-[10px] text-slate-500 line-clamp-1">{r.description}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin Package Activity Selection Modal */}
      {packageActivityModal.open && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[80vh]">
            <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800">Add Activity to Package</h3>
              <button onClick={() => setPackageActivityModal({ open: false, dayIndex: null })} className="text-slate-400 hover:text-slate-700 transition">✕</button>
            </div>
            <div className="p-2 flex-1 overflow-y-auto">
              {(() => {
                const day = editingPackage 
                  ? editingPackage.days?.[packageActivityModal.dayIndex]
                  : wizardDefaultDays?.[packageActivityModal.dayIndex];
                if (!day) return null;
                const cityActs = activitiesInCity(day.city);
                if (cityActs.length === 0) return <div className="p-4 text-xs text-slate-400 italic text-center">No activities available in {day.city}</div>;
                
                return (
                  <div className="flex flex-col gap-1">
                    {cityActs.map(act => {
                      const isSelected = (day.activity_ids || []).includes(act.id);
                      if (isSelected) return null; // Only show unselected acts
                      return (
                        <button
                          key={act.id}
                          type="button"
                          onClick={() => {
                            handlePackageToggleActivity(packageActivityModal.dayIndex, act.id);
                            setPackageActivityModal({ open: false, dayIndex: null });
                          }}
                          className="w-full text-left px-4 py-3 rounded-lg hover:bg-slate-50 transition border border-transparent hover:border-slate-200 flex items-center justify-between gap-3"
                        >
                          <div className="flex flex-col flex-1 gap-1">
                            <span className="text-xs font-bold text-slate-800">{act.name}</span>
                            <span className="text-[10px] text-slate-500 line-clamp-1">{act.description}</span>
                          </div>
                          <strong className="text-xs text-[#0f2942] shrink-0">₹{act.price_adult.toLocaleString()}</strong>
                        </button>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Add New User Modal */}
      {showAddUserModal && (
        <div className="modal-overlay">
          <div className="modal-content max-w-md">
            <div className="modal-header">
              <h3 className="text-sm font-black uppercase tracking-wider font-heading text-slate-800">Create Platform Account Login</h3>
              <button onClick={() => setShowAddUserModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handleAddUserSubmit}>
              <div className="modal-body flex flex-col gap-4 text-left">
                <div className="form-group mb-0">
                  <label className="form-label text-[10px]">Account Role</label>
                  <select 
                    value={newUserForm.role}
                    onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value })}
                    className="form-select text-xs"
                  >
                    <option value="b2c">Traveler (B2C)</option>
                    <option value="b2b">Partner Agent (B2B)</option>
                    <option value="admin">System Admin (Admin)</option>
                  </select>
                </div>

                <div className="form-group mb-0">
                  <label className="form-label text-[10px]">Full Name</label>
                  <input 
                    type="text" 
                    required 
                    value={newUserForm.fullName} 
                    onChange={(e) => setNewUserForm({ ...newUserForm, fullName: e.target.value })} 
                    className="form-input text-xs"
                    placeholder="Enter user full name"
                  />
                </div>

                <div className="form-group mb-0">
                  <label className="form-label text-[10px]">Login ID (Email Address)</label>
                  <input 
                    type="email" 
                    required 
                    value={newUserForm.email} 
                    onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })} 
                    className="form-input text-xs"
                    placeholder="name@domain.com"
                  />
                </div>

                <div className="form-group mb-0">
                  <label className="form-label text-[10px]">Password</label>
                  <input 
                    type="text" 
                    required 
                    value={newUserForm.password} 
                    onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })} 
                    className="form-input text-xs"
                    placeholder="Assign password"
                  />
                </div>

                <div className="form-group mb-0">
                  <label className="form-label text-[10px]">Phone Number</label>
                  <div className="flex gap-2">
                    <select
                      value={newUserForm.countryCode}
                      onChange={(e) => setNewUserForm({ ...newUserForm, countryCode: e.target.value })}
                      className="px-2.5 py-1.5 text-xs bg-white border border-slate-350 rounded outline-none text-slate-800 w-[80px]"
                    >
                      <option value="+91">+91 (IN)</option>
                      <option value="+977">+977 (NP)</option>
                      <option value="+1">+1 (US)</option>
                      <option value="+44">+44 (UK)</option>
                    </select>
                    <input 
                      type="tel" 
                      value={newUserForm.phone} 
                      onChange={(e) => setNewUserForm({ ...newUserForm, phone: e.target.value })} 
                      className="form-input text-xs flex-1"
                      placeholder="9999999999"
                    />
                  </div>
                </div>

                {newUserForm.role === 'b2b' && (
                  <div className="border-t border-slate-100 pt-3 mt-1 flex flex-col gap-3">
                    <div className="form-group mb-0">
                      <label className="form-label text-[10px]">Agency Name</label>
                      <input 
                        type="text" 
                        required 
                        value={newUserForm.agencyName} 
                        onChange={(e) => setNewUserForm({ ...newUserForm, agencyName: e.target.value })} 
                        className="form-input text-xs"
                        placeholder="Agency Name Ltd"
                      />
                    </div>
                    <div className="form-group mb-0">
                      <label className="form-label text-[10px]">Agency Address</label>
                      <input 
                        type="text" 
                        required 
                        value={newUserForm.agencyAddress} 
                        onChange={(e) => setNewUserForm({ ...newUserForm, agencyAddress: e.target.value })} 
                        className="form-input text-xs"
                        placeholder="123 Road City"
                      />
                    </div>
                    <div className="form-group mb-0">
                      <label className="form-label text-[10px]">Agency Website (Optional)</label>
                      <input 
                        type="text" 
                        value={newUserForm.agencyWebsite} 
                        onChange={(e) => setNewUserForm({ ...newUserForm, agencyWebsite: e.target.value })} 
                        className="form-input text-xs"
                        placeholder="www.agency.com"
                      />
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowAddUserModal(false)} className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 bg-transparent">Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm bg-orange-655 hover:bg-orange-700 text-white rounded-lg py-2 px-4 shadow">Create User</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Credentials Modal */}
      {editingUser && (
        <div className="modal-overlay">
          <div className="modal-content max-w-md">
            <div className="modal-header">
              <h3 className="text-sm font-black uppercase tracking-wider font-heading text-slate-800">Edit User Profile</h3>
              <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleEditUserSave(editingUser); }}>
              <div className="modal-body flex flex-col gap-4 text-left">
                <div className="form-group mb-0">
                  <label className="form-label text-[10px]">Full Name</label>
                  <input
                    type="text"
                    required
                    value={editingUser.fullName}
                    onChange={(e) => setEditingUser({ ...editingUser, fullName: e.target.value })}
                    className="form-input text-xs"
                  />
                </div>

                <div className="form-group mb-0">
                  <label className="form-label text-[10px]">Login ID (Email Address)</label>
                  <input
                    type="email"
                    required
                    value={editingUser.email}
                    onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                    className="form-input text-xs"
                  />
                </div>

                <p className="text-[10px] text-slate-450 -mt-1">
                  To change this user's password, use the "Reset Password" action in the Users table instead.
                </p>

                <div className="form-group mb-0">
                  <label className="form-label text-[10px]">Phone Number</label>
                  <div className="flex gap-2">
                    <select
                      value={editingUser.countryCode}
                      onChange={(e) => setEditingUser({ ...editingUser, countryCode: e.target.value })}
                      className="px-2.5 py-1.5 text-xs bg-white border border-slate-350 rounded outline-none text-slate-800 w-[80px]"
                    >
                      <option value="+91">+91 (IN)</option>
                      <option value="+977">+977 (NP)</option>
                      <option value="+1">+1 (US)</option>
                      <option value="+44">+44 (UK)</option>
                    </select>
                    <input 
                      type="tel" 
                      value={editingUser.phone} 
                      onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })} 
                      className="form-input text-xs flex-1"
                    />
                  </div>
                </div>

                {editingUser.role === 'b2b' && (
                  <div className="border-t border-slate-100 pt-3 mt-1 flex flex-col gap-3">
                    <div className="form-group mb-0">
                      <label className="form-label text-[10px]">Agency Name</label>
                      <input 
                        type="text" 
                        required 
                        value={editingUser.agencyName || ''} 
                        onChange={(e) => setEditingUser({ ...editingUser, agencyName: e.target.value })} 
                        className="form-input text-xs"
                      />
                    </div>
                    <div className="form-group mb-0">
                      <label className="form-label text-[10px]">Agency Address</label>
                      <input 
                        type="text" 
                        required 
                        value={editingUser.agencyAddress || ''} 
                        onChange={(e) => setEditingUser({ ...editingUser, agencyAddress: e.target.value })} 
                        className="form-input text-xs"
                      />
                    </div>
                    <div className="form-group mb-0">
                      <label className="form-label text-[10px]">Agency Website (Optional)</label>
                      <input 
                        type="text" 
                        value={editingUser.agencyWebsite || ''} 
                        onChange={(e) => setEditingUser({ ...editingUser, agencyWebsite: e.target.value })} 
                        className="form-input text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setEditingUser(null)} className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 bg-transparent">Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm bg-orange-655 hover:bg-orange-700 text-white rounded-lg py-2 px-4 shadow">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Renaming a city rewrites it across hotels, activities, airports and
          packages -- see handleRenameCity for what is deliberately left alone. */}
      {editingCity && (
        <div className="modal-overlay">
          <div className="modal-content max-w-sm">
            <div className="modal-header">
              <h3 className="text-sm font-black uppercase tracking-wider font-heading text-slate-800">Rename City</h3>
              <button onClick={() => setEditingCity(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              const result = handleRenameCity(editingCity.original, editingCity.name);
              if (result.ok) setEditingCity(null);
            }}>
              <div className="modal-body flex flex-col gap-4 text-left">
                <div className="form-group mb-0">
                  <label className="form-label text-[10px]">City Name</label>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={editingCity.name}
                    onChange={(e) => setEditingCity({ ...editingCity, name: e.target.value })}
                    className="form-input text-xs"
                  />
                </div>
                {(() => {
                  const c = editingCity.original;
                  const airport = getAirportForCity(db.airports || [], c);
                  const counts = [
                    [(db.hotels || []).filter(h => sameCity(h.city, c)).length, 'hotel', 'hotels'],
                    [(db.activities || []).filter(a => sameCity(a.city, c)).length, 'activity', 'activities'],
                    [(db.packages || []).filter(p => (p.cities || []).some(x => sameCity(x, c))).length, 'package', 'packages'],
                  ].filter(([n]) => n > 0);
                  return (
                    <div className="text-[10px] text-slate-450 leading-relaxed">
                      {counts.length > 0 && (
                        <p>Renaming also updates {counts.map(([n, one, many]) => `${n} ${n === 1 ? one : many}`).join(', ')}.</p>
                      )}
                      <p className="mt-1">
                        Airport: {airport ? <strong>{airport.name}</strong> : <em>none — this city is road-only</em>}
                        {' '}(change this by editing the airport below).
                      </p>
                      <p className="mt-1">Existing bookings and quotes keep the old name.</p>
                    </div>
                  );
                })()}
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setEditingCity(null)} className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 bg-transparent">Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm">Rename</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Airport name, code, and which cities it serves. The served-cities list
          is what decides where a flight leg can be offered. */}
      {editingAirport && (
        <div className="modal-overlay">
          <div className="modal-content max-w-md">
            <div className="modal-header">
              <h3 className="text-sm font-black uppercase tracking-wider font-heading text-slate-800">Edit Airport</h3>
              <button onClick={() => setEditingAirport(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleSaveAirportEdit(); }}>
              <div className="modal-body flex flex-col gap-4 text-left">
                <div className="flex gap-3">
                  <div className="form-group mb-0 flex-1">
                    <label className="form-label text-[10px]">Airport Name</label>
                    <input
                      type="text"
                      required
                      value={editingAirport.name || ''}
                      onChange={(e) => setEditingAirport({ ...editingAirport, name: e.target.value })}
                      className="form-input text-xs"
                    />
                  </div>
                  <div className="form-group mb-0 w-24">
                    <label className="form-label text-[10px]">Code</label>
                    <input
                      type="text"
                      maxLength={5}
                      value={editingAirport.code || ''}
                      onChange={(e) => setEditingAirport({ ...editingAirport, code: e.target.value })}
                      className="form-input text-xs uppercase"
                    />
                  </div>
                </div>

                <div className="form-group mb-0">
                  <label className="form-label text-[10px]">Cities This Airport Serves</label>
                  <div className="flex flex-wrap gap-2">
                    {(db.cities || []).map(city => {
                      const selected = (editingAirport.cities || []).includes(city);
                      return (
                        <button
                          key={city}
                          type="button"
                          onClick={() => handleToggleEditAirportCity(city)}
                          className={`text-[11px] font-bold py-1.5 px-3 rounded-lg border transition ${
                            selected
                              ? 'bg-sky-600 border-sky-600 text-white shadow-sm'
                              : 'bg-white border-slate-300 text-slate-600 hover:border-sky-400'
                          }`}
                        >
                          {city}
                        </button>
                      );
                    })}
                  </div>
                  <span className="text-[10px] text-slate-450 block mt-2 leading-relaxed">
                    A flight is offered between two cities only when both have an airport and the
                    two are different. Each served city keeps its own airport transfer price.
                  </span>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setEditingAirport(null)} className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 bg-transparent">Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Activity editing is a popup rather than an inline table row: a
          per-vehicle activity needs a rate for every vehicle, which stacked
          vertically inside a table cell and sprawled the row down the page. */}
      {editingActivityId && (
        <div className="modal-overlay">
          <div className="modal-content max-w-md">
            <div className="modal-header">
              <h3 className="text-sm font-black uppercase tracking-wider font-heading text-slate-800">Edit Activity</h3>
              <button onClick={() => setEditingActivityId(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleSaveActivityEdit(); }}>
              <div className="modal-body flex flex-col gap-4 text-left">
                <div className="form-group mb-0">
                  <label className="form-label text-[10px]">Activity Name</label>
                  <input
                    type="text"
                    required
                    value={activityEditState.name || ''}
                    onChange={(e) => setActivityEditState({ ...activityEditState, name: e.target.value })}
                    className="form-input text-xs"
                  />
                </div>

                <div className="form-group mb-0">
                  <label className="form-label text-[10px]">City</label>
                  <select
                    value={activityEditState.city || ''}
                    onChange={(e) => setActivityEditState({ ...activityEditState, city: e.target.value })}
                    className="form-input text-xs"
                  >
                    {(db.cities || []).map(city => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                  <span className="text-[10px] text-slate-450 block mt-1">
                    This activity can only be added to a day in this city.
                  </span>
                </div>

                <div className="form-group mb-0">
                  <label className="form-label text-[10px]">Charged</label>
                  <select
                    value={activityEditState.pricing_mode || 'per_person'}
                    onChange={(e) => setActivityEditState({ ...activityEditState, pricing_mode: e.target.value })}
                    className="form-input text-xs"
                  >
                    <option value="per_person">Per person (× party size)</option>
                    <option value="per_vehicle">Per vehicle (once per day)</option>
                  </select>
                </div>

                {activityEditState.pricing_mode === 'per_vehicle' ? (
                  <div className="form-group mb-0">
                    <label className="form-label text-[10px]">Rate Per Vehicle (₹ per day)</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(db.vehicles || []).map(v => (
                        <label key={v.id} className="flex flex-col gap-0.5">
                          <span className="text-[9px] uppercase font-bold text-slate-500 truncate" title={v.name}>{v.name}</span>
                          <input
                            type="number"
                            min="0"
                            value={(activityEditState.vehicle_rates || {})[v.id] ?? 0}
                            onChange={(e) => setActivityEditState({
                              ...activityEditState,
                              vehicle_rates: { ...(activityEditState.vehicle_rates || {}), [v.id]: Number(e.target.value) || 0 },
                            })}
                            className="form-input text-xs"
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="form-group mb-0">
                      <label className="form-label text-[10px]">Adult Ticket (₹)</label>
                      <input
                        type="number"
                        min="0"
                        value={activityEditState.price_adult ?? 0}
                        onChange={(e) => setActivityEditState({ ...activityEditState, price_adult: Number(e.target.value) || 0 })}
                        className="form-input text-xs"
                      />
                    </div>
                    <div className="form-group mb-0">
                      <label className="form-label text-[10px]">Child Ticket (₹)</label>
                      <input
                        type="number"
                        min="0"
                        value={activityEditState.price_child ?? 0}
                        onChange={(e) => setActivityEditState({ ...activityEditState, price_child: Number(e.target.value) || 0 })}
                        className="form-input text-xs"
                      />
                    </div>
                  </div>
                )}

                <div className="form-group mb-0">
                  <label className="form-label text-[10px]">Description</label>
                  <textarea
                    rows={3}
                    value={activityEditState.description || ''}
                    onChange={(e) => setActivityEditState({ ...activityEditState, description: e.target.value })}
                    className="form-input text-xs"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setEditingActivityId(null)} className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 bg-transparent">Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Vehicle identity. Prices are not here on purpose -- they live in the
          rate sheet, so there is one place to look for any number. */}
      {editingVehicleDetails && (
        <div className="modal-overlay">
          <div className="modal-content max-w-md">
            <div className="modal-header">
              <h3 className="text-sm font-black uppercase tracking-wider font-heading text-slate-800">Edit Vehicle</h3>
              <button onClick={() => setEditingVehicleDetails(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleSaveVehicleDetails(); }}>
              <div className="modal-body flex flex-col gap-4 text-left">
                <div className="form-group mb-0">
                  <label className="form-label text-[10px]">Vehicle Name</label>
                  <input
                    type="text"
                    required
                    value={editingVehicleDetails.name || ''}
                    onChange={(e) => setEditingVehicleDetails({ ...editingVehicleDetails, name: e.target.value })}
                    className="form-input text-xs"
                  />
                </div>
                <div className="form-group mb-0">
                  <label className="form-label text-[10px]">Max Capacity (travellers)</label>
                  <input
                    type="number"
                    min="1"
                    value={editingVehicleDetails.capacity ?? ''}
                    onChange={(e) => setEditingVehicleDetails({ ...editingVehicleDetails, capacity: Number(e.target.value) || 0 })}
                    className="form-input text-xs"
                  />
                </div>
                {/* A full-day sightseeing hire is a property of the vehicle,
                    not a sector between two places, so it is priced here
                    rather than in the transfer sheet. */}
                <div className="form-group mb-0">
                  <label className="form-label text-[10px]">Full-Day Sightseeing Rate (₹ per day)</label>
                  <input
                    type="number"
                    min="0"
                    value={editingVehicleDetails.daily_sightseeing_rate ?? 0}
                    onChange={(e) => setEditingVehicleDetails({ ...editingVehicleDetails, daily_sightseeing_rate: Number(e.target.value) || 0 })}
                    className="form-input text-xs"
                  />
                  <span className="text-[10px] text-slate-450 block mt-1 leading-relaxed">
                    Charged for each day the vehicle is at the guest's disposal for local
                    sightseeing. Not a point-to-point transfer, so it is not in the rate sheet.
                  </span>
                </div>
                <div className="form-group mb-0">
                  <label className="form-label text-[10px]">Description</label>
                  <textarea
                    rows={3}
                    value={editingVehicleDetails.description || ''}
                    onChange={(e) => setEditingVehicleDetails({ ...editingVehicleDetails, description: e.target.value })}
                    className="form-input text-xs"
                  />
                </div>
                <p className="text-[10px] text-slate-450 -mt-1">
                  Point-to-point transfer prices are edited in the rate sheet behind this popup.
                </p>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setEditingVehicleDetails(null)} className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 bg-transparent">Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {walletModalUser && (
        <div className="modal-overlay">
          <div className="modal-content max-w-lg">
            <div className="modal-header">
              <h3 className="text-sm font-black uppercase tracking-wider font-heading text-slate-800">
                Wallet — {walletModalUser.agencyName || walletModalUser.fullName}
              </h3>
              <button onClick={() => setWalletModalUser(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div className="modal-body flex flex-col gap-4 text-left">
              {walletModalLoading ? (
                <p className="text-xs text-slate-500 text-center py-6">Loading wallet…</p>
              ) : walletModalError ? (
                <p className="text-xs text-red-600 text-center py-6">{walletModalError}</p>
              ) : (
                <>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between">
                    <span className="text-[10px] text-slate-500 uppercase font-extrabold tracking-wider">Current Balance</span>
                    <strong className="text-xl font-bold text-slate-800">₹{Number(walletModalData.balance || 0).toLocaleString()}</strong>
                  </div>

                  <form onSubmit={handleAddWalletEntry} className="border border-slate-200 rounded-xl p-4 flex flex-col gap-3">
                    <span className="text-[10px] text-slate-500 uppercase font-extrabold tracking-wider">Add Credit / Debit</span>
                    <div className="flex gap-2">
                      <select
                        value={walletEntryForm.type}
                        onChange={(e) => setWalletEntryForm({ ...walletEntryForm, type: e.target.value })}
                        className="px-2.5 py-1.5 text-xs bg-white border border-slate-350 rounded outline-none text-slate-800 w-[100px]"
                      >
                        <option value="credit">Credit (+)</option>
                        <option value="debit">Debit (−)</option>
                      </select>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        placeholder="Amount"
                        value={walletEntryForm.amount}
                        onChange={(e) => setWalletEntryForm({ ...walletEntryForm, amount: e.target.value })}
                        className="form-input text-xs flex-1"
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="Reason (e.g. Commission payout for booking #1234)"
                      value={walletEntryForm.reason}
                      onChange={(e) => setWalletEntryForm({ ...walletEntryForm, reason: e.target.value })}
                      className="form-input text-xs"
                    />
                    <button
                      type="submit"
                      disabled={walletEntrySubmitting}
                      className="btn btn-primary btn-sm self-end"
                      style={{ opacity: walletEntrySubmitting ? 0.6 : 1 }}
                    >
                      {walletEntrySubmitting ? 'Saving…' : 'Add Entry'}
                    </button>
                  </form>

                  <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
                    {walletModalData.transactions.length === 0 ? (
                      <p className="text-xs text-slate-450 text-center py-4">No wallet activity yet.</p>
                    ) : (
                      walletModalData.transactions.map((t) => (
                        <div key={t.id} className="flex items-center gap-3 border-b border-slate-100 pb-2 last:border-0">
                          {t.type === 'credit' ? (
                            <ArrowUpCircle size={16} className="text-emerald-600 shrink-0" />
                          ) : (
                            <ArrowDownCircle size={16} className="text-red-600 shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-800 truncate">{t.reason}</p>
                            <p className="text-[10px] text-slate-450">{new Date(t.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                          </div>
                          <span className={`text-xs font-bold ${t.type === 'credit' ? 'text-emerald-600' : 'text-red-600'}`}>
                            {t.type === 'credit' ? '+' : '−'}₹{Number(t.amount || 0).toLocaleString()}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" onClick={() => setWalletModalUser(null)} className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 bg-transparent">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Sign In / Register Modal Popup Overlays */}
      {showB2cLoginPortal && renderAuthGate()}
      {showB2bLoginPortal && renderAuthGate()}

    </div>
    </div>
  );
}

export default App;
