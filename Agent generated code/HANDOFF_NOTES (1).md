# ForgeOS — Database Layer Handoff Notes
_Last updated: 2026-07-19 (rev 2 — gap-closing pass)_

## Status: File #11 (Database Schema) — COMPLETE, including prior gaps

A second pass closed every gap flagged in rev 1 of this document except live
DB verification (still blocked by sandbox network restrictions). See
"Rev 2 changes" section below for what was added.

All code for `11_DATABASE_SCHEMA_NEEDS.md` has been generated and delivered as
downloadable files in this conversation. If you're starting a new conversation,
**re-upload these two source files first** so Claude has context again:
- `11_DATABASE_SCHEMA_NEEDS.md`
- `INDEX (1).md`

Then say: "I previously had you build the database schema layer — here's the
handoff notes, please continue from here" and attach this file too.

---

## What was built

```
python-service/
├── db/
│   ├── __init__.py          (212 LOC) — asyncpg pool, migration runner, health check
│   ├── models.py             (524 LOC) — SQLAlchemy 2.0 models, 1:1 with SQL schema
│   ├── queries.py            (356 LOC) — recursive layer tree, collaborators, ops, comments, assets, notifications
│   ├── utils.py               (193 LOC) — transactions, retry/backoff, advisory locks
│   └── migrations/
│       ├── 001_init_schema.sql        (145 LOC) — users, sessions, projects, layers
│       ├── 002_add_collaboration.sql   (109 LOC) — collaborators, share_links, operations, comments
│       ├── 003_add_animations.sql      (124 LOC) — animations, keyframes, geometry_operations, particle_systems, versions
│       └── 004_add_assets.sql           (96 LOC) — assets, notifications, audit_logs
├── services/
│   ├── db_service.py         (555 LOC) — 9 CRUD service classes
│   ├── transaction_manager.py (145 LOC) — multi-step atomic orchestration, savepoints
│   └── query_optimizer.py    (238 LOC) — caching, batch loaders, slow-query instrumentation
└── requirements.txt           — asyncpg, SQLAlchemy, redis
```

**Total: 2,697 LOC** (474 SQL + 2,223 Python)

All Python passed `py_compile`. SQL was hand-reviewed but **never run against a
live Postgres/Neon instance** (no network/DB access in the sandbox) — this is
the one open verification item.

---

## Rev 2 changes (gap-closing pass)

- **`db/migrations/005_performance_optimizations.sql`** (new) —
  - `operations` converted to an 8-way HASH partition on `project_id`
  - `audit_logs` converted to monthly RANGE partitions on `created_at`, plus
    a default catch-all partition and a `create_audit_log_month_partition()`
    helper function to add future months
  - BRIN indexes added on both tables' timestamp columns
  - `mv_project_dashboard` materialized view added, with the unique index
    required for `REFRESH ... CONCURRENTLY`
  - `projects.storage_quota_bytes` column added (default 5 GiB)
  - **Tradeoff documented in the migration's header comment**: partitioned
    tables require the partition key in any PK/unique constraint, so
    `operations`/`audit_logs` primary keys became composite
    `(id, project_id)` / `(id, created_at)`, and the self-referencing FK on
    `operations.parent_operation_id` was dropped (now app-validated).
- **`db/models.py`** — `Operation` and `AuditLog` models updated to match
  the new composite primary keys; `Project` model gained `storage_quota_bytes`.
- **`db/queries.py`** — added `get_project_dashboard_cached()`, which reads
  from the new materialized view instead of live-joining 4 tables.
- **`services/db_service.py`**:
  - `ProjectService.reserve_storage()` — atomic, race-safe quota
    enforcement (single `UPDATE ... WHERE total_size + delta <= quota`)
  - `QuotaExceededError` — raised when a write would exceed quota
  - `LayerService.soft_delete_layer_cascade()` — real cascading soft-delete
    using the recursive subtree query, updates `total_layers` after
  - `AssetService.register_asset()` — now reserves storage atomically in
    the same transaction as the insert (rolls back together)
  - `AssetService.delete_asset()` (new) — releases reserved storage on delete
- **`tests/`** (new directory) — `conftest.py`, `test_migrations.py`,
  `test_db_service.py`, `test_quota_and_transactions.py`. Real integration
  tests against a live Postgres (not mocked), auto-skipped if
  `DATABASE_URL` isn't set. Covers: all tables exist, partitioning is
  correctly applied, materialized view is queryable, migrations are
  idempotent, CRUD + constraint violations, cascading soft-delete,
  quota enforcement (including the rollback-on-failure path), and
  `TransactionManager` fully rolling back a multi-step failure.
- **`pytest.ini`**, **`requirements-dev.txt`** (new).

All Python re-verified with `py_compile` after every change. Total LOC is
now **3,404** across SQL + Python + tests.

## Known gaps / next steps (in priority order)

1. **Run the migrations for real — still the #1 open item.** Spin up a Neon
   branch or local Docker Postgres and run:
   ```
   docker run --rm -d -p 5433:5432 -e POSTGRES_PASSWORD=test postgres:16
   export DATABASE_URL="postgresql://postgres:test@localhost:5433/postgres"
   pip install -r requirements.txt -r requirements-dev.txt
   pytest tests/ -v
   ```
   This sandbox has no network access, so none of migration 005's
   partitioning SQL or the new test suite has ever actually executed
   against real Postgres. The partitioning DDL in particular (converting an
   existing table to partitioned via rename-and-swap) is the highest-risk
   untested piece — verify it first.
2. **Alembic wiring** — `models.py` is structured to support Alembic
   autogeneration diffing against the hand-written migrations, but Alembic
   itself isn't configured.
3. **Contracts/checklist not checked against** — `../contracts/API_CONTRACT.md`,
   `../contracts/STATE_CONTRACT.md`, and `../checklists/QUALITY_CHECKLIST.md`
   were referenced in `INDEX (1).md` but never uploaded, so this code hasn't
   been validated against them.
4. **Possible duplicate work** — per `INDEX (1).md`'s own status table, the
   Foundation/Architecture category (which includes file #11) was already
   marked "✅ Complete (V0.A1)" before this work started. Worth confirming
   with your team whether V0.A1's schema version and this one need to be
   reconciled/merged.
5. **Monthly partition maintenance** — `create_audit_log_month_partition()`
   needs to be called on a schedule (e.g. a monthly cron/job) to keep future
   months covered; it currently only pre-creates last/this/next month at
   migration time.

---

## Other 14 spec files (not built by this conversation)

Per `INDEX (1).md`, the full ForgeOS project has 15 spec files (~47,500 LOC,
13 agents). Only #11 was uploaded and built here. The rest are being handled
by your team on other accounts:

01, 02, 03, 04, 05, 06, 07, 08, 09, 10, 12, 13, 14, 15 — see `INDEX (1).md`
for full names/owners/LOC targets.

---

## How to resume

When you're back with a fresh conversation:
1. Upload this file + the two source `.md` files.
2. Tell Claude which of the "Known gaps" above you want tackled next
   (e.g. "run the migrations," "write tests," "add cascading soft-delete").
3. If you have the contracts/checklist files by then, upload those too so
   the code can be validated against them.
