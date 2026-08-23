// seedData.js - Updated database in Indian Rupees (INR / ₹) with 5x3 Hotel Master Matrix

import { isAdminSession, syncAdminDb } from '../utils/apiClient';

export const INITIAL_CITIES = [
  'Kathmandu', 'Pokhara', 'Chitwan', 'Nagarkot', 'Lumbini',
  'Butwal', 'Bhairahawa', 'Jomsom'
];

// One airport can serve several cities (Bhairahawa serves Lumbini, Butwal and
// Bhairahawa itself), and the airport's name often differs from the city it
// serves (Chitwan flies via Bharatpur) -- which is why this is its own list
// rather than a flag on a city. The quote builder offers a flight leg only
// between two cities whose airports differ, so Lumbini->Butwal (both on
// Bhairahawa) correctly stays road-only.
export const INITIAL_AIRPORTS = [
  { id: "apt-ktm", name: "Tribhuvan International Airport", code: "KTM", cities: ["Kathmandu"] },
  { id: "apt-pkr", name: "Pokhara International Airport", code: "PKR", cities: ["Pokhara"] },
  { id: "apt-bhr", name: "Bharatpur Airport", code: "BHR", cities: ["Chitwan"] },
  { id: "apt-bwa", name: "Gautam Buddha International Airport (Bhairahawa)", code: "BWA", cities: ["Lumbini", "Butwal", "Bhairahawa"] },
  { id: "apt-jmo", name: "Jomsom Airport", code: "JMO", cities: ["Jomsom"] }
];

