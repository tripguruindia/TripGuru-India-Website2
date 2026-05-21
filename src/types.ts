export interface ItineraryDay {
  day: number;
  title: string;
  activity: string;
}

export interface Destination {
  id: string;
  slug: string;
  name: string;
  region: string;
  hook: string;
  description: string;
  highlights: string[];
  image: string;
  accent: string;
  usp: string;
  vibe: string;
  mustDo: string;
  whyNow: string;
  itinerary: ItineraryDay[];
}
