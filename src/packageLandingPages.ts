// Landing pages for paid-ad packages. The ad's WhatsApp auto-reply links here
// instead of to a PDF, so each page has to stand on its own: what the trip is,
// what it costs, and one button back into the WhatsApp chat.
//
// Adding a package for a new ad is one more entry in `packageLandingPages` —
// the route, SEO tags, sitemap entry and the WhatsApp link preview
// (scripts/postbuild-sitemap.mjs) are all generated from it.
//
// This file must stay free of imports: the postbuild script bundles it on its
// own to read the config from Node.

export interface PackageDay {
  day: number;
  title: string;
  description: string;
  meals: string;
  tags: string[];
}

export interface PackageStay {
  nights: number;
  city: string;
  category: string;
  details: string[];
}

export interface PackageLandingPageConfig {
  slug: string;
  path: string;
  /** Short name used in analytics and the WhatsApp message. */
  name: string;
  title: string;
  description: string;
  keywords: string;
  eyebrow: string;
  heroTitle: string;
  /** Part of `heroTitle` rendered in gold italics. */
  heroHighlight: string;
  heroDescription: string;
  heroImage: string;
  /** 1200x630 — what WhatsApp shows when the link is pasted into a chat. */
  ogImage: string;
  duration: string;
  route: { city: string; nights: number }[];
  /** Per person, INR. `null` hides the figure and shows "ask on WhatsApp". */
  priceFrom: number | null;
  priceNote: string;
  quickFacts: { label: string; value: string }[];
  gallery: { src: string; alt: string; caption: string }[];
  days: PackageDay[];
  stays: PackageStay[];
  inclusions: string[];
  exclusions: string[];
  goodToKnow: { title: string; text: string }[];
  faqs: { question: string; answer: string }[];
  whatsappMessage: string;
}