export const INITIAL_HOTELS = [
  // Kathmandu Hotels
  {
    id: "h-ktm-3",
    name: "Hotel Tibet",
    city: "Kathmandu",
    category: "3-Star",
    description: "A charming boutique hotel decorated in authentic Tibetan style, located near Lazimpat.",
    rates: {
      single:      { CP: 3800, MAP: 4800, AP: 5800 },
      double:      { CP: 4500, MAP: 6000, AP: 7500 },
      extra_adult: { CP: 1400, MAP: 2200, AP: 3000 },
      cwb:         { CP: 1000, MAP: 1800, AP: 2600 },
      cnb:         { CP: 400,  MAP: 1000, AP: 1600 }
    }
  },
  {
    id: "h-ktm-4",
    name: "Hotel Shanker",
    city: "Kathmandu",
    category: "4-Star",
    description: "A historic heritage hotel housed in a 19th-century royal palace near Lazimpat.",
    rates: {
      single:      { CP: 7000, MAP: 8500,  AP: 10000 },
      double:      { CP: 8000, MAP: 10500, AP: 13000 },
      extra_adult: { CP: 2200, MAP: 3400,  AP: 4600 },
      cwb:         { CP: 1800, MAP: 2800,  AP: 3800 },
      cnb:         { CP: 800,  MAP: 1600,  AP: 2400 }
    }
  },
  {
    id: "h-ktm-5",
    name: "Kathmandu Marriott Hotel",
    city: "Kathmandu",
    category: "5-Star",
    description: "A luxury modern hotel in the heart of Naxal offering world-class amenities and dining.",
    rates: {
      single:      { CP: 16000, MAP: 18500, AP: 21000 },
      double:      { CP: 18000, MAP: 22000, AP: 26000 },
      extra_adult: { CP: 4000,  MAP: 6000,  AP: 8000 },
      cwb:         { CP: 3000,  MAP: 5000,  AP: 7000 },
      cnb:         { CP: 1500,  MAP: 3000,  AP: 4500 }
    }
  },

  // Pokhara Hotels
  {
    id: "h-pok-3",
    name: "Hotel Silver Oaks Inn",
    city: "Pokhara",
    category: "3-Star",
    description: "A cozy family-run hotel with a beautiful garden, situated in a quiet corner of Lakeside.",
    rates: {
      single:      { CP: 3000, MAP: 3800, AP: 4600 },
      double:      { CP: 3800, MAP: 5000, AP: 6200 },
      extra_adult: { CP: 1000, MAP: 1600, AP: 2200 },
      cwb:         { CP: 800,  MAP: 1400, AP: 2000 },
      cnb:         { CP: 300,  MAP: 800,  AP: 1300 }
    }
  },
  {
    id: "h-pok-4",
    name: "Temple Tree Resort & Spa",
    city: "Pokhara",
    category: "4-Star",
    description: "Boutique resort with traditional Western-Nepal stone architecture and a gorgeous swimming pool.",
    rates: {
      single:      { CP: 7500, MAP: 9000,  AP: 10500 },
      double:      { CP: 9000, MAP: 11500, AP: 14000 },
      extra_adult: { CP: 2500, MAP: 3700,  AP: 4900 },
      cwb:         { CP: 2000, MAP: 3000,  AP: 4000 },
      cnb:         { CP: 900,  MAP: 1700,  AP: 2500 }
    }
  },
  {
    id: "h-pok-5",
    name: "Pokhara Grande",
    city: "Pokhara",
    category: "5-Star",
    description: "A deluxe resort hotel boasting spectacular views of the Annapurna range and a tranquil spa.",
    rates: {
      single:      { CP: 13500, MAP: 15500, AP: 17500 },
      double:      { CP: 15000, MAP: 18500, AP: 22000 },
      extra_adult: { CP: 3800,  MAP: 5500,  AP: 7200 },
      cwb:         { CP: 2800,  MAP: 4500,  AP: 6200 },
      cnb:         { CP: 1200,  MAP: 2500,  AP: 3800 }
    }
  },

  // Chitwan Hotels
  {
    id: "h-chi-3",
    name: "Hotel Parkside",
    city: "Chitwan",
    category: "3-Star",
    description: "Located near Sauraha, offering clean rooms, eco-tours, and a welcoming garden terrace.",
    rates: {
      single:      { CP: 3400, MAP: 4400, AP: 5400 },
      double:      { CP: 4200, MAP: 5600, AP: 7000 },
      extra_adult: { CP: 1200, MAP: 1800, AP: 2400 },
      cwb:         { CP: 900,  MAP: 1500, AP: 2100 },
      cnb:         { CP: 350,  MAP: 850,  AP: 1350 }
    }
  },
  {
    id: "h-chi-4",
    name: "Landmark Forest Park",
    city: "Chitwan",
    category: "4-Star",
    description: "Spacious lodge in Sauraha with direct jungle accessibility, featuring a pool and Tharu hospitality.",
    rates: {
      single:      { CP: 6800, MAP: 8200,  AP: 9600 },
      double:      { CP: 8000, MAP: 10400, AP: 12800 },
      extra_adult: { CP: 2200, MAP: 3400,  AP: 4600 },
      cwb:         { CP: 1600, MAP: 2600,  AP: 3600 },
      cnb:         { CP: 700,  MAP: 1500,  AP: 2300 }
    }
  },
  {
    id: "h-chi-5",
    name: "Barahi Jungle Lodge",
    city: "Chitwan",
    category: "5-Star",
    description: "An ultra-luxury safari lodge on the banks of Rapti River, offering premium jungle safaris.",
    rates: {
      single:      { CP: 18500, MAP: 21500, AP: 24500 },
      double:      { CP: 21000, MAP: 25500, AP: 30000 },
      extra_adult: { CP: 5000,  MAP: 7500,  AP: 10000 },
      cwb:         { CP: 3800,  MAP: 6000,  AP: 8200 },
      cnb:         { CP: 1800,  MAP: 3500,  AP: 5200 }
    }
  },

  // Nagarkot Hotels
  {
    id: "h-nag-3",
    name: "Hotel Country Villa",
    city: "Nagarkot",
    category: "3-Star",
    description: "Perched on the ridge line, offering panoramic views of the Himalayas from private balconies.",
    rates: {
      single:      { CP: 4200, MAP: 5400, AP: 6600 },
      double:      { CP: 5000, MAP: 6800, AP: 8600 },
      extra_adult: { CP: 1500, MAP: 2300, AP: 3100 },
      cwb:         { CP: 1100, MAP: 1900, AP: 2700 },
      cnb:         { CP: 450,  MAP: 1050, AP: 1650 }
    }
  },
  {
    id: "h-nag-4",
    name: "Club Himalaya Resort",
    city: "Nagarkot",
    category: "4-Star",
    description: "A popular resort offering a 360-degree viewpoint of the mountain range, heated indoor pool.",
    rates: {
      single:      { CP: 8000, MAP: 9800,  AP: 11600 },
      double:      { CP: 9800, MAP: 12500, AP: 15200 },
      extra_adult: { CP: 2600, MAP: 3800,  AP: 5000 },
      cwb:         { CP: 2000, MAP: 3000,  AP: 4000 },
      cnb:         { CP: 950,  MAP: 1750,  AP: 2550 }
    }
  },
  {
    id: "h-nag-5",
    name: "Mystic Mountain Resort",
    city: "Nagarkot",
    category: "5-Star",
    description: "Luxury property designed with terraces cascading down the hillside, facing directly north towards the peaks.",
    rates: {
      single:      { CP: 14500, MAP: 17000, AP: 19500 },
      double:      { CP: 16000, MAP: 20000, AP: 24000 },
      extra_adult: { CP: 4200,  MAP: 6200,  AP: 8200 },
      cwb:         { CP: 3200,  MAP: 5200,  AP: 7200 },
      cnb:         { CP: 1400,  MAP: 2800,  AP: 4200 }
    }
  }
];

