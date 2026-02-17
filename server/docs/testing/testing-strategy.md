# Testing Strategy

This document summarizes the testing strategy for the system, including types of tests, tools, and best practices.

---

## Types of Tests

- **Unit tests:** Test individual functions/models (see `__tests__/Unit/`)
- **Integration tests:** Test controllers and middleware with real DB/Redis (see `__tests__/Integration/`)
- **End-to-end (E2E) tests:** Simulate real user flows (see `docs/testing/E2E checklist.md`)

## Tools Used

- Jest (unit/integration)
- Supertest (API testing)
- Stripe CLI/VS Code extension (webhook testing)

## Running Tests

- `npm test` — Run all tests
- `npm test:watch` — Rerun all tests on saved changes
- `npm run test:unit` — Run unit tests
- `npm run test:integration` — Run integration tests

## Test Data

- Use test DB and Redis instances
- Seed data scripts as needed

## CI Integration

- Tests run on push/PR via GitHub Actions (see `.github/workflows/`)

---

For more, see the `__tests__` directory and related docs.
