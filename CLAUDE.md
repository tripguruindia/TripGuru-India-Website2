# TripGuru — project guide for Claude Code

Read this before changing anything. It records the decisions and traps that
are not obvious from the code.

## Who you are working with

Tanmay owns the business and is **not a developer**. He does not know git
commands and should not be expected to. He tests carefully and describes
symptoms accurately in plain language — that is his strength, use it.

- Give click-by-click test steps ("click X, you should see Y"), not technical
  verification criteria.
- When something breaks, reassure first ("nothing is lost"), then give the fix.
  Git errors read as alarming to him.
- Prefer doing things yourself — reading code, running builds, measuring
  styles in the browser — over asking him to investigate.
- Windows PowerShell. `&&` does **not** chain commands; give one per line.
- He asked directly for fewer, larger steps: long multi-part instructions lose
  him.
- **Open a pull request as soon as a piece of work is finished** — he asked for
  this directly, so do not wait to be told each time. He merges it himself on
  GitHub; a branch pushed without a PR is work he cannot see or ship. Once a PR
  is merged it cannot take new commits: restart the branch from `main` and open
  a fresh PR for the next change.

## What this repo is

Two things in one repository:

1. **The main marketing site** (`src/`) — React 19 + TypeScript + Vite 6 +
   Tailwind 4 + React Router 7. Public pages, destinations, city landing
   pages, lead capture. Talks to a separate service, InTravWeb.
2. **The Nepal portal** (`src/portals/nepal/`) — a self-service quote builder
   and booking system with three separate portals, plus its own Express +
   SQLite backend in `server/`.

Live: https://tripguruindia.com · portal at `/nepal`
Repo: https://github.com/tripguruindia/TripGuru-India-Website2

## Commands

```
npm install          # first time
npm run dev          # dev server
npm run build        # build + regenerate sitemap
npm run lint         # tsc --noEmit
```

`.env.local` must contain `VITE_INTRAVWEB_API_BASE` and `VITE_NEPAL_API_BASE`
(see `.env.example`). **Vite reads env files only at startup** — restart the
dev server after changing them.

There is **no automated test suite.** All verification to date has been
throwaway scripts plus manual browser checks. If you add tests, that is a
genuine improvement, not scope creep.

## The three portals

All three are hash routes on the single `/nepal` path, all rendered from one
component in `src/portals/nepal/App.jsx` (~10,000 lines, one big `App()`):

| Route | Portal | Who |
|---|---|---|
| `/nepal` | B2C traveller storefront | public, login optional |
| `/nepal#/b2b` | B2B agent portal | travel agents |
| `/nepal#/admin` | Admin backend | staff |

`view` / `currentRoute` state decides which renders. Sub-views are
`b2cSubView`, `b2bSubView`, `activeAdminTab`.

**The B2C portal renders no sidebar** — `view !== 'b2c'` guards the `<aside>`,
so B2C navigation lives in the header. The B2C block inside the sidebar is
dead code; don't add anything there expecting it to show.

### Rule: portals never navigate to each other

There are **zero `window.location.hash` writes** in the portal, and it must
stay that way. Logging out of the agent portal used to drop you on the
traveller storefront — it reads as a fault and demonstrates to anyone watching
that the three portals are one app. Logout leaves you on the portal you were
in; each has its own signed-out screen.

If you need to move a user between views, set the sub-view state. Never write
the hash.

### Rule: the traveller portal must not reveal the others

No link, menu item, or text on the B2C portal may mention the agent or admin
portals. This has been audited and is currently clean.

**Known limitation, disclosed to Tanmay:** all three portals build into one JS
chunk, so the route strings are findable in devtools. Truly hiding them means
splitting into separate Vite entry points — a substantial change Tanmay has
not yet approved. Server-side auth is what actually protects the data.

### Rule: dev-only UI must be hostname-gated

`isLocalDevHost` (top of `App.jsx`) is true only on localhost/127.0.0.1/[::1].
The sign-in gate's quick-login buttons print working credentials and are
gated behind it. They were previously live on the public admin page.

Use a hostname check, not `import.meta.env.DEV` — a production build served
locally should still show dev helpers, and a dev build must never reach the
live domain with them on.

## Styling — read before touching portal CSS

The portal forces descendant text to `--text-primary` with `!important`.