export const INITIAL_VEHICLES = [
  {
    id: "v-sedan",
    name: "Sedan (Car)",
    description: "Ideal for couple or solo travelers. Fits 1-3 passengers + light luggage.",
    capacity: 3,
    daily_sightseeing_rate: 3800,
    route_rates: {
      ktm_airport_transfer: 1200,
      ktm_to_pokhara: 8000,
      pokhara_to_chitwan: 7000,
      chitwan_to_ktm: 9500,
      ktm_to_nagarkot: 3000,
      nagarkot_to_ktm: 3000,
      pokhara_to_ktm: 8000,
      local_sightseeing: 3800
    }
  },
  {
    id: "v-suv",
    name: "SUV / Scorpio",
    description: "Spacious rough-terrain vehicle, great for families. Fits 4-5 passengers.",
    capacity: 5,
    daily_sightseeing_rate: 6500,
    route_rates: {
      ktm_airport_transfer: 2000,
      ktm_to_pokhara: 12500,
      pokhara_to_chitwan: 11000,
      chitwan_to_ktm: 14500,
      ktm_to_nagarkot: 5000,
      nagarkot_to_ktm: 5000,
      pokhara_to_ktm: 12500,
      local_sightseeing: 6500
    }
  },
  {
    id: "v-hiace",
    name: "Toyota Hiace (Minivan)",
    description: "Excellent for small tour groups. Fits 6-12 passengers comfortably.",
    capacity: 12,
    daily_sightseeing_rate: 9500,
    route_rates: {
      ktm_airport_transfer: 3500,
      ktm_to_pokhara: 18000,
      pokhara_to_chitwan: 16000,
      chitwan_to_ktm: 21000,
      ktm_to_nagarkot: 7500,
      nagarkot_to_ktm: 7500,
      pokhara_to_ktm: 18000,
      local_sightseeing: 9500
    }
  },
  {
    id: "v-coaster",
    name: "Toyota Coaster (Mini Bus)",
    description: "Standard option for larger groups. Fits 13-20 passengers with luggage.",
    capacity: 20,
    daily_sightseeing_rate: 15000,
    route_rates: {
      ktm_airport_transfer: 6000,
      ktm_to_pokhara: 30000,
      pokhara_to_chitwan: 26000,
      chitwan_to_ktm: 35000,
      ktm_to_nagarkot: 12000,
      nagarkot_to_ktm: 12000,
      pokhara_to_ktm: 30000,
      local_sightseeing: 15000
    }
  }
];

