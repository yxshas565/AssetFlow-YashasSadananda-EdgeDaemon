# AssetFlow — Enterprise Asset & Resource Management System

Built solo for Odoo Hackathon 2026, Virtual Round (12 July 2026, 09:00–17:00 IST).

## What this is

A centralized ERP module for tracking, allocating, and maintaining physical
assets and shared/bookable resources across an organization. Explicitly out
of scope per the problem statement: purchasing, invoicing, accounting.

## Stack

| Layer          | Choice                          |
|----------------|----------------------------------|
| Backend        | FastAPI (Python 3.12)           |
| Database       | PostgreSQL 16                   |
| ORM            | SQLAlchemy 2.0 + Alembic        |
| Frontend       | React + Vite                    |
| Auth           | JWT (python-jose) + bcrypt      |
| Containers     | Docker Compose                  |

No BaaS platforms (Firebase/Supabase/Mongo Atlas) are used, per the
hackathon's stated evaluation preference for locally-modeled relational data.

## Architecture decisions worth noting

**1. Booking overlap prevention is enforced at the database layer**, not in
application code. `bookings` has a PostgreSQL `EXCLUDE USING GIST` constraint
over a `tsrange(start_ts, end_ts)`, so two overlapping bookings for the same
resource can never both commit — even under concurrent requests. See
`backend/alembic/versions/0002_booking_exclude_constraint.py`.

**2. Full audit trail via `asset_status_history`**, an append-only table that
every state-changing action (allocation, transfer, maintenance, audit
closure) writes to. This gives complete per-asset history without the
complexity of full event sourcing — the current state lives on `assets.status`,
history lives alongside it.

**3. Audit cycles use an expected-vs-observed discrepancy model**
(`audit_findings` table: `expected_status` vs `observed_status` +
`discrepancy_type`), so mismatches during an audit cycle are structured data,
not free text — enabling the auto-generated discrepancy report.

**4. Role assignment has no self-elevation path.** Signup always creates an
`Employee`-role account. Only an `Admin` can promote someone to
`DepartmentHead` or `AssetManager`, and only via the Organization Setup →
Employee Directory screen.

**5. State transitions (maintenance, transfer requests) are enforced via
explicit transition maps in the service layer**, not database triggers —
this gives the same correctness guarantee as trigger-based enforcement at a
fraction of the implementation cost, appropriate for an 8-hour build.

## Running locally

```bash
cp .env.example .env
docker compose up --build
```

Backend: http://localhost:8000 (interactive docs at `/docs`)
Frontend: `cd frontend && npm install && npm run dev` → http://localhost:5173

First-time DB setup:

```bash
docker compose exec backend alembic revision --autogenerate -m "initial schema"
docker compose exec backend alembic upgrade head
```

## Project structure

```
assetflow/
├── backend/
│   ├── app/
│   │   ├── models/      # SQLAlchemy models (see backend/app/models/*.py)
│   │   ├── schemas/      # Pydantic request/response schemas
│   │   ├── routers/      # One router per resource
│   │   ├── services/      # Business logic — state transitions, conflict checks
│   │   ├── core/          # auth, config, db session
│   │   └── main.py
│   ├── alembic/            # migrations, incl. 0002_booking_exclude_constraint.py
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── pages/         # one per screen
│       ├── components/
│       └── api/
└── docker-compose.yml
```

## Build log

This README is updated through the day as modules go in. See commit history
for hourly progress (pushed at least once per hour per hackathon rules).

## Demo video

Link added on submission — functional walkthrough, max 5 minutes.

## What's deliberately deferred

Logged here as the build progresses, with reasoning, rather than shipped
half-broken. (Section added during the build.)
