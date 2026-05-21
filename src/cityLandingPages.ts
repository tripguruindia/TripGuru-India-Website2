export interface CityLandingPageConfig {
  slug: string;
  path: string;
  city: string;
  state: string;
  regionCode: string;
  geoPosition: string;
  title: string;
  description: string;
  keywords: string;
  eyebrow: string;
  heroTitle: string;
  heroDescription: string;
  trustPoints: string[];
  nearbyAreas: string[];
  serviceHeading: string;
  faqHeading: string;
  ctaHeading: string;
  faqQuestion: string;
  faqAnswer: string;
  destinationAltSuffix: string;
}

export const cityLandingPages: CityLandingPageConfig[] = [
  {
    slug: 'gorakhpur',
    path: '/travel-agency-in-gorakhpur',
    city: 'Gorakhpur',
    state: 'Uttar Pradesh',
    regionCode: 'IN-UP',
    geoPosition: '26.7606;83.3732',
    title: 'Travel Agency in Gorakhpur | International Tour Packages | TripGuru India',
    description:
      'Looking for a travel agency in Gorakhpur? TripGuru plans international holidays, flights, hotels, visa guidance and custom itineraries with WhatsApp support.',
    keywords:
      'travel agency in gorakhpur, gorakhpur travel agency, international tour packages from gorakhpur, custom travel agency gorakhpur, TripGuru India',
    eyebrow: 'Travel Agency in Gorakhpur',
    heroTitle: 'International trip planning from Gorakhpur to the world.',
    heroDescription:
      'TripGuru helps Gorakhpur travelers plan international holidays with checked flights, hotel options, custom itineraries, and responsive WhatsApp support.',
    trustPoints: [
      'Based in Gorakhpur, serving travelers across Uttar Pradesh and India.',
      'Tailor-made trips for families, couples, honeymooners, and business travelers.',
      'Transparent trip planning focused on timing, comfort, and value.',
    ],
    nearbyAreas: ['Civil Lines', 'Golghar', 'Betiahata', 'Mohaddipur', 'Taramandal', 'Railway Colony'],
    serviceHeading: 'A travel agency in Gorakhpur that plans the details you actually care about.',
    faqHeading: 'Questions travelers in Gorakhpur often ask.',
    ctaHeading: 'Ready to plan your next international trip from Gorakhpur?',
    faqQuestion: 'Do you plan international trips from Gorakhpur?',
    faqAnswer:
      'Yes. TripGuru plans international holidays for travelers starting from Gorakhpur and nearby cities, including flight combinations, hotel selection, transfers, and curated experiences.',
    destinationAltSuffix: 'from Gorakhpur',
  },
  {
    slug: 'noida',
    path: '/travel-agency-in-noida',
    city: 'Noida',
    state: 'Uttar Pradesh',
    regionCode: 'IN-UP',
    geoPosition: '28.5355;77.3910',
    title: 'Travel Agency in Noida | International Tour Packages | TripGuru India',
    description:
      'Looking for a travel agency in Noida? TripGuru plans international holidays, flights, hotels, visa guidance and custom itineraries with WhatsApp support.',
    keywords:
      'travel agency in noida, noida travel agency, international tour packages from noida, custom travel agency noida, TripGuru India',
    eyebrow: 'Travel Agency in Noida',
    heroTitle: 'International trip planning from Noida to the world.',
    heroDescription:
      'TripGuru helps Noida and NCR travelers plan international holidays with checked flights, hotel options, custom itineraries, and responsive WhatsApp support.',
    trustPoints: [
      'Serving travelers from Noida, Delhi NCR, and across North India.',
      'Tailor-made trips for families, couples, honeymooners, and business travelers.',
      'Transparent trip planning focused on timing, comfort, and value.',
    ],
    nearbyAreas: ['Sector 15', 'Sector 18', 'Sector 50', 'Sector 62', 'Noida Expressway', 'Greater Noida'],
    serviceHeading: 'A travel agency in Noida that plans the details you actually care about.',
    faqHeading: 'Questions travelers in Noida often ask.',
    ctaHeading: 'Ready to plan your next international trip from Noida?',
    faqQuestion: 'Do you plan international trips from Noida?',
    faqAnswer:
      'Yes. TripGuru plans international holidays for travelers starting from Noida and the NCR region, including flight combinations, hotel selection, transfers, and curated experiences.',
    destinationAltSuffix: 'from Noida',
  },
  {
    slug: 'delhi',
    path: '/travel-agency-in-delhi',
    city: 'Delhi',
    state: 'Delhi',
    regionCode: 'IN-DL',
    geoPosition: '28.6139;77.2090',
    title: 'Travel Agency in Delhi | International Tour Packages | TripGuru India',
    description:
      'Looking for a travel agency in Delhi? TripGuru plans international holidays, flights, hotels, visa guidance and custom itineraries with WhatsApp support.',
    keywords:
      'travel agency in delhi, delhi travel agency, international tour packages from delhi, custom travel agency delhi, TripGuru India',
    eyebrow: 'Travel Agency in Delhi',
    heroTitle: 'International trip planning from Delhi to the world.',
    heroDescription:
      'TripGuru helps Delhi travelers plan international holidays with checked flights, hotel options, custom itineraries, and responsive WhatsApp support.',
    trustPoints: [
      'Serving travelers from Delhi with practical international trip planning.',
      'Tailor-made trips for families, couples, honeymooners, and business travelers.',
      'Transparent trip planning focused on timing, comfort, and value.',
    ],
    nearbyAreas: ['South Delhi', 'Aerocity', 'Vasant Kunj', 'Greater Kailash', 'Defence Colony', 'Connaught Place'],
    serviceHeading: 'A travel agency in Delhi that plans the details you actually care about.',
    faqHeading: 'Questions travelers in Delhi often ask.',
    ctaHeading: 'Ready to plan your next international trip from Delhi?',
    faqQuestion: 'Do you plan international trips from Delhi?',
    faqAnswer:
      'Yes. TripGuru plans international holidays for travelers starting from Delhi, including flight combinations, hotel selection, transfers, and curated experiences.',
    destinationAltSuffix: 'from Delhi',
  },
  {
    slug: 'bangalore',
    path: '/travel-agency-in-bangalore',
    city: 'Bangalore',
    state: 'Karnataka',
    regionCode: 'IN-KA',
    geoPosition: '12.9716;77.5946',
    title: 'Premium Travel Agency in Bangalore | Custom International Tours | TripGuru',
    description:
      'Plan luxury international holidays & corporate tours from Bangalore with TripGuru. Bespoke itineraries, corporate flight desks, group offsites & seamless visa support.',
    keywords:
      'travel agency bangalore, luxury tour packages bangalore, corporate tours bangalore, travel agent indiranagar, travel agent whitefield, international packages bangalore, TripGuru',
    eyebrow: 'Premium Travel Services in Bangalore',
    heroTitle: 'Bespoke international travel & corporate retreats from Bangalore.',
    heroDescription:
      'Designing tailormade international getaways for Bangalore tech professionals, corporate teams, and families. Multi-destination flight routing, custom hotel boards, and dedicated WhatsApp support.',
    trustPoints: [
      'Corporate travel desks & customized MICE packages for tech enterprises.',
      'Premium honeymoon & family holidays designed around comfort & luxury.',
      'End-to-end planning with visa coordination and flight combinations.',
    ],
    nearbyAreas: ['Indiranagar', 'Whitefield', 'Koramangala', 'HSR Layout', 'Jayanagar', 'Electronic City', 'Sadashivanagar'],
    serviceHeading: 'Specialized international planning for Bangalore professionals & companies.',
    faqHeading: 'Frequently Asked Questions in Bangalore.',
    ctaHeading: 'Ready to design a premium travel experience from Bangalore?',
    faqQuestion: 'Do you offer corporate employee packages & business offsites?',
    faqAnswer:
      'Yes. TripGuru designs custom corporate offsites, team building getaways, flight desks, and employee incentive holiday packages for major tech companies and enterprises in Bangalore.',
    destinationAltSuffix: 'from Bangalore',
  },
  {
    slug: 'hyderabad',
    path: '/travel-agency-in-hyderabad',
    city: 'Hyderabad',
    state: 'Telangana',
    regionCode: 'IN-TG',
    geoPosition: '17.3850;78.4867',
    title: 'Premium Travel Agency in Hyderabad | Luxury Holiday Packages | TripGuru',
    description:
      'Luxury international tour packages & corporate retreats from Hyderabad. Experience premium custom itineraries, fast visa assistance, and private group flight deals.',
    keywords:
      'travel agency hyderabad, luxury tours hyderabad, travel agent jubilee hills, travel agent gachibowli, corporate team offsites hyderabad, TripGuru',
    eyebrow: 'Bespoke Travel Planning in Hyderabad',
    heroTitle: 'Curating luxury holidays & corporate corporate retreats from Hyderabad.',
    heroDescription:
      'We curate premium international packages for Hyderabad families, honeymooners, and corporate teams. Offering optimized flight options from Rajiv Gandhi International Airport and concierge visa guidance.',
    trustPoints: [
      'Tailored corporate travel services & high-end corporate retreats.',
      'Curated stays at premier global properties & luxury resorts.',
      '24/7 travel desk support during your trip on WhatsApp.',
    ],
    nearbyAreas: ['Jubilee Hills', 'Banjara Hills', 'Gachibowli', 'Hitec City', 'Madhapur', 'Secunderabad', 'Begumpet'],
    serviceHeading: 'Bespoke travel designs for Hyderabad elites & corporate leaders.',
    faqHeading: 'Frequently Asked Questions in Hyderabad.',
    ctaHeading: 'Plan your premium international getaway from Hyderabad.',
    faqQuestion: 'How does your visa support work for international packages?',
    faqAnswer:
      'We provide complete visa documentation assistance and slot coordination for all major destinations. We align visa timelines with your itinerary before confirming non-refundable bookings.',
    destinationAltSuffix: 'from Hyderabad',
  },
  {
    slug: 'chennai',
    path: '/travel-agency-in-chennai',
    city: 'Chennai',
    state: 'Tamil Nadu',
    regionCode: 'IN-TN',
    geoPosition: '13.0827;80.2707',
    title: 'Premium Travel Agency in Chennai | Custom International Holidays | TripGuru',
    description:
      'Plan tailored international vacations & corporate group bookings from Chennai. Custom itineraries, luxury cruises, corporate travel, and visa coordination with TripGuru.',
    keywords:
      'travel agency chennai, international packages chennai, travel agent adyar, travel agent nungambakkam, corporate tours chennai, TripGuru',
    eyebrow: 'Bespoke Holidays from Chennai',
    heroTitle: 'Premium international tour packages & company group trips from Chennai.',
    heroDescription:
      'Designing unique international holidays and cruise itineraries for Chennai families, business leaders, and corporate teams. Stress-free visa support and handpicked accommodation curation.',
    trustPoints: [
      'Bespoke luxury packages & high-end corporate group offsites.',
      'Cruise bookings & premium resort experiences globally.',
      'Flexible flight packages originating from Chennai International Airport.',
    ],
    nearbyAreas: ['Adyar', 'Nungambakkam', 'Anna Nagar', 'T-Nagar', 'Mylapore', 'OMR', 'Velachery'],
    serviceHeading: 'Crafting luxury travel experiences for Chennai travelers & companies.',
    faqHeading: 'Frequently Asked Questions in Chennai.',
    ctaHeading: 'Ready to request a custom travel quote from Chennai?',
    faqQuestion: 'Do you arrange corporate incentive trips and family tours together?',
    faqAnswer:
      'Yes. We handle large corporate travel groups, annual MICE retreats, business offsites, as well as multi-generational premium family tours with custom coaches and private guides.',
    destinationAltSuffix: 'from Chennai',
  },
  {
    slug: 'mumbai',
    path: '/travel-agency-in-mumbai',
    city: 'Mumbai',
    state: 'Maharashtra',
    regionCode: 'IN-MH',
    geoPosition: '19.0760;72.8777',
    title: 'Luxury Travel Agency in Mumbai | Bespoke International Holidays | TripGuru',
    description:
      'Bespoke luxury travel agency in Mumbai. We design premium international tour packages, corporate retreats, VIP cruise charters, and fast visa assistance.',
    keywords:
      'luxury travel agency mumbai, travel agent bandra, travel agent south mumbai, corporate tours mumbai, custom travel agency mumbai, TripGuru',
    eyebrow: 'Ultra-Premium Travel in Mumbai',
    heroTitle: 'Bespoke international trips & corporate executive retreats from Mumbai.',
    heroDescription:
      'Curating highly personalized, high-end travel experiences for Mumbai corporate executives, elite families, and couples. End-to-end management from private airport transfers to bespoke local itineraries.',
    trustPoints: [
      'Bespoke travel curator for corporate leaders & luxury leisure travelers.',
      'Direct partnerships with five-star global hotel brands and private villas.',
      'Fast-track visa coordination and premium concierge services.',
    ],
    nearbyAreas: ['Bandra', 'Juhu', 'Colaba', 'Andheri West', 'South Mumbai', 'Powai', 'Worli', 'Lower Parel'],
    serviceHeading: 'Bespoke travel management for Mumbai corporate groups & families.',
    faqHeading: 'Frequently Asked Questions in Mumbai.',
    ctaHeading: 'Begin crafting your signature travel experience from Mumbai.',
    faqQuestion: 'What VIP services do you offer for high-end corporate travelers?',
    faqAnswer:
      'For high-paying corporate clients, we coordinate premium corporate offsites, luxury resort buyouts, executive flight desks, VIP lounge access, private transfers, and customized team excursions.',
    destinationAltSuffix: 'from Mumbai',
  },
  {
    slug: 'pune',
    path: '/travel-agency-in-pune',
    city: 'Pune',
    state: 'Maharashtra',
    regionCode: 'IN-MH',
    geoPosition: '18.5204;73.8567',
    title: 'Premium Travel Agency in Pune | International Tour Packages | TripGuru',
    description:
      'Premium international travel agency in Pune. Custom family tour packages, romantic honeymoons, corporate team getaways, and seamless visa guidance.',
    keywords:
      'travel agency pune, international packages pune, travel agent koregaon park, travel agent kothrud, corporate offsite pune, TripGuru',
    eyebrow: 'Custom Travel Curation in Pune',
    heroTitle: 'Tailored international holidays & corporate team events from Pune.',
    heroDescription:
      'Planning international travel for Pune corporate professionals, families, and couples. Optimized itineraries, comfortable transfers, visa coordination, and dedicated support.',
    trustPoints: [
      'Expert trip mapping for corporate employees & business teams.',
      'Handpicked premium properties focusing on location & style.',
      'Seamless multi-segment flights starting from Pune or Mumbai airports.',
    ],
    nearbyAreas: ['Koregaon Park', 'Kothrud', 'Aundh', 'Hinjawadi', 'Baner', 'Viman Nagar', 'Kalyani Nagar'],
    serviceHeading: 'Designing premium holidays & offsites for Pune corporate clients.',
    faqHeading: 'Frequently Asked Questions in Pune.',
    ctaHeading: 'Ready to build your international itinerary from Pune?',
    faqQuestion: 'Can you coordinate trips starting from Pune but flying out of Mumbai?',
    faqAnswer:
      'Yes. Many Pune travelers fly from Mumbai to access direct international flights. We organize seamless private airport transfers between Pune and Mumbai, along with coordinated flight tickets.',
    destinationAltSuffix: 'from Pune',
  },
  {
    slug: 'ahmedabad',
    path: '/travel-agency-in-ahmedabad',
    city: 'Ahmedabad',
    state: 'Gujarat',
    regionCode: 'IN-GJ',
    geoPosition: '23.0225;72.5714',
    title: 'Premium Travel Agency in Ahmedabad | Custom Family & Corporate Tours | TripGuru',
    description:
      'Top-tier travel agency in Ahmedabad. Customized family tour packages, corporate employee groups, premium honeymoons, and complete visa support.',
    keywords:
      'travel agency ahmedabad, custom tour packages ahmedabad, travel agent satellite, travel agent sg highway, corporate tour packages ahmedabad, TripGuru',
    eyebrow: 'Bespoke Travel Planners in Ahmedabad',
    heroTitle: 'Premium international family holidays & corporate trips from Ahmedabad.',
    heroDescription:
      'Curating customized international tours for Ahmedabad families, business groups, and honeymooners. High-quality guides, curated meals, and seamless visa processing.',
    trustPoints: [
      'Tailormade international packages catering to premium family groups.',
      'Corporate incentive travel, offsite events, and group booking services.',
      'Fully vetted hotels, tours, and transfers with 24/7 support.',
    ],
    nearbyAreas: ['Satellite', 'Bodakdev', 'S.G. Highway', 'Prahlad Nagar', 'Navrangpura', 'C.G. Road', 'Vastrapur'],
    serviceHeading: 'Custom travel planning for Ahmedabad business leaders & families.',
    faqHeading: 'Frequently Asked Questions in Ahmedabad.',
    ctaHeading: 'Ready to discuss your custom travel plans from Ahmedabad?',
    faqQuestion: 'Do you plan group tours with custom food preferences?',
    faqAnswer:
      'Yes. We specialize in planning custom group tours for corporate offsites and families. We coordinate with local properties and restaurants to arrange specific meal preferences (including Indian, vegetarian, and Jain food).',
    destinationAltSuffix: 'from Ahmedabad',
  },
];

export const cityLandingPageMap = Object.fromEntries(
  cityLandingPages.map((page) => [page.path, page]),
) as Record<string, CityLandingPageConfig>;