export const INITIAL_ACTIVITIES = [
  // Kathmandu Activities
  {
    id: "a-ktm-everest",
    name: "Everest Mountain Flight (1 Hour)",
    city: "Kathmandu",
    description: "Fly close to the world's tallest peaks, including Mt. Everest, with a guaranteed window seat.",
    price_adult: 19500,
    price_child: 17000
  },
  {
    id: "a-ktm-sightseeing",
    name: "Heritage Sightseeing Entry & Guide",
    city: "Kathmandu",
    description: "Full-day guided historical tour of Swayambhunath, Boudhanath, and Kathmandu Durbar Square.",
    price_adult: 3000,
    price_child: 1800
  },
  {
    id: "a-ktm-cablecar",
    name: "Chandragiri Hills Cable Car Ticket",
    city: "Kathmandu",
    description: "Cable car tickets to Chandragiri Hills, providing a sweeping view of Kathmandu valley and mountains.",
    price_adult: 2200,
    price_child: 1300
  },

  // Pokhara Activities
  {
    id: "a-pok-sunrise",
    name: "Sarangkot Sunrise Excursion",
    city: "Pokhara",
    description: "Early morning drive to Sarangkot hill for a breathtaking sunrise over Annapurna and Dhaulagiri.",
    price_adult: 1800,
    price_child: 1000
  },
  {
    id: "a-pok-paragliding",
    name: "Tandem Paragliding in Pokhara",
    city: "Pokhara",
    description: "Fly like a bird from Sarangkot over Lakeside Pokhara, guided by certified tandem pilots.",
    price_adult: 6500,
    price_child: 6500
  },
  {
    id: "a-pok-zipflyer",
    name: "Pokhara ZipFlyer Extreme",
    city: "Pokhara",
    description: "One of the longest and steepest zip lines in the world with a vertical drop of 600m.",
    price_adult: 5500,
    price_child: 5500
  },
  {
    id: "a-pok-boating",
    name: "Private Fewa Lake Boating (1 Hour)",
    city: "Pokhara",
    description: "Enjoy a scenic boat ride on Lake Fewa with visits to the Tal Barahi Temple on the island.",
    price_adult: 1200,
    price_child: 800
  },

  // Chitwan Activities
  {
    id: "a-chi-safari",
    name: "Jungle Jeep Safari (Half Day)",
    city: "Chitwan",
    description: "Go deep into the Chitwan National Park in an open-top Jeep to spot One-Horned Rhinos, deer, and Royal Bengal Tigers.",
    price_adult: 2500,
    price_child: 1600
  },
  {
    id: "a-chi-canoe",
    name: "Rapti River Canoeing & Bird Watching",
    city: "Chitwan",
    description: "Canoe down the Rapti River in a hand-carved dugout canoe to see mugger crocodiles and water birds.",
    price_adult: 1500,
    price_child: 1000
  },
  {
    id: "a-chi-dance",
    name: "Tharu Cultural Dance Show",
    city: "Chitwan",
    description: "Vibrant traditional Tharu stick dance performance illustrating Tharu history and culture.",
    price_adult: 800,
    price_child: 400
  },

  // Nagarkot Activities
  {
    id: "a-nag-sunrise",
    name: "Nagarkot Sunrise & Village Hike",
    city: "Nagarkot",
    description: "Watch a spectacular sunrise, followed by an easy 3-hour hike through local villages and terraced farms.",
    price_adult: 1800,
    price_child: 1000
  },

  // Full-day local sightseeing, priced per VEHICLE rather than per head: one
  // car out for one day costs the same whether two people ride in it or
  // twelve. Rates carried over from the vehicles' former
  // daily_sightseeing_rate so existing quotes reprice identically.
  ...["Kathmandu", "Pokhara", "Chitwan", "Nagarkot", "Lumbini", "Butwal", "Bhairahawa", "Jomsom"].map((city) => ({
    id: `a-sightseeing-${city.toLowerCase()}`,
    name: `${city} Full-Day Sightseeing (Vehicle)`,
    city,
    description: `Private vehicle at your disposal for a full day of local sightseeing in ${city}.`,
    price_adult: 0,
    price_child: 0,
    pricing_mode: "per_vehicle",
    vehicle_rates: { "v-sedan": 3800, "v-suv": 6500, "v-hiace": 9500, "v-coaster": 15000 }
  }))
];

