import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { cityLandingPageMap } from '../../cityLandingPages';
import { CONTACT_INFO, DESTINATIONS, LOGO_URL } from '../../constants';

const BASE_URL = 'https://www.tripguruindia.com';
const DEFAULT_TITLE = 'TripGuru | International Tour Packages, Flights & Hotels';
const DEFAULT_DESCRIPTION =
  'Plan international holidays with TripGuru India. Get custom itineraries, flights, hotels, visa guidance and WhatsApp support for family, honeymoon, corporate and group trips.';
const DEFAULT_KEYWORDS =
  'international tour packages, custom itineraries, flight bookings, hotel bookings, visa guidance, honeymoon packages, family holidays, TripGuru India';
const DEFAULT_GEO_POSITION = '28.6139;77.2090';
type SeoConfig = {
  title: string;
  description: string;
  keywords: string;
  canonical: string;
  ogImage: string;
  geoRegion?: string;
  geoPlacename?: string;
  geoPosition?: string;
  robots?: string;
  structuredData: Record<string, unknown> | Array<Record<string, unknown>>;
};

function setMeta(selector: string, attributes: Record<string, string>, content: string) {
  let element = document.head.querySelector(selector) as HTMLMetaElement | null;

  if (!element) {
    element = document.createElement('meta');
    Object.entries(attributes).forEach(([key, value]) => element?.setAttribute(key, value));
    document.head.appendChild(element);
  }

  element.setAttribute('content', content);
}

function setCanonical(href: string) {
  let canonical = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.setAttribute('rel', 'canonical');
    document.head.appendChild(canonical);
  }

  canonical.setAttribute('href', href);
}

function setStructuredData(data: SeoConfig['structuredData']) {
  const id = 'route-seo-jsonld';
  let script = document.getElementById(id) as HTMLScriptElement | null;

  if (!script) {
    script = document.createElement('script');
    script.id = id;
    script.type = 'application/ld+json';
    document.head.appendChild(script);
  }

  script.textContent = JSON.stringify(data);
}

function getDefaultStructuredData(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'TravelAgency',
    name: 'TripGuru',
    alternateName: 'TripGuru India',
    description: 'Travel agency for international tour packages, flights, hotels, visa guidance and custom itineraries.',
    url: BASE_URL,
    logo: LOGO_URL,
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: CONTACT_INFO.phone,
      contactType: 'customer service',
      areaServed: 'IN',
      availableLanguage: ['en', 'hi'],
    },
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'India',
      addressRegion: 'Uttar Pradesh',
      addressCountry: 'IN',
    },
    priceRange: 'Custom pricing',
    areaServed: ['Gorakhpur', 'Noida', 'Delhi NCR', 'India'],
    knowsAbout: [
      'International tour packages',
      'Custom holidays',
      'Honeymoon travel',
      'Family vacations',
      'Corporate travel',
      'Visa-ready itineraries',
    ],
    makesOffer: [
      {
        '@type': 'Offer',
        itemOffered: {
          '@type': 'Service',
          name: 'Custom International Tour Packages',
          serviceType: 'Travel planning',
          areaServed: 'India',
        },
      },
      {
        '@type': 'Offer',
        itemOffered: {
          '@type': 'Service',
          name: 'Hotel and Flight Planning',
          serviceType: 'Travel booking assistance',
          areaServed: 'India',
        },
      },
    ],
    sameAs: [CONTACT_INFO.instagram, CONTACT_INFO.facebook, CONTACT_INFO.linkedin],
  };
}

