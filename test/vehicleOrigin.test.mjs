// ---------------------------------------------------------------------------
// Indian vs Nepali vehicles.
//
// Run with:  npm test
//
// The failure this guards against is silent and expensive: an Indian vehicle
// has NO sector rates, so if it is ever priced leg by leg it totals zero and
// the quote goes out with no vehicle cost at all. It must be priced only from
// a Vehicle Package, and say so loudly when none matches.
// ---------------------------------------------------------------------------
import { calculateQuote } from '../src/portals/nepal/utils/calculator.js';
import { vehiclesForTrip, fleetForTrip, countryOfCity, isIndianVehicle }
  from '../src/portals/nepal/utils/vehicleOrigin.js';

const cityCountries = { Gorakhpur: 'india', Raxaul: 'india', Kathmandu: 'nepal', Pokhara: 'nepal' };

const vehicles = [
  { id: 'v-in-tt', name: 'Tempo Traveller 17', capacity: 17, origin: 'india', route_rates: {} },
  { id: 'v-in-ertiga', name: 'Ertiga', capacity: 5, origin: 'india', route_rates: {} },
  { id: 'v-np-hiace', name: 'Hiace', capacity: 12, origin: 'nepal', daily_sightseeing_rate: 9500,
    route_rates: { gorakhpur_to_kathmandu: 20000, kathmandu_to_pokhara: 18000, pokhara_to_gorakhpur: 25000 } },
  { id: 'v-np-sedan', name: 'Sedan', capacity: 3, origin: 'nepal', route_rates: {} },
];
const hotels = [
  { id: 'h-ktm', city: 'Kathmandu', category: '4-Star', name: 'KTM',
    rates: { single:{CP:0}, double:{CP:6000}, extra_adult:{CP:0}, cwb:{CP:0}, cnb:{CP:0} } },
  { id: 'h-pok', city: 'Pokhara', category: '4-Star', name: 'PKR',
    rates: { single:{CP:0}, double:{CP:5000}, extra_adult:{CP:0}, cwb:{CP:0}, cnb:{CP:0} } },
];
const itinerary = [
  { day:1, city:'Kathmandu', hotelId:'h-ktm', meals:'CP', activity_ids:[], transfers:['gorakhpur_to_kathmandu'] },
  { day:2, city:'Kathmandu', hotelId:'h-ktm', meals:'CP', activity_ids:[], transfers:[] },
  { day:3, city:'Pokhara',   hotelId:'h-pok', meals:'CP', activity_ids:[], transfers:['kathmandu_to_pokhara'] },
  { day:4, city:'Gorakhpur', hotelId:'',      meals:'None', activity_ids:[], transfers:['pokhara_to_gorakhpur'] },
];
const pkgFor = (vehicleId) => ({
  id:'p1', vehicle_id: vehicleId, start_city:'Gorakhpur', end_city:'Gorakhpur',
  cities:['Kathmandu','Pokhara'], days:4, rate:40000,
});
const quote = (vehicleId, packages) => calculateQuote({
  hotelsData: hotels, vehiclesData: vehicles, activitiesData: [],
  routesData: [], airportsData: [], vehiclePackagesData: packages,
  vehicleId, startCity:'Gorakhpur', endCity:'Gorakhpur',
  rooms:[{ adults:2, children:[] }],
  settings:{ markup_percent:0, tax_enabled:false, tax_percent:0 },
  itinerary,
});

let passed=0, failed=0;
const ok=(c,l,d='')=>c?(passed++,console.log('  \x1b[32mPASS\x1b[0m  '+l)):(failed++,console.log('  \x1b[31mFAIL\x1b[0m  '+l+(d?'   -> '+d:'')));

console.log('\nWhich country a city is in');
ok(countryOfCity(cityCountries,'Gorakhpur')==='india','a marked border town is India');
ok(countryOfCity(cityCountries,' gorakhpur ')==='india','matched forgivingly');
ok(countryOfCity(cityCountries,'Kathmandu')==='nepal','a Nepali city is Nepal');
ok(countryOfCity(cityCountries,'Somewhere New')==='nepal','an unmarked city reads as Nepal, never India');
ok(countryOfCity(undefined,'Gorakhpur')==='nepal','no map at all -> Nepal, not a crash');

console.log('\nWhich fleet a trip needs');
ok(fleetForTrip(cityCountries,'Gorakhpur','Gorakhpur')==='india','India to India -> Indian vehicle');
ok(fleetForTrip(cityCountries,'Gorakhpur','Raxaul')==='india','border town to a different border town -> Indian');
ok(fleetForTrip(cityCountries,'Kathmandu','Kathmandu')==='nepal','inside Nepal -> Nepali vehicle');
ok(fleetForTrip(cityCountries,'Gorakhpur','Kathmandu')===null,'crossing one way -> either fleet');

console.log('\nWhat the operator is offered');
const indiaRun = vehiclesForTrip(vehicles, cityCountries, 'Gorakhpur', 'Gorakhpur');
ok(indiaRun.length===2 && indiaRun.every(isIndianVehicle),'an India-to-India run offers only Indian vehicles');
const nepalRun = vehiclesForTrip(vehicles, cityCountries, 'Kathmandu', 'Pokhara');
ok(nepalRun.length===2 && nepalRun.every(v=>!isIndianVehicle(v)),'a run inside Nepal offers only Nepali vehicles');
ok(vehiclesForTrip(vehicles, cityCountries, 'Gorakhpur', 'Kathmandu').length===4,'a one-way crossing offers both fleets');
ok(vehiclesForTrip(vehicles, cityCountries, '', '').length===4,'before the endpoints are chosen, nothing is hidden');

console.log('\nAn Indian vehicle is priced ONLY from a package');
const noPkg = quote('v-in-tt', []);
ok(Math.round(noPkg.totals.transport)===0,'with no package it charges nothing rather than guessing',
   String(Math.round(noPkg.totals.transport)));
ok(noPkg.vehicleNeedsPackage===true,'and it says so, so the builder can refuse to send the quote');
const withPkg = quote('v-in-tt', [pkgFor('v-in-tt')]);
ok(Math.round(withPkg.totals.transport)===40000,'with a package it charges the package rate',
   String(Math.round(withPkg.totals.transport)));
ok(withPkg.vehicleNeedsPackage===false,'and the warning clears');

console.log('\nA Nepali vehicle still prices either way');
const npSectors = quote('v-np-hiace', []);
ok(Math.round(npSectors.totals.transport)===63000,'no package -> legs are summed, exactly as before',
   String(Math.round(npSectors.totals.transport)));
ok(npSectors.vehicleNeedsPackage===false,'and that is not an error state');
const npPkg = quote('v-np-hiace', [pkgFor('v-np-hiace')]);
ok(Math.round(npPkg.totals.transport)===40000,'a matching package still wins',
   String(Math.round(npPkg.totals.transport)));

console.log(`\n  ${passed} passed, ${failed} failed\n`);
process.exit(failed?1:0);