export const INITIAL_PACKAGES = [
  {
    id: "pkg-glimpse",
    name: "Glimpse of Nepal Tour",
    description: "A perfect 4-Night introduction highlighting the architectural heritage of Kathmandu and lakeside beauty of Pokhara.",
    duration_nights: 4,
    default_hotel_category: "4-Star",
    default_vehicle_id: "v-suv",
    starting_price_override: 21999,
    cities: ["Kathmandu", "Pokhara"],
    days: [
      {
        day: 1,
        city: "Kathmandu",
        title: "Kathmandu Arrival",
        description: "Receive airport transfer and check-in to your hotel. Attend a evening brief and welcome dinner.",
        transfer_route: "ktm_airport_transfer",
        is_sightseeing: false,
        activity_ids: []
      },
      {
        day: 2,
        city: "Kathmandu",
        title: "Explore Historic Kathmandu",
        description: "Full day sightseeing in Kathmandu visiting Swayambhunath temple (Monkey Temple) and Boudhanath Stupa.",
        transfer_route: "local_sightseeing",
        is_sightseeing: true,
        activity_ids: ["a-ktm-sightseeing"]
      },
      {
        day: 3,
        city: "Pokhara",
        title: "Scenic Drive to Pokhara",
        description: "Drive from Kathmandu to Pokhara. Check-in to Lakeside hotel. Take a tranquil evening boat ride on Fewa Lake.",
        transfer_route: "ktm_to_pokhara",
        is_sightseeing: false,
        activity_ids: ["a-pok-boating"]
      },
      {
        day: 4,
        city: "Pokhara",
        title: "Sunrise & Pokhara Sightseeing",
        description: "Sunrise trip to Sarangkot for stunning Himalayan vistas. Afternoon sightseeing covering Davis Falls, Gupteshwor Cave and Peace Stupa.",
        transfer_route: "local_sightseeing",
        is_sightseeing: true,
        activity_ids: ["a-pok-sunrise"]
      },
      {
        day: 5,
        city: "Kathmandu",
        title: "Return Drive & Departure",
        description: "Drive back from Pokhara to Kathmandu airport for your outbound international departure.",
        transfer_route: "pokhara_to_ktm",
        is_sightseeing: false,
        activity_ids: []
      }
    ]
  },
  {
    id: "pkg-heritage-wildlife",
    name: "Nepal Heritage, Wildlife & Lakes",
    description: "A comprehensive 6-Night itinerary combining Kathmandu culture, Pokhara's Annapurna views, and jungle wildlife safari in Chitwan.",
    duration_nights: 6,
    default_hotel_category: "4-Star",
    default_vehicle_id: "v-suv",
    starting_price_override: 45999,
    cities: ["Kathmandu", "Pokhara", "Chitwan"],
    days: [
      {
        day: 1,
        city: "Kathmandu",
        title: "Arrival in Kathmandu",
        description: "Airport transfer to your hotel. Relax and explore Thamel tourist hub in the evening.",
        transfer_route: "ktm_airport_transfer",
        is_sightseeing: false,
        activity_ids: []
      },
      {
        day: 2,
        city: "Kathmandu",
        title: "UNESCO Heritage Sites",
        description: "Guided tour of Swayambhunath, Boudhanath Stupa, and Kathmandu Durbar Square.",
        transfer_route: "local_sightseeing",
        is_sightseeing: true,
        activity_ids: ["a-ktm-sightseeing"]
      },
      {
        day: 3,
        city: "Pokhara",
        title: "Drive to Lakeside Pokhara",
        description: "Scenic overland journey to Pokhara along Trishuli river. Spend a relaxing evening by Lakeside.",
        transfer_route: "ktm_to_pokhara",
        is_sightseeing: false,
        activity_ids: []
      },
      {
        day: 4,
        city: "Pokhara",
        title: "Pokhara Highlights & Sunrise",
        description: "Sarangkot sunrise view, followed by Pokhara city sightseeing and an afternoon boat ride on Fewa Lake.",
        transfer_route: "local_sightseeing",
        is_sightseeing: true,
        activity_ids: ["a-pok-sunrise", "a-pok-boating"]
      },
      {
        day: 5,
        city: "Chitwan",
        title: "Drive to Chitwan Safari Haven",
        description: "Drive to Chitwan National Park. Refresh at the resort, followed by a Tharu village walk and cultural dance show in the evening.",
        transfer_route: "pokhara_to_chitwan",
        is_sightseeing: false,
        activity_ids: ["a-chi-dance"]
      },
      {
        day: 6,
        city: "Chitwan",
        title: "Jungle Safari & Crocodile Spotting",
        description: "Morning dugout canoe ride. Half-day open Jeep safari to spot wild Rhinos, deer, leopards and birds.",
        transfer_route: "local_sightseeing",
        is_sightseeing: true,
        activity_ids: ["a-chi-safari", "a-chi-canoe"]
      },
      {
        day: 7,
        city: "Kathmandu",
        title: "Drive to Kathmandu & Departure",
        description: "Drive back from Chitwan to Kathmandu. Stop for souvenir shopping before transferring to the airport.",
        transfer_route: "chitwan_to_ktm",
        is_sightseeing: false,
        activity_ids: []
      }
    ]
  },
  {
    id: "pkg-escape",
    name: "Nagarkot & Kathmandu Escape",
    description: "A short 3-Night getaway to experience local cultures, ancient Bhaktapur, and sunrise over the central Himalayas in Nagarkot.",
    duration_nights: 3,
    default_hotel_category: "3-Star",
    default_vehicle_id: "v-sedan",
    starting_price_override: 13499,
    cities: ["Kathmandu", "Nagarkot"],
    days: [
      {
        day: 1,
        city: "Kathmandu",
        title: "Arrival in Kathmandu",
        description: "Airport transfer to your hotel. Visit Pashupatinath temple for evening Aarati rituals.",
        transfer_route: "ktm_airport_transfer",
        is_sightseeing: false,
        activity_ids: []
      },
      {
        day: 2,
        city: "Nagarkot",
        title: "Bhaktapur Sightseeing & Drive to Nagarkot",
        description: "Visit medieval Bhaktapur Durbar Square (historic city). Later, drive up the ridge to Nagarkot for an epic mountain sunset view.",
        transfer_route: "ktm_to_nagarkot",
        is_sightseeing: false,
        activity_ids: []
      },
      {
        day: 3,
        city: "Kathmandu",
        title: "Sunrise & Return to Kathmandu",
        description: "View sunrise over Everest, Langtang and Ganesh ranges. Return to Kathmandu. Cable car ride at Chandragiri Hills.",
        transfer_route: "nagarkot_to_ktm",
        is_sightseeing: false,
        activity_ids: ["a-ktm-cablecar"]
      },
      {
        day: 4,
        city: "Kathmandu",
        title: "Departure Transfer",
        description: "Check out of the hotel. Free time for shopping in Thamel until airport departure transfer.",
        transfer_route: "ktm_airport_transfer",
        is_sightseeing: false,
        activity_ids: []
      }
    ]
  }
];

