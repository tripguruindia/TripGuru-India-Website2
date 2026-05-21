import { Destination } from './types';

export const DESTINATIONS: Destination[] = [
  {
    id: 'australia',
    slug: 'australia',
    name: 'Australia',
    region: 'Oceania',
    hook: 'Where the wild Outback meets the sophisticated pulse of the coast.',
    description: 'A continent of contrasts, Australia offers everything from the ancient silence of the Red Centre to the vibrant energy of Sydney Harbour. Experience the world\'s most pristine reefs and the most secluded luxury lodges.',
    highlights: [
      'Private sunset yacht cruise in Sydney Harbour',
      'Helicopter excursion to the Blue Mountains',
      'Exclusive snorkeling at the Heart Reef',
      'Private "Sounds of Silence" desert dinner'
    ],
    image: 'https://res.cloudinary.com/dnty2fhxp/image/upload/v1774102563/Australia_mixitm.avif',
    accent: 'Azure',
    usp: 'The Ultimate Coastal Luxury',
    vibe: 'Sophisticated adventure meets pristine nature.',
    mustDo: 'Dive the Great Barrier Reef, walk the Sydney Harbour Bridge, and witness the sunset over Uluru.',
    whyNow: 'Limited-season private reef tours now open.',
    itinerary: [
      { day: 1, title: 'Arrival in Sydney', activity: 'Private transfer to your harbor-view suite; evening luxury yacht cruise with champagne at sunset.' },
      { day: 2, title: 'Sydney Icons', activity: 'VIP backstage tour of the Opera House and a private guided walk through the historic Rocks district.' },
      { day: 3, title: 'Blue Mountains', activity: 'Helicopter excursion to the Blue Mountains for a secluded gourmet picnic and wildlife spotting.' },
      { day: 4, title: 'The Great Barrier Reef', activity: 'Fly to Hamilton Island; afternoon private snorkeling tour to explore the vibrant Heart Reef.' },
      { day: 5, title: 'Whitsunday Sailing', activity: 'Full-day private catamaran charter to Whitehaven Beach with a chef-prepared seafood lunch.' },
      { day: 6, title: 'Daintree Rainforest', activity: 'Private guided trek through the world\'s oldest rainforest and a crocodile-spotting river cruise.' },
      { day: 7, title: 'Melbourne Culture', activity: 'Fly to Melbourne; evening "laneway" food discovery tour with a local culinary expert.' },
      { day: 8, title: 'Great Ocean Road', activity: 'Private chauffeured tour of the 12 Apostles with a stop at a boutique cool-climate winery.' },
      { day: 9, title: 'Uluru Sunset', activity: 'Fly to the Red Centre; private sunset viewing of Uluru with a "Sounds of Silence" desert dinner.' },
      { day: 10, title: 'Kata Tjuta & Farewell', activity: 'Sunrise walk through the Valley of the Winds at Kata Tjuta; afternoon private transfer to airport.' }
    ]
  },
  {
    id: 'austria',
    slug: 'austria',
    name: 'Austria',
    region: 'Europe',
    hook: 'Imperial grandeur and Alpine serenity in perfect harmony.',
    description: 'From the baroque elegance of Vienna to the mirror-like waters of Hallstatt, Austria is a symphony of high culture and natural beauty. Walk in the footsteps of emperors and composers in the heart of Europe.',
    highlights: [
      'Private concert at Schönbrunn Palace',
      'VIP access to Vienna\'s private opera galas',
      'Exclusive boat cruise on Lake Hallstatt',
      'Private pastry masterclass at a historic café'
    ],
    image: 'https://res.cloudinary.com/dnty2fhxp/image/upload/v1774106404/Austria_urxzd8.avif',
    accent: 'Gold',
    usp: 'Imperial Elegance & Alpine Bliss',
    vibe: 'A timeless blend of high culture and mountain serenity.',
    mustDo: 'Attend a private concert at Schönbrunn Palace, cruise Lake Hallstatt, and experience the Salzburg festival.',
    whyNow: 'Exclusive access to Vienna’s private opera galas.',
    itinerary: [
      { day: 1, title: 'Imperial Vienna', activity: 'Private tour of Schönbrunn Palace and an evening classical concert at the Musikverein.' },
      { day: 2, title: 'Vienna Coffee Culture', activity: 'Morning guided walk of the Ringstrasse followed by a private pastry masterclass at a historic café.' },
      { day: 3, title: 'Wachau Valley', activity: 'Private boat cruise on the Danube with wine tastings at boutique vineyards in Dürnstein.' },
      { day: 4, title: 'Salzburg Heritage', activity: 'First-class train to Salzburg; evening private tour of the Hohensalzburg Fortress.' },
      { day: 5, title: 'The Sound of Music', activity: 'Private limousine tour of the lake district and filming locations with a gourmet lakeside lunch.' },
      { day: 6, title: 'Hallstatt Magic', activity: 'Early morning private boat tour of Lake Hallstatt before the crowds arrive; visit to the Skywalk.' }
    ]
  },
  {
    id: 'azerbaijan',
    slug: 'azerbaijan',
    name: 'Azerbaijan',
    region: 'Middle East',
    hook: 'The Land of Fire, where futuristic skylines meet ancient Silk Road secrets.',
    description: 'Experience the dramatic contrast of Baku\'s ultra-modern architecture against the backdrop of the Caspian Sea and ancient Zoroastrian temples. A destination where East and West converge in luxury.',
    highlights: [
      'Private tour of the iconic Flame Towers',
      'Exclusive exploration of the Old City (Icherisheher)',
      'Private visit to the mud volcanoes of Gobustan',
      'Traditional tea ceremony in a historic Karvansaray'
    ],
    image: 'https://res.cloudinary.com/dnty2fhxp/image/upload/v1774087827/Azerbaijan_qzqqhe.avif',
    accent: 'Emerald',
    usp: 'The New Silk Road Luxury',
    vibe: 'Ultra-modern skylines rooted in ancient fire-worship traditions.',
    mustDo: 'Witness the Flame Towers light show, explore the mud volcanoes of Gobustan, and wander the Old City.',
    whyNow: 'Visa-free entry for Indian travelers is a game-changer.',
    itinerary: [
      { day: 1, title: 'Baku Modernity', activity: 'Private tour of the Flame Towers and the Heydar Aliyev Center; evening walk along the Caspian promenade.' },
      { day: 2, title: 'Old City Secrets', activity: 'Guided exploration of Icherisheher (Old City) and the Maiden Tower; traditional tea ceremony.' },
      { day: 3, title: 'Gobustan & Fire', activity: 'Visit the mud volcanoes and ancient rock carvings of Gobustan, followed by the Ateshgah Fire Temple.' },
      { day: 4, title: 'Sheki Heritage', activity: 'Private transfer to Sheki; tour of the ornate Sheki Khans\' Palace and the historic Karvansaray.' }
    ]
  },
  {
    id: 'bhutan',
    slug: 'bhutan',
    name: 'Bhutan',
    region: 'Asia',
    hook: 'The Last Shangri-La, where spirituality and happiness are the only measures.',
    description: 'Journey into the heart of the Himalayas, where ancient monasteries cling to cliffs and the air is filled with prayer flags. Experience a kingdom that prioritizes Gross National Happiness above all else.',
    highlights: [
      'Private monk blessing at a local monastery',
      'Exclusive guided trek to the Tiger\'s Nest',
      'Traditional farmhouse dinner with a local family',
      'Private archery lesson—the national sport'
    ],
    image: 'https://res.cloudinary.com/dnty2fhxp/image/upload/v1774087827/Bhutan_jg68b1.avif',
    accent: 'Teal',
    usp: 'The Kingdom of Happiness',
    vibe: 'Spiritual awakening in the world’s only carbon-negative country.',
    mustDo: 'Hike to the Tiger’s Nest Monastery, receive a private monk blessing, and explore the Punakha Dzong.',
    whyNow: 'Exclusive boutique lodges now offering private monk blessings.',
    itinerary: [
      { day: 1, title: 'Thimphu Arrival', activity: 'Private transfer to the capital; evening visit to the Tashichho Dzong and the Giant Buddha.' },
      { day: 2, title: 'Thimphu Culture', activity: 'Morning private archery lesson (national sport) and a visit to the traditional medicine institute.' },
      { day: 3, title: 'Punakha Valley', activity: 'Drive over Dochula Pass; visit the stunning Punakha Dzong and the "Fertility Temple".' },
      { day: 4, title: 'Phobjikha Valley', activity: 'Private excursion to the glacial valley of Phobjikha; visit the Gangtey Monastery and spot cranes.' },
      { day: 5, title: 'Paro Heritage', activity: 'Return to Paro; private tour of the National Museum and a traditional farmhouse dinner.' },
      { day: 6, title: 'Tiger\'s Nest Hike', activity: 'Private guided trek to the iconic Taktsang Monastery; evening hot stone bath for recovery.' },
      { day: 7, title: 'Spiritual Farewell', activity: 'Morning meditation at a local monastery followed by a private transfer to the airport.' }
    ]
  },
  {
    id: 'budapest',
    slug: 'budapest',
    name: 'Budapest',
    region: 'Europe',
    hook: 'The Pearl of the Danube, where thermal luxury meets architectural grandeur.',
    description: 'Discover a city of two halves, separated by the majestic Danube. From the historic thermal baths to the vibrant ruin bars, Budapest offers a unique blend of old-world charm and modern energy.',
    highlights: [
      'Private sunset cruise on the Danube',
      'VIP access to the Széchenyi Thermal Baths',
      'Curated "Ruin Bar" crawl with a local expert',
      'Private tour of the historic Castle District'
    ],
    image: 'https://res.cloudinary.com/dnty2fhxp/image/upload/v1774106404/Budapest_nujaci.avif',
    accent: 'Ruby',
    usp: 'Grandeur on the Danube',
    vibe: 'Old-world charm meets a vibrant, modern nightlife scene.',
    mustDo: 'Soak in the Széchenyi Thermal Baths, take a private Danube river cruise, and explore Buda Castle.',
    whyNow: 'River-view suites at historic palaces are currently trending.',
    itinerary: [
      { day: 1, title: 'Buda Grandeur', activity: 'Private tour of the Castle District and Fisherman\'s Bastion; evening Danube river cruise.' },
      { day: 2, title: 'Pest Exploration', activity: 'Guided walk of the Parliament and St. Stephen\'s Basilica; afternoon at the Széchenyi Thermal Baths.' },
      { day: 3, title: 'Jewish Quarter & Ruin Bars', activity: 'Private tour of the Great Synagogue followed by a curated "Ruin Bar" crawl with a local guide.' }
    ]
  },
  {
    id: 'cambodia',
    slug: 'cambodia',
    name: 'Cambodia',
    region: 'Asia',
    hook: 'Ancient wonders and modern luxury in the heart of Southeast Asia.',
    description: 'From the mystical sunrise over Angkor Wat to the pristine white sands of Koh Rong, Cambodia is a land of profound history and breathtaking natural beauty. Experience the soul of the Khmer Empire in absolute comfort.',
    highlights: [
      'Private champagne sunrise at Angkor Wat',
      'Exclusive boat tour of Tonle Sap floating villages',
      'Private speedboat to the secluded Koh Rong',
      'VIP tour of the Royal Palace in Phnom Penh'
    ],
    image: 'https://res.cloudinary.com/dnty2fhxp/image/upload/v1774102563/Cambodia_oyyy5n.avif',
    accent: 'Gold',
    usp: 'Ancient Wonders, Modern Comfort',
    vibe: 'Mystical temple ruins paired with world-class luxury retreats.',
    mustDo: 'Watch the sunrise over Angkor Wat, explore Ta Prohm, and visit the Royal Palace in Phnom Penh.',
    whyNow: 'New direct flights making the Angkor circuit more accessible.',
    itinerary: [
      { day: 1, title: 'Angkor Wat Sunrise', activity: 'Private sunrise tour of Angkor Wat followed by a champagne breakfast in the jungle.' },
      { day: 2, title: 'Hidden Temples', activity: 'Explore the overgrown ruins of Ta Prohm and the intricate carvings of Banteay Srei.' },
      { day: 3, title: 'Tonle Sap Lake', activity: 'Private boat tour of the floating villages and a sunset cocktail cruise on the lake.' },
      { day: 4, title: 'Phnom Penh Arrival', activity: 'Fly to the capital; evening private cyclo tour of the riverfront and colonial district.' },
      { day: 5, title: 'Royal Heritage', activity: 'Private tour of the Royal Palace and Silver Pagoda; evening farewell Khmer feast.' },
      { day: 6, title: 'Koh Rong Bliss', activity: 'Fly to Sihanoukville; private speedboat to Koh Rong for a day of white-sand beach relaxation.' }
    ]
  },
  {
    id: 'china',
    slug: 'china',
    name: 'China',
    region: 'Asia',
    hook: 'A breathtaking journey from imperial history to futuristic megacities.',
    description: 'China is a land of immense scale, where the Great Wall winds through ancient mountains and neon skylines define the future. Experience the world\'s oldest continuous civilization in unparalleled luxury.',
    highlights: [
      'Private sunset walk on the Great Wall',
      'VIP tour of the Terracotta Army in Xi\'an',
      'Exclusive visit to the Giant Panda Research Base',
      'Private Huangpu River cruise in Shanghai'
    ],
    image: 'https://res.cloudinary.com/dnty2fhxp/image/upload/v1774102564/China_ia0kj1.avif',
    accent: 'Ruby',
    usp: 'The Dragon Awakens',
    vibe: 'A breathtaking scale of history and hyper-modern innovation.',
    mustDo: 'Walk the Great Wall at Mutianyu, explore the Forbidden City, and witness the Shanghai skyline.',
    whyNow: 'Business & leisure fusion trips are at an all-time high.',
    itinerary: [
      { day: 1, title: 'Beijing Imperial', activity: 'Private tour of the Forbidden City and the Temple of Heaven; evening Peking Duck feast.' },
      { day: 2, title: 'The Great Wall', activity: 'Private excursion to the Mutianyu section of the Great Wall with a cable car ride and picnic.' },
      { day: 3, title: 'Xi\'an Arrival', activity: 'First-class train to Xi\'an; evening private tour of the ancient City Wall by bicycle.' },
      { day: 4, title: 'Terracotta Warriors', activity: 'VIP tour of the Terracotta Army site and a private dumpling-making class.' },
      { day: 5, title: 'Chengdu Pandas', activity: 'Fly to Chengdu; private visit to the Giant Panda Research Base and a Sichuan hotpot dinner.' },
      { day: 6, title: 'Guilin Landscapes', activity: 'Fly to Guilin; private bamboo raft cruise on the Li River amidst karst mountains.' },
      { day: 7, title: 'Shanghai Modernity', activity: 'Fly to Shanghai; evening private cruise on the Huangpu River to see the Bund skyline.' },
      { day: 8, title: 'Old Shanghai', activity: 'Guided walk through the French Concession and Yu Garden; afternoon at leisure for shopping.' },
      { day: 9, title: 'Suzhou Gardens', activity: 'Private day trip to the "Venice of the East"; visit the Humble Administrator\'s Garden.' },
      { day: 10, title: 'Bund Farewell', activity: 'Morning at leisure on the Bund; private transfer to Pudong Airport for departure.' }
    ]
  },
  {
    id: 'croatia',
    slug: 'croatia',
    name: 'Croatia',
    region: 'Europe',
    hook: 'The Adriatic\'s sun-drenched secret, where medieval walls meet crystal waters.',
    description: 'Sail between a thousand islands, walk the ancient walls of Dubrovnik, and discover the turquoise waterfalls of Plitvice. Croatia is a Mediterranean dream of history, nature, and coastal elegance.',
    highlights: [
      'Private yacht charter to the Elafiti Islands',
      'Exclusive sunset walk on Dubrovnik\'s walls',
      'Private speedboat to the magical Blue Cave',
      'VIP tour of Diocletian\'s Palace in Split'
    ],
    image: 'https://res.cloudinary.com/dnty2fhxp/image/upload/v1774106404/CROATIA_umh9zo.avif',
    accent: 'Azure',
    usp: 'Adriatic’s Sun-Drenched Secret',
    vibe: 'Crystal waters, medieval walls, and a Mediterranean soul.',
    mustDo: 'Walk the ancient walls of Dubrovnik, sail the Elafiti Islands, and explore Plitvice Lakes.',
    whyNow: 'Private yacht charters are the best way to avoid the crowds.',
    itinerary: [
      { day: 1, title: 'Dubrovnik Arrival', activity: 'Private transfer to your cliffside hotel; evening sunset walk on the ancient city walls.' },
      { day: 2, title: 'Adriatic Sailing', activity: 'Full-day private yacht charter to the Elafiti Islands with a secluded bay lunch.' },
      { day: 3, title: 'Hvar Island', activity: 'Private speedboat to Hvar; explore the fortress and enjoy the vibrant harbor scene.' },
      { day: 4, title: 'Vis & Blue Cave', activity: 'Private boat excursion to the island of Vis and the magical Blue Cave on Biševo.' },
      { day: 5, title: 'Split Heritage', activity: 'Private tour of Diocletian\'s Palace and the historic Riva promenade in Split.' },
      { day: 6, title: 'Krka Waterfalls', activity: 'Private guided tour of the Krka National Park waterfalls and a swim in the lower pools.' },
      { day: 7, title: 'Plitvice Lakes', activity: 'Private guided tour of the turquoise waterfalls and wooden walkways of Plitvice.' },
      { day: 8, title: 'Zagreb Culture', activity: 'Transfer to the capital; evening private tour of the Upper Town and the Museum of Broken Relationships.' }
    ]
  },
  {
    id: 'denmark',
    slug: 'denmark',
    name: 'Denmark',
    region: 'Europe',
    hook: 'The capital of cool, where effortless design meets "Hygge" comfort.',
    description: 'Copenhagen is a city of solar-powered boats, Michelin-starred dining, and fairy-tale castles. Experience the world\'s happiest nation through its impeccable design and coastal charm.',
    highlights: [
      'Private canal tour in a solar-powered boat',
      'VIP tour of Rosenborg and Amalienborg Palaces',
      'Exclusive day trip to Kronborg (Hamlet\'s Castle)',
      'Private evening at the historic Tivoli Gardens'
    ],
    image: 'https://res.cloudinary.com/dnty2fhxp/image/upload/v1774106403/Denmark_lgpht9.avif',
    accent: 'Teal',
    usp: 'The Capital of Cool',
    vibe: 'Effortless design, Michelin dining, and "Hygge" comfort.',
    mustDo: 'Explore Nyhavn harbor, visit Tivoli Gardens, and discover the coastal castles.',
    whyNow: 'Summer festivals in Copenhagen are world-renowned.',
    itinerary: [
      { day: 1, title: 'Copenhagen Design', activity: 'Private canal tour in a solar-powered boat followed by a visit to the Nyhavn district.' },
      { day: 2, title: 'Royal Heritage', activity: 'VIP tour of Rosenborg Castle and the Amalienborg Palace; evening at Tivoli Gardens.' },
      { day: 3, title: 'North Zealand Castles', activity: 'Private day trip to Kronborg (Hamlet\'s Castle) and the stunning Louisiana Museum of Modern Art.' }
    ]
  },
  {
    id: 'dubai',
    slug: 'dubai',
    name: 'Dubai',
    region: 'Middle East',
    hook: 'The City of Gold, where the impossible becomes reality every day.',
    description: 'From the world\'s tallest building to ultra-luxury desert retreats, Dubai is a playground of innovation and opulence. Experience the pinnacle of modern luxury in the heart of the Arabian desert.',
    highlights: [
      'VIP access to the Burj Khalifa Sky Lounge',
      'Private luxury desert safari with dune dinner',
      'Exclusive yacht cruise around the Palm Jumeirah',
      'Personal shopping experience at the Dubai Mall'
    ],
    image: 'https://res.cloudinary.com/dnty2fhxp/image/upload/v1774087826/Dubai_ffozrd.avif',
    accent: 'Gold',
    usp: 'The City of Gold',
    vibe: 'Where the impossible becomes reality every single day.',
    mustDo: 'Experience the Burj Khalifa’s 148th floor, take a luxury desert safari, and explore Old Dubai.',
    whyNow: 'New ultra-luxury desert resorts offering unmatched privacy.',
    itinerary: [
      { day: 1, title: 'Modern Dubai', activity: 'VIP access to the Burj Khalifa Sky Lounge and a private yacht cruise around the Palm.' },
      { day: 2, title: 'Desert Adventure', activity: 'Private luxury desert safari with a sunset dune dinner and traditional entertainment.' },
      { day: 3, title: 'Old Dubai Heritage', activity: 'Guided walk through the Al Fahidi district and a private abra ride across the Creek.' },
      { day: 4, title: 'Leisure & Shopping', activity: 'Morning at leisure; afternoon private personal shopping experience at the Dubai Mall.' }
    ]
  },
  {
    id: 'egypt',
    slug: 'egypt',
    name: 'Egypt',
    region: 'Africa',
    hook: 'Timeless wonders of the Nile, where ancient history defies imagination.',
    description: 'Unveil the mysteries of the Pyramids, cruise the Nile on a private Dahabiya, and explore the Valley of the Kings. Egypt is a journey back in time to the cradle of civilization.',
    highlights: [
      'Private sunrise tour of the Great Pyramids',
      'Exclusive Nile cruise on a private Dahabiya',
      'VIP tour of the Grand Egyptian Museum',
      'Private flight to the majestic Abu Simbel'
    ],
    image: 'https://res.cloudinary.com/dnty2fhxp/image/upload/v1774102563/Egypt_vzelpw.avif',
    accent: 'Gold',
    usp: 'Timeless Wonders of the Nile',
    vibe: 'Ancient history on a scale that defies imagination.',
    mustDo: 'Visit the Great Pyramids of Giza, cruise the Nile on a private Dahabiya, and explore the Valley of the Kings.',
    whyNow: 'Grand Egyptian Museum opening soon—be among the first.',
    itinerary: [
      { day: 1, title: 'Cairo Arrival', activity: 'Private transfer to your Nile-view suite; evening welcome dinner at a historic palace.' },
      { day: 2, title: 'Giza Pyramids', activity: 'Private sunrise tour of the Great Pyramids and Sphinx; afternoon visit to the Grand Egyptian Museum.' },
      { day: 3, title: 'Alexandria Day Trip', activity: 'Private excursion to the Mediterranean coast; visit the Library of Alexandria and Qaitbay Citadel.' },
      { day: 4, title: 'Luxor Heritage', activity: 'Fly to Luxor; private tour of the Valley of the Kings and the stunning Temple of Hatshepsut.' },
      { day: 5, title: 'Karnak & Luxor Temples', activity: 'Morning private tour of Karnak Temple; evening visit to Luxor Temple under the stars.' },
      { day: 6, title: 'Nile Sailing', activity: 'Board a private Dahabiya for a serene cruise; visit the riverside temples of Edfu and Kom Ombo.' },
      { day: 7, title: 'Aswan Wonders', activity: 'Arrive in Aswan; private tour of Philae Temple and a sunset felucca ride around Elephantine Island.' },
      { day: 8, title: 'Abu Simbel', activity: 'Private flight to the majestic temples of Abu Simbel; evening farewell dinner in Aswan.' },
      { day: 9, title: 'Red Sea Relaxation', activity: 'Fly to Hurghada; private transfer to a luxury beach resort; afternoon at leisure for snorkeling.' },
      { day: 10, title: 'Red Sea Farewell', activity: 'Morning private boat trip to Giftun Island; evening farewell seafood feast by the sea.' }
    ]
  },
  {
    id: 'finland',
    slug: 'finland',
    name: 'Finland',
    region: 'Europe',
    hook: 'The Arctic\'s magical frontier, where the Northern Lights dance over pristine lakes.',
    description: 'Experience the world\'s happiest nation through its glass igloos, husky safaris, and the magic of Lapland. Finland is a winter wonderland of serene nature and Arctic adventure.',
    highlights: [
      'Overnight stay in a luxury glass igloo',
      'Private Northern Lights hunting safari',
      'Exclusive husky sledding through Arctic forests',
      'Private meeting with Santa in Rovaniemi'
    ],
    image: 'https://res.cloudinary.com/dnty2fhxp/image/upload/v1774106403/FINLAND_ulzel5.avif',
    accent: 'Azure',
    usp: 'The Arctic’s Magical Frontier',
    vibe: 'Pristine wilderness and the world’s happiest people.',
    mustDo: 'Sleep in a glass igloo and hunt for the Northern Lights in Lapland.',
    whyNow: 'Glass igloo stays are booking up 12 months in advance.',
    itinerary: [
      { day: 1, title: 'Helsinki Vibes', activity: 'Private tour of the Design District and the Temppeliaukio (Rock) Church; evening sauna experience.' },
      { day: 2, title: 'Lapland Arrival', activity: 'Fly to Rovaniemi; private transfer to your glass igloo; evening Northern Lights hunting.' },
      { day: 3, title: 'Arctic Adventure', activity: 'Private husky sledding safari through the snow-covered forest; evening reindeer farm visit.' },
      { day: 4, title: 'Santa Claus Village', activity: 'Cross the Arctic Circle; private meeting with Santa and a festive lunch at a traditional kota.' },
      { day: 5, title: 'Snowmobile Safari', activity: 'Private snowmobile tour to a frozen lake for ice fishing; evening farewell Arctic feast.' }
    ]
  },
  {
    id: 'france',
    slug: 'france',
    name: 'France',
    region: 'Europe',
    hook: 'The art of living, from romantic Parisian streets to the sun-drenched Riviera.',
    description: 'Indulge in the world\'s finest gastronomy, explore the grandeur of Versailles, and relax in the glamour of Saint-Tropez. France is a celebration of romance, culture, and unparalleled elegance.',
    highlights: [
      'VIP after-hours tour of the Louvre',
      'Exclusive access to the King\'s private apartments at Versailles',
      'Private yacht charter along the French Riviera',
      'Gourmet picnic in the Loire Valley châteaux'
    ],
    image: 'https://res.cloudinary.com/dnty2fhxp/image/upload/v1774106404/France_xnbqu1.avif',
    accent: 'Ruby',
    usp: 'The Art of Living (Art de Vivre)',
    vibe: 'Romance, gastronomy, and unparalleled cultural depth.',
    mustDo: 'Take a private after-hours tour of the Louvre and explore the Palace of Versailles.',
    whyNow: 'Exclusive private tours of the Louvre after hours.',
    itinerary: [
      { day: 1, title: 'Parisian Elegance', activity: 'Private transfer to your hotel near the Louvre; evening private cruise on the Seine.' },
      { day: 2, title: 'Art & History', activity: 'VIP after-hours tour of the Louvre or Musée d\'Orsay; afternoon guided walk of Montmartre.' },
      { day: 3, title: 'Versailles Grandeur', activity: 'Private excursion to the Palace of Versailles with exclusive access to the King\'s private apartments.' },
      { day: 4, title: 'Loire Valley Châteaux', activity: 'Private day trip to the Loire Valley; visit Chenonceau and Chambord with a gourmet lunch.' },
      { day: 5, title: 'French Riviera', activity: 'Fly to Nice; private transfer to your seaside villa; evening walk on the Promenade des Anglais.' },
      { day: 6, title: 'Monaco & Eze', activity: 'Private limousine tour of Monaco and the medieval village of Eze with a gourmet lunch.' },
      { day: 7, title: 'Provence Landscapes', activity: 'Private day trip to the lavender fields of Valensole (seasonal) and the Gorges du Verdon.' },
      { day: 8, title: 'Cannes & Antibes', activity: 'Private boat tour along the coast; visit the Picasso Museum in Antibes; evening farewell dinner.' },
      { day: 9, title: 'Saint-Tropez Glamour', activity: 'Private yacht charter to Saint-Tropez; explore the harbor and enjoy a beach club afternoon.' },
      { day: 10, title: 'Riviera Farewell', activity: 'Morning at leisure in Nice; private transfer to the airport for your departure.' }
    ]
  },
  {
    id: 'georgia',
    slug: 'georgia',
    name: 'Georgia',
    region: 'Asia',
    hook: 'The birthplace of wine, nestled in the majestic Caucasus mountains.',
    description: 'Discover ancient wine traditions, legendary mountain hospitality, and the stunning peaks of Kazbegi. Georgia is a hidden gem where history and nature converge in the heart of the Caucasus.',
    highlights: [
      'Private wine tasting in ancient qvevri cellars',
      'Exclusive 4x4 trek to Gergeti Trinity Church',
      'Private Khinkali and Khachapuri making class',
      'Guided tour of the historic Tbilisi Old Town'
    ],
    image: 'https://res.cloudinary.com/dnty2fhxp/image/upload/v1774087827/Georgia_l2btzs.avif',
    accent: 'Gold',
    usp: "Caucasus’ Hidden Gem",
    vibe: 'Ancient wine culture and legendary mountain hospitality.',
    mustDo: 'Taste ancient wines in Kakheti and visit the Gergeti Trinity Church in Kazbegi.',
    whyNow: 'Top-tier luxury hotels opening in the Kazbegi mountains.',
    itinerary: [
      { day: 1, title: 'Tbilisi Old Town', activity: 'Private walking tour of the historic district and Narikala Fortress; evening sulfur bath experience.' },
      { day: 2, title: 'Wine Heritage', activity: 'Full-day private tour of the Kakheti wine region with tastings at ancient qvevri cellars.' },
      { day: 3, title: 'Mtskheta & Uplistsikhe', activity: 'Visit the ancient capital Mtskheta and the cave city of Uplistsikhe with a private guide.' },
      { day: 4, title: 'Kazbegi Mountains', activity: 'Drive the Georgian Military Highway; private 4x4 trek to the Gergeti Trinity Church.' },
      { day: 5, title: 'Culinary Tbilisi', activity: 'Private Khinkali and Khachapuri making class; afternoon at leisure for boutique shopping.' }
    ]
  },
  {
    id: 'greece',
    slug: 'greece',
    name: 'Greece',
    region: 'Europe',
    hook: 'The cradle of civilization, where whitewashed islands meet the deep blue Aegean.',
    description: 'Wander through ancient ruins in Athens, watch the sunset in Oia, and sail the pristine waters of the Cyclades. Greece is a timeless Mediterranean dream of history and island magic.',
    highlights: [
      'Private sunset catamaran cruise in Santorini',
      'VIP tour of the Acropolis and Parthenon',
      'Exclusive boat excursion to Delos and Rhenia',
      'Private villa stay with caldera views'
    ],
    image: 'https://res.cloudinary.com/dnty2fhxp/image/upload/v1774102564/Greece_u1jtfa.avif',
    accent: 'Teal',
    usp: 'Cradle of Civilization',
    vibe: 'Whitewashed islands and the deep blue of the Aegean.',
    mustDo: 'Watch the sunset in Oia, Santorini and explore the Acropolis in Athens.',
    whyNow: 'Private villa stays in Santorini are the ultimate escape.',
    itinerary: [
      { day: 1, title: 'Athens Heritage', activity: 'Private tour of the Acropolis and the Parthenon; evening walk through the historic Plaka district.' },
      { day: 2, title: 'Delphi Oracle', activity: 'Private day trip to the ancient sanctuary of Delphi; visit the Temple of Apollo and the museum.' },
      { day: 3, title: 'Santorini Arrival', activity: 'Fly to Santorini; private transfer to your caldera-view suite; evening sunset dinner in Oia.' },
      { day: 4, title: 'Caldera Sailing', activity: 'Full-day private catamaran cruise with snorkeling, volcano visits, and a sunset seafood lunch.' },
      { day: 5, title: 'Mykonos Glamour', activity: 'Private ferry to Mykonos; evening private tour of the windmills and Little Venice.' },
      { day: 6, title: 'Delos & Rhenia', activity: 'Private boat excursion to the sacred island of Delos and the pristine beaches of Rhenia.' },
      { day: 7, title: 'Crete Discovery', activity: 'Fly to Crete; private tour of the Palace of Knossos and the historic Venetian harbor of Chania.' },
      { day: 8, title: 'Aegean Farewell', activity: 'Morning at leisure for beach relaxation; evening farewell Greek feast at a traditional taverna.' }
    ]
  },
  {
    id: 'indonesia',
    slug: 'indonesia',
    name: 'Indonesia',
    region: 'Asia',
    hook: 'Tropical zen and island magic in the heart of the archipelago.',
    description: 'From the lush rice terraces of Ubud to the spiritual cliffs of Uluwatu, Indonesia is a land of profound beauty and island serenity. Experience the ultimate tropical escape in world-class luxury retreats.',
    highlights: [
      'Private spiritual blessing at Tirta Empul',
      'Exclusive sunrise trek to Mount Batur',
      'Private boat trip to the hidden Nusa Penida',
      'Luxury jungle villa stay in Ubud'
    ],
    image: 'https://res.cloudinary.com/dnty2fhxp/image/upload/v1774087828/Indonesia_zuifnh.avif',
    accent: 'Teal',
    usp: 'Tropical Zen & Island Magic',
    vibe: 'Lush jungles, spiritual depth, and world-class surfing.',
    mustDo: 'Explore the Tegalalang Rice Terraces and visit the Uluwatu Temple at sunset.',
    whyNow: 'New wellness retreats in Ubud are redefining luxury.',
    itinerary: [
      { day: 1, title: 'Ubud Arrival', activity: 'Private transfer to your jungle villa; evening traditional Balinese dance performance.' },
      { day: 2, title: 'Ubud Culture', activity: 'Private tour of the Tegalalang Rice Terraces and a spiritual blessing at Tirta Empul temple.' },
      { day: 3, title: 'Mount Batur Sunrise', activity: 'Private sunrise trek to Mount Batur (optional) or a scenic drive to Lake Batur with a picnic.' },
      { day: 4, title: 'Seminyak Vibes', activity: 'Transfer to the coast; afternoon at leisure for beach relaxation or boutique shopping.' },
      { day: 5, title: 'Uluwatu Sunset', activity: 'Visit the cliffside Uluwatu Temple for a sunset Kecak dance; evening private seafood dinner.' },
      { day: 6, title: 'Nusa Penida', activity: 'Private boat trip to Nusa Penida; visit Kelingking Beach and Broken Beach for iconic views.' },
      { day: 7, title: 'Gili Islands', activity: 'Private speedboat to Gili Trawangan; day at leisure for snorkeling and island cycling.' },
      { day: 8, title: 'Island Farewell', activity: 'Full day at leisure for spa treatments or surfing lessons; evening farewell dinner.' }
    ]
  },
  {
    id: 'israel',
    slug: 'israel',
    name: 'Israel',
    region: 'Middle East',
    hook: 'The Holy Land where ancient spiritual sites meet modern Mediterranean energy.',
    description: 'Float in the mineral-rich Dead Sea, explore the ancient Old City of Jerusalem, and experience the high-energy culinary scene of Tel Aviv. Israel is a land of profound history and vibrant modern life.',
    highlights: [
      'Private tour of Jerusalem\'s Old City secrets',
      'Exclusive float in the Dead Sea at sunset',
      'Curated food tour of Tel Aviv\'s Carmel Market',
      'Private excursion to the Masada fortress'
    ],
    image: 'https://res.cloudinary.com/dnty2fhxp/image/upload/v1774106405/ISRAEL_h8tgvs.avif',
    accent: 'Azure',
    usp: 'The Holy Land & Modern Tech',
    vibe: 'Ancient spiritual sites meet a high-energy Mediterranean vibe.',
    mustDo: 'Float in the Dead Sea and explore the Old City of Jerusalem.',
    whyNow: 'Tel Aviv’s culinary scene is currently the best in the region.',
    itinerary: [
      { day: 1, title: 'Jerusalem Arrival', activity: 'Private transfer to your historic hotel; evening walk through the vibrant Mahane Yehuda Market.' },
      { day: 2, title: 'Old City Secrets', activity: 'Private tour of the Western Wall, Church of the Holy Sepulchre, and the Via Dolorosa.' },
      { day: 3, title: 'Dead Sea & Masada', activity: 'Private excursion to the Masada fortress and a relaxing float in the mineral-rich Dead Sea.' },
      { day: 4, title: 'Tel Aviv Energy', activity: 'Transfer to Tel Aviv; private tour of the Bauhaus architecture and the historic port of Jaffa.' },
      { day: 5, title: 'Culinary Tel Aviv', activity: 'Guided food tour of the Carmel Market followed by an afternoon at leisure on the beach.' },
      { day: 6, title: 'Galilee Day Trip', activity: 'Private tour of Nazareth and the Sea of Galilee; evening farewell dinner in Tel Aviv.' },
      { day: 7, title: 'Haifa & Acre', activity: 'Private tour of the Bahá\'í Gardens in Haifa and the ancient Crusader city of Acre.' }
    ]
  },
  {
    id: 'italy',
    slug: 'italy',
    name: 'Italy',
    region: 'Europe',
    hook: 'La Dolce Vita—a feast for the senses in the heart of the Mediterranean.',
    description: 'Indulge in world-class art, explore the ancient ruins of Rome, and sail the stunning Amalfi Coast. Italy is a timeless celebration of gastronomy, history, and unparalleled beauty.',
    highlights: [
      'Early-morning private access to the Sistine Chapel',
      'Exclusive yacht charter along the Amalfi Coast',
      'Private wine tasting in the heart of Chianti',
      'VIP tour of the Colosseum and Roman Forum'
    ],
    image: 'https://res.cloudinary.com/dnty2fhxp/image/upload/v1774106405/Italy_zdtfuj.avif',
    accent: 'Ruby',
    usp: 'La Dolce Vita',
    vibe: 'A feast for the senses: art, food, and timeless beauty.',
    mustDo: 'Tour the Colosseum in Rome and take a private boat tour of the Amalfi Coast.',
    whyNow: 'Private access to the Vatican and Sistine Chapel.',
    itinerary: [
      { day: 1, title: 'Rome Arrival', activity: 'Private transfer to your hotel near the Spanish Steps; evening private tour of the Trevi Fountain.' },
      { day: 2, title: 'Ancient Rome', activity: 'VIP tour of the Colosseum and the Roman Forum; afternoon private pizza-making class.' },
      { day: 3, title: 'Vatican Wonders', activity: 'Early-morning private access to the Vatican Museums and the Sistine Chapel.' },
      { day: 4, title: 'Florence Heritage', activity: 'First-class train to Florence; evening private tour of the Uffizi Gallery and the Duomo.' },
      { day: 5, title: 'Tuscan Countryside', activity: 'Private day trip to the Chianti region for exclusive wine tastings and a gourmet farmhouse lunch.' },
      { day: 6, title: 'Venice Arrival', activity: 'First-class train to Venice; private water taxi to your hotel; evening gondola ride.' },
      { day: 7, title: 'Venetian Islands', activity: 'Private boat tour to Murano and Burano; evening farewell dinner overlooking the Grand Canal.' },
      { day: 8, title: 'Amalfi Coast', activity: 'Fly to Naples; private transfer to Positano; evening sunset cocktails overlooking the sea.' },
      { day: 9, title: 'Capri Island', activity: 'Private boat charter to Capri; visit the Blue Grotto and enjoy a lunch in Anacapri.' },
      { day: 10, title: 'Pompeii & Farewell', activity: 'Private tour of the ancient ruins of Pompeii; transfer to Naples airport for departure.' }
    ]
  },
  {
    id: 'japan',
    slug: 'japan',
    name: 'Japan',
    region: 'Asia',
    hook: 'A perfect harmony of ancient tradition and futuristic innovation.',
    description: 'Witness the cherry blossoms in Kyoto, explore the neon streets of Tokyo, and relax in traditional hot spring ryokans. Japan is a land of precision, politeness, and deep respect for beauty.',
    highlights: [
      'Private tea ceremony with a master in Kyoto',
      'Exclusive sushi-making class with a master chef',
      'VIP tour of Tokyo\'s neon-lit Golden Gai',
      'Bullet train journey in first-class luxury'
    ],
    image: 'https://res.cloudinary.com/dnty2fhxp/image/upload/v1774087828/Japan_t7agfi.avif',
    accent: 'Ruby',
    usp: 'Tradition Meets Tomorrow',
    vibe: 'Precision, politeness, and a deep respect for beauty.',
    mustDo: 'Witness the cherry blossoms in Kyoto and explore the neon streets of Tokyo.',
    whyNow: 'Cherry blossom season is the most coveted travel window.',
    itinerary: [
      { day: 1, title: 'Tokyo Arrival', activity: 'Private transfer to your Shinjuku suite; evening private tour of the neon-lit Golden Gai.' },
      { day: 2, title: 'Tokyo Traditions', activity: 'Private tour of the Senso-ji Temple and a traditional sushi-making class with a master chef.' },
      { day: 3, title: 'Mt. Fuji Excursion', activity: 'Private drive to Lake Kawaguchi for views of Mt. Fuji and a visit to the Chureito Pagoda.' },
      { day: 4, title: 'Hakone Hot Springs', activity: 'Private transfer to Hakone; stay in a traditional Ryokan with a private onsen and Kaiseki dinner.' },
      { day: 5, title: 'Kyoto Heritage', activity: 'Bullet train to Kyoto; evening private tour of the Gion district and a tea ceremony.' },
      { day: 6, title: 'Kyoto Temples', activity: 'Private tour of the Kinkaku-ji (Golden Pavilion) and the Fushimi Inari shrine.' },
      { day: 7, title: 'Arashiyama Bamboo', activity: 'Private guided walk through the Bamboo Grove and a visit to the Tenryu-ji Temple.' },
      { day: 8, title: 'Nara Day Trip', activity: 'Private tour of the Todai-ji Temple and the deer park; evening at leisure in Kyoto.' },
      { day: 9, title: 'Hiroshima & Miyajima', activity: 'Bullet train to Hiroshima; private tour of the Peace Memorial Park and the floating torii gate.' },
      { day: 10, title: 'Osaka Energy', activity: 'Transfer to Osaka; private tour of the Osaka Castle and a street food tour in Dotonbori.' }
    ]
  },
  {
    id: 'jordan',
    slug: 'jordan',
    name: 'Jordan',
    region: 'Middle East',
    hook: 'The rose-red city of Petra and the otherworldly sands of Wadi Rum.',
    description: 'Discover the ancient wonders of Petra, camp under the stars in Wadi Rum, and float in the Dead Sea. Jordan is a land of dramatic desert landscapes and profound historical depth.',
    highlights: [
      'Private tour of the "Rose-Red City" of Petra',
      'Exclusive 4x4 desert safari in Wadi Rum',
      'Luxury "bubble" camp stay under the stars',
      'Private "Petra by Night" experience'
    ],
    image: 'https://res.cloudinary.com/dnty2fhxp/image/upload/v1774106405/JORDAN_aq7jxr.avif',
    accent: 'Gold',
    usp: 'The Rose-Red City of Petra',
    vibe: 'Adventure in the desert and floating in the Dead Sea.',
    mustDo: 'Discover the ancient city of Petra and camp under the stars in Wadi Rum.',
    whyNow: 'Luxury "bubble" camps in Wadi Rum are a must-try.',
    itinerary: [
      { day: 1, title: 'Amman Arrival', activity: 'Private transfer to your hotel; evening private tour of the Citadel and the Roman Theater.' },
      { day: 2, title: 'Jerash & Ajloun', activity: 'Private day trip to the ancient Roman city of Jerash and the Ajloun Castle.' },
      { day: 3, title: 'Petra Discovery', activity: 'Private tour of the "Rose-Red City" of Petra; evening "Petra by Night" experience.' },
      { day: 4, title: 'Petra Monastery', activity: 'Morning hike to the Monastery (Ad Deir); afternoon at leisure for independent exploration.' },
      { day: 5, title: 'Wadi Rum Safari', activity: 'Private 4x4 desert safari; evening luxury camp stay with a traditional Zarb dinner.' },
      { day: 6, title: 'Dead Sea Float', activity: 'Transfer to the Dead Sea; afternoon at leisure for a mineral-rich float and spa treatment.' }
    ]
  },
  {
    id: 'kazakhstan',
    slug: 'kazakhstan',
    name: 'Kazakhstan',
    region: 'Asia',
    hook: 'Central Asia\'s rising star, where futuristic cities meet vast untouched steppes.',
    description: 'Explore the dramatic Charyn Canyon, visit the futuristic capital of Astana, and hike the pristine Shymbulak mountains. Kazakhstan is a land of immense scale and breathtaking natural beauty.',
    highlights: [
      'Private 4x4 expedition to Charyn Canyon',
      'Exclusive visit to the futuristic Bayterek Tower',
      'Private alpine trek in the Shymbulak mountains',
      'Traditional Kazakh feast with live folk music'
    ],
    image: 'https://res.cloudinary.com/dnty2fhxp/image/upload/v1774087828/Kazakhstan_grbxuu.avif',
    accent: 'Teal',
    usp: 'Central Asia’s Rising Star',
    vibe: 'Futuristic cities and vast, untouched natural beauty.',
    mustDo: 'Explore the Charyn Canyon, visit the futuristic city of Astana, and hike the Shymbulak mountains.',
    whyNow: 'Direct flights from major Indian hubs now available.',
    itinerary: [
      { day: 1, title: 'Almaty Arrival', activity: 'Private transfer to your luxury hotel; evening cable car to Kok Tobe for panoramic city views.' },
      { day: 2, title: 'Charyn Canyon Expedition', activity: 'Full-day private 4x4 journey to the "Valley of Castles" with a gourmet picnic by the river.' },
      { day: 3, title: 'Alpine Shymbulak', activity: 'Morning visit to Medeu skating rink; afternoon at Shymbulak Mountain Resort with a private guide.' },
      { day: 4, title: 'Big Almaty Lake', activity: 'Private excursion to the turquoise Big Almaty Lake; evening traditional Kazakh feast with live folk music.' },
      { day: 5, title: 'Astana Futurism', activity: 'Fly to Astana; private tour of the Bayterek Tower and the stunning Nur-Alem Pavilion.' }
    ]
  },
  {
    id: 'kenya',
    slug: 'kenya',
    name: 'Kenya',
    region: 'Africa',
    hook: 'The soul of safari, where the Great Migration defines the rhythm of life.',
    description: 'Witness the raw power of nature in the Maasai Mara, visit traditional villages, and experience the magic of a hot air balloon safari. Kenya is the heart of the African savannah.',
    highlights: [
      'Private game drive tracking the Big Five',
      'Exclusive sunrise hot air balloon safari',
      'Private visit to a traditional Maasai Manyatta',
      'Luxury bush dinner under the African stars'
    ],
    image: 'https://res.cloudinary.com/dnty2fhxp/image/upload/v1774087827/Kenya_do9wmw.avif',
    accent: 'Azure',
    usp: 'The Soul of Safari',
    vibe: 'The raw power of nature and the Great Migration.',
    mustDo: 'Witness the Great Migration in the Maasai Mara, visit a Maasai village, and experience a hot air balloon safari.',
    whyNow: 'Private conservancies offer exclusive, crowd-free safaris.',
    itinerary: [
      { day: 1, title: 'Nairobi Conservation', activity: 'Private visit to the Sheldrick Elephant Orphanage and Giraffe Centre; evening fine dining at Hemmingways.' },
      { day: 2, title: 'Maasai Mara Arrival', activity: 'Fly to a private conservancy in the Mara; afternoon game drive followed by a sundowner on the plains.' },
      { day: 3, title: 'The Great Migration', activity: 'Full-day private game drive tracking the Big Five; evening luxury bush dinner under the stars.' },
      { day: 4, title: 'Sky Safari', activity: 'Sunrise hot air balloon flight over the Mara; afternoon private visit to a traditional Maasai Manyatta.' },
      { day: 5, title: 'Amboseli Giants', activity: 'Fly to Amboseli; private game drive with the backdrop of Mount Kilimanjaro; evening sundowner.' },
      { day: 6, title: 'Laikipia Wilderness', activity: 'Fly to a private ranch in Laikipia; guided bush walk and a night game drive for nocturnal sightings.' },
      { day: 7, title: 'Samburu Landscapes', activity: 'Fly to Samburu; private game drive to spot the "Samburu Special Five"; evening riverside dinner.' },
      { day: 8, title: 'Safari Farewell', activity: 'Morning game drive followed by a private transfer to Nairobi for your departure flight.' }
    ]
  },
  {
    id: 'malaysia',
    slug: 'malaysia',
    name: 'Malaysia',
    region: 'Asia',
    hook: 'A vibrant fusion of ancient traditions and futuristic skylines.',
    description: 'From the iconic Petronas Twin Towers to the pristine beaches of Langkawi, Malaysia is a melting pot of cultures, food, and tropical beauty. Experience the best of Asia in one destination.',
    highlights: [
      'VIP tour of the Petronas Twin Towers',
      'Private sunset catamaran cruise in Langkawi',
      'Exclusive boat tour of the Kilim Karst Geoforest',
      'Private tea at the historic Majestic Hotel'
    ],
    image: 'https://res.cloudinary.com/dnty2fhxp/image/upload/v1774087828/Malaysia_fxdign.avif',
    accent: 'Gold',
    usp: 'Truly Asia',
    vibe: 'A melting pot of cultures, food, and tropical beauty.',
    mustDo: 'Visit the Petronas Twin Towers, explore the Batu Caves, and relax on the beaches of Langkawi.',
    whyNow: 'Luxury island resorts in Langkawi are offering great value.',
    itinerary: [
      { day: 1, title: 'Kuala Lumpur Arrival', activity: 'Private transfer to your suite; evening VIP tour of the Petronas Twin Towers and a rooftop dinner.' },
      { day: 2, title: 'Batu Caves & Heritage', activity: 'Private tour of the Batu Caves and the historic Merdeka Square; afternoon tea at the Majestic Hotel.' },
      { day: 3, title: 'Langkawi Archipelago', activity: 'Fly to Langkawi; private sunset catamaran cruise with free-flow cocktails and a seafood BBQ.' },
      { day: 4, title: 'Mangrove Safari', activity: 'Private boat tour of the Kilim Karst Geoforest Park; afternoon at leisure for beach relaxation.' },
      { day: 5, title: 'SkyBridge Adventure', activity: 'Private visit to the Langkawi SkyBridge; evening farewell dinner at a beachfront luxury retreat.' }
    ]
  },
  {
    id: 'maldives',
    slug: 'maldives',
    name: 'Maldives',
    region: 'Asia',
    hook: 'The pinnacle of tropical luxury—one island, one resort.',
    description: 'Stay in an overwater villa, snorkel with manta rays, and enjoy a private sandbank picnic. The Maldives is the ultimate island escape, where every moment is a celebration of paradise.',
    highlights: [
      'Private seaplane transfer to your resort',
      'Exclusive snorkeling with manta rays',
      'Private sandbank picnic for total seclusion',
      'Candlelit dinner on a private beach'
    ],
    image: 'https://res.cloudinary.com/dnty2fhxp/image/upload/v1774087830/Maldives_kjjlrq.avif',
    accent: 'Gold',
    usp: 'The Ultimate Island Escape',
    vibe: 'One island, one resort: the pinnacle of tropical luxury.',
    mustDo: 'Stay in an overwater villa, snorkel with manta rays, and enjoy a private sandbank picnic.',
    whyNow: 'Private seaplane transfers are the only way to arrive.',
    itinerary: [
      { day: 1, title: 'Atoll Arrival', activity: 'Private seaplane transfer to your overwater villa; evening private candlelit dinner on the beach.' },
      { day: 2, title: 'Marine Discovery', activity: 'Private guided snorkeling with manta rays or whale sharks; afternoon overwater spa treatment.' },
      { day: 3, title: 'Sandbank Escape', activity: 'Private boat to a secluded sandbank for a chef-prepared picnic and a day of total privacy.' },
      { day: 4, title: 'Sunset Dhoni Cruise', activity: 'Traditional private dhoni cruise at sunset with champagne; evening stargazing from your deck.' }
    ]
  },
  {
    id: 'morocco',
    slug: 'morocco',
    name: 'Morocco',
    region: 'Africa',
    hook: 'A sensory explosion of colors, scents, and ancient desert magic.',
    description: 'Wander the Marrakech Medina, take a camel trek in the Sahara, and explore the High Atlas Mountains. Morocco is a vibrant tapestry of culture, history, and legendary hospitality.',
    highlights: [
      'Private tour of Marrakech\'s hidden souks',
      'Exclusive sunset camel trek in the Sahara',
      'Luxury desert camp stay under the stars',
      'Private visit to the Majorelle Garden'
    ],
    image: 'https://res.cloudinary.com/dnty2fhxp/image/upload/v1774106405/Morocco_cykoi6.avif',
    accent: 'Gold',
    usp: 'Gateway to the Sahara',
    vibe: 'A sensory explosion of colors, scents, and sounds.',
    mustDo: 'Wander the Marrakech Medina, take a camel trek in the Sahara, and explore the Atlas Mountains.',
    whyNow: 'Luxury Riads in Marrakech are the height of chic.',
    itinerary: [
      { day: 1, title: 'Marrakech Arrival', activity: 'Private transfer to your luxury Riad; evening private tour of the Jemaa el-Fnaa square.' },
      { day: 2, title: 'Palaces & Gardens', activity: 'Private tour of Bahia Palace and the Majorelle Garden; afternoon artisan workshop in the souks.' },
      { day: 3, title: 'Atlas Mountain Retreat', activity: 'Private drive to the High Atlas; traditional Berber lunch in a mountain village and a scenic hike.' },
      { day: 4, title: 'Sahara Expedition', activity: 'Fly to Erfoud; private 4x4 transfer to Merzouga for a sunset camel trek and a luxury desert camp.' },
      { day: 5, title: 'Dades Valley', activity: 'Private drive through the "Road of a Thousand Kasbahs"; visit the stunning Dades Gorges.' },
      { day: 6, title: 'Ouarzazate Cinema', activity: 'Private tour of the Atlas Film Studios and the UNESCO-listed Ait Ben Haddou fortress.' },
      { day: 7, title: 'Fes Medieval Heart', activity: 'Fly to Fes; private guided walk through the labyrinthine Fes el Bali and the ancient tanneries.' },
      { day: 8, title: 'Chefchaouen Blue', activity: 'Private day trip to the blue-washed city; explore the medina and enjoy a rooftop lunch.' },
      { day: 9, title: 'Casablanca Grandeur', activity: 'Private tour of the Hassan II Mosque; evening farewell dinner at the iconic Rick’s Café.' },
      { day: 10, title: 'Moroccan Farewell', activity: 'Morning at leisure for last-minute shopping; private transfer to the airport for departure.' }
    ]
  },
  {
    id: 'nepal',
    slug: 'nepal',
    name: 'Nepal',
    region: 'Asia',
    hook: 'The roof of the world, where spirituality meets Himalayan peaks.',
    description: 'Experience the world\'s highest mountains, explore the ancient temples of Kathmandu, and enjoy a private helicopter tour over Everest. Nepal is a land of profound peace and majestic beauty.',
    highlights: [
      'Private helicopter tour to Everest Base Camp',
      'Champagne breakfast at 5,545m altitude',
      'Exclusive tour of Kathmandu\'s spiritual sites',
      'Private boat ride on the serene Phewa Lake'
    ],
    image: 'https://res.cloudinary.com/dnty2fhxp/image/upload/v1774087828/Nepal_iox55t.avif',
    accent: 'Ruby',
    usp: 'The Roof of the World',
    vibe: 'Spiritual peace and the world’s highest mountains.',
    mustDo: 'Trek to Everest Base Camp, explore the temples of Kathmandu, and enjoy a helicopter tour over the Himalayas.',
    whyNow: 'Helicopter tours to Everest Base Camp are now easier to book.',
    itinerary: [
      { day: 1, title: 'Kathmandu Arrival', activity: 'Private transfer to your heritage hotel; evening walk through the historic Durbar Square.' },
      { day: 2, title: 'Everest Helicopter', activity: 'Private helicopter excursion to Everest Base Camp with a champagne breakfast at 5,545m.' },
      { day: 3, title: 'Spiritual Kathmandu', activity: 'Private tour of Pashupatinath and Boudhanath; afternoon private pottery class in Bhaktapur.' },
      { day: 4, title: 'Pokhara Lakeside', activity: 'Fly to Pokhara; private boat ride on Phewa Lake and a sunset visit to the Shanti Stupa.' },
      { day: 5, title: 'Annapurna Sunrise', activity: 'Early morning private drive to Sarangkot for Himalayan views; afternoon at leisure for spa.' },
      { day: 6, title: 'Chitwan Wilderness', activity: 'Fly to Chitwan; private jeep safari in search of rhinos and a sunset canoe ride on the Rapti River.' },
      { day: 7, title: 'Himalayan Farewell', activity: 'Morning meditation session followed by a private transfer to Kathmandu for departure.' }
    ]
  },
  {
    id: 'netherlands',
    slug: 'netherlands',
    name: 'Netherlands',
    region: 'Europe',
    hook: 'Canals, tulips, and masterpieces in the heart of Europe.',
    description: 'Cruise the historic canals of Amsterdam, visit the vibrant Keukenhof tulip gardens, and explore the world-class Rijksmuseum. The Netherlands is a beautifully organized land of art and coastal charm.',
    highlights: [
      'Private salon boat cruise on Amsterdam\'s canals',
      'VIP early-access tour of the Rijksmuseum',
      'Exclusive helicopter flight over tulip fields',
      'Private guided walk of the historic Jordaan'
    ],
    image: 'https://res.cloudinary.com/dnty2fhxp/image/upload/v1774106407/Netherlands_pab4vb.avif',
    accent: 'Teal',
    usp: 'Canals, Tulips & Masterpieces',
    vibe: 'Liberal, artistic, and beautifully organized.',
    mustDo: 'Cruise the Amsterdam canals, visit the Keukenhof tulip gardens, and explore the Rijksmuseum.',
    whyNow: 'Tulip season (April-May) is a once-in-a-lifetime sight.',
    itinerary: [
      { day: 1, title: 'Amsterdam Arrival', activity: 'Private transfer to your canal-side suite; evening private salon boat cruise with local snacks.' },
      { day: 2, title: 'Art & History', activity: 'VIP early-access tour of the Rijksmuseum and a private guided walk of the Jordaan district.' },
      { day: 3, title: 'Keukenhof & Tulips', activity: 'Private tour of the Keukenhof Gardens and a helicopter flight over the vibrant tulip fields.' }
    ]
  },
  {
    id: 'new-zealand',
    slug: 'new-zealand',
    name: 'New Zealand',
    region: 'Oceania',
    hook: 'The adventure capital of the world, where every landscape is a movie set.',
    description: 'Cruise through the majestic Milford Sound, visit the Hobbiton Movie Set, and explore the glaciers of the South Island. New Zealand is a land of breathtaking fjords and world-class luxury lodges.',
    highlights: [
      'Private helicopter excursion to Milford Sound',
      'Exclusive VIP tour of the Hobbiton Movie Set',
      'Private glacier landing and guided walk',
      'Luxury winery tour on Waiheke Island'
    ],
    image: 'https://res.cloudinary.com/dnty2fhxp/image/upload/v1774102563/New_Zealand_s8yawq.avif',
    accent: 'Emerald',
    usp: 'The Adventure Capital',
    vibe: 'Stunning landscapes that look like a movie set.',
    mustDo: 'Cruise through Milford Sound, visit the Hobbiton Movie Set, and explore the glaciers of the South Island.',
    whyNow: 'Luxury lodges in the South Island are world-class.',
    itinerary: [
      { day: 1, title: 'Auckland Arrival', activity: 'Private transfer to your harbor-view hotel; evening private yacht cruise in the Waitemata Harbour.' },
      { day: 2, title: 'Waiheke Wine', activity: 'Private helicopter to Waiheke Island for a day of boutique winery tours and a gourmet lunch.' },
      { day: 3, title: 'Rotorua Geothermal', activity: 'Private tour of Te Puia and a traditional Maori Hangi dinner with a private cultural performance.' },
      { day: 4, title: 'Hobbiton Experience', activity: 'VIP tour of the Hobbiton Movie Set with a private lunch at the Green Dragon Inn.' },
      { day: 5, title: 'Queenstown Adventure', activity: 'Fly to Queenstown; private jet boat tour on the Shotover River and a sunset gondola ride.' },
      { day: 6, title: 'Milford Sound Heli', activity: 'Private helicopter excursion to Milford Sound with an alpine landing and a private fjord cruise.' },
      { day: 7, title: 'Glacier Landing', activity: 'Private helicopter flight to Franz Josef Glacier for a snow landing and guided glacier walk.' },
      { day: 8, title: 'Wanaka Leisure', activity: 'Private drive to Wanaka; afternoon at leisure for lakeside walks or a private vineyard visit.' },
      { day: 9, title: 'Mount Cook Alpine', activity: 'Private tour of Aoraki / Mount Cook National Park; evening stargazing at the Dark Sky Reserve.' },
      { day: 10, title: 'Christchurch Farewell', activity: 'Private transfer to Christchurch; morning city tour followed by a transfer to the airport.' }
    ]
  },
  {
    id: 'norway',
    slug: 'norway',
    name: 'Norway',
    region: 'Europe',
    hook: 'The land of the fjords, where dramatic nature meets the midnight sun.',
    description: 'Cruise the UNESCO-listed Geirangerfjord, witness the Northern Lights in Tromsø, and explore the Viking history of Oslo. Norway is a land of raw natural power and Arctic magic.',
    highlights: [
      'Private cruise of the majestic Geirangerfjord',
      'Exclusive Northern Lights safari in Tromsø',
      'Private tour of the Munch Museum in Oslo',
      'Scenic journey on the iconic Flåm Railway'
    ],
    image: 'https://res.cloudinary.com/dnty2fhxp/image/upload/v1774106406/Norway_lvsjfv.avif',
    accent: 'Azure',
    usp: 'The Land of the Fjords',
    vibe: 'Dramatic nature and the magic of the Northern Lights.',
    mustDo: 'Cruise the Geirangerfjord, witness the Northern Lights in Tromsø, and explore the Viking history in Oslo.',
    whyNow: 'Electric fjord cruises are the new way to see the sights.',
    itinerary: [
      { day: 1, title: 'Oslo Arrival', activity: 'Private transfer to your hotel; evening private tour of the Munch Museum and the Opera House.' },
      { day: 2, title: 'Bergen Gateway', activity: 'Fly to Bergen; private guided walk through the historic Bryggen wharf and a funicular ride.' },
      { day: 3, title: 'Fjord Majesty', activity: 'Private boat tour of the Sognefjord followed by a scenic journey on the Flåm Railway.' },
      { day: 4, title: 'Geirangerfjord', activity: 'Private cruise of the UNESCO-listed Geirangerfjord; visit the Seven Sisters waterfalls.' },
      { day: 5, title: 'Arctic Tromsø', activity: 'Fly to Tromsø; private Northern Lights safari with a professional photographer and a cozy bonfire.' },
      { day: 6, title: 'Lofoten Discovery', activity: 'Fly to the Lofoten Islands; private tour of the dramatic peaks and traditional red rorbuer cabins.' },
      { day: 7, title: 'Whale Watching', activity: 'Private boat excursion for whale watching in the Arctic waters; evening at leisure in a fishing village.' },
      { day: 8, title: 'Midnight Sun Hike', activity: 'Private guided trek to a coastal peak for a midnight sun experience; evening at leisure.' }
    ]
  },
  {
    id: 'oman',
    slug: 'oman',
    name: 'Oman',
    region: 'Middle East',
    hook: 'Arabia\'s best-kept secret, where authentic culture meets stunning nature.',
    description: 'Explore the vast Wahiba Sands, visit the grand Sultan Qaboos Mosque, and relax in the Jebel Akhdar mountains. Oman is a land of rugged beauty and legendary Arabian hospitality.',
    highlights: [
      'Private 4x4 expedition to Wahiba Sands',
      'Exclusive tour of the Royal Opera House Muscat',
      'Luxury mountain resort stay in Jebel Akhdar',
      'Private sunset dhow cruise in Muscat'
    ],
    image: 'https://res.cloudinary.com/dnty2fhxp/image/upload/v1774102563/Oman_rmn3y6.avif',
    accent: 'Gold',
    usp: 'Arabia’s Best Kept Secret',
    vibe: 'Authentic Arabian culture and stunning natural beauty.',
    mustDo: 'Explore the Wahiba Sands, visit the Sultan Qaboos Grand Mosque, and relax in the Jebel Akhdar mountains.',
    whyNow: 'Luxury mountain resorts in Jebel Akhdar are a cool escape.',
    itinerary: [
      { day: 1, title: 'Muscat Heritage', activity: 'Private transfer to your seaside hotel; evening private tour of the Mutrah Souq and a dhow cruise.' },
      { day: 2, title: 'Grand Mosque & Opera', activity: 'Morning private tour of the Sultan Qaboos Grand Mosque and the Royal Opera House Muscat.' },
      { day: 3, title: 'Jebel Akhdar Peaks', activity: 'Private 4x4 drive to the "Green Mountain"; afternoon guided walk through ancient rose gardens.' },
      { day: 4, title: 'Wahiba Sands Safari', activity: 'Private desert expedition to Wahiba Sands; sunset dune bashing and a luxury Bedouin camp stay.' },
      { day: 5, title: 'Wadi Bani Khalid', activity: 'Private swim in the emerald pools of Wadi Bani Khalid; evening farewell dinner in Muscat.' }
    ]
  },
  {
    id: 'philippines',
    slug: 'philippines',
    name: 'Philippines',
    region: 'Asia',
    hook: 'A tropical archipelago of 7,000 islands, each a slice of paradise.',
    description: 'Explore the turquoise lagoons of El Nido, relax on the white sands of Boracay, and discover the Chocolate Hills of Bohol. The Philippines is a land of island-hopping dreams and warm hospitality.',
    highlights: [
      'Private island-hopping tour in El Nido',
      'Exclusive sunset cruise in Boracay',
      'Private visit to the Chocolate Hills and Tarsiers',
      'Luxury resort stay on a private island'
    ],
    image: 'https://res.cloudinary.com/dnty2fhxp/image/upload/v1774087829/Philippines_gbdtuh.avif',
    accent: 'Emerald',
    usp: '7,000 Islands of Paradise',
    vibe: 'Crystal lagoons and the world’s friendliest people.',
    mustDo: 'Island hop in El Nido, swim in the crystal lagoons of Palawan, and explore the Chocolate Hills of Bohol.',
    whyNow: 'Private island hopping in Palawan is the ultimate luxury.',
    itinerary: [
      { day: 1, title: 'Manila Arrival', activity: 'Private transfer to your hotel; evening private tour of the historic Intramuros district by kalesa.' },
      { day: 2, title: 'El Nido Lagoons', activity: 'Fly to El Nido; private boat tour of the Big and Small Lagoons with a gourmet island BBQ lunch.' },
      { day: 3, title: 'Hidden Beaches', activity: 'Private island hopping to Secret Beach and Hidden Beach; afternoon at leisure for snorkeling.' },
      { day: 4, title: 'Coron Expedition', activity: 'Private boat to Coron; explore Kayangan Lake and the Twin Lagoons; evening at a luxury eco-resort.' },
      { day: 5, title: 'Bohol Countryside', activity: 'Fly to Bohol; private tour of the Chocolate Hills and a tarsier sanctuary visit.' },
      { day: 6, title: 'Panglao Island', activity: 'Private dolphin-watching tour at sunrise; afternoon at leisure for beach relaxation on Panglao.' },
      { day: 7, title: 'Boracay Sunset', activity: 'Fly to Boracay; private sunset paraw sailing followed by a beachfront seafood dinner.' },
      { day: 8, title: 'Island Farewell', activity: 'Full day at leisure for beach activities or a private spa treatment; evening farewell cocktails.' }
    ]
  },
  {
    id: 'prague',
    slug: 'prague',
    name: 'Prague',
    region: 'Europe',
    hook: 'The City of a Hundred Spires, where fairytale charm meets Gothic grandeur.',
    description: 'Walk across the historic Charles Bridge, explore the majestic Prague Castle, and wander the cobblestone streets of the Old Town. Prague is a city of timeless beauty and artistic history.',
    highlights: [
      'Private twilight walk across Charles Bridge',
      'VIP tour of Prague Castle and the Golden Lane',
      'Exclusive visit to the Strahov Library',
      'Private Vltava River jazz cruise'
    ],
    image: 'https://res.cloudinary.com/dnty2fhxp/image/upload/v1774106407/Prague_hgceun.avif',
    accent: 'Gold',
    usp: 'The Fairytale City',
    vibe: 'Gothic spires and a rich, artistic history.',
    mustDo: 'Walk across the Charles Bridge, explore the Prague Castle, and enjoy a private Vltava River cruise.',
    whyNow: 'River-view suites in the Old Town are currently available.',
    itinerary: [
      { day: 1, title: 'Prague Arrival', activity: 'Private transfer to your boutique hotel; evening private walk across the Charles Bridge at twilight.' },
      { day: 2, title: 'Castle & Cathedral', activity: 'VIP tour of Prague Castle and the Golden Lane; afternoon private visit to the Strahov Library.' },
      { day: 3, title: 'Old Town Secrets', activity: 'Private guided walk through the Old Town Square and the Jewish Quarter; evening jazz cruise.' }
    ]
  },
  {
    id: 'russia',
    slug: 'russia',
    name: 'Russia',
    region: 'Europe',
    hook: 'Imperial grandeur and vast landscapes that defy the imagination.',
    description: 'Explore the historic Red Square in Moscow, the world-class Hermitage Museum in St. Petersburg, and the imperial palaces of the Tsars. Russia is a land of immense scale and profound history.',
    highlights: [
      'VIP tour of the Kremlin and Armoury Chamber',
      'Early-access private tour of the Hermitage',
      'Private hydrofoil trip to Peterhof Palace',
      'Exclusive performance at the Bolshoi Theatre'
    ],
    image: 'https://res.cloudinary.com/dnty2fhxp/image/upload/v1774102564/Russia_er1ha8.avif',
    accent: 'Azure',
    usp: 'Grandeur of the Tsars',
    vibe: 'Imperial history and a scale that defies belief.',
    mustDo: 'Visit the Red Square in Moscow, the Hermitage Museum in St. Petersburg, and take a private boat trip to Peterhof Palace.',
    whyNow: 'White Nights in St. Petersburg are a magical experience.',
    itinerary: [
      { day: 1, title: 'Moscow Arrival', activity: 'Private transfer to your historic hotel; evening private tour of the illuminated Red Square.' },
      { day: 2, title: 'Kremlin & Armoury', activity: 'VIP tour of the Kremlin grounds and the Armoury Chamber; evening performance at the Bolshoi.' },
      { day: 3, title: 'Moscow Metro', activity: 'Private tour of the "Underground Palaces" (Metro stations) and the Tretyakov Gallery.' },
      { day: 4, title: 'St. Petersburg Art', activity: 'Sapsan high-speed train to St. Petersburg; private sunset cruise along the Neva River canals.' },
      { day: 5, title: 'Hermitage Treasures', activity: 'Early-access private tour of the Hermitage Museum and the Winter Palace with an art historian.' },
      { day: 6, title: 'Peterhof Grandeur', activity: 'Private hydrofoil trip to Peterhof Palace; explore the Lower Park fountains and the Grand Palace.' },
      { day: 7, title: 'Catherine Palace', activity: 'Private excursion to Tsarskoye Selo to see the Amber Room; evening farewell Russian feast.' },
      { day: 8, title: 'Pavlovsk & Pushkin', activity: 'Private tour of the Pavlovsk Palace and gardens; afternoon at leisure for independent exploration.' },
      { day: 9, title: 'Imperial Farewell', activity: 'Morning visit to the Fabergé Museum; private transfer to the airport for departure.' }
    ]
  },
  {
    id: 'saudi-arabia',
    slug: 'saudi-arabia',
    name: 'Saudi Arabia',
    region: 'Middle East',
    hook: 'The Kingdom\'s new dawn, where ancient heritage meets a bold future.',
    description: 'Explore the ancient ruins of Al-Ula, the modern skyline of Riyadh, and the historic Al-Balad district in Jeddah. Saudi Arabia is a land of dramatic desert landscapes and a bold, futuristic vision.',
    highlights: [
      'Private tour of the UNESCO site Hegra in Al-Ula',
      'Exclusive sunset at the Elephant Rock',
      'Private tour of Riyadh\'s historic Diriyah',
      'Luxury desert stargazing experience'
    ],
    image: 'https://res.cloudinary.com/dnty2fhxp/image/upload/v1774106759/Saudi_Arabia_ohsp6x.avif',
    accent: 'Emerald',
    usp: 'The Kingdom’s New Dawn',
    vibe: 'Ancient heritage meets a bold, futuristic vision.',
    mustDo: 'Explore the ancient ruins of Al-Ula, the modern skyline of Riyadh, and the historic Al-Balad district in Jeddah.',
    whyNow: 'Al-Ula is the world’s most exciting new luxury destination.',
    itinerary: [
      { day: 1, title: 'Riyadh Arrival', activity: 'Private transfer to your luxury hotel; evening visit to the Sky Bridge at Kingdom Centre.' },
      { day: 2, title: 'Diriyah Heritage', activity: 'Private tour of the At-Turaif district in Diriyah; afternoon visit to the National Museum.' },
      { day: 3, title: 'Al-Ula Expedition', activity: 'Fly to Al-Ula; private tour of the UNESCO site Hegra and the stunning Elephant Rock at sunset.' },
      { day: 4, title: 'Old Town Al-Ula', activity: 'Private guided walk through the Al-Ula Old Town; evening stargazing experience in the desert.' },
      { day: 5, title: 'Dadan & Ikmah', activity: 'Private tour of the ancient kingdoms of Dadan and Jabal Ikmah; afternoon at leisure in the oasis.' },
      { day: 6, title: 'Jeddah Al-Balad', activity: 'Fly to Jeddah; private tour of the historic Al-Balad district and its coral-stone houses.' },
      { day: 7, title: 'Red Sea Leisure', activity: 'Private boat trip for snorkeling in the Red Sea; evening farewell dinner on the Jeddah Corniche.' }
    ]
  },
  {
    id: 'seychelles',
    slug: 'seychelles',
    name: 'Seychelles',
    region: 'Africa',
    hook: 'The Garden of Eden, where pristine sands meet unique granite landscapes.',
    description: 'Relax on the world-famous Anse Source d’Argent, explore the prehistoric Vallee de Mai, and enjoy a private island picnic. The Seychelles is a land of unmatched tropical seclusion and natural beauty.',
    highlights: [
      'Private boat tour to Curieuse Island',
      'Exclusive guided walk through Vallée de Mai',
      'Private sandbank picnic for total seclusion',
      'Luxury beachfront villa stay'
    ],
    image: 'https://res.cloudinary.com/dnty2fhxp/image/upload/v1774087829/Seychelles_rgbszs.avif',
    accent: 'Azure',
    usp: 'The Garden of Eden',
    vibe: 'Pristine beaches and unique granite landscapes.',
    mustDo: 'Relax on Anse Source d’Argent, explore the Vallee de Mai, and enjoy a private island picnic.',
    whyNow: 'Private island resorts offering unmatched seclusion.',
    itinerary: [
      { day: 1, title: 'Mahé Arrival', activity: 'Private transfer to your beachfront villa; evening private sunset dinner overlooking the ocean.' },
      { day: 2, title: 'Mahé Exploration', activity: 'Private tour of Victoria market and the Mission Lodge lookout; afternoon at leisure for spa.' },
      { day: 3, title: 'Praslin & Vallée de Mai', activity: 'Private boat to Praslin; guided tour of the coco-de-mer forest and a swim at Anse Lazio.' },
      { day: 4, title: 'La Digue Magic', activity: 'Private ferry to La Digue; bicycle tour to Anse Source d’Argent for its iconic granite boulders.' },
      { day: 5, title: 'Island Hopping Safari', activity: 'Private boat tour to Curieuse Island for giant tortoises and snorkeling at St. Pierre.' },
      { day: 6, title: 'Island Leisure', activity: 'Full day at leisure for water sports or a private sandbank picnic; evening farewell cocktails.' }
    ]
  },
  {
    id: 'singapore',
    slug: 'singapore',
    name: 'Singapore',
    region: 'Asia',
    hook: 'The Garden City, where high-tech innovation meets lush tropical greenery.',
    description: 'Experience the futuristic Gardens by the Bay, the iconic Marina Bay Sands, and the world-class culinary scene of this vibrant city-state. Singapore is a land of efficiency, luxury, and green innovation.',
    highlights: [
      'VIP access to the Marina Bay Sands SkyPark',
      'Private night safari at the Singapore Zoo',
      'Exclusive food tour of Michelin-starred hawkers',
      'Private sunset cruise in the Marina Bay'
    ],
    image: 'https://res.cloudinary.com/dnty2fhxp/image/upload/v1774087830/Singapore_rfbpjp.avif',
    accent: 'Teal',
    usp: 'The Garden City',
    vibe: 'High-tech innovation meets lush, tropical greenery.',
    mustDo: 'Visit Gardens by the Bay, experience the Marina Bay Sands infinity pool, and enjoy a private night safari.',
    whyNow: 'Michelin-starred street food is a must-try experience.',
    itinerary: [
      { day: 1, title: 'Singapore Arrival', activity: 'Private transfer to your hotel; evening private tour of Gardens by the Bay and the Light Show.' },
      { day: 2, title: 'Marina Bay Icons', activity: 'VIP access to the Marina Bay Sands SkyPark; afternoon private food tour of the historic districts.' },
      { day: 3, title: 'Sentosa Island VIP', activity: 'Private cable car to Sentosa; VIP tour of the S.E.A. Aquarium and a luxury beach club afternoon.' }
    ]
  },
  {
    id: 'south-africa',
    slug: 'south-africa',
    name: 'South Africa',
    region: 'Africa',
    hook: 'A world in one country, from majestic safaris to stunning coastal drives.',
    description: 'Witness the Big Five in the Kruger, explore the vibrant V&A Waterfront in Cape Town, and taste world-class wines in the Stellenbosch valley. South Africa is a land of raw natural beauty and diverse cultures.',
    highlights: [
      'Private game drive in a luxury Kruger lodge',
      'Exclusive sunset cable car to Table Mountain',
      'Private wine tasting in the Franschhoek valley',
      'Luxury coastal drive along Chapman\'s Peak'
    ],
    image: 'https://res.cloudinary.com/dnty2fhxp/image/upload/v1774102566/South_Africa_h8ni5z.avif',
    accent: 'Gold',
    usp: 'A World in One Country',
    vibe: 'Safaris, vineyards, and stunning coastal drives.',
    mustDo: 'Take a cable car to Table Mountain, go on a safari in Kruger National Park, and drive the Garden Route.',
    whyNow: 'Luxury safari lodges in the Kruger are world-renowned.',
    itinerary: [
      { day: 1, title: 'Cape Town Arrival', activity: 'Private transfer to your V&A Waterfront hotel; evening private cable car to Table Mountain.' },
      { day: 2, title: 'Cape Peninsula', activity: 'Private tour of Cape Point and Boulders Beach penguins; evening sunset drive on Chapman’s Peak.' },
      { day: 3, title: 'Winelands Heritage', activity: 'Private tour of Stellenbosch and Franschhoek with exclusive cellar tastings and a gourmet lunch.' },
      { day: 4, title: 'Hermanus Whales', activity: 'Private drive to Hermanus for land-based whale watching (seasonal) and a coastal walk.' },
      { day: 5, title: 'Kruger Safari', activity: 'Fly to a private reserve in the Greater Kruger; afternoon game drive and a luxury bush dinner.' },
      { day: 6, title: 'The Big Five', activity: 'Morning and afternoon private game drives with an expert ranger; evening stargazing experience.' },
      { day: 7, title: 'Bush Walk & Spa', activity: 'Guided morning bush walk to learn about tracking; afternoon private spa treatment at the lodge.' },
      { day: 8, title: 'Garden Route Magic', activity: 'Fly to George; private drive to Knysna for a sunset lagoon cruise and fresh oysters.' },
      { day: 9, title: 'Plettenberg Bay', activity: 'Private boat tour to see the seal colony; afternoon at leisure for beach relaxation.' },
      { day: 10, title: 'Safari Farewell', activity: 'Morning game drive followed by a private transfer for your departure flight.' }
    ]
  },
  {
    id: 'south-korea',
    slug: 'south-korea',
    name: 'South Korea',
    region: 'Asia',
    hook: 'The K-Wave experience, where ancient palaces meet cutting-edge pop culture.',
    description: 'Explore the historic Gyeongbokgung Palace, the vibrant streets of Myeongdong, and the stunning volcanic landscapes of Jeju Island. South Korea is a land of high-energy innovation and deep tradition.',
    highlights: [
      'Private tea ceremony in a historic Hanok village',
      'Exclusive K-Pop and K-Drama location tour',
      'Private guided trek on Jeju\'s Hallasan',
      'VIP tour of the DMZ and historic sites'
    ],
    image: 'https://res.cloudinary.com/dnty2fhxp/image/upload/v1774102565/South_Korea_ktdk23.avif',
    accent: 'Ruby',
    usp: 'The K-Wave Experience',
    vibe: 'Ancient palaces meet cutting-edge technology and pop culture.',
    mustDo: 'Visit Gyeongbokgung Palace, explore the vibrant Myeongdong district, and relax on Jeju Island.',
    whyNow: 'K-Pop and K-Drama tours are currently trending.',
    itinerary: [
      { day: 1, title: 'Seoul Arrival', activity: 'Private transfer to your luxury hotel; evening private tour of the N Seoul Tower for city views.' },
      { day: 2, title: 'Imperial Seoul', activity: 'Private tour of Gyeongbokgung Palace and Bukchon Hanok Village; afternoon tea ceremony.' },
      { day: 3, title: 'K-Culture & Shopping', activity: 'Private tour of Gangnam and the COEX Starfield Library; evening street food tour in Myeongdong.' },
      { day: 4, title: 'DMZ Experience', activity: 'Private day trip to the DMZ for a historic tour; evening farewell dinner in Seoul.' },
      { day: 5, title: 'Jeju Island Escape', activity: 'Fly to Jeju; private tour of the Manjanggul Cave and the stunning Jusangjeolli Cliff.' },
      { day: 6, title: 'Sunrise Peak', activity: 'Private guided trek to Seongsan Ilchulbong for sunrise; afternoon at leisure for beach relaxation.' },
      { day: 7, title: 'Jeju Haenyeo', activity: 'Private visit to see the "Haenyeo" (women divers) and a fresh seafood lunch by the sea.' }
    ]
  },
  {
    id: 'spain',
    slug: 'spain',
    name: 'Spain',
    region: 'Europe',
    hook: 'Passion, art, and sun—a vibrant celebration of life in the Mediterranean.',
    description: 'Marvel at the Sagrada Familia in Barcelona, enjoy a tapas crawl in Madrid, and witness a passionate Flamenco show in Seville. Spain is a land of stunning architecture, vibrant festivals, and sun-soaked beaches.',
    highlights: [
      'VIP after-hours tour of the Sagrada Familia',
      'Exclusive tapas and wine tour in Madrid',
      'Private Flamenco performance in a historic cave',
      'Luxury yacht charter along the Costa del Sol'
    ],
    image: 'https://res.cloudinary.com/dnty2fhxp/image/upload/v1774106408/SPAIN_xnxh2b.avif',
    accent: 'Ruby',
    usp: 'Passion, Art & Sun',
    vibe: 'Vibrant festivals, stunning architecture, and sun-soaked beaches.',
    mustDo: 'Marvel at the Sagrada Familia, enjoy a tapas crawl in Madrid, and witness a Flamenco show in Seville.',
    whyNow: 'Tapas crawls in Madrid are a culinary delight.',
    itinerary: [
      { day: 1, title: 'Madrid Arrival', activity: 'Private transfer to your hotel near the Prado; evening private tapas tour in the historic center.' },
      { day: 2, title: 'Art & Royalty', activity: 'VIP tour of the Royal Palace and the Prado Museum; afternoon at leisure in Retiro Park.' },
      { day: 3, title: 'Toledo Day Trip', activity: 'Private excursion to the medieval city of Toledo; explore the cathedral and Jewish Quarter.' },
      { day: 4, title: 'Seville Heritage', activity: 'High-speed train to Seville; evening private flamenco performance in a historic patio.' },
      { day: 5, title: 'Alcázar & Cathedral', activity: 'Private tour of the Real Alcázar and the Giralda; afternoon horse-drawn carriage ride.' },
      { day: 6, title: 'Granada Alhambra', activity: 'Private drive to Granada; sunset tour of the Alhambra and Generalife gardens.' },
      { day: 7, title: 'Barcelona Modernism', activity: 'Fly to Barcelona; private tour of Sagrada Família and Park Güell with skip-the-line access.' },
      { day: 8, title: 'Gothic Quarter', activity: 'Guided walk through the Barri Gòtic and El Born; afternoon private cooking class.' },
      { day: 9, title: 'Montserrat & Wine', activity: 'Private day trip to the Montserrat monastery and a boutique Penedès winery for cava tasting.' },
      { day: 10, title: 'Barcelona Farewell', activity: 'Morning at leisure on the beach or Las Ramblas; private transfer to the airport.' }
    ]
  },
  {
    id: 'sri-lanka',
    slug: 'sri-lanka',
    name: 'Sri Lanka',
    region: 'Asia',
    hook: 'The Pearl of the Indian Ocean, rich in tea estates and ancient wildlife.',
    description: 'Climb the Sigiriya Rock Fortress, take a scenic train ride through the tea country, and go on a leopard safari in Yala. Sri Lanka is a land of lush landscapes, ancient Buddhist heritage, and warm island magic.',
    highlights: [
      'Private sunrise climb of Sigiriya Rock',
      'Exclusive luxury train journey to Ella',
      'Private leopard-tracking safari in Yala',
      'VIP tour of the Temple of the Tooth Relic'
    ],
    image: 'https://res.cloudinary.com/dnty2fhxp/image/upload/v1774087829/Sri_Lanka_n34fuk.avif',
    accent: 'Emerald',
    usp: 'The Pearl of the Indian Ocean',
    vibe: 'Tea estates, wildlife, and ancient Buddhist heritage.',
    mustDo: 'Climb the Sigiriya Rock Fortress, take a scenic train ride through the tea country, and go on a safari in Yala National Park.',
    whyNow: 'Luxury train rides through the tea country are a must.',
    itinerary: [
      { day: 1, title: 'Colombo Arrival', activity: 'Private transfer to your boutique hotel; evening private tour of the historic Fort district.' },
      { day: 2, title: 'Sigiriya Rock', activity: 'Private climb of the Sigiriya Rock Fortress; afternoon private jeep safari in Minneriya National Park.' },
      { day: 3, title: 'Polonnaruwa Ruins', activity: 'Private guided tour of the ancient city ruins by bicycle; afternoon wildlife safari in Minneriya.' },
      { day: 4, title: 'Kandy Heritage', activity: 'Private tour of the Temple of the Tooth Relic and a traditional cultural dance performance.' },
      { day: 5, title: 'Tea Country Train', activity: 'Scenic luxury train ride to Ella; private tour of a historic tea factory and a gourmet lunch.' },
      { day: 6, title: 'Yala Safari', activity: 'Private game drive in Yala National Park in search of leopards; evening luxury tented camp stay.' },
      { day: 7, title: 'Galle Fort', activity: 'Private walking tour of the UNESCO-listed Galle Fort; afternoon at leisure for beach relaxation.' }
    ]
  },
  {
    id: 'switzerland',
    slug: 'switzerland',
    name: 'Switzerland',
    region: 'Europe',
    hook: 'The pinnacle of Alpine luxury, where pristine lakes meet mountain peaks.',
    description: 'Experience the world\'s most scenic train rides, witness the iconic Matterhorn in Zermatt, and cruise the crystal-clear Lake Lucerne. Switzerland is a land of precision, beauty, and world-class luxury.',
    highlights: [
      'Private journey on the Glacier Express',
      'Exclusive helicopter tour over the Matterhorn',
      'Private chocolate masterclass in Zurich',
      'Luxury lakefront villa stay in Lucerne'
    ],
    image: 'https://res.cloudinary.com/dnty2fhxp/image/upload/v1774106409/Switzerland_dqfs23.avif',
    accent: 'Azure',
    usp: 'The Pinnacle of Alpine Luxury',
    vibe: 'Pristine lakes, mountain peaks, and world-class watches.',
    mustDo: 'Take the Glacier Express, witness the Matterhorn in Zermatt, and cruise Lake Lucerne.',
    whyNow: 'Scenic train rides through the Alps are currently peak season.',
    itinerary: [
      { day: 1, title: 'Zurich Arrival', activity: 'Private transfer to your lakeside hotel; evening private tour of the Old Town and a chocolate tasting.' },
      { day: 2, title: 'Lucerne Magic', activity: 'Private boat cruise on Lake Lucerne and a trip to the top of Mount Pilatus via cogwheel railway.' },
      { day: 3, title: 'Mount Pilatus', activity: 'Private excursion to the summit of Mt. Pilatus via the world\'s steepest cogwheel railway.' },
      { day: 4, title: 'Glacier Express', activity: 'Full-day luxury train journey on the Glacier Express with a multi-course lunch in the Excellence Class.' },
      { day: 5, title: 'Zermatt & Matterhorn', activity: 'Private tour of Zermatt and a trip to the Gornergrat for the best views of the Matterhorn.' },
      { day: 6, title: 'Jungfraujoch', activity: 'Private excursion to the "Top of Europe"; afternoon at leisure in Interlaken for boutique shopping.' },
      { day: 7, title: 'Geneva Lakeside', activity: 'Private transfer to Geneva; tour of the Jet d\'Eau and the United Nations; evening farewell dinner.' }
    ]
  },
  {
    id: 'taiwan',
    slug: 'taiwan',
    name: 'Taiwan',
    region: 'Asia',
    hook: 'The Heart of Asia, where vibrant night markets meet majestic mountain peaks.',
    description: 'Explore the neon-lit streets of Taipei, the stunning marble canyons of Taroko Gorge, and the serene beauty of Sun Moon Lake. Taiwan is a land of culinary wonders, deep-rooted traditions, and warm island hospitality.',
    highlights: [
      'VIP access to the Taipei 101 Observatory',
      'Private guided trek through Taroko Gorge',
      'Exclusive tea ceremony in historic Jiufen',
      'Private lantern release in Shifen'
    ],
    image: 'https://res.cloudinary.com/dnty2fhxp/image/upload/v1774102565/Taiwan_tgo2s0.avif',
    accent: 'Teal',
    usp: 'The Heart of Asia',
    vibe: 'Night markets, mountains, and a warm, island soul.',
    mustDo: 'Visit Taipei 101, explore the Taroko Gorge, and experience a lantern release in Shifen.',
    whyNow: 'Lantern releases in Shifen are a magical experience.',
    itinerary: [
      { day: 1, title: 'Taipei Arrival', activity: 'Private transfer to your luxury hotel; evening private food tour of the Raohe Night Market.' },
      { day: 2, title: 'Taipei Icons', activity: 'VIP access to Taipei 101 and a private tour of the National Palace Museum.' },
      { day: 3, title: 'Taroko Gorge', activity: 'Private day trip to Taroko National Park; explore the Marble Canyons and the Eternal Spring Shrine.' },
      { day: 4, title: 'Shifen & Jiufen', activity: 'Private lantern release in Shifen and a sunset tea ceremony in the historic hills of Jiufen.' },
      { day: 5, title: 'Sun Moon Lake', activity: 'Private transfer to Sun Moon Lake; private boat tour and a scenic bicycle ride around the lake.' }
    ]
  },
  {
    id: 'thailand',
    slug: 'thailand',
    name: 'Thailand',
    region: 'Asia',
    hook: 'The Land of Smiles, where vibrant culture meets tropical island paradise.',
    description: 'Explore the neon streets of Bangkok, the lush jungles of Chiang Mai, and the pristine beaches of the Andaman Sea. Thailand is a land of sensory overload, spiritual peace, and warm hospitality.',
    highlights: [
      'Private sunrise tour of Bangkok\'s Grand Palace',
      'Exclusive elephant sanctuary visit in Chiang Mai',
      'Private yacht charter in the Phi Phi Islands',
      'Gourmet street food tour with a local expert'
    ],
    image: 'https://res.cloudinary.com/dnty2fhxp/image/upload/v1774087830/Thailand_sgqbqc.avif',
    accent: 'Emerald',
    usp: 'The Land of Smiles',
    vibe: 'Tropical islands, ancient temples, and vibrant markets.',
    mustDo: 'Island hop in the Phi Phi Islands, visit the Grand Palace in Bangkok, and experience an elephant sanctuary in Chiang Mai.',
    whyNow: 'Private island hopping is the best way to see the coast.',
    itinerary: [
      { day: 1, title: 'Bangkok Arrival', activity: 'Private transfer to your riverside suite; evening private dinner cruise on the Chao Phraya River.' },
      { day: 2, title: 'Royal Bangkok', activity: 'Private tour of the Grand Palace and Wat Pho; afternoon private long-tail boat tour of the canals.' },
      { day: 3, title: 'Ayutthaya Heritage', activity: 'Private day trip to the ancient capital; explore the ruins and enjoy a riverside lunch.' },
      { day: 4, title: 'Chiang Mai Culture', activity: 'Fly to Chiang Mai; private visit to an ethical elephant sanctuary and a sunset temple tour.' },
      { day: 5, title: 'Elephant Sanctuary', activity: 'Private visit to an ethical elephant sanctuary; afternoon private Thai cooking class.' },
      { day: 6, title: 'Chiang Rai Day Trip', activity: 'Private excursion to the White Temple (Wat Rong Khun) and the Golden Triangle.' },
      { day: 7, title: 'Phuket Yachting', activity: 'Fly to Phuket; full-day private yacht charter to the Phi Phi Islands with a secluded bay lunch.' },
      { day: 8, title: 'Krabi Island Hopping', activity: 'Private boat tour of the Hong Islands; evening private dinner on the beach at a luxury resort.' },
      { day: 9, title: 'Koh Samui Bliss', activity: 'Fly to Koh Samui; private spa day followed by a sunset cocktail at a hilltop bar.' }
    ]
  },
  {
    id: 'turkey',
    slug: 'turkey',
    name: 'Turkey',
    region: 'Middle East',
    hook: 'Where East meets West, from the domes of Istanbul to the caves of Cappadocia.',
    description: 'Explore the historic Hagia Sophia, witness the sunrise from a hot air balloon in Cappadocia, and relax on the turquoise coast of Bodrum. Turkey is a land of immense history and dramatic natural beauty.',
    highlights: [
      'Private sunrise hot air balloon in Cappadocia',
      'Exclusive after-hours tour of Hagia Sophia',
      'Private yacht cruise on the Bosphorus',
      'VIP tour of the ancient ruins of Ephesus'
    ],
    image: 'https://res.cloudinary.com/dnty2fhxp/image/upload/v1774102565/Turkey_gqq61s.avif',
    accent: 'Gold',
    usp: 'Where Continents Collide',
    vibe: 'Rich history, stunning landscapes, and a vibrant culture.',
    mustDo: 'Take a hot air balloon ride in Cappadocia, explore the Hagia Sophia, and cruise the Bosphorus in Istanbul.',
    whyNow: 'Hot air ballooning in Cappadocia is a bucket-list item.',
    itinerary: [
      { day: 1, title: 'Istanbul Arrival', activity: 'Private transfer to your Bosphorus-view suite; evening private yacht cruise at sunset.' },
      { day: 2, title: 'Ottoman Heritage', activity: 'VIP tour of the Topkapi Palace and the Hagia Sophia; afternoon private shopping in the Grand Bazaar.' },
      { day: 3, title: 'Byzantine Secrets', activity: 'Private tour of the Blue Mosque and the Basilica Cistern; evening Turkish bath experience.' },
      { day: 4, title: 'Cappadocia Skies', activity: 'Fly to Cappadocia; private sunset horse ride through the Red Valley and a luxury cave hotel stay.' },
      { day: 5, title: 'Balloon Sunrise', activity: 'Sunrise hot air balloon flight; private tour of the Goreme Open Air Museum and a pottery workshop.' },
      { day: 6, title: 'Ihlara Valley', activity: 'Private guided hike through the Ihlara Valley; visit the Selime Monastery.' },
      { day: 7, title: 'Pamukkale Pools', activity: 'Fly to Denizli; private tour of the white travertine terraces and the ancient city of Hierapolis.' },
      { day: 8, title: 'Ephesus Wonders', activity: 'Private drive to Ephesus; VIP tour of the ancient ruins and the Terrace Houses.' },
      { day: 9, title: 'Bodrum Coast', activity: 'Fly to Bodrum; private transfer to your seaside resort; afternoon at leisure for beach relaxation.' },
      { day: 10, title: 'Aegean Farewell', activity: 'Private boat charter along the Bodrum coast; evening farewell seafood dinner by the harbor.' }
    ]
  },
  {
    id: 'usa',
    slug: 'usa',
    name: 'USA',
    region: 'Americas',
    hook: 'The Land of Opportunity, from iconic skylines to breathtaking national parks.',
    description: 'Experience the neon energy of New York City, the majestic depths of the Grand Canyon, and the sun-drenched coast of California. The USA is a land of vast diversity, cinematic landscapes, and world-class entertainment.',
    highlights: [
      'Private helicopter tour of the Manhattan skyline',
      'Exclusive floor landing in the Grand Canyon',
      'VIP access to the Empire State Building',
      'Private wine tasting in the Napa Valley'
    ],
    image: 'https://res.cloudinary.com/dnty2fhxp/image/upload/v1774102565/USA_l81oat.avif',
    accent: 'Azure',
    usp: 'The Land of Opportunity',
    vibe: 'Iconic cities and breathtaking national parks.',
    mustDo: 'Visit the Grand Canyon, experience the neon lights of Times Square, and take a private helicopter tour of Manhattan.',
    whyNow: 'Road trips through the National Parks are currently peak season.',
    itinerary: [
      { day: 1, title: 'NYC Arrival', activity: 'Private transfer to your Manhattan suite; evening private helicopter tour of the skyline.' },
      { day: 2, title: 'Manhattan Icons', activity: 'VIP access to the Empire State Building and a private guided walk through Central Park.' },
      { day: 3, title: 'Statue of Liberty', activity: 'Private boat to Liberty and Ellis Islands; evening Broadway show with premium seating.' },
      { day: 4, title: 'Washington D.C.', activity: 'First-class train to D.C.; private tour of the Capitol and the Smithsonian Museums.' },
      { day: 5, title: 'Monument Walk', activity: 'Private evening tour of the Lincoln, Jefferson, and WWII memorials under the lights.' },
      { day: 6, title: 'Las Vegas Energy', activity: 'Fly to Las Vegas; evening private limousine tour of the Strip and a Cirque du Soleil show.' },
      { day: 7, title: 'Grand Canyon Heli', activity: 'Private helicopter excursion with a landing on the canyon floor.' },
      { day: 8, title: 'Antelope Canyon', activity: 'Private tour of the Antelope Canyon and Horseshoe Bend with a professional photographer.' },
      { day: 9, title: 'Vegas VIP', activity: 'Private limo tour of the Las Vegas Strip and a VIP table at a world-class show.' },
      { day: 10, title: 'LA & Malibu', activity: 'Fly to LA; private tour of Hollywood and a sunset dinner at a beachfront Malibu restaurant.' },
      { day: 11, title: 'San Francisco Bay', activity: 'Fly to SF; private tour of the Golden Gate Bridge and a sunset cruise around Alcatraz.' },
      { day: 12, title: 'Napa Valley Farewell', activity: 'Private day trip to Napa Valley for exclusive winery tours and a farewell gourmet lunch.' }
    ]
  },
  {
    id: 'uzbekistan',
    slug: 'uzbekistan',
    name: 'Uzbekistan',
    region: 'Asia',
    hook: 'The heart of the Silk Road, where blue-tiled domes meet ancient desert cities.',
    description: 'Explore the majestic Registan Square in Samarkand, the historic Old City of Bukhara, and the ancient walls of Khiva. Uzbekistan is a land of stunning Islamic architecture and legendary Silk Road history.',
    highlights: [
      'Private sunset tour of Samarkand\'s Registan',
      'Exclusive visit to a traditional silk paper workshop',
      'Private tour of Bukhara\'s ancient Ark Fortress',
      'Traditional Uzbek feast with a local family'
    ],
    image: 'https://res.cloudinary.com/dnty2fhxp/image/upload/v1774087829/Uzbekistan_btqnp8.avif',
    accent: 'Ruby',
    usp: 'The Heart of the Silk Road',
    vibe: 'Blue-tiled mosques and a rich, ancient history.',
    mustDo: 'Marvel at Registan Square in Samarkand, explore the old city of Bukhara, and visit the walled city of Khiva.',
    whyNow: 'New high-speed trains making travel between cities easy.',
    itinerary: [
      { day: 1, title: 'Tashkent Arrival', activity: 'Private transfer to your hotel; evening private tour of the Tashkent Metro and the Chorsu Bazaar.' },
      { day: 2, title: 'Samarkand Grandeur', activity: 'High-speed train to Samarkand; private tour of the Registan Square and the Shah-i-Zinda necropolis.' },
      { day: 3, title: 'Bukhara Heritage', activity: 'High-speed train to Bukhara; private walking tour of the ancient mosques and the Ark Fortress.' },
      { day: 4, title: 'Khiva Walled City', activity: 'Fly to Urgench; private tour of the Ichan-Kala fortress in Khiva and a sunset dinner on the walls.' },
      { day: 5, title: 'Silk Road Farewell', activity: 'Morning at leisure for artisan shopping; afternoon private transfer for your departure flight.' },
      { day: 6, title: 'Fergana Valley', activity: 'Private day trip to the Fergana Valley; visit local silk and pottery workshops.' }
    ]
  },
  {
    id: 'vietnam',
    slug: 'vietnam',
    name: 'Vietnam',
    region: 'Asia',
    hook: 'A land of profound beauty, from the limestone peaks of Ha Long Bay to the vibrant streets of Hoi An.',
    description: 'Cruise the emerald waters of Ha Long Bay, explore the historic streets of Hoi An, and experience the high-energy pulse of Ho Chi Minh City. Vietnam is a land of stunning nature, rich history, and world-class cuisine.',
    highlights: [
      'Private overnight cruise in Ha Long Bay',
      'Exclusive lantern-making class in Hoi An',
      'Private tour of the Cu Chi Tunnels',
      'Gourmet street food tour in Hanoi'
    ],
    image: 'https://res.cloudinary.com/dnty2fhxp/image/upload/v1774087830/Vietnam_rdcuiz.avif',
    accent: 'Ruby',
    usp: 'Timeless Charm & Street Food',
    vibe: 'Staggering natural beauty and a rich, ancient heritage.',
    mustDo: 'Cruise Ha Long Bay, explore the ancient town of Hoi An, and experience a street food tour in Hanoi.',
    whyNow: 'Overnight cruises in Ha Long Bay are a must-try.',
    itinerary: [
      { day: 1, title: 'Hanoi Arrival', activity: 'Private transfer to your French Quarter hotel; evening VIP street food tour with a local chef.' },
      { day: 2, title: 'Hanoi Heritage', activity: 'Private tour of the Ho Chi Minh Complex and the Temple of Literature; evening Water Puppet show.' },
      { day: 3, title: 'Halong Bay Cruise', activity: 'Private transfer to Ha Long Bay; overnight luxury cruise with kayaking and a sunset deck dinner.' },
      { day: 4, title: 'Bay Exploration', activity: 'Morning tai chi on deck; visit hidden caves and floating villages; return to Hanoi.' },
      { day: 5, title: 'Hoi An Ancient Town', activity: 'Fly to Da Nang; private walking tour of the lantern-lit streets and a tailor-made suit experience.' },
      { day: 6, title: 'My Son Sanctuary', activity: 'Private sunrise tour of the Champa ruins; afternoon private cooking class in a local garden.' },
      { day: 7, title: 'Hue Imperial City', activity: 'Private drive over the Hai Van Pass to Hue; private tour of the Imperial Citadel and royal tombs.' },
      { day: 8, title: 'Ho Chi Minh City', activity: 'Fly to Saigon; evening private tour of the city’s rooftop bars and colonial landmarks.' },
      { day: 9, title: 'Mekong Delta', activity: 'Private boat tour of the Mekong Delta; visit local workshops and enjoy a traditional lunch.' },
      { day: 10, title: 'Cu Chi Tunnels', activity: 'Private morning tour of the Cu Chi Tunnels; afternoon at leisure for shopping before departure.' }
    ]
  }
];

export const CONTACT_INFO = {
  whatsapp: 'https://wa.me/917007106463',
  instagram: 'https://www.instagram.com/tripguruindia/',
  linkedin: 'https://www.linkedin.com/company/tripguru-india/',
  facebook: 'https://www.facebook.com/tripguruindia',
  email: 'travel@tripguruindia.com',
  phone: '+91 7007106463'
};

export const LOGO_URL = 'https://res.cloudinary.com/dnty2fhxp/image/upload/v1773128212/TripGuru_Logo_WITHOUT_BACKGROUND_WITHOUT_INDIA_kjgdbk.png';
