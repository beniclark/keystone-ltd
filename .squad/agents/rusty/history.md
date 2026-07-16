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

### Loop Engineering Phase 3 (2026-07-16)

**Context:** Implemented Phase 3 — GitHub connector, Copilot delegation adapter, and worktree isolation primitive with comprehensive contract tests.

**Architecture decisions:**
- **Injected Transports for Testability:** GitHubConnector accepts `fetchImpl` parameter (defaults to global fetch); WorktreeManager accepts `execImpl` and `fsImpl` parameters. Zero live network or git operations in unit tests.
- **Dry-Run by Default:** GitHubCopilotAdapter defaults to `dryRun: true`. Real delegation requires explicit opt-in. Dry-run returns complete, human-reviewable payload showing exact API calls that would be made.
- **Backend-Neutral Delegation:** Abstract `DelegationAdapter` class defines contract: `delegate(request)` returns `DelegationResult`. Request includes source, objective, doneWhen conditions, path constraints, limits, verification commands, escalation instructions. Multiple backends can implement this interface.
- **Cloud-Branch Isolation:** Separate validation and creation helpers for cloud-branch isolation results. Requires branch name before state can transition to "running". PR URL is optional.
- **Worktree Safety:** Manager refuses branch switching inside worktrees, only removes clean/merged/abandoned worktrees, detects collisions via both `git worktree list` and JSON manifest. Branch naming: `loop/{pattern}/{source}-{run-id}`.
- **Copilot Assignment API Shape:** Implemented as REST PATCH to `/repos/:owner/:repo/issues/:number` with `assignees: ["copilot"]`. **Flagged as NEEDS_LIVE_VERIFICATION** because actual bot username and exact API shape may differ from public docs. Isolated behind single function for easy replacement after live testing.
- **Error Handling Coverage:** Connector tests cover 403 permission denied, 404 not found, 429 rate limit (with retry-after), malformed JSON response, replay idempotency. Adapter tests cover dry-run, real delegation success, API errors, isolation result validation.

**Key file paths:**
- `scripts/loop/connectors/github.mjs` — GitHub REST API connector with injected fetch
- `scripts/loop/delegates/index.mjs` — backend-neutral delegation interface and helpers
- `scripts/loop/delegates/github-copilot.mjs` — GitHub Copilot adapter (dry-run default)
- `scripts/loop/isolation/worktree.mjs` — git worktree manager with injected exec/fs
- `tests/unit/loop/github-connector.test.mjs` — connector contract tests (23 tests)
- `tests/unit/loop/delegation.test.mjs` — delegation interface tests (31 tests)
- `tests/unit/loop/github-copilot-adapter.test.mjs` — adapter tests (18 tests)
- `tests/unit/loop/worktree.test.mjs` — worktree integration tests (31 tests)

**API Coverage:**
- **Reads:** issues (get/list), labels, PRs (get/list), PR reviews, check runs, workflow runs, workflow run logs URL
- **Writes:** update issue (body/labels), create comment, create issue, assign Copilot to issue
- **Delegation:** complete dry-run payload with source, objective, paths, limits, verification, escalation; formatted markdown comment for issue

**Test Results:**
- 241 total tests passing (138 Phase 2 + 103 Phase 3)
- Lint: clean
- Build: successful (dist/ generated)
- Phase 3 acceptance criteria met:
  - Connector/adapter contract tests cover success, permission failure, rate limiting, replay, malformed responses ✓
  - Dry-run output is complete enough for human approval ✓
  - Worktree integration tests create, reuse, and safely remove isolated worktrees ✓

**BLOCKER for L2 Rollout:**
- **Copilot Assignment API Shape:** The exact API endpoint, bot username/login, and assignment mechanism for GitHub Copilot coding agent needs live verification. Current implementation uses REST API with `assignees: ["copilot"]` based on public docs, but may require GraphQL mutation, different bot login, or org-specific installation lookup. Must be verified in manual bootstrap probe before enabling L2 delegation.

**Next Phase (Phase 4):**
- Skills: project-specific `.github/skills/*/SKILL.md` files with Keystone commands, label rules, risk paths
- Custom agents: loop-implementer and loop-verifier (independent checker cannot edit production)
- Hooks: `preToolUse` policy (protected paths, destructive commands), `agentStop` verification (deterministic checks before completion)

