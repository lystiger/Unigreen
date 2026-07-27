# ADR 0002: Publish a contract-first HTTP API

- Status: Accepted
- Date: 2026-07-27

## Context

Backend and frontend are developed independently. Hand-maintained duplicate
types would drift and make integration failures likely.

## Decision

FastAPI's OpenAPI document is the source for generated frontend types and
clients. Public application endpoints use `/api/v1`. Every failure uses one
error envelope and includes the request ID. Breaking contract changes require
coordination or a new API version.

## Consequences

The OpenAPI document is generated and checked in CI. Frontend mocks must derive
from contract examples.