**Never style portal UI with fixed Tailwind colour classes.** A light fixed
background renders cream-on-cream in dark mode. Use the theme tokens in
`src/portals/nepal/index.css` (`--bg-card`, `--text-muted`, `--primary`,
`--border-color`, …) and follow the existing `.quote-*` and `.draft-resume-*`
blocks as the pattern.

**Always check both light and dark themes.** The toggle is top-left. Verify by
measuring computed styles in the browser rather than guessing — two "still
broken" reports from Tanmay turned out to be stale cached CSS.

## Backend (`server/`)

Node + Express, hand-written SQL via `@libsql/client`, **no ORM**.
Hosted on Render (`tripguru-nepal-api`, id `srv-da0ockm1egvs7397c53g`), auto-
deploys from `main`. Database is Turso (libSQL/SQLite).

```
server/db/schema.sql        every statement is CREATE TABLE IF NOT EXISTS
server/src/migrate.js       applies schema.sql on every deploy
server/src/seed.js          demo fixtures, idempotent
server/src/routes/          auth, admin, public, bookings, quotes
server/src/serializers.js   DB row -> API shape
```

Mounted at `/api/nepal/{auth,admin,public,bookings,quotes}`.

**Adding a table:** just add it to `schema.sql`. `migrate.js` runs on every
Render build, so it appears automatically — no manual DB step.

**Adding a column to an existing table:** `CREATE TABLE IF NOT EXISTS` will
*not* add it. Add an entry to `ADDITIVE_COLUMNS` in `migrate.js` (an
`ALTER TABLE`, wrapped so "duplicate column" is swallowed).

### Auth model — the rule that matters most

**Ownership is always derived from the verified JWT, never from the request
body.** `bookings.agent_id`, `quotes.agent_id`/`user_id`, and commission are
all assigned server-side. A client-supplied `agent_id` is never trusted. This
fixed a real bug where every B2B booking was hardcoded to one agent.

Every read is scoped to the caller, so one agent cannot see another's data
even by guessing an id — they get a 404, not a 403.

Each portal is an **independent session in the same browser**: tokens live in
`nepal_auth_token_{admin,b2b,b2c}`, displayed user in
`nepal_quote_user_<route>`. Do not reintroduce a shared token or user key —
both have caused cross-portal leaks before.

### Saved quotes

`quotes` is a **separate table, not `bookings` with a Draft status** — a quote
has no commission owed and must not count toward sales volume; merging them
would corrupt dashboard totals.

Statuses `Draft → Sent → Won | Lost`. **`Won` is settable only via
`POST /quotes/:id/convert`**, so a Won quote always has a real booking behind
it. Convert is idempotent and recomputes commission server-side. Converted
quotes are locked against edit and delete — they are the record of what the
client agreed to.

Booking a build that came from a saved quote goes *through* that quote (save,
then convert) rather than creating a second parallel booking, which keeps
`converted_booking_id` pointing at the real booking so win rates stay
measurable.

## The voucher, and its two copies

The confirmation screen renders one document (`#print-sheet`) in one of two
copies, chosen by `invoiceCopyMode`. Print and the WhatsApp export both act on
what is rendered, so the single switch decides what both produce — four
separate buttons would have had to rebuild the sheet anyway.

- **`client`** (the default) — itinerary and one all-inclusive total. No
  per-service split, no GST line, no agency markup. On the agent portal the
  last two are the agent's own margin and TripGuru's price; sending them to his
  client hands over his cost sheet. Defaulting here is deliberate: mailing an
  internal sheet to a traveller is far worse than pressing one button for your
  own copy.
- **`internal`** — every line, for the operator's own record.

Both are the same trip at the same grand total; only the detail differs, so the
two copies can never quote differently.

**`#print-sheet` does not follow the portal theme.** It is a document preview —
what is on screen is what prints and what a client is shown — so it stays a
white sheet with dark ink in both themes. Under the dark theme the portal's
global rules had turned its surface dark while its type stayed slate-900,
rendering the proposal title dark navy on near-black. The rules live in
`index.css` scoped to that one id, and include a blanket `*` colour because the
portal forces descendant text to `--text-primary` with `!important`; the class
rules after it are more specific than `*`, so the sheet's accents survive.

## Editing a confirmed booking

`PATCH /bookings/:id` amends a booking in place. Editing a confirmed trip used
to have no path at all, so the only way to change one was to build it again —
which left two bookings for one trip and counted the money twice.

*Edit This Booking* on the voucher sets `editingBookingId`; the builder's book
button then reads *Update Booking <id>* and `handleConfirmCheckout` PATCHes
instead of POSTing, replacing the record in the local lists rather than
prepending to them.

