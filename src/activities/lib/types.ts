export interface Prices {
  adult: number | null;
  child: number | null;
  senior: number | null;
  unit: number | null;
}

export interface Availability {
  weekdays: number[];
  closed: string[];
  from: string;
  until: string;
  leadHours: number;
  times: string[];
  dateRequired: boolean;
}

export interface ProductOption {
  id: string;
  name: string;
  description: string;
  pricingUnit: 'per_person' | 'per_unit';
  prices: Prices;
  net?: Prices;
  minPax: number;
  maxPax: number;
  availability: Availability;
  active: boolean;
  sortOrder: number;
}

export interface Policy {
  tiers: { hours: number; refund: number }[];
  note: string;
}

export interface DestinationRef {
  id: string;
  slug: string;
  name: string;
  country: string;
}

export interface FromPrice {
  amount: number;
  per: 'adult' | 'unit';
}

export interface ProductCardData {
  id: string;
  slug: string;
  destination: DestinationRef | null;
  category: string;
  title: string;
  summary: string;
  durationText: string;
  image: string;
  features: string[];
  freeCancellation: boolean;
  freeCancellationHours: number | null;
  fromPrice: FromPrice | null;
  attributes: Record<string, unknown>;
}

export interface Product {
  id: string;
  slug: string;
  destinationId: string;
  destination: DestinationRef | null;
  category: string;
  title: string;
  summary: string;
  description: string;
  durationText: string;
  highlights: string[];
  includes: string[];
  excludes: string[];
  itinerary: { time: string; text: string }[];
  meetingPoint: string;
  pickupInfo: string;
  howToUse: string;
  indiaNotes: string;
  images: string[];
  features: string[];
  attributes: Record<string, unknown>;
  ages: { childMin: number; childMax: number; seniorMin: number };
  cancellationPolicy: Policy;
  supplier: string;
  status: string;
  sortOrder: number;
  options: ProductOption[];
  fromPrice: FromPrice | null;
  related?: ProductCardData[];
}

export interface Destination {
  id: string;
  slug: string;
  name: string;
  country: string;
  tagline: string;
  description: string;
  heroImage: string;
  tint: string;
  sortOrder: number;
  published: boolean;
  productCount?: number;
  categoryCounts?: Record<string, number>;
  products?: ProductCardData[];
}
