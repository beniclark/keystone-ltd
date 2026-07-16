# Rusty — Project History

## Project Context

- **Project:** Keystone Financial (keystone-ltd) — a financial services demo website
- **Stack:** React 19, Vite 8, Tailwind CSS 4.2 (frontend). Backend planned: Express + better-sqlite3 + JWT.
- **User:** beclark
- **Repo:** https://github.com/beniclark/keystone-ltd
- **Current state:** Frontend-only. All data is hardcoded in components. Backend work covers GitHub issues #1-#8 (server setup, seed script, API routes, API client, auth rewrite, form updates, data hooks, profile updates).

## Learnings

- Session started 2026-04-15. Backend doesn't exist yet — all work is greenfield. Vite proxy config needed for /api/* routes.

### Loop Engineering Phase 2 (2026-07-16)

**Context:** Implemented Phase 2 of Repository-Owned Loop Engineering system — contracts, policy, budgets, and state management.

**Architecture decisions:**
- **Config & Policy Separation:** `.loop/config.json` for operational settings (mode, branches, cadence), `.loop/policy.json` for immutable safety rules (protected paths, action limits, escalation rules)
- **JSON Schema Validation:** Using `ajv` (already in deps via ESLint) for strict validation of config and state. Removed `date-time` format requirements to avoid ajv-formats compatibility issues in ESM.
- **Fail-Closed Policy:** `policy.mjs` denies by default — only explicitly allowed actions/paths proceed. Missing params or ambiguous inputs fail closed and escalate.
- **Pure Functions:** All core modules (`idempotency`, `policy`, `state`, `budget`) are side-effect-free and operate on plain objects. This enables deterministic testing and future Phase 3 transport injection.
- **Idempotency via Hashing:** Stable keys for events (delivery ID), source items (kind + number), failure fingerprints (SHA256 of normalized error), delegations (sourceKey + runId). Replay protection built in.
- **Optimistic Concurrency:** State includes `version` field. Updates increment version; concurrent writes detected by version mismatch trigger retry with backoff (Phase 3 implementation).
- **Kill Switch:** `loop:paused` label on state issue short-circuits all checks. Verified in budget tests.
- **Marker-Delimited State:** GitHub issue body contains human-readable narrative + `<!-- LOOP_STATE_BEGIN -->` JSON block `<!-- LOOP_STATE_END -->`. Parsing/serialization in `state.mjs`.
- **Append-Only Audit Trail:** One comment per run with discoveries/actions/deferrals/links. Pruning keeps recent maxCount OR within maxAge (OR logic, not AND).

**Key file paths:**
- `.loop/config.json`, `.loop/policy.json` — versioned loop contracts
- `.loop/schemas/config.schema.json`, `.loop/schemas/state.schema.json` — JSON Schema validators
- `.loop/fixtures/*.json` — representative GitHub event payloads for dry-run testing
- `.loop/state.example.md` — live-ledger format documentation
- `scripts/loop/core/idempotency.mjs` — stable key generation (event, source, fingerprint, delegation)
- `scripts/loop/core/config.mjs` — config loader with schema validation
- `scripts/loop/core/policy.mjs` — fail-closed path/action checks, human-gate classification
- `scripts/loop/core/state.mjs` — parse/serialize ledger, optimistic updates, run comment formatting, pruning
- `scripts/loop/core/budget.mjs` — attempts/concurrent PR/delegation/cooldown/pause checks

**Dependencies added:**
- `ajv-formats` (for date-time validation, but removed usage to avoid ESM compat issues)
- `minimatch` (for glob pattern matching in policy enforcement)

**Protected paths pattern:**
- `.env*`, `.github/workflows/**`, `.github/hooks/**`, `.loop/**`
- `package.json`, `package-lock.json`
- `**/*auth*`, `**/*session*`, `**/migrations/**`, `**/*.sql`

**Action caps (L1 mode):**
- Issue intake: max 10 labels, 5 comments per run; no auto-close
- CI sweeper: max 3 fix issues, 2 assignments per run
- PR babysitter: max 10 labels, 3 comments per run; no auto-rebase/merge

**Budget limits:**
- Max 3 attempts per source item/failure fingerprint
- Max 5 changed files per automated fix
- Max 2 concurrent loop-created PRs
- Max 1 concurrent delegation per source item
- No auto-merge

**Testing approach:**
- Unit tests in `src/__tests__/loop/*.test.js`
- Comprehensive coverage: idempotency (replay protection), policy (fail-closed, human gates), state (parse/serialize/prune/malformed), budget (pause short-circuit, concurrent limits), schema validation (config/state fixtures)
- 138 total tests passing (all existing + 71 new loop tests)
- Acceptance criteria met: config/state validate, replays are no-ops, pause is deterministic, malformed state fails closed

**Next Phase (Phase 3):**
- GitHubConnector with injected HTTP transport (no live API calls in tests)
- GitHub Copilot adapter with dry-run default
- Local `git worktree` manager for isolation
- Backend-neutral delegation interface