Ownership follows the same rule as everything else: derived from the verified
token, never the body. A B2B agent may amend only a booking whose `agent_id` is
his own; anyone else gets a 404, not a 403. `total_price` comes from the client
(it has just repriced the itinerary) but `agent_commission` is always recomputed
server-side from that total, and the type, owner and `created_at` are immutable.

## GST

Two settings, not one, both in Admin -> Global Pricing Formulas:

- **`tax_enabled`** — whether GST is charged at all. Deliberately separate from
  a 0% rate: with it off the quote prints **no GST line**, so nothing tells a
  client a tax was collected and came to nothing.
- **`tax_percent`** — the rate. 5% is the default for a fresh install; the live
  row keeps whatever it already had until it is changed in Admin.

`tax_enabled` is an `ADDITIVE_COLUMNS` entry defaulting to 1, so the live
settings row keeps charging GST exactly as before the column existed.

**Where GST sits relative to the markup differs by portal**, via the
`tax_before_markup` flag passed into `calculateQuote`:

- **B2C** — the markup *is* the selling price, so GST is charged on the
  marked-up amount. That is what the traveller pays tax on.
- **B2B** — the markup is the agent's *own* margin, which is not TripGuru's to
  tax. GST is charged on TripGuru's price and the agent's margin goes on top of
  the GST-inclusive figure.

The grand total is the same either way (multiplication commutes); what changes
is the **split**. On a ₹17,600 B2B trip at 5% GST and 10% agent markup, GST is
₹880 rather than ₹968 — the honest figure for what TripGuru actually collected.
Both orderings run through one `applyMarkupAndTax()` helper so the grand total
and the per-adult/per-child split can never drift apart.

**Bookings and quotes do not store the tax rate.** A saved quote reprices
against whatever GST is set when it is reopened — pre-existing behaviour, now
also true of the on/off switch.

## Deployment

- **Frontend:** Vercel project `trip-guru-india-website2`, auto-deploys from
  `main`. Needs `VITE_INTRAVWEB_API_BASE` and `VITE_NEPAL_API_BASE`.
- **Backend:** Render, auto-deploys from `main`. Build runs `npm run migrate`.
- **Database:** Turso. Credentials live only in Render env vars — never in the
  repo.
- Render's free plan has no Shell, so one-off DB work is done by POSTing to
  Turso's HTTP API (`/v2/pipeline`) from a real browser tab.

## Gotchas that have bitten before

- **`calculateQuote` must stay memoised.** An unmemoised version ran on every
  render and froze the UI on lead submit.
- **Package cards advertise an offer price** (`starting_price_override`) that
  the builder must honour via `offer_discount_per_pax`, pinned to the
  package's default configuration. Previously a card said ₹21,999/pax and the
  builder quoted ₹55,879.
- **The promotional poster popup is intentional** — `popup_poster_active` +
  `popup_poster_url` in Admin settings, shown once per session on first
  scroll. It is not a bug; it has been mistaken for one.
- **"Forgot Password?" does nothing** but show a message telling the user to
  contact the administrator. There is no email reset. If the admin password is
  lost, recovery means writing a bcrypt hash directly into the Turso `users`
  table.
- **Open Graph tags are set client-side**, so WhatsApp/Facebook link previews
  show generic homepage content. Needs prerendering or SSR to fix.

## Transfers, airports, and flights

A day holds a **`transfers` array**, not one route. Flying between cities needs
two on the same day (a drop at the origin airport, a pickup at the
destination), and either must be removable on its own. `transfer_route` is
still written as `transfers[0]` — quotes, bookings and packages saved before
this change store only the string. **Always read a day's transfers through
`getDayTransfers()` and write them through `withDayTransfers()`** (both in
`utils/transfers.js`), never by touching either field directly.

`utils/transfers.js` is shared by the pricing engine and the builder UI on
purpose, so the price charged and the itinerary shown can't disagree.

**Airports are their own master**, not a flag on a city: one airport serves
several cities (Bhairahawa covers Lumbini, Butwal and Bhairahawa) and its name
often differs from the city (Chitwan flies via Bharatpur). The transfer *rate*
is per city, because the drive from a shared airport differs by city.

Airports are **selectable stops in the Route Builder** (`apt:<id>` in the
dropdown, `apt<code>` in the key), so "Pokhara Airport to Bandipur" is a route
somebody builds and prices in Admin. This is what stops every new destination
needing a code change — adding Bandipur is: add the city, list it under
Pokhara International, build the route, set the rates.

