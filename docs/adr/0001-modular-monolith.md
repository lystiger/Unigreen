# ADR 0001: Use a modular monolith

- Status: Accepted
- Date: 2026-07-27

## Context

Uni-Green needs a catalogue and quotation-to-order workflow on one SME VPS.
The domains are related and require transactional consistency, while expected
traffic does not justify distributed-system overhead.

## Decision

Build one FastAPI deployable with modules that own their domain behavior and
tables. Routers remain transport-only, cross-module work uses explicit service
interfaces, and external providers sit behind adapters. A separate worker
process imports the same application package.

## Consequences

Deployments and transactions remain simple. Module boundaries must be enforced
through review and tests so the monolith does not become tightly coupled.

