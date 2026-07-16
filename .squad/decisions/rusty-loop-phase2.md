# Loop Engineering Phase 2 — Core Architecture Decisions

**Date:** 2026-07-16  
**Author:** Rusty (Backend Dev)  
**Context:** Phase 2 implementation of Repository-Owned Loop Engineering system

## Decisions

### 1. Pure Functions + Injected Transport

**Decision:** All core modules (`idempotency`, `policy`, `state`, `budget`) are implemented as pure functions operating on plain objects. No direct GitHub API calls, no side effects.

**Rationale:**
- Enables deterministic testing without mocking complex HTTP clients
- Phase 3 will inject a transport layer (GitHubConnector) that these modules don't know about
- Makes the loop logic independently testable and verifiable
- Supports future backends beyond GitHub

**Implications:**
- Phase 3 must implement GitHubConnector with same contract
- State updates are computed locally, then applied via transport
- Budget checks operate on passed-in state snapshots

### 2. Fail-Closed Policy Enforcement

**Decision:** `policy.mjs` denies all actions/paths by default. Only explicitly allowed actions in `allowedActions[mode]` and non-protected paths in `protectedPaths` proceed.

**Rationale:**
- Safety-first approach — unknown/ambiguous inputs are blocked
- Prevents accidental escalation of loop privileges
- Aligns with loop-engineering safety principles (deny by default)
- Missing params or malformed inputs fail closed and escalate

**Implications:**
- New L2 actions must be explicitly added to `allowedActions.L2`
- Protected paths must be maintained as codebase grows
- Policy changes require careful review — denylists expand, allowlists contract

### 3. Optimistic Concurrency via Version Field

**Decision:** State includes a `version` integer field. Every update increments version. Concurrent writes are detected by version mismatch and trigger retry with exponential backoff.

**Rationale:**
- GitHub issue API doesn't support atomic compare-and-swap
- Version field provides lightweight optimistic locking
- Avoids lost updates in concurrent loop runs (e.g., scheduled reconciliation + webhook trigger)
- Retry logic in Phase 3 transport layer

**Implications:**
- Every state update must call `updateState(current, updateFn)` which increments version
- Phase 3 GitHubConnector must check version on write and retry on mismatch
- Infinite retry risk mitigated by exponential backoff + max retries

### 4. Marker-Delimited State in Issue Body

**Decision:** Live state stored in GitHub issue labeled `loop:state`. Issue body contains human-readable narrative + `<!-- LOOP_STATE_BEGIN -->` JSON block `<!-- LOOP_STATE_END -->`.

**Rationale:**
- GitHub issues provide durable, auditable, accessible storage
- Marker delimiters allow human edits to narrative without breaking JSON parsing
- JSON block is machine-readable; narrative is human-readable status summary
- Single source of truth (no external state DB)

**Implications:**
- Parsing must be robust to user edits (fail closed if markers missing/malformed)
- State schema must remain backward-compatible as system evolves
- Phase 3 must implement atomic issue body updates with version checking

### 5. Append-Only Run Comments with Pruning

**Decision:** Each loop run appends one comment to state issue with discoveries/actions/deferrals/links. Old comments (>30 days OR >100 count) are pruned to GitHub Actions artifacts.

**Rationale:**
- Preserves complete audit trail without unbounded growth
- One comment per run simplifies chronological tracking
- Pruning keeps issue manageable while archiving history
- OR logic (maxAge OR maxCount) ensures recent runs always kept

**Implications:**
- Phase 3 must implement archival to GitHub Actions artifacts before pruning
- Pruning is optional maintenance (doesn't block loop execution)
- Issue comment count grows linearly with run frequency

### 6. Idempotency via Stable Keys

**Decision:** Use stable, deterministic keys for deduplication:
- Event delivery: `event-{deliveryId}`
- Source item: `{kind}-{number}` (e.g., `issue-123`, `pr-456`)
- Failure fingerprint: `sha256:{hash(workflow|job|step|sha|normalizedError)}`
- Delegation: `deleg-{sourceKey}-run-{runId}`

**Rationale:**
- GitHub webhook redelivery is common (network issues, timeouts)
- Replayed events must not duplicate labels, comments, assignments
- Failure fingerprints enable retry tracking per distinct error
- Normalization (strip file paths, line numbers) groups similar failures

**Implications:**
- State ledger must track processed event deliveries (not in Phase 2 schema yet)
- Failure fingerprints may collide if normalization too aggressive
- Delegation keys assume runId is unique (workflow run ID or timestamp)

### 7. Kill Switch via Pause Label

**Decision:** Adding `loop:paused` label to state issue immediately stops all loops. `checkPaused()` is first check in `checkAllBudgets()`, short-circuits all other checks.

**Rationale:**
- Single point of control for emergency stop
- No code deployment needed to pause
- Visible in GitHub UI (label on state issue)
- Fast recovery (remove label to resume)

**Implications:**
- Every loop run must call `checkPaused()` before any writes
- Paused state visible in issue labels and state JSON `status: "paused"`
- No partial work allowed when paused (no "finish this delegation then pause")

### 8. No Date-Time Format Validation

**Decision:** Removed `format: "date-time"` from JSON schemas despite using ajv-formats. Use plain `type: "string"` for timestamps.

**Rationale:**
- ajv-formats ESM compatibility issues in Vitest/Vite environment
- Date-time format validation is nice-to-have, not critical for safety
- ISO 8601 strings work fine without format enforcement
- Avoids build-time/test-time import errors

**Implications:**
- Timestamps must be ISO 8601 strings by convention (not enforced)
- Invalid timestamps will be caught by Date parsing, not schema validation
- Re-evaluate if ajv-formats resolves ESM issues in future

## Testing Strategy

- **Unit tests only in Phase 2** — no integration or E2E
- **Pure functions enable deterministic testing** — no mocking, no live API
- **Fail-closed behavior verified** — missing params, malformed inputs, ambiguous paths all tested
- **Schema validation tested with fixtures** — config, state, and event payloads validate
- **Replay protection tested** — same delivery ID produces same key
- **Pause short-circuit tested** — paused state blocks all budget checks

## Open Questions for Phase 3

1. **Retry strategy:** Exponential backoff params (initial delay, max retries, jitter)?
2. **Event delivery tracking:** Add `processedDeliveries` to state schema?
3. **Archival format:** JSON files in artifacts? How to query archived runs?
4. **Concurrency:** Should concurrent runs be blocked entirely, or just serialized?
5. **State issue discovery:** How to find/create the `loop:state` issue at bootstrap?

## References

- Phase 2 plan section in `C:\Users\beclark\.copilot\session-state\8f5ce834-14a2-4b71-a886-4b0b17bfbe2c\plan.md`
- Loop Engineering safety principles: https://github.com/cobusgreyling/loop-engineering/blob/main/docs/safety.md
- JSON Schema draft-07: https://json-schema.org/draft-07/schema