Look an airport transfer up with **`resolveAirportTransfer()`**, never by
generating `<city>_airport_transfer` directly. It prefers a hand-built route
(either direction) and falls back to the legacy key, which is why
`ktm_airport_transfer` and its prices still work.

The Road/Flight toggle lives in the **final builder only, not the intake
wizard** — it is an operator decision, and asking a traveller up front
confused the form. Flight is offered only between cities with *different*
airports. The airfare itself is never priced (no flight inventory); the
itinerary says "not included" in as many words.

## Activities

Most are sold per head (`price_adult`/`price_child` × party size). A full-day
sightseeing run is not: it is one vehicle out for one day, costing the same
for two people or twelve, and a Coaster day costs four times a Sedan day. Those
carry **`pricing_mode: 'per_vehicle'`** and bill once from `vehicle_rates`,
keyed by vehicle id, ignoring the per-head prices entirely. Charging one per
head would quote ₹65,000 for a twelve-seater instead of ₹9,500.

Sightseeing is an **activity, not a transfer** — it was briefly both, and the
`local_sightseeing` route key still prices for old saved quotes but is gone
from the route master.

An activity is only offerable on a day in its **own city**; compare through
`activitiesInCity()`, which trims and is null-safe. One whose city is not in
the Cities master can never be used, so the Admin list flags it.

**Nothing is ever added to a day automatically.** The intake wizard used to
drop a hardcoded activity (`a-ktm-sightseeing`, `a-pok-boating`,
`a-chi-safari`) on the second night in a city, so asking for two nights in
Kathmandu silently added a paid activity nobody chose and the quote came out
higher than the agent expected. Activities are picked by hand in the day
cards. Tanmay wants automatic suggestions back **later**; when they return
they must be driven by the activities master, not hardcoded ids, and be
visible and removable at the moment they are added.

## The quote builder

**The intake wizard opens empty.** Every field a trip is made of — city,
nights, start and end city, date, star rating, nationality — starts blank with
a "Select ..." prompt and is `required`. It used to open pre-filled
(Kathmandu, two nights, Gorakhpur both ends, a hardcoded date), so pressing
*Create Proposal* without touching anything produced a real-looking quote for
a trip nobody had chosen. `handleCreateProposal` repeats the check in JS
because the B2C lead-capture modal resubmits the form on the user's behalf and
bypasses the browser's own validation.

Admin's saved wizard defaults (`wizard_default_*`) feed the Admin editor and
the *Customize Recommended Itinerary* button, which reads them straight from
settings. They deliberately no longer pre-fill the intake form — loading a
template is a click the operator makes, not something that happens to them.

**One place edits a trip: the intake page.** A saved quote reopens there, not
in the day cards. Its stays are derived from the itinerary
(`deriveTripStructure`) rather than stored, so the two cannot disagree.

Continuing from the intake page **reshapes** the itinerary via
`rebuildItineraryForStructure()` — days for a city are reused in order, so
hotels, meals, activities and flight legs survive; only new days come in
blank. It used to rebuild from scratch, which silently discarded the whole
itinerary if you went there to change the rooms. **Never reintroduce a path
that regenerates over an existing itinerary.**

That function takes the trip's start/end city **as arguments**. The intake page
calls it before its own `setState` has landed, so reading them from state
rebuilt day one against the previous start city.

The builder header is a read-only summary plus one *Edit Trip* button. The
former per-field pickers, "Edit Rooms" and "Edit Cities & Nights" are gone.

### Hotels on a day card

Match a hotel's city through **`sameCity()`** (module scope, above `App()`),
never a raw `===` on the strings — a stray space in the Cities master used to
hide every hotel in that city. `sameCity` is deliberately at module scope: it
was declared partway down the component body, which put every earlier use of
it in the temporal dead zone and rendered the whole portal as a blank page.

`hotelChoicesForCity()` returns the trip's star rating first and every other
rating the city has second. Offering only the chosen rating meant a city with
no hotel at that rating showed an empty dropdown with no explanation — Jomsom
on a 4-Star trip left "No stay required" as the only choice. Other ratings are
labelled with the rating they actually are and priced from their own rates.