function getSeoConfig(pathname: string): SeoConfig {
  const normalizedPath = pathname === '/' ? '/' : pathname.replace(/\/+$/, '');
  const cityPage = cityLandingPageMap[normalizedPath as keyof typeof cityLandingPageMap];

  if (cityPage) {
    return {
      title: cityPage.title,
      description: cityPage.description,
      keywords: cityPage.keywords,
      canonical: `${BASE_URL}${cityPage.path}`,
      ogImage: LOGO_URL,
      geoRegion: cityPage.regionCode,
      geoPlacename: cityPage.city,
      geoPosition: cityPage.geoPosition,
      structuredData: [
        {
          '@context': 'https://schema.org',
          '@type': 'TravelAgency',
          name: 'TripGuru',
          url: `${BASE_URL}${cityPage.path}`,
          image: LOGO_URL,
          telephone: CONTACT_INFO.phone,
          email: CONTACT_INFO.email,
          address: {
            '@type': 'PostalAddress',
            addressLocality: cityPage.city,
            addressRegion: cityPage.state,
            addressCountry: 'IN',
          },
          areaServed: [cityPage.city, cityPage.state, 'India'],
          priceRange: 'Custom pricing',
          knowsAbout: ['International holidays', 'Custom itineraries', 'Flight and hotel planning', 'Visa-ready travel planning'],
          makesOffer: {
            '@type': 'Offer',
            itemOffered: {
              '@type': 'Service',
              name: `International tour packages from ${cityPage.city}`,
              serviceType: 'Travel agency services',
            },
          },
          sameAs: [CONTACT_INFO.instagram, CONTACT_INFO.facebook, CONTACT_INFO.linkedin],
        },
        {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: [
            {
              '@type': 'Question',
              name: cityPage.faqQuestion,
              acceptedAnswer: {
                '@type': 'Answer',
                text: cityPage.faqAnswer,
              },
            },
            {
              '@type': 'Question',
              name: 'Can TripGuru help with custom travel packages?',
              acceptedAnswer: {
                '@type': 'Answer',
                text:
                  'Yes. TripGuru creates tailor-made itineraries for honeymoon trips, family vacations, premium hotels, and international travel planning.',
              },
            },
          ],
        },
      ],
    };
  }

  if (normalizedPath.startsWith('/destinations/')) {
    const slug = normalizedPath.split('/')[2];
    const destination = DESTINATIONS.find((item) => item.slug === slug);

    if (destination) {
      return {
        title: `${destination.name} Tour Packages | TripGuru India`,
        description: `${destination.name} with TripGuru India. ${destination.description}`,
        keywords: `${destination.name.toLowerCase()} tour packages, ${destination.name.toLowerCase()} holiday packages, custom ${destination.name.toLowerCase()} itinerary, TripGuru India`,
        canonical: `${BASE_URL}/destinations/${destination.slug}`,
        ogImage: destination.image,
        structuredData: [
          getDefaultStructuredData(),
          {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              {
                '@type': 'ListItem',
                position: 1,
                name: 'Home',
                item: BASE_URL,
              },
              {
                '@type': 'ListItem',
                position: 2,
                name: 'Destinations',
                item: `${BASE_URL}/destinations`,
              },
              {
                '@type': 'ListItem',
                position: 3,
                name: destination.name,
                item: `${BASE_URL}/destinations/${destination.slug}`,
              },
            ],
          },
        ],
      };
    }
  }

  if (normalizedPath === '/privacy-policy') {
    return {
      title: 'Privacy Policy | TripGuru India',
      description: 'Read the Privacy Policy of TripGuru India to understand how we collect, protect, and use your personal information during travel planning.',
      keywords: 'privacy policy, tripguru, tripguru india, data protection, travel agency policy',
      canonical: `${BASE_URL}/privacy-policy`,
      ogImage: LOGO_URL,
      structuredData: {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: 'Privacy Policy - TripGuru India',
        description: 'Privacy policy and data protection details of TripGuru India.',
        publisher: getDefaultStructuredData(),
      },
    };
  }

  if (normalizedPath === '/thank-you') {
    return {
      title: 'Thank You | TripGuru India',
      description: 'Your quote request has been successfully received.',
      keywords: '',
      canonical: `${BASE_URL}/thank-you`,
      ogImage: LOGO_URL,
      robots: 'noindex, nofollow',
      structuredData: {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: 'Thank You - TripGuru India',
        description: 'Thank you page for conversion tracking.',
        publisher: getDefaultStructuredData(),
      },
    };
  }

  return {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    keywords: DEFAULT_KEYWORDS,
    canonical: BASE_URL,
    ogImage: LOGO_URL,
    geoRegion: 'IN',
    geoPlacename: 'India',
    geoPosition: DEFAULT_GEO_POSITION,
    structuredData: getDefaultStructuredData(),
  };
}

export const SeoManager = () => {
  const location = useLocation();

  useEffect(() => {
    const seo = getSeoConfig(location.pathname);

    document.title = seo.title;
    document.documentElement.lang = 'en';

    setCanonical(seo.canonical);

    setMeta('meta[name="title"]', { name: 'title' }, seo.title);
    setMeta('meta[name="description"]', { name: 'description' }, seo.description);
    setMeta('meta[name="keywords"]', { name: 'keywords' }, seo.keywords);
    setMeta('meta[name="author"]', { name: 'author' }, 'TripGuru');
    setMeta('meta[name="robots"]', { name: 'robots' }, seo.robots || 'index, follow');
    setMeta('meta[name="geo.region"]', { name: 'geo.region' }, seo.geoRegion || 'IN');
    setMeta('meta[name="geo.placename"]', { name: 'geo.placename' }, seo.geoPlacename || 'India');
    setMeta('meta[name="geo.position"]', { name: 'geo.position' }, seo.geoPosition || DEFAULT_GEO_POSITION);
    setMeta('meta[name="ICBM"]', { name: 'ICBM' }, (seo.geoPosition || DEFAULT_GEO_POSITION).replace(';', ', '));

    setMeta('meta[property="og:type"]', { property: 'og:type' }, 'website');
    setMeta('meta[property="og:url"]', { property: 'og:url' }, seo.canonical);
    setMeta('meta[property="og:title"]', { property: 'og:title' }, seo.title);
    setMeta('meta[property="og:description"]', { property: 'og:description' }, seo.description);
    setMeta('meta[property="og:image"]', { property: 'og:image' }, seo.ogImage);

    setMeta('meta[name="twitter:card"]', { name: 'twitter:card' }, 'summary_large_image');
    setMeta('meta[name="twitter:url"]', { name: 'twitter:url' }, seo.canonical);
    setMeta('meta[name="twitter:title"]', { name: 'twitter:title' }, seo.title);
    setMeta('meta[name="twitter:description"]', { name: 'twitter:description' }, seo.description);
    setMeta('meta[name="twitter:image"]', { name: 'twitter:image' }, seo.ogImage);

    setStructuredData(seo.structuredData);
  }, [location.pathname]);

  return null;
};
