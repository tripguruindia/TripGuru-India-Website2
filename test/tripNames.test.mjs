// ---------------------------------------------------------------------------
// The generated name for a trip.
//
// Run with:  npm test
//
// The property that matters is stability: rebuilding the same trip must
// produce the same name, or an agent repricing a quote would watch its title
// change underneath him.
// ---------------------------------------------------------------------------
import { generateTripName, formatDuration, tripCities }
  from '../src/portals/nepal/utils/tripNames.js';

const trip = (...cities) => cities.map((c, i) => ({ day: i + 1, city: c }));

let passed = 0;
let failed = 0;
function ok(c, label, detail = '') {
  if (c) { passed += 1; console.log('  \x1b[32mPASS\x1b[0m  ' + label); }
  else { failed += 1; console.log('  \x1b[31mFAIL\x1b[0m  ' + label + (detail ? '   -> ' + detail : '')); }
}

console.log('\nLength is written the way the trade writes it');
ok(formatDuration(5) === '4N/5D', 'five days is 4N/5D -- the last day is the departure');
ok(formatDuration(1) === '0N/1D', 'a single day has no nights');

console.log('\nThe name describes what the trip actually contains');
const lakes = generateTripName(trip('Kathmandu', 'Kathmandu', 'Pokhara', 'Pokhara', 'Kathmandu'));
ok(/4N\/5D$/.test(lakes), 'ends with the duration', lakes);
ok(!/Custom Itinerary/.test(lakes), 'and is not "… Custom Itinerary"', lakes);
const jungle = generateTripName(trip('Kathmandu', 'Chitwan', 'Chitwan', 'Kathmandu'));
ok(/Wild|Jungle|Wildlife|Safari/.test(jungle), 'a Chitwan trip reads as wildlife', jungle);
const sacred = generateTripName(trip('Kathmandu', 'Lumbini', 'Lumbini', 'Kathmandu'));
ok(/Sacred|Spiritual|Temples|Pilgrimage/.test(sacred), 'a Lumbini trip reads as pilgrimage', sacred);
const peaks = generateTripName(trip('Kathmandu', 'Nagarkot', 'Nagarkot'));
ok(/Himalayan|Peaks|Mountain|Clouds/.test(peaks), 'a Nagarkot trip reads as mountains', peaks);

console.log('\nThe same trip always gets the same name');
const a = generateTripName(trip('Kathmandu', 'Pokhara', 'Pokhara', 'Kathmandu'));
const b = generateTripName(trip('Kathmandu', 'Pokhara', 'Pokhara', 'Kathmandu'));
ok(a === b, 'rebuilding does not rename the trip', `${a} vs ${b}`);
ok(generateTripName(trip('Pokhara', 'Kathmandu', 'Kathmandu', 'Pokhara')) === a,
  'and the order the cities were entered does not change it');

console.log('\nA longer trip is named for its own length');
const four = generateTripName(trip('Kathmandu', 'Pokhara', 'Pokhara', 'Kathmandu'));
const six = generateTripName(trip('Kathmandu', 'Pokhara', 'Pokhara', 'Pokhara', 'Kathmandu', 'Kathmandu'));
ok(/3N\/4D$/.test(four) && /5N\/6D$/.test(six), 'durations differ', `${four} | ${six}`);

console.log('\nHousekeeping');
ok(generateTripName([]) === '', 'an empty itinerary has no name, not a broken one');
ok(generateTripName(undefined) === '', 'and neither does an undefined one');
ok(tripCities(trip('Kathmandu', 'Kathmandu', 'Pokhara')).join('+') === 'Kathmandu+Pokhara',
  'cities are de-duplicated in visit order');

console.log(`\n  ${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