export const INITIAL_SETTINGS = {
  markup_percent: 15,
  b2c_markup_percent: 15,
  b2b_markup_percent: 10,
  tax_percent: 5,
  tax_enabled: true,
  exchange_rate: 1.0,
  popup_poster_url: "/nepal_hero.png",
  popup_poster_active: true
};

export const INITIAL_BOOKINGS = [
  {
    id: "qt-1001",
    client_name: "Rahul Sharma",
    email: "rahul.sharma@example.com",
    phone: "+91 98765 43210",
    travel_date: "2026-10-15",
    adults: 2,
    cwb: 0,
    cnb: 0,
    total_price: 110500,
    package_name: "Glimpse of Nepal Tour",
    status: "Confirmed",
    created_at: "2026-05-20T10:15:30Z",
    itinerary_summary: "4 Nights, 2 Adults, 1 Double Room (4-Star Hotels), SUV vehicle.",
    passengers: [
      { name: "Rahul Sharma", type: "Adult" },
      { name: "Priya Sharma", type: "Adult" }
    ],
    type: "B2C"
  },
  {
    id: "qt-1002",
    client_name: "Anita Patel (Agent Guest)",
    email: "anita.patel@horizon.com",
    phone: "+91 98888 77777",
    travel_date: "2026-11-20",
    adults: 2,
    cwb: 0,
    cnb: 0,
    total_price: 145000,
    package_name: "Nepal Heritage, Wildlife & Lakes",
    status: "Confirmed",
    created_at: "2026-05-21T09:12:00Z",
    itinerary_summary: "6 Nights, 2 Adults, 1 Double Room (4-Star Hotels), SUV vehicle.",
    passengers: [
      { name: "Anita Patel", type: "Adult" },
      { name: "Suresh Patel", type: "Adult" }
    ],
    type: "B2B",
    agent_id: "AGT-9021",
    agent_commission: 14500
  }
];