A room's price is **`double` + `extra_adult`** when three adults share it —
there is no `triple` rate; `extra_adult` *is* the third bed. The engine has
always charged it (see `deriveFromRooms`), but the day card showed only the
double rate, so a correct quote looked as if it had ignored the third guest.
The card now prints every bed the party occupies and warns when a bed the
party needs has no rate set, because that bed is otherwise charged ₹0 and the
whole quote comes out short with nothing on screen to say so.

Day headings and descriptions are generated in `calculator.js` and are what the
client reads: lead with the movement (Arrive / Drive to / Fly to / Depart) and
spell meal plans out.

A whole-vehicle activity is never **named** in the title — "Kathmandu Full-Day
Sightseeing (Vehicle)" is an operations label, not something to show a
traveller — but it still **counts**: a day carrying one is headed
"<City> Sightseeing", not "Leisure Day in <City>". Leaving it out entirely put
the two halves of the same card in contradiction, the heading calling a day
leisure while the itinerary under it described a full day of sightseeing.

## Current state and what's next

As of 2026-08-23, `main` is at PR #26 and everything is merged and deployed;
no open PRs. Live since the last handoff: the wallet ledger, airports and
Road/Flight transfers, airports as route stops, the transfer rate sheet,
two-way sector pricing, per-vehicle sightseeing activities, editable
cities/airports/activities, editing a saved trip's cities and nights,
readable itinerary copy, and a mobile navigation drawer.

**Outstanding data Tanmay owes** (all Admin work, no code):

- Five transfers still at ₹0: Bhairahawa, Butwal, Lumbini and Jomsom airport
  transfers, plus *Gorakhpur Airport (GOP) to Gorakhpur*.
- The activity *"Kathmandu Full Day Sightseeing (5-6 Hours"* is per-vehicle
  with **no rates at all**, so it charges nothing. Created through the old
  broken inline editor.
- Seven cities have no hotels and so cannot host a paid overnight: Bagdogra,
  Bhairahawa, Butwal, Gorakhpur, Lumbini, Mankamna, Raxaul.

**Known and deliberate:** flight airfare is never priced (the portal has no
flight inventory) — the itinerary says so instead.

Next, roughly in order: the rest of the mobile pass (27 of 39 tap targets are
under 40px and 54 text elements under 12px — a deliberate rescale of the
portal's type and controls, not a bug fix); client list for agents; filters and
export on booking history; splitting the portals into separate builds
(awaiting his decision); Open Graph prerendering; and 6.2 MB of PNGs in
`/public` (largest >1 MB).

## Operating on live data

There is no staging environment. `npm run dev` talks to the **live** API, so
admin actions taken locally hit production immediately.

**`npm run seed` does not run on deploy** — only `npm run migrate` does. A new
table therefore arrives empty, and its seed rows have to be entered through
the Admin UI. This is why the airports master had to be filled in by hand
after the migration created it.

**Be careful deleting through the admin UI.** Deleting a route by walking up
the DOM from a matched row can match the container holding *all* rows and hit
the first one instead. That happened: it silently removed `local_sightseeing`
and `ktm_airport_transfer` (and stripped the Kathmandu rates from every
vehicle) while appearing to target a test route. Verify what actually
disappeared *before* saving, and re-read the API afterwards to confirm.

Routes the builder invents mid-quote (`ensureRoutesExist`) only reach the
server from an **admin** session — `saveDB` syncs on `isAdminSession()`. One
created while testing in the B2C/B2B builder stays local.

## Verifying changes

Two traps, each of which cost an hour:

**`npm run lint` is `tsc --noEmit` and does not type-check JSX bodies.** An
undefined variable inside JSX passes lint and crashes at runtime. Render the
screen before believing it works.

**CSS transitions outrank `!important`,** and in a headless tab that never
paints, a transition starts and then freezes — pinning the property to its
start value and overriding even inline styles. Any measurement of an animated
element reports the *pre-animation* value, which reads exactly like a broken
implementation. Disable the transition at **matching specificity** first;
`* { transition: none }` loses to `.nepal-portal-root .sidebar`.

Pricing changes are worth a throwaway Node script against `calculator.js`
rather than clicking through the UI. Bundle it first — the source uses Vite's
extensionless imports, which Node will not resolve:

```
node node_modules/esbuild/bin/esbuild test.mjs --bundle --platform=node \
  --format=esm --outfile=out.mjs && node out.mjs
```

Suites written this way have covered flight legs, airport-served-by-another-
city, reverse pricing, per-vehicle activities and the structure merge. They
live in the session scratchpad, not the repo — **there is still no committed
test suite, and adding one remains a genuine improvement.**
