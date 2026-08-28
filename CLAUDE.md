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

Two committed test suites:

- **`npm test`** (repo root) — `test/cityDefaults.test.mjs` (the City Defaults
  resolver), `test/vehiclePackages.test.mjs` (package matching, and that a
  package never charges the vehicle twice) and `test/vehicleOrigin.test.mjs`
  (which fleet a trip may use, and that an Indian vehicle is never priced by
  sector). Bundled with esbuild first, because the source uses Vite's
  extensionless imports.
- **`npm test`** from **`server/`** — `server/test/approval.test.js`, the agent
  approval gate. It boots the real Express app against a throwaway libSQL file
  in the temp directory, so it touches nothing live and needs no credentials,
  then tears both down.

Everything else is still verified by throwaway scripts and browser checks.
**More tests are a genuine improvement, not scope creep.**

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

### Browser Back moves between screens, not off the site

The portal is one page whose screens are state, so Back used to leave
altogether — pressed in the quote builder it loaded whatever page had been
open before `/nepal`. Each screen now pushes a history entry, so Back walks
builder → wizard → packages → dashboard and only leaves once there is nothing
left to go back to.

**This is not a hash write and must not become one.** Every entry keeps the
*same* url and carries the screen in `history.state`; `currentRoute` still
comes from the hash, so this moves within one portal without ever changing
which portal you are in. When the hash itself changes the entry is *replaced*
rather than pushed — the browser has already made one, and pushing a second
costs a dead Back press.

Backing out of a voucher into the builder sets `editingBookingId`, exactly as
the voucher's *Edit This Booking* button does. Without it the trip is already
booked but the builder does not know, so pressing Book again would write a
second booking for the same trip — a path that only opened once Back started
moving between screens.

The block lives *below* the booking state it reads. Placed with the other
routing code it sat above `lastBookingId` and rendered the portal as a blank
page; lint passed it.

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

### There is no commission — the agent keeps his own markup

**TripGuru pays agents nothing.** The agent is shown a cost, adds his own
markup on top of it, and collects the whole amount from his client. His
earnings are simply that markup. There is no commission rate, no tier system,
and nothing for TripGuru to pay out.

`agentEarnings(totalPrice, markupPercent)` in **`server/src/agentEarnings.js`**
is the single definition, imported by both `routes/bookings.js` and
`routes/quotes.js`. It replaced `AGENT_COMMISSION_RATE = 0.1`, which was
declared separately in each of those files — changing one left the two
disagreeing about what the same trip was worth. `agentEarningsOn(booking)` at
module scope in `App.jsx` mirrors it for display.