export const INITIAL_ROUTES = [
  { key: "local_sightseeing", name: "Local Sightseeing", description: "Enjoy full-day private vehicle sightseeing around local monuments, shopping, and scenic spots." },
  // Airport <-> hotel runs, one per city with air access. Keyed
  // `<citykey>_airport_transfer` so the builder can find one from a city name.
  // Priced per CITY, not per airport: the drive from a shared airport differs
  // by city (Bhairahawa->Lumbini is not Bhairahawa->Butwal).
  { key: "ktm_airport_transfer", name: "Kathmandu Airport Transfer", description: "Receive private vehicle airport pickup or departure transfer in Kathmandu." },
  { key: "pokhara_airport_transfer", name: "Pokhara Airport Transfer", description: "Private vehicle transfer between Pokhara airport and your Pokhara hotel." },
  { key: "chitwan_airport_transfer", name: "Chitwan (Bharatpur) Airport Transfer", description: "Private vehicle transfer between Bharatpur airport and your Chitwan resort." },
  { key: "lumbini_airport_transfer", name: "Lumbini Airport Transfer", description: "Private vehicle transfer between Bhairahawa airport and your Lumbini hotel." },
  { key: "butwal_airport_transfer", name: "Butwal Airport Transfer", description: "Private vehicle transfer between Bhairahawa airport and your Butwal hotel." },
  { key: "bhairahawa_airport_transfer", name: "Bhairahawa Airport Transfer", description: "Private vehicle transfer between Bhairahawa airport and your Bhairahawa hotel." },
  { key: "jomsom_airport_transfer", name: "Jomsom Airport Transfer", description: "Private vehicle transfer between Jomsom airport and your Jomsom hotel." },
  { key: "ktm_to_pokhara", name: "Kathmandu to Pokhara Overland", description: "Scenic highway transfer from Kathmandu to Pokhara with views of Trishuli river." },
  { key: "pokhara_to_chitwan", name: "Pokhara to Chitwan Overland", description: "Drive from Pokhara down to the subtropical plains of Chitwan National Park." },
  { key: "chitwan_to_ktm", name: "Chitwan to Kathmandu Overland", description: "Drive from Chitwan safari wilderness back to Kathmandu valley." },
  { key: "ktm_to_nagarkot", name: "Kathmandu to Nagarkot drive", description: "Uphill drive from Kathmandu to the scenic ridge resort village of Nagarkot." },
  { key: "nagarkot_to_ktm", name: "Nagarkot to Kathmandu drive", description: "Downhill drive returning from the high ridge of Nagarkot back to Kathmandu." },
  { key: "pokhara_to_ktm", name: "Pokhara to Kathmandu Overland", description: "Overland highway transfer from Pokhara returning back to Kathmandu." }
];

export const INITIAL_USERS = [
  {
    id: "usr-admin",
    email: "admin@nepaltravel.com",
    password: "admin",
    role: "admin",
    fullName: "System Admin",
    phone: "9801234567",
    countryCode: "+977"
  },
  {
    id: "usr-agent",
    email: "agent@horizon.com",
    password: "agent",
    role: "b2b",
    fullName: "Agent Horizon",
    phone: "9876543210",
    countryCode: "+91",
    agencyName: "Horizon Travel Partners",
    agencyAddress: "123 Travel Street, Delhi",
    agencyPhone: "9876543210",
    agencyEmail: "booking@horizontravel.com",
    agencyWebsite: "www.horizontravel.com",
    walletBalance: 145200
  },
  {
    id: "usr-client",
    email: "client@test.com",
    password: "client",
    role: "b2c",
    fullName: "John Doe",
    phone: "9999999999",
    countryCode: "+91",
    address: "456 Residence St, Bangalore"
  }
];

