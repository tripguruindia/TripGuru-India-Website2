// calculator.js - Core pricing calculations in INR with room-based occupancy model

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

const getTransferDesc = (routeKey, startCity, endCity, dayCity, isFirstDay, isLastDay) => {
  if (!routeKey || routeKey === 'local_sightseeing') return '';
  
  if (routeKey === 'ktm_airport_transfer') {
    if (isLastDay) {
      return `Private transfer: Kathmandu to Kathmandu Airport.`;
    }
    return `Private transfer: Kathmandu Airport to Kathmandu.`;
  }
  
  if (routeKey.includes('_to_')) {
    const parts = routeKey.split('_to_');
    const fromCity = formatCityName(parts[0]);
    const toCity = formatCityName(parts[1]);
    return `Private transfer: ${fromCity} to ${toCity}.`;
  }
  
  return `Private transfer: ${formatCityName(routeKey.replace(/_/g, ' '))}.`;
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
  const { markup_percent, b2b_admin_margin_percent = 0, b2c_markup_percent = 15, tax_percent = 13 } = settings || {};
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

    // 2. Transport cost
    if (vehicle && day.transfer_route) {
      const route = day.transfer_route;
      if (route === "local_sightseeing") {
        dayTransportCost = (vehicle.daily_sightseeing_rate || 0) * adminMarginFactor;
      } else if (vehicle.route_rates && vehicle.route_rates[route] !== undefined) {
        dayTransportCost = vehicle.route_rates[route] * adminMarginFactor;
      }
    }

    // 3. Activities cost (INR)
    const dayActivities = [];
    let dayActivityCostAdult = 0;
    let dayActivityCostChild = 0;
    if (day.activity_ids && day.activity_ids.length > 0) {
      day.activity_ids.forEach(actId => {
        const act = activitiesData.find(a => a.id === actId);
        if (act) {
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
            priceAdult: markedUpPriceAdult,
            priceChild: markedUpPriceChild
          });
        }
      });
    }

    // Dynamic Heading & Description Generation
    const routeObj = routesData.find(r => r.key === day.transfer_route);
    const selectedActs = (day.activity_ids || [])
      .map(actId => activitiesData.find(a => a.id === actId))
      .filter(Boolean);
    
    const effectiveRouteObj = (day.transfer_route === 'local_sightseeing' && selectedActs.length === 0)
      ? null
      : routeObj;

    let heading = "";
    if (effectiveRouteObj && selectedActs.length > 0) {
      heading = `${effectiveRouteObj.name} & ${selectedActs.map(a => a.name).join(' + ')}`;
    } else if (effectiveRouteObj) {
      heading = effectiveRouteObj.name;
    } else if (selectedActs.length > 0) {
      heading = selectedActs.map(a => a.name).join(' + ');
    } else {
      heading = isLastDay ? `Departure from ${day.city}` : `Leisure day in ${day.city}`;
    }

    if (heading.length > 85) {
      heading = heading.substring(0, 82) + "...";
    }

    let descParts = [];

    // 1. Transfer
    if (day.transfer_route && day.transfer_route !== 'local_sightseeing') {
      const transferText = getTransferDesc(
        day.transfer_route,
        startCity,
        endCity,
        day.city,
        day.day === 1,
        isLastDay
      );
      if (transferText) {
        descParts.push(transferText);
      }
    }

    // 2. Activity / Leisure
    if (selectedActs.length > 0) {
      selectedActs.forEach(act => {
        descParts.push(act.description);
      });
    } else {
      if (isLastDay) {
        descParts.push(`Check out from your accommodation in ${day.city}.`);
      } else {
        descParts.push(`Enjoy your day in ${day.city}.`);
      }
    }

    // 3. Hotel
    if (!isLastDay) {
      if (selectedHotel) {
        descParts.push(`Overnight accommodation at ${selectedHotel.name} (${selectedHotel.category}) on ${mealPlan} basis.`);
      } else {
        if (day.stay_address) {
          descParts.push(`Overnight stay at ${day.stay_address} (self-arranged).`);
        } else {
          descParts.push(`Overnight stay self-arranged (no hotel stay booked).`);
        }
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
      transportRoute: day.transfer_route,
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
  const total = subtotalWithMarkup + tax;
  const perPerson = totalPax > 0 ? total / totalPax : 0;

  // Proportional breakdown calculations for Adults vs Children
  const subtotalAdult = accommodationCostAdult + transportCostAdult + activityCostAdult;
  const subtotalChild = accommodationCostChild + transportCostChild + activityCostChild;

  const markupAdult = subtotalAdult * (activeMarkupPercent / 100);
  const markupChild = subtotalChild * (activeMarkupPercent / 100);

  const taxAdult = (subtotalAdult + markupAdult) * (tax_percent / 100);
  const taxChild = (subtotalChild + markupChild) * (tax_percent / 100);

  const totalAdult = subtotalAdult + markupAdult + taxAdult;
  const totalChild = subtotalChild + markupChild + taxChild;

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
