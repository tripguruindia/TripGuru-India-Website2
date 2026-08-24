// ---------------------------------------------------------------------------
// City Defaults -- what a freshly built day in a city starts out as.
//
// Run it with:   npm test
//
// The property that matters most is the last group: a city with NO defaults
// configured must behave exactly as the builder did before this feature
// existed. Every live quote depends on that, because the defaults start empty.
//
// utils/cityDefaults.js uses Vite's extensionless imports, so this is bundled
// with esbuild before it runs -- see the `test` script in package.json.
// ---------------------------------------------------------------------------
import {
  buildDayDefaults,
  defaultHotelId,
  defaultMealPlan,
  defaultActivityIds,
} from '../src/portals/nepal/utils/cityDefaults.js';

const hotels = [
  { id: 'h-ktm-4a', city: 'Kathmandu', category: '4-Star', name: 'Hotel Alpha' },
  { id: 'h-ktm-4b', city: 'Kathmandu', category: '4-Star', name: 'Hotel Partner' },
  { id: 'h-ktm-3a', city: 'Kathmandu', category: '3-Star', name: 'Budget Inn' },
  { id: 'h-chi-4', city: 'Chitwan', category: '4-Star', name: 'Jungle Lodge' },
];
const activities = [
  { id: 'a-ktm-sight', city: 'Kathmandu', name: 'Kathmandu Full-Day Sightseeing' },
  { id: 'a-ktm-bhak', city: 'Kathmandu', name: 'Bhaktapur & Patan Tour' },
  { id: 'a-pok-boat', city: 'Pokhara', name: 'Phewa Lake Boating' },
];
const defaults = [
  {
    city: 'Kathmandu',
    default_hotels: { '4-Star': 'h-ktm-4b', '3-Star': 'h-ktm-3a' },
    default_meals: 'MAP',
    night_plans: { 1: [], 2: ['a-ktm-sight'], 3: ['a-ktm-bhak'] },
  },
];

let passed = 0;
let failed = 0;
function ok(condition, label, detail = '') {
  if (condition) {
    passed += 1;
    console.log('  \x1b[32mPASS\x1b[0m  ' + label);
  } else {
    failed += 1;
    console.log('  \x1b[31mFAIL\x1b[0m  ' + label + (detail ? '   -> ' + detail : ''));
  }
}

console.log('\nA configured city uses the hotel the admin chose');
ok(defaultHotelId(defaults, hotels, 'Kathmandu', '4-Star') === 'h-ktm-4b',
  'the partner hotel, not whichever came first');
ok(defaultMealPlan(defaults, 'Kathmandu') === 'MAP', 'and the configured meal plan');

console.log('\nNight plans are keyed by night index, and compose');
ok(defaultActivityIds(defaults, activities, 'Kathmandu', 1).length === 0,
  'night 1 is the arrival day and stays empty');
ok(defaultActivityIds(defaults, activities, 'Kathmandu', 2)[0] === 'a-ktm-sight',
  'night 2 gets the sightseeing run');
ok(defaultActivityIds(defaults, activities, 'Kathmandu', 3)[0] === 'a-ktm-bhak',
  'night 3 gets its own');
ok(defaultActivityIds(defaults, activities, 'Kathmandu', 4).length === 0,
  'a night with no plan adds nothing');

console.log('\nStale configuration can never charge for something that is gone');
const stale = [{
  ...defaults[0],
  default_hotels: { '4-Star': 'h-deleted' },
  night_plans: { 2: ['a-deleted', 'a-pok-boat'] },
}];
ok(defaultHotelId(stale, hotels, 'Kathmandu', '4-Star') === 'h-ktm-4a',
  'a deleted default hotel falls back instead of dangling');
ok(defaultActivityIds(stale, activities, 'Kathmandu', 2).length === 0,
  'a deleted activity is dropped, and one from another city is never offered here');

console.log('\nCity names are matched forgivingly, as everywhere else');
ok(defaultMealPlan([{ ...defaults[0], city: '  kathmandu ' }], 'Kathmandu') === 'MAP',
  'a stray space or different case still matches');

console.log('\nWhatever is filled in automatically is reported, so it can be shown');
let r = buildDayDefaults({
  cityDefaults: defaults, hotels, activities,
  city: 'Kathmandu', category: '4-Star', nightIndex: 2,
});
ok(r.autoAdded.hotelName === 'Hotel Partner', 'the hotel is named');
ok(r.autoAdded.activityNames[0] === 'Kathmandu Full-Day Sightseeing', 'the activity is named');
r = buildDayDefaults({
  cityDefaults: defaults, hotels, activities,
  city: 'Chitwan', category: '4-Star', nightIndex: 1,
});
ok(r.autoAdded.hotelName === '', 'a fallback pick is not announced as a decision');

console.log('\nAn UNCONFIGURED city behaves exactly as it did before this existed');
ok(defaultHotelId(defaults, hotels, 'Chitwan', '4-Star') === 'h-chi-4', 'first hotel in the city');
ok(defaultMealPlan(defaults, 'Chitwan') === 'AP', 'Chitwan still defaults to full board');
ok(defaultMealPlan(defaults, 'Pokhara') === 'CP', 'everywhere else still breakfast only');
ok(defaultActivityIds(defaults, activities, 'Pokhara', 2).length === 0, 'and nothing is added');
ok(defaultHotelId(undefined, hotels, 'Kathmandu', '4-Star') === 'h-ktm-4a',
  'no defaults loaded at all -> the old rule');
ok(defaultMealPlan(null, 'Chitwan') === 'AP', 'null defaults -> the old rule');
ok(defaultActivityIds(null, activities, 'Kathmandu', 2).length === 0, 'null defaults -> nothing added');

console.log(`\n  ${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
