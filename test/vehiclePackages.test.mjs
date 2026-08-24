// ---------------------------------------------------------------------------
// Whole-trip vehicle package rates.
//
// Run with:  npm test
//
// The failure this suite exists to prevent is double-charging. A full day of
// sightseeing is billed as a per-vehicle ACTIVITY, and the sectors are billed
// per leg. A package pays for the vehicle for the whole trip, so if either of
// those keeps charging, the same vehicle is paid for twice and the quote goes
// out high with nothing on screen to explain it.
// ---------------------------------------------------------------------------
import { calculateQuote } from '../src/portals/nepal/utils/calculator.js';
import { findVehiclePackage, overnightCitiesOf, normaliseCities }
  from '../src/portals/nepal/utils/vehiclePackages.js';

const vehicles = [
  { id: 'v-hiace', name: 'Toyota Hiace', capacity: 12, daily_sightseeing_rate: 9500,
    route_rates: { gorakhpur_to_kathmandu: 20000, kathmandu_to_pokhara: 18000, pokhara_to_gorakhpur: 25000 } },
];
const activities = [
  { id: 'a-ktm-sight', city: 'Kathmandu', name: 'Kathmandu Full-Day Sightseeing',
    pricing_mode: 'per_vehicle', vehicle_rates: { 'v-hiace': 9500 }, covered_by_vehicle_package: true },
  { id: 'a-sarangkot', city: 'Pokhara', name: 'Sarangkot Sunrise Run',
    pricing_mode: 'per_vehicle', vehicle_rates: { 'v-hiace': 2500 }, covered_by_vehicle_package: false },
  { id: 'a-entry', city: 'Pokhara', name: 'Museum Entry', pricing_mode: 'per_person',
    price_adult: 500, price_child: 250 },
];
const hotels = [
  { id: 'h-ktm', city: 'Kathmandu', category: '4-Star', name: 'KTM Hotel',
    rates: { single:{CP:0}, double: { CP: 6000 }, extra_adult:{CP:0}, cwb:{CP:0}, cnb:{CP:0} } },
  { id: 'h-pok', city: 'Pokhara', category: '4-Star', name: 'PKR Hotel',
    rates: { single:{CP:0}, double: { CP: 5000 }, extra_adult:{CP:0}, cwb:{CP:0}, cnb:{CP:0} } },
];

// Gorakhpur -> Kathmandu (2n) -> Pokhara (1n) -> Gorakhpur. 4 days total.
const itinerary = [
  { day: 1, city: 'Kathmandu', hotelId: 'h-ktm', meals: 'CP', activity_ids: [], transfers: ['gorakhpur_to_kathmandu'] },
  { day: 2, city: 'Kathmandu', hotelId: 'h-ktm', meals: 'CP', activity_ids: ['a-ktm-sight'], transfers: [] },
  { day: 3, city: 'Pokhara',   hotelId: 'h-pok', meals: 'CP', activity_ids: [], transfers: ['kathmandu_to_pokhara'] },
  { day: 4, city: 'Gorakhpur', hotelId: '',      meals: 'None', activity_ids: [], transfers: ['pokhara_to_gorakhpur'] },
];

const pkg = {
  id: 'vpkg-1', vehicle_id: 'v-hiace', start_city: 'Gorakhpur', end_city: 'Gorakhpur',
  cities: ['Kathmandu', 'Pokhara'], days: 4, rate: 40000,
};

const quote = (vehiclePackagesData, extraActivityOnDay3) => calculateQuote({
  hotelsData: hotels, vehiclesData: vehicles, activitiesData: activities,
  routesData: [], airportsData: [], vehiclePackagesData,
  vehicleId: 'v-hiace', startCity: 'Gorakhpur', endCity: 'Gorakhpur',
  // A room is {adults, children} -- two adults share a double.
  rooms: [{ adults: 2, children: [] }],
  settings: { markup_percent: 0, tax_enabled: false, tax_percent: 0 },
  itinerary: itinerary.map((d, i) =>
    i === 2 && extraActivityOnDay3 ? { ...d, activity_ids: [extraActivityOnDay3] } : d),
});