The markup is applied **last** on the agent portal (GST is charged on
TripGuru's price, the markup goes on top of the GST-inclusive figure), so it
works back out of the stored total exactly:

    markup = total x pct / (100 + pct)

Deriving it from `total_price` and `markup_percent` — both of which have always
been stored — means it is right for **every booking ever made**, including the
ones written while the flat 10% was still being recorded. The
`bookings.agent_commission` column is kept and now holds this real figure; the
name is legacy.

The decorative badges are gone: "Partner Status: Gold Tier (10% Comm.)" (agent
dashboard *and* agent profile), the "Commissions (10%)" dashboard card, the
"Commission (10%)" table column, and the sidebar's "Comm: 10%". Do not
reintroduce a commission figure — there is nothing behind it.

### TripGuru's own markup lives in Admin, and always did

Admin → Global Pricing Formulas has **both** rates, and had them all along —
they were simply labelled ambiguously ("B2B Partner Markup" reads as the
*partner's* markup when it is in fact TripGuru's margin on the price the
partner is shown). They now read **"Your markup on B2C (%)"** and **"Your
markup on B2B (%)"**.

Watch the names, which do not match what they hold:

| Stored as | Really is | Reaches `calculateQuote` as |
|---|---|---|
| `settings.b2c_markup_percent` | TripGuru's markup on B2C | `markup_percent` |
| `settings.b2b_markup_percent` | TripGuru's markup on B2B | `b2b_admin_margin_percent` |
| `bookings/quotes.markup_percent` | on B2B, the **agent's own** markup | `markup_percent` |

So `markup_percent` means TripGuru's margin on a B2C trip and the agent's
margin on a B2B one. In `App.jsx` the state is `b2cMarkupInput` /
`b2bMarkupInput` (both TripGuru's, bound to the Admin fields) versus
`agentMarkupInput` (the agent's own box in the builder).

### Agent accounts are approved before they can trade

A B2B signup creates a **`pending`** account. It cannot quote or book until an
admin approves it in **Admin -> Users Master**, where pending agents sit in a
queue at the top of the screen with Approve / Reject beside them.

Enforcement is **server-side**, by `requireApprovedAgent` in
`middleware/auth.js`, on every route where an agent creates or amends money:
`POST`/`PATCH` on `/bookings`, and `POST`/`PATCH`/`DELETE`/`:id/convert` on
`/quotes`. Hiding the buttons would not have been protection.

It reads the status from the **database, never the token**. Tokens last 30
days, so an agent rejected this morning would still be carrying one minted
while he was approved. Reads are deliberately left unguarded so the waiting
screen can still load. Non-agents pass straight through — this is a rule about
agent accounts, not a general permission check.

**`approval_status` defaults to `'approved'`, not `'pending'`.** Every account
that already existed when the column arrived is a real, working account;
defaulting to pending would have locked every current agent out the moment
Render deployed. Only a fresh B2B signup writes `'pending'`, explicitly. The
same rule holds in the UI: a missing status reads as approved everywhere.

Only `PATCH /admin/users/:id/approval` may write the status. `PATCH /auth/me`
deliberately cannot, or the queue would be self-service. A rejection carries a
reason, shown to the agent; a rejected agent can be approved after all from his
row, because rejecting the wrong one is a slip.

The **front end has one gate**, at the point where every B2B sub-view renders —
not a guard per screen, which the next new screen would quietly miss. The agent
navigation is hidden while waiting, since every item led to the same screen.

### The GST number

Optional at B2B signup, stored on `users.gst_number`, editable by the agent
through `PATCH /auth/me`, and printed on the **internal copy of the voucher
only** — a traveller has no use for the agency's GST registration, and the
client copy carries no trade wording.

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

**One screen lists both: *Quotes & Bookings*.** A booking made straight from
the builder never had a quote behind it, so it appeared nowhere on that screen
— three bookings in the history and one card in the list. Direct bookings are
now listed too, as **Won**: every booking is won business, whether or not a
proposal preceded it. A booking that came *from* a quote is not listed twice —
the quote's Won card already carries *Open Booking*.

**The client on `checkoutForm` must be cleared with the trip.** It used to
persist, so every new booking opened pre-filled with the previous customer's
name, email and phone and could be confirmed for the wrong person without
anyone noticing. `startFreshTrip()` clears it together with
`editingBookingId`; the two always go together. It is deliberately *not*
cleared right after booking — the voucher rendered next reads it for
"Prepared For".

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

**The client copy carries no trade wording.** "B2B Partner Voucher", the
"B2B Travel Partner" tagline and the "Booking Agent" line all describe the
agent's arrangement with TripGuru, which is nothing to do with the traveller
reading the document — on the client copy the letterhead is simply the agent's
own, and the pill reads "Travel Voucher". They stay on the internal copy.

**The agent's logo lives on their account, not in a browser.** `agency_logo`
is an `ADDITIVE_COLUMNS` entry on `users`, written through
`PATCH /auth/me` — the caller's own row, chosen from the verified token, never
from the body; role, email, password and wallet balance are not editable
there. It used to sit only in `localStorage`, so an agent signing in from
another device sent unbranded vouchers. Capped at 1MB on both sides: it rides
along with every login and `/me`.

The letterhead's logo box is `h-24 max-w-[320px]` with `object-contain`, so a
round logo lands square and centred (96×96) and a wide one with the name built
in runs the full width (320×64) — neither stretched nor cropped.

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

**`editingBookingId` must be cleared wherever a different trip is loaded** —
the from-scratch branch of `handleCreateProposal`, both preset-package
handlers, `resumeBuilderDraft`, `handleResumeQuote`, and the *Customize
Recommended Itinerary* button. It shipped without those clears, and the result
destroyed data: press *Edit This Booking*, navigate away, build something else,
press Book, and the new trip silently **overwrote** the old booking instead of
creating its own. Deliberately *not* cleared in the reshape branch — the
builder's *Edit Trip* button goes through that same screen and must keep
amending the same booking. The builder shows a banner naming the booking being
amended, so the state is never invisible.

A **converted quote stays locked** but is no longer a dead end: its card
carries an *Open Booking* button through to the voucher, where the trip can be
edited.

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

**Automatic suggestions are back, driven by Admin.** The intake wizard once
dropped a *hardcoded* activity (`a-ktm-sightseeing`, `a-pok-boating`,
`a-chi-safari`) on the second night in a city, so asking for two nights in
Kathmandu silently added a paid activity nobody chose and the quote came out
higher than the agent expected. That was removed, and has now returned on the
terms it failed on: driven by **Admin -> City Defaults** rather than hardcoded
ids, and **announced** — the builder shows a banner naming every day that was
pre-filled, and each item is removable on its day card. See *City Defaults*
below.

## Vehicle packages — one rate for the whole trip

How Nepal actually works: a party leaves an Indian border town (Gorakhpur,
Raxaul) in an **Indian vehicle**, tours Nepal, and the same vehicle brings them
back to a border town — the same one or another. That is roughly 90% of trips.
The other case is a **Nepali vehicle** picked up inside Nepal, after flying into
Kathmandu or being dropped at the border.

Either way the vehicle is **hired for the trip, not for each leg**, and the
empty return run is part of what is being paid for. So it is quoted as one
figure, not as a sum of sectors.

**Admin -> Vehicle Packages** holds those rates. A row is
*vehicle + start city + end city + overnight cities + days -> rate*, and
`utils/vehiclePackages.js` matches a trip against it.

- Matching is **exact**. A package rate is a negotiated number for a specific
  run; picking the nearest one would put a figure on a quote nobody agreed.
- City **order is ignored** — Kathmandu then Pokhara is the same road as
  Pokhara then Kathmandu — so each circuit is entered once.
- Only **overnight** cities count. Somewhere visited for a few hours is charged
  as its own extra, not folded into the key.
- **Days** is the whole itinerary length, departure day included.

**When a row matches, the vehicle is paid for once.** Every sector charge is
suppressed and the package figure is added instead. So is the basic local
sightseeing — which is the trap: a full day of sightseeing is billed as a
**per-vehicle activity**, so leaving it alone would charge the same vehicle
twice on the same day and the quote would go out high with nothing to explain
it. `activities.covered_by_vehicle_package` decides, defaulting to **covered**,
because ordinary sightseeing is what a package includes and the extras are the
exception. A genuine extra run — Sarangkot at sunrise, a Pumdikot detour — is
marked not covered and still charges on top. Per-head tickets are never
affected.

**No match falls back to sector pricing and says so**, on the agent portal:
the builder names the exact combination that has no row. A gap in the rate
sheet then shows up on a real quote instead of as a wrong price.

**The builder had no vehicle picker at all.** `selectedVehicleId` defaulted to
`v-suv` and could only be changed by loading a preset package, draft, quote or
booking — so a Coaster could not be quoted for twelve people, and a package
keyed to a Hiace could never be matched. The intake wizard now has a required
**Vehicle** field, showing each vehicle's capacity.

### Indian and Nepali vehicles are separate fleets

`vehicles.origin` is `'india'` or `'nepal'`, and `cities.country` says which
side of the border a city is on. Both default to **`'nepal'`** — every vehicle
and city that already existed is a Nepali one apart from a handful of border
towns, which are marked by hand in **Admin -> Cities** (click the India/Nepal
badge). An unmarked city always reads as Nepal, never India.

**An Indian vehicle has no sector rates at all.** It is hired from a border
town for the whole trip and is priced *only* from a Vehicle Package. This is
enforced, not merely documented: `calculateQuote` never sums sectors for one,
because a missing sector rate contributes nothing and the vehicle would have
totalled **₹0** with nothing on screen to say so. `vehicleNeedsPackage` on the
result says exactly that, and the builder shows it in **red** — "this quote has
no vehicle cost" — rather than the ordinary amber "priced leg by leg" note.
The Admin rate sheet and the vehicle editor both hide sector rates for an
Indian vehicle, and switching a vehicle to Indian clears any it had.

Which fleet a trip may use follows from its two endpoints, via
`vehiclesForTrip()` in **`utils/vehicleOrigin.js`**:

| Start | End | Offered |
|---|---|---|
| India | India | Indian vehicles only |
| Nepal | Nepal | Nepali vehicles only |
| mixed | | both — an Indian vehicle dropping at Kathmandu, or a border drop and a Nepali vehicle onward, are both real |

Before both endpoints are chosen nothing is filtered, so the dropdown is never
mysteriously empty. Changing an endpoint clears a vehicle that is no longer
offered — leaving it selected would quote a vehicle that has no rate. When the
required fleet exists but is *empty*, the field says which fleet is missing
rather than showing a blank box or offering the wrong one.

**Every path that sets a vehicle must go through `vehiclesForTrip()`.** The
*Customize Recommended Itinerary* template did not: it forced
`wizard_default_vehicle_id || 'v-suv'`, which put a **Nepali** vehicle on a
Gorakhpur-to-Gorakhpur run — the one trip only an Indian vehicle can do — and
the builder's header is read-only, so there was no way to change it without
going back through *Edit Trip*. The template now honours the saved default only
when the run allows it, falls back to the first vehicle that can do the run, and
leaves it unset when none can.

Still to do: **a trip can only have one vehicle**, so "Indian vehicle to
Kathmandu, then a Nepali vehicle onward" cannot be quoted as two vehicles.
Tanmay's call was to do packages first and come back to this.

## City Defaults — what a new day starts as

**Admin -> City Defaults** decides, per city: which hotel to book at each star
rating, which meal plan to assume, and which activities to include on each
night of a stay. It is what makes a quote come out ready to send, and it is
how a hotel TripGuru has a partnership with actually gets used.

Before it existed the answers were spread through the builder and effectively
arbitrary:

- the hotel was **`cityHotels[0]`** — whichever hotel happened to sit first in
  the Hotels master for that city and rating, so with several options the
  choice looked random (this is the "auto picking some hotels" Tanmay reported;
  it was never literally hardcoded);
- the meal plan was the literal **`city === 'chitwan' ? 'AP' : 'CP'`**, written
  out in **nine** separate places, so no other city could ever default to
  anything but CP.

All of that now goes through **`utils/cityDefaults.js`**, the one module that
decides. `buildDayDefaults()` returns the hotel, meals and activities *and* a
plain-language list of what it filled in, which is what the builder's banner
renders.

**Night plans are keyed by the night's index within the stay**, not by how long
the stay is: `{"1": [...], "2": [...]}`. A three-night stay takes nights 1, 2
and 3, so adding a fourth later does not mean re-entering the first three, and
the arrival day is handled naturally (night 1 light, night 2 the full run).

**Everything is optional, and unconfigured means unchanged.** A city with no
row, or a row with a field unset, falls back to exactly the old behaviour. This
is the property the committed test guards hardest — every live quote depends on
it, because the table starts empty.

A configured default is only honoured if it still resolves: a hotel that was
deleted or re-rated falls back rather than dangling, and an activity that was
deleted or moved to another city is dropped rather than silently charged for.

**The portals only fetch master data when the portal is opened.** The B2C/B2B
load effect keyed on `currentRoute` alone, so an agent who left the tab open
kept quoting from whatever he loaded hours ago. That is how a vehicle package
rate entered in Admin can fail to apply to the very next quote: the builder
never saw the row, and the "no package rate" warning names a combination that
is sitting in Admin looking correct. It now also refetches when he crosses onto
a quote-building screen (`wizard` or `packages`), which is the moment stale
rates start costing money.

**A new master has to be named in the public-db merge or the portals never see
it.** The B2C/B2B load in `App.jsx` is a **whitelist** of keys copied out of
`/public/db`. `city_defaults` was missing from it at first, and the symptom was
exactly the kind that wastes an hour: Admin saved the defaults correctly, the
API returned them, and the builder still picked whatever hotel came first.

**The banner announcing them is gone**, at Tanmay's request — it read as
clutter on every quote. The defaults still apply, and each pre-filled item is
still shown on its own day card and removable there. The risk this restores is
the one the banner existed for: a paid activity can arrive on a day without
being announced. If quotes start coming out higher than expected, look here
first.

Automatic activities are added by the **wizard** and by new days in a reshape.
They are deliberately *not* added when a day is added by hand or moved to
another city — the operator asked for a day, not for something paid to appear
on it.

## The day card reads as a document

A day shows a **bold heading, the itinerary text, and the date** — no "Tour Day
Heading" / "Tour Day Itinerary" labels, no boxes, and no footnote explaining
where the words came from. Both fields were always read-only (the engine writes
them in `calculator.js`), so those labels named boxes nobody could type into,
on a page an agent shows a client.

`dayDateLabel()` at module scope turns the trip's start date and a day number
into "Fri, 16 Oct, 2026". Module scope for the same reason as `sameCity`.

**The trip's name is generated, not described.** `utils/tripNames.js` produces
"Lakes & Legends of Nepal 4N/5D" instead of "Kathmandu & Pokhara Custom
Itinerary". The title is chosen by what the trip contains — a Chitwan leg reads
as wildlife, Lumbini as pilgrimage — and the choice is a **stable hash** of the
cities and length, never random: an agent repricing a quote must not watch its
title change underneath him. The field stays editable, and a name saved with a
quote is never overwritten.

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

As of 2026-08-24, `main` is at PR #37. **PR #38 is open and not yet merged** —
Tanmay asked to work through the whole agreed list and merge it in one go, so
it carries all three items below rather than shipping one at a time:

- There is no commission anywhere; the agent keeps the markup he adds, and the
  Admin markup fields say whose markup they are.
- A new agent account is `pending` until an admin approves it, enforced
  server-side.
- B2B signup collects an optional GST number.
- **Admin -> City Defaults**: the hotel, meal plan and per-night sightseeing a
  new day starts with, replacing an arbitrary "first hotel in the list" and a
  meal rule hardcoded in nine places.
- First committed tests: `test/cityDefaults.test.mjs` and
  `server/test/approval.test.js`.

Live since the last handoff, in the order it shipped:

- Room rates show every bed the party occupies, and warn when a bed has no
  rate set; hotels in a city offer other star ratings when the trip's rating
  has none; nothing is added to a day automatically any more.
- GST is a switch and a rate in Admin, and on the agent portal it is charged
  before the agent's markup.
- The intake wizard opens empty and refuses a blank submit; a day carrying a
  whole-vehicle sightseeing activity is headed "<City> Sightseeing".
- The Hotels and Activities admin sheets work on a phone.
- The voucher has a client copy and an internal copy; a booked trip can be
  edited in place (`PATCH /bookings/:id`); the sheet stays white in dark mode.
- Browser Back walks the portal's screens instead of leaving the site.
- Direct bookings appear in *Quotes & Bookings* as Won, and the dashboard
  shows Upcoming Trips rather than the whole history.
- The client copy carries no trade wording, and an agent's logo lives on their
  account (`PATCH /auth/me`).

**Outstanding data Tanmay owes** (all Admin work, no code):

- Five transfers still at ₹0: Bhairahawa, Butwal, Lumbini and Jomsom airport
  transfers, plus *Gorakhpur Airport (GOP) to Gorakhpur*.
- The activity *"Kathmandu Full Day Sightseeing (5-6 Hours"* is per-vehicle
  with **no rates at all**, so it charges nothing. Created through the old
  broken inline editor.
- Seven cities have no hotels and so cannot host a paid overnight: Bagdogra,
  Bhairahawa, Butwal, Gorakhpur, Lumbini, Mankamna, Raxaul.

**One booking may hold the wrong data.** Before the fix in PR #34, pressing
*Edit This Booking* and then building a different trip PATCHed the old booking
instead of creating a new one. The overwritten values are gone from the
database. If a booking shows the wrong client or price, correct it by hand
with *Edit This Booking*.

**Known and deliberate:** flight airfare is never priced (the portal has no
flight inventory) — the itinerary says so instead.

### Agreed next, in Tanmay's words

1. ~~"Partner Status: Gold Tier (10% Comm.)" is not a real feature.~~
   **Done.** Tanmay's ruling: there is no commission structure at all — the
   agent simply adds his markup to the cost shown to him. See *There is no
   commission* above.
2. ~~A new B2B account must not work until an admin approves it.~~ **Done.**
   See *Agent accounts are approved before they can trade* above.
3. ~~B2B signup should collect a GST number.~~ **Done**, and **optional** —
   Tanmay's call: an agent may register without one and add it later.
4. **Copy written by an AI agent in the portal.** Tanmay raised this for day
   headings and descriptions, and it is the right tool for the job: the current
   copy is assembled from templates, so every "Leisure Day in Pokhara" reads
   identically and a generated trip name can only be picked from a fixed list.
   An LLM would give real variety and let an operator ask for a different tone.
   It needs a provider chosen, an API key in Render's env vars, and a decision
   on cost per quote — and it must write into an editable field rather than
   straight onto the document, so a bad sentence is never sent unseen. Worth
   doing after email.
5. **Email, later.** OTP and email verification at signup, and automatic mail
   (booking confirmations, quotes to clients). Nothing exists today: "Forgot
   Password?" only tells the user to contact the administrator. This one is
   explicitly deferred — it needs a mail provider chosen and credentials in
   Render env vars first.

Also still open from before: the rest of the mobile pass (27 of 39 tap targets
under 40px, 54 text elements under 12px — a deliberate rescale of the portal's
type and controls, not a bug fix); client list for agents; filters and export
on booking history; splitting the portals into separate builds (awaiting his
decision); Open Graph prerendering; 6.2 MB of PNGs in `/public` (largest
>1 MB); and TripGuru's own admin logo, which is still browser-local while the
agents' logos now live on their accounts.

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
city, reverse pricing, per-vehicle activities and the structure merge. Those
live in the session scratchpad. The one suite that **is** in the repo is
`server/test/approval.test.js` (`npm test` from `server/`) — follow its shape
for anything else worth committing.
