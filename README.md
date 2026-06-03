# Rehab & Rise — full-stack coaching platform

Angular 18 (standalone) + Node/Express + MySQL. Pixel-ported from the
"Sage & Clay" design. Public marketing site + free-call booking + checkout,
**plus** a Coach Studio (admin) and a Member dashboard — all backed by a real
database, real file uploads, and JWT auth.

## Surfaces
- **Public site** (`/`) — programs, booking, subscribe. Programs are pulled live
  from the DB, so anything the coach changes in the Studio shows here.
- **Coach Studio** (`/coach`, admin only) — overview stats, **Programs CRUD**
  (add/edit/delete → reflects on the public site), weekly **availability**
  editor, **bookings** confirm, **clients** with file upload, private notes,
  and a per-client **training-plan builder**.
- **Member dashboard** (`/dashboard`) — next session + Meet link, program &
  today's session (driven by the coach's plan), files (download), billing.

## Prerequisites
- Node.js 18+ and npm
- A running MySQL 8 server

## Backend setup
```bash
cd backend
cp .env.example .env          # set DB creds + JWT_SECRET
mysql -u root -p < schema.sql # create database + tables
npm install
npm run seed                  # programs, coach, sample clients, plans, slots
npm start                     # http://localhost:4000
```

`.env` keys: `PORT`, `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`,
`DB_NAME`, `JWT_SECRET`, `CLIENT_ORIGIN` (default `http://localhost:4200`).

Uploaded files are stored on disk under `backend/uploads/` (created
automatically) with metadata in the `files` table.

## Frontend setup
```bash
cd frontend
npm install
npm start                     # http://localhost:4200
```

> Font inlining is disabled in `angular.json` (`optimization.fonts: false`)
> so the build works offline. Fonts still load at runtime via `<link>`.
> Re-enable on your machine if you want them inlined.

## Demo logins (after seeding)
| Role   | Email                     | Password   |
|--------|---------------------------|------------|
| Coach  | jordan@rehabandrise.com   | coach123   |
| Member | alex.morgan@email.com     | member123  |

Other seeded members (all `member123`): priya.r@, dani.kove@, m.tate@,
sophie.bell@ (lapsed).

## How the data flows
- **Programs** live in the `programs` table. `GET /api/programs` returns active
  ones for the public site; the Studio's `*/admin/programs` routes do full CRUD.
- **Availability**: the coach edits a weekly template
  (`availability_template`); saving regenerates concrete future
  `availability_slots`, which feed the public booking calendar. Booked slots
  lock and are preserved across regeneration.
- **Bookings** atomically lock a slot (transaction) and generate a Meet link.
- **Subscribe** creates a member + subscription + first payment and returns a
  one-time dev password (stand-in for the emailed credential).
- **Files**: the coach uploads via multipart to a client; bytes land in
  `backend/uploads/`, metadata in `files`. Members download their own files
  (`GET /api/files/:id/download`, auth-checked); downloading clears the NEW flag.
- **Training plans**: one JSON document per member in `training_plans`. The
  member dashboard picks the session whose `days` includes today's weekday.

## Key API routes
```
POST   /api/login                         GET  /api/me
GET    /api/programs                       (public, active only)
GET    /api/admin/programs                 POST /api/admin/programs
PUT    /api/admin/programs/:id             DELETE /api/admin/programs/:id
GET    /api/availability                   (public, grouped by date)
GET/PUT /api/admin/availability-template
POST   /api/bookings                       GET  /api/admin/bookings
POST   /api/admin/bookings/:id/confirm
POST   /api/subscribe
GET    /api/admin/clients                  GET  /api/admin/clients/:id
PUT    /api/admin/clients/:id/note         PUT  /api/admin/clients/:id/plan
GET    /api/admin/stats
POST   /api/admin/clients/:id/files        DELETE /api/admin/files/:fileId
GET    /api/files/:fileId/download
GET    /api/member/overview
```

## Notes / still mocked
- Google Meet links are generated with a deterministic stub
  (`meetCode()` in `server.js`) — wiring real Google Calendar/Meet + email
  delivery is the one remaining integration.
- Phases ("Foundation/Building/Peak") and the coach note on the member program
  page are presentational.
