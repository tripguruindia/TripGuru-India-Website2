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

## Current state and what's next

As of 2026-08-22, `main` is at PR #11. Saved quotes is live. Portal isolation
and the credential exposure are fixed. Demo passwords have been rotated.

Next piece of work, agreed with Tanmay:

- **Wallet ledger** — the ₹1,45,200 balance on the agent dashboard is a
  hardcoded number. It should be a real credit/debit history.

Then, roughly in order: client list for agents; filters and export on booking
history; splitting the portals into separate builds (awaiting his decision);
Open Graph prerendering; and 6.2 MB of PNGs in `/public` (largest >1 MB).
