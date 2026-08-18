# TripGuru Deployment Guide

## 1. Dependency

Deploy InTravWeb first. TripGuru needs the live InTravWeb backend URL for offers and lead capture.

Production backend currently used:

```text
https://intravweb.onrender.com
```

## 2. Deploy On Vercel

1. Create a new Vercel project from the TripGuru frontend repository.
   - If uploading the ZIP, upload the project files at the ZIP root. `package.json` must not be inside an extra parent folder.
2. Use the Vite framework preset.
3. Set:

```text
Install Command: npm install
Build Command: npm run build
Output Directory: dist
```

4. Add these environment variables (both Production and Preview):

```env
VITE_INTRAVWEB_API_BASE=https://intravweb.onrender.com
VITE_NEPAL_API_BASE=https://tripguru-nepal-api.onrender.com
```

5. Deploy.

## 3. Custom Domain

1. Add `tripguruindia.com` and `www.tripguruindia.com` in Vercel.
2. Follow Vercel DNS instructions.
3. Keep `https://www.tripguruindia.com` as the canonical domain.
4. Confirm InTravWeb `ALLOWED_ORIGINS` includes both TripGuru domains.

## 4. End-To-End Test

1. Open the live TripGuru site.
2. Confirm homepage, destinations, offers, reviews, services, and contact sections load.
3. Confirm offers load from InTravWeb.
4. Submit the concierge form and continue to WhatsApp.
5. Confirm the lead appears in InTravWeb.
6. Confirm the email alert reaches `travel@tripguruindia.com`.

## 5. Local Development

```bash
cp .env.example .env.local
npm install
npm run dev
```

Vite reads env files only at startup, so restart `npm run dev` after editing
`.env.local`.

Use a local backend by changing `.env.local`:

```env
VITE_INTRAVWEB_API_BASE=http://localhost:4000
VITE_NEPAL_API_BASE=http://localhost:4001
```

## 6. Env Var Table

| Variable | Required | Purpose |
|---|---|---|
| `VITE_INTRAVWEB_API_BASE` | Yes | Base URL for InTravWeb offers and lead APIs |
| `VITE_NEPAL_API_BASE` | Yes | Base URL for the Nepal portal API (auth, live pricing data, bookings). Without it the portal silently falls back to bundled seed data, so prices will not match the live database. |

## 7. Project Structure

```text
src/
  App.tsx
  cityLandingPages.ts
  config/api.ts
  components/
  constants.ts
  main.tsx
scripts/
  postbuild-sitemap.mjs
public/
  robots.txt
  sitemap.xml
```

## 8. SEO Page Inventory

- `/`
- `/offers`
- `/services`
- `/contact`
- `/destinations`
- `/travel-agency-in-gorakhpur`
- `/travel-agency-in-noida`
- `/travel-agency-in-delhi`
- `/destinations/:slug`

## 9. Pre-Launch Checklist

- [ ] `VITE_INTRAVWEB_API_BASE` is set in Vercel.
- [ ] `VITE_NEPAL_API_BASE` is set in Vercel (Production and Preview).
- [ ] Nepal portal demo passwords have been rotated -- the seeded `admin`,
      `agent` and `client` accounts ship with the password equal to the role
      name and must not reach production.
- [ ] If deploying from ZIP, it is flat and excludes `node_modules/`, `dist/`, `.env`, and `.env.local`.
- [ ] InTravWeb is live before frontend deployment.
- [ ] InTravWeb `ALLOWED_ORIGINS` includes TripGuru domains.
- [ ] `npm run lint` passes.
- [ ] `npm run build` passes.
- [ ] Sitemap uses `https://www.tripguruindia.com`.
- [ ] Robots file points to the TripGuru sitemap.
- [ ] Offers load from InTravWeb.
- [ ] Lead submission appears in InTravWeb.
- [ ] Email alert reaches `travel@tripguruindia.com`.
