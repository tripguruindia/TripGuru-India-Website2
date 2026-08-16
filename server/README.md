# TripGuru Nepal Portal API

Backend for the Nepal portal (`tripguruindia.com/nepal`) — Phase 0: auth + admin master-data CRUD. Node.js + Express + Turso (libSQL/SQLite), queried directly with `@libsql/client` (no ORM).

See `/root/.claude/plans/synchronous-doodling-journal.md` (or ask Claude) for the full rebuild plan and rationale, and `db/schema.sql` for the table definitions.

## Why no ORM

Prisma's Turso support is still early-access and uses a different migration workflow than a normal Postgres/MySQL setup (`prisma migrate diff` + the Turso CLI, not `prisma migrate deploy`). For a service handling real auth and passwords, hand-written SQL against the officially-supported `@libsql/client` is the more stable choice today. `db/schema.sql` is plain `CREATE TABLE IF NOT EXISTS` statements — safe to re-run on every deploy (see `src/migrate.js`).

## Local development

```bash
cd server
cp .env.example .env   # fill in TURSO_DATABASE_URL, TURSO_AUTH_TOKEN, JWT_SECRET
npm install
npm run migrate          # applies db/schema.sql
npm run seed              # loads demo hotels/vehicles/packages/users
npm run dev                # starts on :4000
```

## Deployment (Render)

- Web service root dir: this MCP toolset doesn't support a rootDir field, so build/start commands `cd server && ...` from the repo root instead.
- Build command: `cd server && npm install && npm run migrate`
- Start command: `cd server && npm start`
- Env vars: `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `JWT_SECRET`, `ALLOWED_ORIGINS`
- After first deploy, run `npm run seed` once to load demo data (Render shell, or a one-off local run against the same Turso database).

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
- Nested JSON columns (`rates`, `route_rates`, `cities`, `days`, `passengers`, `itinerary`, `rooms`, `b2b_white_label`) are stored as TEXT and parsed/stringified in `src/serializers.js` — SQLite has no native JSON column type the way Postgres does.
