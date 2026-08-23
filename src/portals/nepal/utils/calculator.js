// calculator.js - Core pricing calculations in INR with room-based occupancy model

import {
  getDayTransfers,
  getAirportForCity,
  airportFromKeySegment,
  resolveAirportTransfer,
  rateForRoute,
  findRoute,
  TRAVEL_MODE_FLIGHT,
} from './transfers';

/**
 * Converts a rooms array into flat travelers and roomConfig objects
 * that the pricing engine uses internally.
 *
 * Room occupancy rules:
 *   - Max per room: 3 adults + 1 child  OR  2 adults + 2 children
 *   - Only 1 extra bed per room
 *   - If 3 adults: 3rd adult = extra_adult rate, any child = CNB
 *   - If ≤2 adults: 1st child = CWB (gets the extra bed), remaining children = CNB
 *
 * @param {Array} rooms - e.g. [{ adults: 2, children: [{ age: 8 }] }]
 * @returns {{ travelers, roomConfig, totalPax, childAges }}
 */
export function deriveFromRooms(rooms) {
  let totalAdults = 0;
  let totalCwb = 0;
  let totalCnb = 0;

  let singleRooms = 0;
  let doubleRooms = 0;
  let extraAdultBeds = 0;
  let cwbBeds = 0;
  let cnbBeds = 0;

  const allChildAges = [];

  (rooms || []).forEach(room => {
    const adults = room.adults || 1;
    const children = room.children || [];

    totalAdults += adults;

    // Determine room base type
    if (adults === 1) {
      singleRooms += 1;
    } else {
      // 2 or 3 adults -> double room base
      doubleRooms += 1;
    }

    // 3rd adult -> extra bed (extra_adult rate)
    if (adults >= 3) {
      extraAdultBeds += 1;
    }

    // Children assignment
    children.forEach((child, childIdx) => {
      allChildAges.push(child.age);

      if (adults >= 3) {
        // Extra bed is already used by 3rd adult -> all children are CNB
        totalCnb += 1;
        cnbBeds += 1;
      } else {
        // ≤2 adults: check for explicit withBed if 2 adults + 1 child
        let isCwb = false;
        if (adults === 2 && children.length === 1 && child.withBed !== undefined) {
          isCwb = child.withBed;
        } else {
          // Fallback rule: first child gets CWB (extra bed), rest are CNB
          isCwb = (childIdx === 0);
        }

        if (isCwb) {
          totalCwb += 1;
          cwbBeds += 1;
        } else {
          totalCnb += 1;
          cnbBeds += 1;
        }
      }
    });
  });

  return {
    travelers: { adults: totalAdults, cwb: totalCwb, cnb: totalCnb },
    roomConfig: {
      single: singleRooms,
      double: doubleRooms,
      extra_adult: extraAdultBeds,
      cwb: cwbBeds,
      cnb: cnbBeds
    },
    totalPax: totalAdults + totalCwb + totalCnb,
    childAges: allChildAges
  };
}

/**
 * Validates per-room occupancy rules.
 * @param {Array} rooms
 * @returns {{ isValid: boolean, message: string }}
 */
export function validateRoomCapacity(rooms) {
  if (!rooms || rooms.length === 0) {
    return { isValid: false, message: "At least 1 room is required." };
  }

  for (let i = 0; i < rooms.length; i++) {
    const room = rooms[i];
    const adults = room.adults || 0;
    const childCount = (room.children || []).length;

    if (adults < 1) {
      return { isValid: false, message: `Room ${i + 1}: At least 1 adult is required.` };
    }

    if (adults > 3) {
      return { isValid: false, message: `Room ${i + 1}: Maximum 3 adults allowed per room.` };
    }

    // Max occupancy check
    if (adults === 3 && childCount > 1) {
      return { isValid: false, message: `Room ${i + 1}: With 3 adults, maximum 1 child allowed.` };
    }

    if (adults <= 2 && childCount > 2) {
      return { isValid: false, message: `Room ${i + 1}: Maximum 2 children allowed per room.` };
    }

    // Validate child ages
    for (let j = 0; j < (room.children || []).length; j++) {
      const age = room.children[j].age;
      if (age === undefined || age === null || age === '') {
        return { isValid: false, message: `Room ${i + 1}, Child ${j + 1}: Please enter child age.` };
      }
      if (age < 0 || age > 11) {
        return { isValid: false, message: `Room ${i + 1}, Child ${j + 1}: Child age must be 0–11. Anyone 12+ is an adult.` };
      }
    }
  }

  return { isValid: true, message: "" };
}