// Helper to initialize and retrieve database from localStorage (V2 database for new schema)
export function initializeDB() {
  if (typeof window === "undefined") return null;

  const getOrSet = (key, defaultVal) => {
    const val = localStorage.getItem(key);
    if (!val) {
      localStorage.setItem(key, JSON.stringify(defaultVal));
      return defaultVal;
    }
    try {
      return JSON.parse(val);
    } catch (e) {
      localStorage.setItem(key, JSON.stringify(defaultVal));
      return defaultVal;
    }
  };

  return {
    cities: getOrSet("nepal_quote_cities_v2", INITIAL_CITIES),
    airports: getOrSet("nepal_quote_airports_v2", INITIAL_AIRPORTS),
    hotels: getOrSet("nepal_quote_hotels_v2", INITIAL_HOTELS),
    vehicles: getOrSet("nepal_quote_vehicles_v2", INITIAL_VEHICLES),
    routes: getOrSet("nepal_quote_routes_v2", INITIAL_ROUTES),
    activities: getOrSet("nepal_quote_activities_v2", INITIAL_ACTIVITIES),
    packages: getOrSet("nepal_quote_packages_v2", INITIAL_PACKAGES),
    settings: getOrSet("nepal_quote_settings_v2", INITIAL_SETTINGS),
    bookings: getOrSet("nepal_quote_bookings_v2", INITIAL_BOOKINGS),
    leads: getOrSet("nepal_quote_leads_v2", []),
    users: getOrSet("nepal_quote_users_v2", INITIAL_USERS)
  };
}

// `oldDb` (the db state before this change) is optional but required for
// admin sessions to sync efficiently -- see syncAdminDb() in apiClient.js,
// which diffs newDb against oldDb per top-level key so only what actually
// changed is PUT/POST/DELETEd to the server. Every top-level mutation in
// App.jsx funnels through updateDBState(), which supplies it.
export function saveDB(db, oldDb) {
  if (typeof window === "undefined") return;
  // Always mirror to localStorage -- this keeps the local cache a valid
  // fallback for b2c/b2b (still localStorage-backed in Phase 0) and for
  // the next page load before an admin session re-authenticates.
  localStorage.setItem("nepal_quote_cities_v2", JSON.stringify(db.cities));
  localStorage.setItem("nepal_quote_airports_v2", JSON.stringify(db.airports || []));
  localStorage.setItem("nepal_quote_hotels_v2", JSON.stringify(db.hotels));
  localStorage.setItem("nepal_quote_vehicles_v2", JSON.stringify(db.vehicles));
  localStorage.setItem("nepal_quote_routes_v2", JSON.stringify(db.routes));
  localStorage.setItem("nepal_quote_activities_v2", JSON.stringify(db.activities));
  localStorage.setItem("nepal_quote_packages_v2", JSON.stringify(db.packages));
  localStorage.setItem("nepal_quote_settings_v2", JSON.stringify(db.settings));
  localStorage.setItem("nepal_quote_bookings_v2", JSON.stringify(db.bookings));
  localStorage.setItem("nepal_quote_leads_v2", JSON.stringify(db.leads || []));
  localStorage.setItem("nepal_quote_users_v2", JSON.stringify(db.users || []));

  // Admin sessions additionally push whatever changed to the real backend.
  // Fire-and-forget from the caller's point of view; failures are surfaced
  // via an alert since there's no toast system in this app yet.
  if (isAdminSession()) {
    syncAdminDb(oldDb, db).catch((err) => {
      console.error('Failed to sync admin changes to the server', err);
      if (typeof window.alert === 'function') {
        window.alert(
          'Failed to save changes to the server: ' + (err.message || 'Unknown error') +
          '\nPlease check your connection and try again.'
        );
      }
    });
  }
}