const unsplash = (id: string, params: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&q=70&${params}`;

export const packageLandingPages: PackageLandingPageConfig[] = [
  {
    slug: 'phuket-krabi',
    path: '/packages/phuket-krabi',
    name: 'Phuket + Krabi 5N/6D',
    title: 'Phuket & Krabi Tour Package | 5 Nights 6 Days | TripGuru India',
    description:
      'Phuket 3N + Krabi 2N with 4-star hotels, daily breakfast, Phi Phi Island speedboat tour, Krabi 4 Island tour, Phuket city tour and private airport transfers. Plan it with TripGuru on WhatsApp.',
    keywords:
      'phuket krabi tour package, phuket krabi 5 nights 6 days, thailand tour package from india, phi phi island tour, krabi 4 island tour, TripGuru India',
    eyebrow: 'Thailand · 5 Nights / 6 Days',
    heroTitle: 'Phuket & Krabi, planned end to end.',
    heroHighlight: 'Phuket & Krabi',
    heroDescription:
      'Three nights by Patong Beach, two nights in Ao Nang, and the two island days everyone comes to Thailand for — Phi Phi by speedboat and Krabi’s Four Islands by long-tail boat.',
    heroImage: unsplash('1552465011-b4e21bf6e79a', 'w=1600'),
    ogImage: unsplash('1552465011-b4e21bf6e79a', 'w=1200&h=630'),
    duration: '5 Nights / 6 Days',
    route: [
      { city: 'Phuket', nights: 3 },
      { city: 'Krabi', nights: 2 },
    ],
    priceFrom: null,
    priceNote: 'per person on twin sharing · flights extra',
    quickFacts: [
      { label: 'Hotels', value: '4-star, near the beach' },
      { label: 'Meals', value: 'Breakfast daily + 2 lunches' },
      { label: 'Transfers', value: 'Private airport & inter-city' },
      { label: 'Visa', value: 'Visa-free for Indians' },
    ],
    gallery: [
      {
        src: unsplash('1589394815804-964ed0be2eb5', 'w=900'),
        alt: 'Limestone cliffs around the Phi Phi Islands lagoon',
        caption: 'Phi Phi Islands by speedboat',
      },
      {
        src: unsplash('1506665531195-3566af2b4dfa', 'w=900'),
        alt: 'Phi Phi Don bay seen from the viewpoint',
        caption: 'Lunch stop at Phi Phi Don',
      },
      {
        src: unsplash('1552465011-b4e21bf6e79a', 'w=900'),
        alt: 'Long-tail boats at Phra Nang Cave Beach in Krabi',
        caption: 'Krabi Four Islands by long-tail boat',
      },
      {
        src: unsplash('1537956965359-7573183d1f57', 'w=900'),
        alt: 'Aerial view of a turquoise beach cove in Thailand',
        caption: 'Beach time built into every day',
      },
    ],
    days: [
      {
        day: 1,
        title: 'Arrive in Phuket',
        description:
          'Our local coordinator meets you at Phuket Airport and a private vehicle takes you to your hotel near Patong Beach. Check in and keep the evening free — Patong’s beach, night markets and Jungceylon mall are a short walk away.',
        meals: 'No meals',
        tags: ['Private airport transfer'],
      },
      {
        day: 2,
        title: 'Phi Phi Islands by speedboat',
        description:
          'Hotel pickup around 7:30 am for a full day on the water: Monkey Beach, Pileh Cove, Viking Cave and a snorkelling stop, a buffet lunch on Phi Phi Don, then white-sand Khai Island before returning to Phuket by evening.',
        meals: 'Breakfast, Lunch',
        tags: ['Shared speedboat', 'About 10 hours'],
      },
      {
        day: 3,
        title: 'Phuket city tour',
        description:
          'A relaxed half day in a private vehicle: the coast road past Patong, Karon and Kata, the Karon viewpoint over three beaches, Wat Chalong, and the Sino-Portuguese streets of Old Phuket Town. Afternoon and evening are yours.',
        meals: 'Breakfast',
        tags: ['Private vehicle', 'About 5 hours'],
      },
      {
        day: 4,
        title: 'Drive to Krabi',
        description:
          'After breakfast a private vehicle drives you from Phuket to Ao Nang in Krabi, about three hours by road. Check in, then walk down to Ao Nang Beach and the Walking Street for sunset.',
        meals: 'Breakfast',
        tags: ['Private transfer', 'About 3 hours'],
      },
      {
        day: 5,
        title: 'Krabi Four Islands by long-tail boat',
        description:
          'The classic Krabi day: the tidal sandbank at Koh Tup, swimming and snorkelling off Chicken Island, a picnic lunch on Koh Poda’s white sand, and the caves and climbing cliffs of Phra Nang Cave Beach.',
        meals: 'Breakfast, Lunch',
        tags: ['Shared long-tail boat', 'About 7 hours'],
      },
      {
        day: 6,
        title: 'Depart from Krabi',
        description:
          'Breakfast at the hotel, check out, and a private transfer to Krabi Airport for your flight home.',
        meals: 'Breakfast',
        tags: ['Private airport transfer'],
      },
    ],
    stays: [
      {
        nights: 3,
        city: 'Phuket',
        category: '4-star hotel near Patong Beach',
        details: [
          'About 5 minutes’ walk to Patong Beach and Jungceylon mall',
          'Outdoor pool · breakfast included',
          'Indian options at breakfast and Indian restaurants nearby',
        ],
      },
      {
        nights: 2,
        city: 'Krabi',
        category: 'Well-rated hotel in Ao Nang',
        details: [
          'About 10 minutes’ walk to Ao Nang Beach and the Walking Street',
          'Outdoor pool · breakfast included',
          'Indian restaurants within 1 km',
        ],
      },
    ],
    inclusions: [
      '3 nights in Phuket and 2 nights in Krabi',
      'Daily breakfast at both hotels',
      'Phi Phi Islands tour by speedboat, with lunch',
      'Krabi Four Islands tour by long-tail boat, with lunch',
      'Half-day Phuket city tour in a private vehicle',
      'Private transfers: Phuket Airport to hotel, Phuket to Krabi, Krabi hotel to airport',
      'TripGuru support on WhatsApp before and during the trip',
    ],
    exclusions: [
      'International and domestic flights',
      'National park fees — THB 400 per person each for Phi Phi and the Four Islands, paid on the spot',
      'Lunches and dinners other than those mentioned',
      'Refundable hotel deposit, where the hotel asks for one',
      'Travel insurance, tips and personal expenses',
      'GST and TCS as applicable',
    ],
    goodToKnow: [
      {
        title: 'No visa needed',
        text: 'Indian passport holders currently enter Thailand visa-free as tourists. Your passport must be valid for at least 6 months from the travel date.',
      },
      {
        title: 'Digital arrival card',
        text: 'Every traveller has to fill in the Thailand Digital Arrival Card (TDAC) online within 3 days before landing. We send you the link and help you fill it in.',
      },
      {
        title: 'Carry some cash',
        text: 'Immigration can ask to see THB 10,000 per person or THB 20,000 per family, in cash or on a forex card.',
      },
      {
        title: 'Island tours depend on the sea',
        text: 'Boat tours can be rescheduled for weather, and the national park closes Maya Bay on some dates — the tour then spends longer at the other stops.',
      },
    ],
    faqs: [
      {
        question: 'Can I change the hotels or the number of nights?',
        answer:
          'Yes. This is our most-booked plan, not a fixed group tour. Tell us your dates and budget on WhatsApp and we will adjust hotels, nights and activities around them.',
      },
      {
        question: 'Are flights included?',
        answer:
          'No — the package covers everything on the ground. We can book your flights as well, usually into Phuket and back from Krabi, and quote them along with the package.',
      },
      {
        question: 'Is this suitable for families and honeymooners?',
        answer:
          'Both. Families usually keep the plan as it is; for honeymoons we often upgrade to a pool-access room or add a private sunset dinner.',
      },
      {
        question: 'How do I book?',
        answer:
          'Message us on WhatsApp with your travel dates and number of travellers. We confirm availability and the final price, and you pay a deposit to our company account to hold the booking.',
      },
    ],
    whatsappMessage:
      'Hi TripGuru, I saw the Phuket + Krabi 5N/6D package on your website. Please share the best price.\n\nTravel dates: \nTravellers: ',
  },
  {
    slug: 'bali',
    path: '/packages/bali',
    name: 'Bali 6N/7D',
    title: 'Bali Tour Package | 6 Nights 7 Days with Private Pool Villa | TripGuru India',
    description:
      'Kuta 4N + Ubud 2N in a private pool villa. Nusa Penida with Indian lunch, water sports, Uluwatu, Tanah Lot, Ubud and the Bali swing, all with private transfers. From ₹74,999 per person.',
    keywords:
      'bali tour package, bali 6 nights 7 days, bali honeymoon package, bali private pool villa package, nusa penida tour, bali package from india, TripGuru India',
    eyebrow: 'Bali · 6 Nights / 7 Days',
    heroTitle: 'Bali, with a private pool villa in Ubud.',
    heroHighlight: 'Bali',
    heroDescription:
      'Four nights in Kuta for the beaches, water sports and Nusa Penida, then two slow nights in Ubud in your own pool villa — with a private car and driver all the way through.',
    heroImage: unsplash('1544644181-1484b3fdfc62', 'w=1600'),
    ogImage: unsplash('1544644181-1484b3fdfc62', 'w=1200&h=630'),
    duration: '6 Nights / 7 Days',
    route: [
      { city: 'Kuta', nights: 4 },
      { city: 'Ubud', nights: 2 },
    ],
    priceFrom: 74999,
    priceNote: 'per person on twin sharing',
    quickFacts: [
      { label: 'Stay', value: '4-star hotel + private pool villa' },
      { label: 'Meals', value: 'Breakfast daily + Indian lunch' },
      { label: 'Transfers', value: 'Private car with driver' },
      { label: 'Visa', value: 'On arrival for Indians' },
    ],
    gallery: [
      {
        src: unsplash('1573790387438-4da905039392', 'w=900'),
        alt: 'Diamond Beach cliffs on Nusa Penida',
        caption: 'Nusa Penida island day',
      },
      {
        src: unsplash('1518548419970-58e3b4079ab2', 'w=900'),
        alt: 'Tanah Lot temple on its sea rock at sunset',
        caption: 'Tanah Lot at sunset',
      },
      {
        src: unsplash('1555400038-63f5ba517a47', 'w=900'),
        alt: 'Tegalalang rice terraces near Ubud',
        caption: 'Tegalalang rice terraces',
      },
      {
        src: unsplash('1537996194471-e657df975ab4', 'w=900'),
        alt: 'Ulun Danu temple on Lake Beratan',
        caption: 'Ulun Danu lake temple',
      },
    ],
    days: [
      {
        day: 1,
        title: 'Arrive in Bali',
        description:
          'A garland welcome at Ngurah Rai Airport and a private transfer to your hotel in Kuta. The rest of the day is free to settle in and walk down to the beach.',
        meals: 'No meals',
        tags: ['Private airport transfer'],
      },
      {
        day: 2,
        title: 'Water sports and Uluwatu Temple',
        description:
          'A morning of water sports — banana boat, jet ski and parasailing — followed by the clifftop Uluwatu Temple, best seen as the sun goes down over the Indian Ocean.',
        meals: 'Breakfast',
        tags: ['Private vehicle', 'Full day'],
      },
      {
        day: 3,
        title: 'Nusa Penida island tour',
        description:
          'Cross by boat to Nusa Penida and spend the day along its coastline of cliffs and coves, with an Indian lunch included on the island.',
        meals: 'Breakfast, Indian Lunch',
        tags: ['Full day', 'Indian lunch'],
      },
      {
        day: 4,
        title: 'Ulun Danu, Tanah Lot and Finns Beach Club',
        description:
          'Up into the hills for Ulun Danu, the temple on the lake, then down to the coast for Tanah Lot on its rock in the sea. The day ends at Finns Beach Club — entry is on your own, so you can decide on the day.',
        meals: 'Breakfast',
        tags: ['Private vehicle', 'Full day'],
      },
      {
        day: 5,
        title: 'Ubud tour, rice terraces and the Bali swing',
        description:
          'Check out of Kuta and tour your way north: Celuk’s silver workshops, a coffee plantation, the Tegalalang rice terraces and the swing at My Swing. The day finishes at your private pool villa in Ubud.',
        meals: 'Breakfast',
        tags: ['Private vehicle', 'Hotel change'],
      },
      {
        day: 6,
        title: 'A day at leisure in Ubud',
        description:
          'Nothing planned. Stay in the villa and use the pool, or explore Ubud’s cafés, market and Monkey Forest at your own pace.',
        meals: 'Breakfast',
        tags: ['Free day'],
      },
      {
        day: 7,
        title: 'Depart from Bali',
        description: 'Breakfast at the villa and a private transfer to the airport in time for your flight.',
        meals: 'Breakfast',
        tags: ['Private airport transfer'],
      },
    ],
    stays: [
      {
        nights: 4,
        city: 'Kuta',
        category: '4-star hotel in Kuta',
        details: ['Superior room', 'Breakfast included', 'Close to the beach, shopping and restaurants'],
      },
      {
        nights: 2,
        city: 'Ubud',
        category: 'One-bedroom private pool villa',
        details: ['Your own pool', 'Breakfast included', 'Quiet setting near Ubud'],
      },
    ],
    inclusions: [
      '4 nights in a 4-star hotel in Kuta',
      '2 nights in a one-bedroom private pool villa in Ubud',
      'Daily breakfast',
      'Nusa Penida island tour with Indian lunch',
      'Water sports: banana boat, jet ski and parasailing',
      'Uluwatu, Ulun Danu and Tanah Lot temple visits',
      'Ubud tour with coffee plantation, Tegalalang rice terraces and the swing at My Swing',
      'Private car with driver for all transfers and sightseeing',
    ],
    exclusions: [
      'Visa on arrival and the Bali tourist levy, paid at the airport',
      'Finns Beach Club entry',
      'Lunches and dinners other than those mentioned',
      'Travel insurance, tips and personal expenses',
      'GST and TCS as applicable',
    ],
    goodToKnow: [
      {
        title: 'Visa on arrival',
        text: 'Indian passport holders get a 30-day visa on arrival in Bali. It can also be applied for online before you fly, which saves the queue. Your passport needs 6 months’ validity.',
      },
      {
        title: 'Hotel check-in is 3 pm',
        text: 'If your flight lands early, tell us — we will request an early check-in or plan the first day around it.',
      },
      {
        title: 'Prices move with dates',
        text: 'The price shown is a starting price. Peak dates, long weekends and the year-end cost more; we confirm the exact figure for your dates on WhatsApp.',
      },
      {
        title: 'Island tours depend on the sea',
        text: 'The Nusa Penida crossing and water sports can be rescheduled within your trip if the weather is rough.',
      },
    ],
    faqs: [
      {
        question: 'Can I change the hotels or the number of nights?',
        answer:
          'Yes. This is our most-booked plan, not a fixed group tour. Tell us your dates and budget on WhatsApp and we will adjust hotels, nights and activities around them.',
      },
      {
        question: 'Is this a good honeymoon plan?',
        answer:
          'It is what most of our honeymoon couples book. The private pool villa is already included; we can add a floating breakfast, a candle-light dinner or a couple’s spa session.',
      },
      {
        question: 'Will we get Indian food?',
        answer:
          'An Indian lunch is included on the Nusa Penida day, and Kuta and Ubud both have plenty of Indian and vegetarian restaurants. Your driver knows them well.',
      },
      {
        question: 'How do I book?',
        answer:
          'Message us on WhatsApp with your travel dates and number of travellers. We confirm availability and the final price, and you pay a deposit to our company account to hold the booking.',
      },
    ],
    whatsappMessage:
      'Hi TripGuru, I saw the Bali 6N/7D package on your website. Please share the best price.\n\nTravel dates: \nTravellers: ',
  },
];

export const packageLandingPageMap = Object.fromEntries(
  packageLandingPages.map((page) => [page.path, page]),
) as Record<string, PackageLandingPageConfig>;
