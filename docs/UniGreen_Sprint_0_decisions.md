# Sprint 0 decision register

Updated: 2026-07-27

## Established

- Python 3.12, FastAPI, Pydantic v2, SQLAlchemy 2, Alembic
- PostgreSQL 16
- Redis 7 and Dramatiq
- `/api/v1` for application endpoints; unversioned operational health routes
- Vietnamese (`vi`) and English (`en`) locale identifiers
- Modular monolith with a separately deployed worker
- UUID internal identifiers and separate human-readable business references
- UTC persistence and Asia/Bangkok as the initial business display timezone

## Open product and operations decisions

These must be resolved before their dependent commercial stories are accepted:

| Decision | Needed by | Current safe posture |
|---|---|---|
| Legal identity and public contact details | Sprint 1 content | Use no invented production content |
| Domain/subdomains | Staging setup | Configure via environment |
| Quotation approval threshold | Sprint 3 | Require approval until decided |
| Currencies, VAT, and rounding | Sprint 3 | No pricing implementation |
| Default payment/delivery/validity terms | Sprint 3 | Store explicit snapshots |
| Customer accounts vs signed links | Sprint 3 | Blueprint's revocable signed links |
| PO discrepancy owner | Sprint 4 | Manager review |
| Upload formats and maximum size | Sprint 1 media/Sprint 4 PO | Conservative allowlist, value pending |
| Initial named staff and role assignments | Before launch | Roles defined; no accounts seeded |
| Email provider and verified domain | Sprint 2 | Provider adapter required |
| Data retention periods | Before production | Do not auto-delete |
| Mounted volume vs S3-compatible storage | Sprint 1 | Mounted VPS volume behind a storage interface |
