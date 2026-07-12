# AssetFlow

**Enterprise Asset & Resource Management System**
Built solo for Odoo Hackathon 2026 — Virtual Round (12 July 2026)

---

## What this is

AssetFlow is a centralized ERP module that lets organizations track, allocate, and maintain physical assets and shared/bookable resources — end to end, from registration through retirement. It's industry-agnostic: the same system works for an office managing laptops, a hospital managing equipment, or a school managing shared rooms and vehicles.

Deliberately out of scope, per the problem statement: purchasing, invoicing, accounting. This is an operational asset ledger, not a financial system.

## Why it's built this way

Three architectural decisions drive the design, each chosen because it demonstrates a real engineering tradeoff rather than the fastest path to a working demo:

**1. Booking overlap is enforced by PostgreSQL itself, not application code.**
The `bookings` table uses a `GIST EXCLUDE` constraint over a `tsrange(start_ts, end_ts)`, so two overlapping bookings for the same resource can never both commit — even under concurrent requests. Most systems check-then-insert in application code, which has a race window under load. This doesn't. See `backend/alembic/versions/0002_booking_exclude_constraint.py`.

**2. Every state change is logged, not just tracked.**
`asset_status_history` is an append-only table that every state-changing action — allocation, transfer, maintenance, audit closure — writes to. The current state lives on `assets.status`; the *story* of how it got there lives in history. This gives full per-asset audit trails without the complexity of true event sourcing.

**3. Audits compare expected state against observed state, structurally.**
`audit_findings` doesn't store free-text notes — it stores `expected_status` vs `observed_status` with a typed `discrepancy_type`. That's what makes auto-generated discrepancy reports possible, and it's what lets closing an audit cycle reconcile the real asset record (e.g. a confirmed-missing asset flips to `Lost` automatically).

## What's implemented

| Module | Status |
|---|---|
| Auth (signup/login/JWT, no self-elevation) | Complete |
| Organization Setup (departments, categories, employee directory, role promotion) | Complete |
| Asset Registration & Directory (auto-tagged, searchable, full history) | Complete |
| Allocation & Transfer (double-allocation guard, transfer workflow) | Complete |
| Resource Booking (DB-enforced overlap prevention) | Complete |
| Maintenance (full approval state machine, auto status transitions) | Complete |
| Audit Cycles (discrepancy detection, cycle closure reconciliation) | Complete |
| Dashboard (live KPIs, overdue-item flagging) | Complete |
| Reports & Analytics | Partial — deferred, see below |
| Activity Log UI | Partial — underlying data exists in `asset_status_history`; dedicated screen deferred |

## Stack

| Layer | Choice |
|---|---|
| Backend | FastAPI (Python 3.12) |
| Database | PostgreSQL 16 |
| ORM / Migrations | SQLAlchemy 2.0 + Alembic |
| Frontend | React + Vite |
| Auth | JWT (python-jose) + bcrypt |
| Containers | Docker Compose |

No BaaS platforms (Firebase/Supabase/Mongo Atlas). No static JSON in the shipped build. Everything runs against a real local relational database.

## Business rules enforced

These are the rules an evaluator can test directly, live:

- Asset tags are unique and auto-generated (`AF-0001` format)
- Signup creates an Employee-role account only — there is no self-elevation path. Only an Admin can promote someone to Department Head or Asset Manager, and only from the Employee Directory screen. An Admin **cannot** promote themselves.
- An already-allocated asset cannot be allocated again — the system shows the current holder and offers a Transfer Request instead
- Transfer requests follow a real state machine: `Requested → Approved → Reallocated`, with history updated automatically
- Booking overlaps are rejected at the database layer — verified against the exact scenario in the problem statement (a 9:30–10:30 request against an existing 9:00–10:00 booking is blocked; a 10:00–11:00 request is allowed)
- Maintenance requests cannot skip states: `Pending → Approved/Rejected → TechnicianAssigned → InProgress → Resolved`. The asset flips to `UnderMaintenance` only on Approval and back to `Available` only on Resolution — enforced at the API layer, not just hidden in the UI
- Audit cycles assign auditors, record `Verified/Missing/Damaged` findings against each asset, and closing a cycle reconciles the real asset status to match confirmed observations

## Running locally

```bash
cp .env.example .env
docker compose up --build
```

Backend: `http://localhost:8000` (interactive API docs at `/docs`)

First-time database setup:

```bash
docker compose exec backend alembic upgrade head
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

## Project structure

assetflow/
├── backend/
│   ├── app/
│   │   ├── models/      # SQLAlchemy models — 12 tables, full relational schema
│   │   ├── schemas/      # Pydantic request/response contracts
│   │   ├── routers/      # One router per resource (auth, org, assets, allocations,
│   │   │                  #   bookings, maintenance, audits)
│   │   ├── services/      # Business logic — state transitions, conflict checks
│   │   ├── core/          # auth, config, db session, RBAC dependency
│   │   └── main.py
│   ├── alembic/            # migrations, including the EXCLUDE constraint migration
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── pages/          # Dashboard, Org Setup, Assets, Allocations,
│       │                    #   Bookings, Maintenance, Audits
│       ├── components/
│       └── api/
└── docker-compose.yml


## What's deliberately deferred, and why

Cut consciously, not accidentally, given the 8-hour build window:

- **Reports & Analytics** — the data model fully supports it (every metric is queryable from `asset_status_history`, `bookings`, `maintenance_requests`), but dedicated chart/export UI was deprioritized in favor of getting the seven core workflows fully correct rather than eight workflows partially correct.
- **Email notifications** — the notification *triggers* exist implicitly wherever state changes happen; a dedicated delivery layer (email/in-app feed) was deferred in favor of correctness on the core state machines.
- **PDF export** — explicitly marked optional in the problem statement; CSV-equivalent data is available via the API.

## Demo video

Link submitted separately — functional walkthrough, under 5 minutes, covering the full lifecycle: registration → allocation conflict → transfer → booking conflict (DB-enforced) → maintenance workflow → audit cycle → dashboard.