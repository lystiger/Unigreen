# ADR 0003: PostgreSQL persistence and Redis-backed jobs

- Status: Accepted
- Date: 2026-07-27

## Decision

Use PostgreSQL 16 with SQLAlchemy 2 and Alembic. Use Redis and Dramatiq for
retryable email and PDF jobs. Jobs receive stable entity IDs after business
transactions commit.

Object storage is accessed through an application interface. Selecting mounted
volume versus S3-compatible storage remains an open deployment decision.