let passed = 0;
let failed = 0;
function ok(c, label, detail = '') {
  if (c) { passed += 1; console.log('  \x1b[32mPASS\x1b[0m  ' + label); }
  else { failed += 1; console.log('  \x1b[31mFAIL\x1b[0m  ' + label + (detail ? '   -> ' + detail : '')); }
}

console.log('\nMatching is exact, and ignores the order cities were entered');
const base = { vehiclePackages: [pkg], vehicleId: 'v-hiace', startCity: 'Gorakhpur', endCity: 'Gorakhpur', itinerary };
ok(findVehiclePackage(base)?.id === 'vpkg-1', 'the run matches its package row');
ok(findVehiclePackage({ ...base, vehiclePackages: [{ ...pkg, cities: ['Pokhara', 'Kathmandu'] }] })?.id === 'vpkg-1',
  'reversed city order still matches -- same road');
ok(findVehiclePackage({ ...base, vehiclePackages: [{ ...pkg, days: 5 }] }) === null,
  'a different number of days does not match');
ok(findVehiclePackage({ ...base, vehiclePackages: [{ ...pkg, end_city: 'Raxaul' }] }) === null,
  'ending at a different border town does not match');
ok(findVehiclePackage({ ...base, vehiclePackages: [{ ...pkg, cities: ['Kathmandu'] }] }) === null,
  'a different circuit does not match');
ok(findVehiclePackage({ ...base, vehicleId: 'v-sedan' }) === null, 'a different vehicle does not match');
ok(overnightCitiesOf(itinerary).join('+') === 'kathmandu+pokhara',
  'the departure day is not an overnight city');

console.log('\nWithout a package, nothing changes from how it prices today');
const sectors = quote([]);
ok(Math.round(sectors.totals.transport) === 63000, 'sectors are summed (20000+18000+25000)',
  String(Math.round(sectors.totals.transport)));
ok(Math.round(sectors.totals.activities) === 9500, 'and the sightseeing day is charged',
  String(Math.round(sectors.totals.activities)));
ok(sectors.vehiclePackage === null, 'and no package is reported');

console.log('\nWith a package, the vehicle is paid for once');
const packaged = quote([pkg]);
ok(Math.round(packaged.totals.transport) === 40000, 'transport is the package rate, not the sector sum',
  String(Math.round(packaged.totals.transport)));
ok(Math.round(packaged.totals.vehiclePackage) === 40000, 'the package figure is reported separately');
ok(Math.round(packaged.totals.activities) === 0,
  'the sightseeing the package covers is absorbed, NOT charged again',
  String(Math.round(packaged.totals.activities)));
ok(packaged.vehiclePackage?.id === 'vpkg-1', 'the matched row is echoed back for the quote line');

console.log('\nGenuine extras still charge on top of a package');
const withSarangkot = quote([pkg], 'a-sarangkot');
ok(Math.round(withSarangkot.totals.activities) === 2500,
  'Sarangkot is marked not covered, so it still bills 2,500',
  String(Math.round(withSarangkot.totals.activities)));
const withEntry = quote([pkg], 'a-entry');
ok(Math.round(withEntry.totals.activities) === 1000,
  'a per-person entry fee is unaffected by the package (500 x 2)',
  String(Math.round(withEntry.totals.activities)));

console.log('\nThe grand total adds up');
ok(Math.round(packaged.totals.accommodation) === 17000, 'three nights of rooms (6000+6000+5000)',
  String(Math.round(packaged.totals.accommodation)));
ok(Math.round(packaged.totals.subtotal) === 57000, 'rooms 17,000 + vehicle 40,000 + activities 0',
  String(Math.round(packaged.totals.subtotal)));

console.log('\nHousekeeping');
ok(normaliseCities([' Kathmandu ', 'KATHMANDU', 'Pokhara']).join('+') === 'kathmandu+pokhara',
  'city lists are trimmed, de-duplicated and case-folded');
ok(findVehiclePackage({ ...base, vehiclePackages: [] }) === null, 'no rows at all -> no match');
ok(findVehiclePackage({ ...base, vehiclePackages: undefined }) === null, 'undefined rows -> no match, not a crash');

console.log(`\n  ${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
