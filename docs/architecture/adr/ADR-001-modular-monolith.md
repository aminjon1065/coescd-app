# ADR-001: Modular Monolith First

Date: 2026-02-18
Status: Accepted

## Context

System scope is broad (EDM + Tasks + Files + GIS + Analytics), but team and release pressure require fast, coordinated delivery for:
- Wave 0: 1 admin validation
- Wave 1: 20-30 pilot users
- Wave 2: 200+ users

## Decision

Adopt modular monolith architecture now.

- Single deployable backend service.
- Strict module boundaries by bounded context.
- In-process domain events + outbox pattern readiness.
- Separate read models for analytics.

## Why

- Faster implementation and refactoring cycle.
- Lower operational complexity at early stage.
- Easier transactional consistency for coupled workflows.
- Allows later extraction to services by module boundary.

## Consequences

Positive:
- Delivery speed and simpler debugging.
- One CI/CD pipeline and straightforward testing.

Negative:
- Higher coupling risk if module boundaries are not enforced.
- Scale bottleneck if all contexts grow unevenly.

Mitigations:
- Enforce no cross-module repository access.
- Use interface/application service boundaries.
- Emit domain events for future decoupling.
- Track extraction candidates with metrics.

## Exit Criteria for Service Extraction

Consider splitting a context when at least two are true:
- Independent scaling need (CPU/IO hotspots).
- Distinct release cadence.
- Team ownership split.
- Repeated deployment risk due to unrelated changes.

## Initial Candidate Order (if split needed)

1. Files service
2. Analytics projector/read service
3. GIS service
4. EDM service