const formatCityName = (c) => {
  if (!c) return '';
  const clean = c.toLowerCase().trim();
  if (clean === 'ktm' || clean === 'kathmandu') return 'Kathmandu';
  return c.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

// Human name for a route key, in the direction the key is written. Used when a
// route only exists backwards, so the day is still labelled the way it is
// actually travelled.
const routeNameForKey = (key, airportsData = []) => {
  if (!key) return '';
  if (key.endsWith('_airport_transfer')) {
    return `${formatCityName(key.replace(/_airport_transfer$/, ''))} Airport Transfer`;
  }
  if (!key.includes('_to_')) return formatCityName(key.replace(/_/g, ' '));
  return key
    .split('_to_')
    .map((seg) => {
      const airport = airportFromKeySegment(airportsData, seg);
      return airport ? airport.name : formatCityName(seg);
    })
    .join(' to ');
};

// Comparing city names from two different sources (a day, a stored route), so
// trimmed and case-insensitive like everywhere else.
const sameCityName = (a, b) =>
  String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();

// CP/MAP/AP are trade shorthand. A client reading the itinerary should not
// have to look them up.
const describeMealPlan = (plan) => {
  switch (plan) {
    case 'MAP': return 'breakfast and dinner included';
    case 'AP': return 'all meals included';
    case 'CP': return 'bed and breakfast';
    default: return 'room only';
  }
};

const getTransferDesc = (routeKey, startCity, endCity, dayCity, isFirstDay, isLastDay, airportsData = []) => {
  if (!routeKey || routeKey === 'local_sightseeing') return '';

  // Legacy per-city airport key. Direction is implied by where the day sits:
  // the last day is a departure (hotel -> airport), anything else an arrival.
  if (routeKey.endsWith('_airport_transfer')) {
    const city = formatCityName(routeKey.replace(/_airport_transfer$/, ''));
    return isLastDay
      ? `Private transfer from your ${city} hotel to ${city} airport.`
      : `Met on arrival at ${city} airport and transferred to your hotel.`;
  }

  if (routeKey.includes('_to_')) {
    const parts = routeKey.split('_to_');
    // Either end may be an airport stop (`aptpkr`), which must be named
    // properly rather than title-cased into "Aptpkr".
    const label = (seg) => {
      const airport = airportFromKeySegment(airportsData, seg);
      return airport ? airport.name : formatCityName(seg);
    };
    const from = label(parts[0]);
    const to = label(parts[parts.length - 1]);
    const via = parts.length > 2
      ? ` via ${parts.slice(1, -1).map(label).join(' and ')}`
      : '';
    // An airport at either end is a meeting or a drop, not a drive between
    // towns. "transferred to Gorakhpur" reads oddly when the guest is already
    // in Gorakhpur, so name the hotel rather than the town.
    if (airportFromKeySegment(airportsData, parts[0])) {
      return `Met on arrival at ${from} and transferred to your ${to} hotel.`;
    }
    if (airportFromKeySegment(airportsData, parts[parts.length - 1])) {
      return `Private transfer from ${from} to ${to}.`;
    }
    return `Drive from ${from} to ${to}${via}, by private vehicle.`;
  }

  return `Private transfer: ${formatCityName(routeKey.replace(/_/g, ' '))}.`;
};

// A day the traveller flies on. Spells out drop -> flight -> pickup so the
// client can see exactly which ground transfers are covered, and states
// plainly that the airfare itself is not part of this quote (the portal has
// no flight inventory -- see the `travel_mode` handling in App.jsx).
const getFlightDayDesc = (day, transfers, airportsData, routesData) => {
  const fromCity = day.flight_from_city || '';
  // On the final day the traveller flies OUT to the trip's end city, which is
  // not the city the day itself sits in -- hence an explicit destination
  // rather than assuming day.city.
  const toCity = day.flight_to_city || day.city || '';
  const fromAirport = getAirportForCity(airportsData, fromCity);
  const toAirport = getAirportForCity(airportsData, toCity);

  // Resolved the same way the builder assigned them, so a city served by
  // another town's airport still matches its own hand-built route.
  const hasDrop = transfers.includes(resolveAirportTransfer(routesData, airportsData, fromCity).key);
  const hasPickup = transfers.includes(resolveAirportTransfer(routesData, airportsData, toCity).key);

  const parts = [];
  if (hasDrop) {
    parts.push(
      `Private transfer from your ${fromCity} hotel to ${fromAirport ? fromAirport.name : `${fromCity} airport`}.`
    );
  }
  parts.push(
    `Fly from ${fromCity} to ${toCity}. Airfare is not included in this quote.`
  );
  if (hasPickup) {
    parts.push(
      `On arrival at ${toAirport ? toAirport.name : `${toCity} Airport`}, private transfer to your hotel.`
    );
  }
  return parts;
};

/**
 * Calculates the complete pricing breakdown in INR for the package.
 * Accepts rooms array (new model) — derives flat values internally.
 */
export function calculateQuote({
  rooms,
  travelers: legacyTravelers,
  roomConfig: legacyRoomConfig,
  itinerary,
  vehicleId,
  hotelsData,
  vehiclesData,
  activitiesData,
  routesData = [],
  airportsData = [],
  settings,
  startCity = 'Kathmandu',
  endCity = 'Kathmandu'
}) {
  // Derive from rooms if provided, otherwise use legacy flat values
  let travelers, roomConfig, totalPax;

  if (rooms && rooms.length > 0) {
    const derived = deriveFromRooms(rooms);
    travelers = derived.travelers;
    roomConfig = derived.roomConfig;
    totalPax = derived.totalPax;
  } else {
    travelers = legacyTravelers || { adults: 2, cwb: 0, cnb: 0 };
    roomConfig = legacyRoomConfig || { single: 0, double: 1, extra_adult: 0, cwb: 0, cnb: 0 };
    totalPax = travelers.adults + travelers.cwb + travelers.cnb;
  }

  const { adults = 2, cwb = 0, cnb = 0 } = travelers;
  const { single = 0, double: dbl = 1, extra_adult = 0, cwb: roomCwb = 0, cnb: roomCnb = 0 } = roomConfig;
  const {
    markup_percent,
    b2b_admin_margin_percent = 0,
    b2c_markup_percent = 15,
    tax_percent = 13,
    // Per-pax, GST-inclusive reduction applied to the final total. Set when a
    // preset package carries a `starting_price_override` (a "special offer"
    // headline price) so the advertised rate is actually honoured downstream
    // instead of only being painted on the package card.
    offer_discount_per_pax = 0
  } = settings || {};
  const activeMarkupPercent = markup_percent !== undefined ? markup_percent : b2c_markup_percent;
  const adminMarginFactor = 1 + (b2b_admin_margin_percent / 100);

  // Find vehicle details
  const vehicle = vehiclesData.find(v => v.id === vehicleId);

  let accommodationCost = 0;
  let accommodationCostAdult = 0;
  let accommodationCostChild = 0;

  let transportCost = 0;

  let activityCost = 0;
  let activityCostAdult = 0;
  let activityCostChild = 0;

  const dayWiseDetails = [];

  // Loop day-by-day to calculate details
  itinerary.forEach((day, index) => {
    const isLastDay = index === itinerary.length - 1;
    let dayHotelCost = 0;
    let dayHotelCostAdult = 0;
    let dayHotelCostChild = 0;
    let dayTransportCost = 0;
    let dayActivityCost = 0;

    let selectedHotel = null;
    let hotelName = "No stay required";
    let mealPlan = (day.hotelId && day.hotelId !== 'no_stay') ? (day.meals || "CP") : "None";

    // 1. Accommodation Lookup (baked meals CP, MAP, AP)
    if (!isLastDay && day.city && day.hotelId && day.hotelId !== 'no_stay') {
      selectedHotel = hotelsData.find(h => h.id === day.hotelId);
      if (selectedHotel) {
        hotelName = selectedHotel.name;
        const rates = selectedHotel.rates;
        
        // 5x3 Lookup: rates[category][mealPlan]
        const singleRate = rates.single?.[mealPlan] || 0;
        const doubleRate = rates.double?.[mealPlan] || 0;
        const extraAdultRate = rates.extra_adult?.[mealPlan] || 0;
        const cwbRate = rates.cwb?.[mealPlan] || 0;
        const cnbRate = rates.cnb?.[mealPlan] || 0;

        dayHotelCostAdult = 
          ((single * singleRate) +
          (dbl * doubleRate) +
          (extra_adult * extraAdultRate)) * adminMarginFactor;

        dayHotelCostChild = 
          ((roomCwb * cwbRate) +
          (roomCnb * cnbRate)) * adminMarginFactor;

        dayHotelCost = dayHotelCostAdult + dayHotelCostChild;
      }
    }

    // 2. Transport cost -- a day can hold several transfers (a flight day has
    // an airport drop at the origin AND a pickup at the destination), so this
    // sums every one rather than pricing a single route.
    const dayTransfers = getDayTransfers(day);
    if (vehicle) {
      dayTransfers.forEach((route) => {
        if (route === "local_sightseeing") {
          dayTransportCost += (vehicle.daily_sightseeing_rate || 0) * adminMarginFactor;
        } else {
          // rateForRoute falls back to the reverse direction: a sector priced
          // one way is priced both ways, so nobody has to enter it twice.
          const rate = rateForRoute(vehicle, route);
          if (rate !== undefined) dayTransportCost += rate * adminMarginFactor;
        }
      });
    }

    // 3. Activities cost (INR)
    const dayActivities = [];
    let dayActivityCostAdult = 0;
    let dayActivityCostChild = 0;
    if (day.activity_ids && day.activity_ids.length > 0) {
      day.activity_ids.forEach(actId => {
        const act = activitiesData.find(a => a.id === actId);
        if (!act) return;

        // A whole-vehicle activity (full-day local sightseeing) is one vehicle
        // out for one day: it costs what that vehicle costs, whether two
        // people ride in it or twelve. Charging it per head would multiply a
        // single car's day by the party size.
        if (act.pricing_mode === 'per_vehicle') {
          const perVehicle = (act.vehicle_rates || {})[vehicleId];
          const actCost = (Number(perVehicle) || 0) * adminMarginFactor;

          // Attributed to the adult column purely so the adult/child split
          // still sums to the total -- it is not a per-head charge.
          dayActivityCostAdult += actCost;
          dayActivityCost += actCost;
          dayActivities.push({
            id: act.id,
            name: act.name,
            cost: actCost,
            pricingMode: 'per_vehicle',
            perVehicle: actCost,
          });
          return;
        }

        const markedUpPriceAdult = (act.price_adult || 0) * adminMarginFactor;
        const markedUpPriceChild = (act.price_child || 0) * adminMarginFactor;
        const actAdultCost = adults * markedUpPriceAdult;
        const actChildCost = (cwb + cnb) * markedUpPriceChild;
        const totalActCost = actAdultCost + actChildCost;

        dayActivityCostAdult += actAdultCost;
        dayActivityCostChild += actChildCost;
        dayActivityCost += totalActCost;
        dayActivities.push({
          id: act.id,
          name: act.name,
          cost: totalActCost,
          pricingMode: 'per_person',
          priceAdult: markedUpPriceAdult,
          priceChild: markedUpPriceChild
        });
      });
    }

    // Dynamic Heading & Description Generation
    const isFlightDay = day.travel_mode === TRAVEL_MODE_FLIGHT && !!day.flight_from_city;
    // findRoute, not a plain find: a sector may only be defined in the
    // opposite direction, and it should still name the day. When it matches
    // that way its stored name points backwards ("Pokhara to Kathmandu" on a
    // Kathmandu-to-Pokhara day), so the label is rebuilt from the key.
    const rawRouteObj = findRoute(routesData, dayTransfers[0]);
    const routeObj = rawRouteObj && rawRouteObj.reversedFrom
      ? { ...rawRouteObj, name: routeNameForKey(rawRouteObj.key, airportsData) }
      : rawRouteObj;
    const selectedActs = (day.activity_ids || [])
      .map(actId => activitiesData.find(a => a.id === actId))
      .filter(Boolean);

    const effectiveRouteObj = (dayTransfers[0] === 'local_sightseeing' && selectedActs.length === 0)
      ? null
      : routeObj;

    // The heading leads with the day's movement rather than concatenating the
    // transfer's stored name with every activity's, which produced things like
    // "GORAKHPUR to Kathmandu Overland & Kathmandu Full-Day Sightseeing
    // (Vehicle)" -- the city twice over and an internal label in front of the
    // client. A whole-vehicle activity is transport, not a highlight, so it is
    // described but never named in the title.
    const highlightActs = selectedActs.filter(a => a.pricing_mode !== 'per_vehicle');
    const prevCity = index > 0 ? itinerary[index - 1].city : null;
    const isTransitionDay = index > 0 && !!prevCity && !sameCityName(prevCity, day.city);

    const highlightSuffix = highlightActs.length === 0
      ? ''
      : highlightActs.length === 1
        ? ` & ${highlightActs[0].name}`
        : ' & Sightseeing';

    let heading;
    if (isFlightDay) {
      heading = `Fly to ${day.flight_to_city || day.city}${highlightSuffix}`;
    } else if (index === 0) {
      heading = `Arrive ${day.city}${highlightSuffix}`;
    } else if (isLastDay) {
      heading = `Depart ${day.city}`;
    } else if (isTransitionDay) {
      heading = `Drive to ${day.city}${highlightSuffix}`;
    } else if (highlightActs.length === 1) {
      heading = highlightActs[0].name;
    } else if (highlightActs.length > 1) {
      heading = `${day.city} Sightseeing`;
    } else {
      heading = `Leisure Day in ${day.city}`;
    }

    if (heading.length > 85) {
      heading = heading.substring(0, 82) + "...";
    }

    let descParts = [];

    // On the last day the guest checks out and then travels, so say so in that
    // order rather than describing the airport run before the check-out.
    if (isLastDay) {
      descParts.push(`Check out from your hotel in ${day.city}.`);
    }

    // 1. Transfers. A flight day gets its own narration (drop, flight,
    // pickup); otherwise each transfer on the day is described in turn.
    if (isFlightDay) {
      descParts.push(...getFlightDayDesc(day, dayTransfers, airportsData, routesData));
    } else {
      dayTransfers.forEach((routeKey) => {
        if (routeKey === 'local_sightseeing') return;
        const transferText = getTransferDesc(
          routeKey,
          startCity,
          endCity,
          day.city,
          day.day === 1,
          isLastDay,
          airportsData
        );
        if (transferText) {
          descParts.push(transferText);
        }
      });
    }

    // 2. Activity / Leisure
    if (selectedActs.length > 0) {
      selectedActs.forEach(act => {
        descParts.push(act.description);
      });
    } else if (!isLastDay) {
      // The last day's check-out line is already at the top.
      descParts.push(`The rest of the day is free.`);
    }

    // 3. Hotel. Meal plans are trade shorthand -- a client reading CP/MAP/AP
    // has to look them up, so they are spelled out.
    if (!isLastDay) {
      if (selectedHotel) {
        descParts.push(`Overnight at ${selectedHotel.name} (${selectedHotel.category}), ${describeMealPlan(mealPlan)}.`);
      } else if (day.stay_address) {
        descParts.push(`Overnight at ${day.stay_address} (arranged by the guest).`);
      } else {
        descParts.push(`Overnight stay arranged by the guest.`);
      }
    }

    const description = descParts.join('\n');

    accommodationCost += dayHotelCost;
    accommodationCostAdult += dayHotelCostAdult;
    accommodationCostChild += dayHotelCostChild;

    transportCost += dayTransportCost;

    activityCost += dayActivityCost;
    activityCostAdult += dayActivityCostAdult;
    activityCostChild += dayActivityCostChild;

    dayWiseDetails.push({
      day: day.day,
      city: day.city,
      title: heading,
      description: description,
      hotelName,
      hotelId: day.hotelId,
      stay_address: day.stay_address,
      hotelCost: Math.round(dayHotelCost),
      mealPlan,
      mealCost: 0, // Meals are now baked into hotelCost!
      transportRoute: dayTransfers[0] || '',
      transportRoutes: dayTransfers,
      travelMode: day.travel_mode || '',
      flightFromCity: day.flight_from_city || '',
      flightToCity: day.flight_to_city || '',
      transportCost: Math.round(dayTransportCost),
      activities: dayActivities,
      activityCost: Math.round(dayActivityCost),
      totalDayCost: Math.round(dayHotelCost + dayTransportCost + dayActivityCost)
    });
  });

  const transportCostAdult = totalPax > 0 ? (transportCost * adults) / totalPax : 0;
  const transportCostChild = transportCost - transportCostAdult;

  const subtotal = accommodationCost + transportCost + activityCost;
  const markup = subtotal * (activeMarkupPercent / 100);
  const subtotalWithMarkup = subtotal + markup;
  const tax = subtotalWithMarkup * (tax_percent / 100);
  const grossTotal = subtotalWithMarkup + tax;

  // The offer discount is GST-inclusive and applied last, so the advertised
  // per-pax price is what the traveller actually sees at checkout. It never
  // drives the total below zero, and it scales with pax count rather than
  // being a flat lump so adding travellers doesn't erase the offer.
  const offerDiscount = Math.min(
    Math.max(0, offer_discount_per_pax) * totalPax,
    grossTotal
  );
  const total = grossTotal - offerDiscount;
  const perPerson = totalPax > 0 ? total / totalPax : 0;

  // Ratio used to spread the discount across the adult/child splits so the
  // per-adult and per-child rates stay consistent with the discounted total.
  const offerRatio = grossTotal > 0 ? total / grossTotal : 1;

  // Proportional breakdown calculations for Adults vs Children
  const subtotalAdult = accommodationCostAdult + transportCostAdult + activityCostAdult;
  const subtotalChild = accommodationCostChild + transportCostChild + activityCostChild;

  const markupAdult = subtotalAdult * (activeMarkupPercent / 100);
  const markupChild = subtotalChild * (activeMarkupPercent / 100);

  const taxAdult = (subtotalAdult + markupAdult) * (tax_percent / 100);
  const taxChild = (subtotalChild + markupChild) * (tax_percent / 100);

  const totalAdult = (subtotalAdult + markupAdult + taxAdult) * offerRatio;
  const totalChild = (subtotalChild + markupChild + taxChild) * offerRatio;

  const perAdult = adults > 0 ? totalAdult / adults : 0;
  const perChild = (cwb + cnb) > 0 ? totalChild / (cwb + cnb) : 0;

  const roomValidation = validateRoomCapacity(rooms || []);

  return {
    travelers,
    roomConfig,
    rooms: rooms || [],
    totals: {
      accommodation: accommodationCost,
      meals: 0, // Baked in!
      transport: transportCost,
      activities: activityCost,
      subtotal,
      markup,
      tax,
      grossTotal,
      offerDiscount,
      total,
      perPerson,
      perAdult,
      perChild,
      adultAccommodation: accommodationCostAdult,
      childAccommodation: accommodationCostChild,
      adultTransport: transportCostAdult,
      childTransport: transportCostChild,
      adultActivities: activityCostAdult,
      childActivities: activityCostChild,
      adultTotal: totalAdult,
      childTotal: totalChild
    },
    dayWiseBreakdown: dayWiseDetails,
    roomValidation
  };
}
