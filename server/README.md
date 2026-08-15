# TripGuru Nepal Portal API

Backend for the Nepal portal (`tripguruindia.com/nepal`) — Phase 0: auth + admin master-data CRUD. Node.js + Express + Prisma + Postgres.

See `/root/.claude/plans/synchronous-doodling-journal.md` (or ask Claude) for the full rebuild plan and rationale.

## Local development

```bash
cd server
cp .env.example .env   # fill in DATABASE_URL and JWT_SECRET
npm install
npx prisma migrate dev --name init
npm run seed            # loads demo hotels/vehicles/packages/users
npm run dev              # starts on :4000
```

## Deployment (Render)

- Web service root dir: `server`
- Build command: `npm install && npx prisma generate && npx prisma migrate deploy`
- Start command: `node src/index.js`
- Env vars: `DATABASE_URL` (from the linked Postgres), `JWT_SECRET`, `ALLOWED_ORIGINS`
- After first deploy, run `npm run seed` once (Render shell or a one-off job) to load demo data.

## API

Base path: `/api/nepal`

- `POST /auth/login`, `POST /auth/signup`, `GET /auth/me`
- `GET /admin/db` — aggregate load of all master data (admin-only)
- Per-resource CRUD under `/admin/*`: `cities`, `hotels`, `vehicles`, `routes`, `activities`, `packages`, `settings`, `users` (+ `/users/:id/reset-password`), `leads`, `bookings` (read-only)

All `/admin/*` routes require `Authorization: Bearer <token>` from a user with `role: "admin"`.

## Known items carried over from the plan

- Demo seed passwords (`admin`/`agent`/`client`) are intentionally weak placeholders matching the original app's fixtures — rotate them via the admin reset-password action before real use.
- `bookings` write path is not implemented yet (Phase 1/2 — B2C/B2B wiring).
- The B2B booking `agent_id` bug (hardcoded `"AGT-9021"` in the old frontend) needs fixing when Phase 2 wires real booking writes.
