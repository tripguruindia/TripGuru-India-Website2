import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Star, Quote, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';

const REVIEWS = [
  {
    name: 'Dr. Babasaheb Kalhapure',
    badge: 'Local Guide',
    rating: 5,
    time: '2 months ago',
    destination: 'Dubai',
    text: 'We had an amazing Dubai trip experience thanks to TripGuru. Everything was very well planned and smoothly managed — from hotel bookings to sightseeing and transport. Their team was always supportive, responsive, and guided us properly at every step. Our Dubai trip became truly memorable and stress-free. Highly recommend for anyone planning an international trip.',
  },
  {
    name: 'Tusshar Gopal',
    badge: 'Local Guide',
    rating: 5,
    time: '1 month ago',
    destination: 'Bali',
    text: 'We went on a one week trip to Bali. TripGuru curated our itinerary including air travel. The resorts and private villas booked for us were one of the best. Activities included water sports, Bali swing, ATV ride, and various spots of sightseeing. The best thing is that we did not have to stress about anything — everything was taken care of. Thanks to TripGuru for making our first international trip memorable.',
  },
  {
    name: 'Shivang Rastogi',
    badge: '',
    rating: 5,
    time: '4 months ago',
    destination: 'Coorg & Mysore',
    text: 'We just finished an incredible family trip to Coorg, Bandipur, and Mysore planned by TripGuru India, and they were phenomenal! The entire trip was seamless and stress-free. The itinerary was perfectly sorted, and both the hotels/resorts and the travel vehicle arranged were absolutely top-notch. We had fun throughout and didn\'t have to worry about a single detail. Highly recommend for flawless group travel!',
  },
  {
    name: 'Anil Kumar Marella',
    badge: '',
    rating: 5,
    time: '2 years ago',
    destination: 'Bali',
    text: 'My journey to Bali with TripGuru was simply outstanding. From meticulously crafted itineraries to seamless logistics, they ensured every moment was memorable. Expert guides added depth to my explorations, unveiling the rich culture and beauty of Bali. Accommodations were top-notch, offering comfort and luxury in stunning settings. TripGuru\'s attention to detail truly set them apart.',
  },
  {
    name: 'Dr. Rishi Vidhyasagar Aacharya',
    badge: 'Local Guide',
    rating: 5,
    time: '3 months ago',
    destination: 'Dubai',
    text: 'We recently went to Dubai with family with TripGuru India and they made an excellent tour program for us. Right from booking the tickets to the city tour, shopping, and stay — everything was very well organized and managed under our budget. Highly recommended agency for all national and international tours.',
  },
  {
    name: 'Anaisha Shahi',
    badge: '',
    rating: 5,
    time: '2 years ago',
    destination: 'School Trip',
    text: 'For every kid their school trip is a once in a lifetime opportunity. We get to spend time with our friends, create unlimited memories and treasure these days forever. TripGuru made our journey even more memorable and unforgettable. With the right assistance, it made everything more easier to understand and helped us link things together.',
  },
  {
    name: 'Abhinav Agrahari',
    badge: '',
    rating: 5,
    time: '1 year ago',
    destination: 'Shimla',
    text: 'TripGuru provided an unforgettable experience with their well-curated itinerary for Shimla. Our stay at Hotel Udman was exceptional — spacious, clean rooms with breathtaking views of the surrounding hills. The excursion to Kufri was the highlight of our trip! Everything was impeccably organized. TripGuru\'s seamless planning and attention to detail made this trip stress-free and thoroughly enjoyable.',
  },
];

export const Reviews = () => {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setActive(p => (p + 1) % REVIEWS.length), 5000);
    return () => clearInterval(timer);
  }, []);

  const prev = () => setActive(p => (p - 1 + REVIEWS.length) % REVIEWS.length);
  const next = () => setActive(p => (p + 1) % REVIEWS.length);
  const r = REVIEWS[active];

  return (
    <section id="reviews" className="py-20 md:py-32 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-12">
          <motion.span
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 text-gold uppercase tracking-[0.28em] text-[10px] font-semibold mb-6"
          >
            <img src="https://www.google.com/favicon.ico" alt="" className="w-3.5 h-3.5" />
            Google Verified Reviews
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          className="font-display text-[clamp(34px,5vw,64px)] text-text-primary leading-[0.98] tracking-tight font-light"
        >
            Trusted by travellers who book with <span className="italic text-gold">TripGuru</span>
          </motion.h2>
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="flex items-center justify-center gap-3 mt-5"
          >
            <div className="flex gap-0.5">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={18} className="fill-gold text-gold" />
              ))}
            </div>
            <span className="text-text-secondary text-sm font-light">4.9 out of 5 — Google Verified</span>
          </motion.div>
        </div>

        {/* Review Card */}
        <motion.div
          key={active}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-4xl mx-auto"
        >
          <div className="relative bg-surface/35 backdrop-blur-sm border border-gold-border/20 rounded-xl p-6 md:p-8">
            <Quote size={36} className="text-gold/15 absolute top-6 left-6" />
            <div className="relative grid grid-cols-1 md:grid-cols-[180px_1fr] gap-7 items-start">
              <div className="rounded-lg border border-gold-border/18 bg-bg/60 p-5">
                <div className="flex gap-0.5 mb-4">
                  {[...Array(r.rating)].map((_, i) => (
                    <Star key={i} size={13} className="fill-gold text-gold" />
                  ))}
                </div>
                <p className="text-text-primary font-display text-xl leading-tight mb-2">{r.destination}</p>
                <p className="text-text-muted text-[10px] uppercase tracking-[0.16em]">{r.time}</p>
              </div>
              <div>
                <p className="text-text-secondary text-sm md:text-base font-light leading-relaxed mb-7 italic">
                  "{r.text}"
                </p>
                <div>
                  <p className="text-text-primary font-semibold text-sm">{r.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {r.badge && (
                      <span className="text-[9px] bg-gold/10 text-gold px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider">{r.badge}</span>
                    )}
                    <span className="text-text-muted text-[10px] uppercase tracking-[0.14em]">Google review</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-6 mt-8">
          <button onClick={prev} className="w-10 h-10 rounded-full border border-gold-border/30 flex items-center justify-center text-gold/60 hover:text-gold hover:border-gold/50 transition-all">
            <ChevronLeft size={18} />
          </button>
          <div className="flex gap-2">
            {REVIEWS.map((_, i) => (
              <button key={i} onClick={() => setActive(i)} className={`w-2 h-2 rounded-full transition-all ${i === active ? 'bg-gold w-6' : 'bg-text-muted/30 hover:bg-text-muted/50'}`} />
            ))}
          </div>
          <button onClick={next} className="w-10 h-10 rounded-full border border-gold-border/30 flex items-center justify-center text-gold/60 hover:text-gold hover:border-gold/50 transition-all">
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Google link */}
        <div className="text-center mt-6">
          <a href="https://www.google.com/search?q=TripGuru+India+Gorakhpur+reviews" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-gold/50 hover:text-gold text-[11px] tracking-widest uppercase transition-colors">
            <ExternalLink size={12} />
            Read all reviews on Google
          </a>
        </div>
      </div>
    </section>
  );
};
