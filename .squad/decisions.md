# Squad Decisions

## Active Decisions

### 2026-07-16: Loop Engineering Phase 1 — Testing and CI Strategy

**Decision Date:** 2026-07-16  
**Decided By:** Danny  
**Status:** Active

#### Context

Implementing Phase 1 of the Repository-Owned Loop Engineering plan required establishing deterministic verification infrastructure. The codebase had no tests, no CI, and no type-checking before this work.

#### Decision

**Test Framework:** Vitest + React Testing Library — native ESM support, Vite integration, faster than Jest.

**Type-Checking:** Non-blocking TypeScript — `allowJs: true`, `checkJs: false`, `noEmit: true` in `tsconfig.json`. Reports diagnostics without failing CI in Phase 1.

**CI Architecture:** Aggregate required check — single `required-checks` job depends on all others (lint+typecheck, unit tests, build, E2E tests). Stable name for branch protection.

**Loop CLI:** Stub-first approach — exits 0 with "not yet implemented" for all commands, preventing `npm run loop:doctor` from failing before Phase 3.

**Branch Protection:** Manual bootstrap via `scripts/loop/bootstrap-branch-protection.mjs` — prints exact `gh api` commands, idempotent and dry-run-first.

#### Rationale

- Deterministic verification foundation for Phase 2+ loop contracts
- Vitest provides ESM compatibility and better Vite performance than Jest
- Non-blocking type-checking avoids scope creep; will become required before L2 loop delegation
- Stable CI check name enables branch protection even as individual jobs evolve
- Manual branch protection bootstrap is safer and more transparent than auto-apply

#### Impact

- Phase 1 verification passes (`npm run verify`)
- CI workflow ready for PRs
- L2 Automation: type-checking will become hard requirement before L2 loops auto-create PRs

---

### 2026-07-16: Loop Engineering Phase 4 — Guardrails (Skills, Custom Agents, Deterministic Hooks)

**Date:** 2026-07-16  
**Decider:** Danny (Lead)  
**Status:** Implemented

#### Decision

**Skills (7):** Project-specific SKILL.md files with Keystone commands, priority labels (P0-P3, NOT Squad duplicates), protected paths (.github/workflows/**, .github/hooks/**, .loop/**, package.json, auth code), and L1 output rules (append-only comments to loop:state issue, NOT source issues).

**Custom Agents (2):**
- `loop-implementer`: Bounded implementation with surgical changes within 5-file limit, allowed paths only, must pass verification, never marks own work verified
- `loop-verifier`: Independent read-only checker with maker-checker separation, re-runs verification commands independently, rejects self-reports

**Deterministic Hooks (2):**
- `pre-tool-policy.json`: Denies protected path edits, destructive git commands, workflow self-modification, dependency changes without override
- `loop-verify.json`: Blocks agent stop if verification fails, changed files exceed limit, or protected paths modified

#### Rationale

Fail-closed policy enforcement — deny by default, allow only explicitly permitted. Maker-checker separation prevents single agent from both proposing and approving. Protected paths prevent governance self-modification and security bypass. State in GitHub issue provides append-only audit trail.

#### Verification

- ✅ 24 policy tests passing
- ✅ 14 verification tests passing
- ✅ npm run lint, build, test:unit all pass
- ✅ Protected edits denied, allowed edits pass

---

### 2026-07-16: Loop Engineering Phase 5 — Workflow/CLI Architecture

**Decision ID:** LOOP-PHASE5-001  
**Date:** 2026-07-16  
**Author:** Danny  
**Status:** Implemented

#### Decision

**Reusable Workflow:** `loop-run.yml` as `workflow_call` eliminates duplication across three loop workflows. Accepts inputs: loop-name, dry-run, mode, source-ref. Uses `secrets: inherit` for GITHUB_TOKEN propagation.

**Individual Loop Workflows:**
1. `loop-issue-intake.yml`: Issues trigger + Mon-Fri 9 AM UTC scheduled reconciliation
2. `loop-ci-sweeper.yml`: workflow_run trigger on "CI" workflow failure, early-exit step filters conclusion
3. `loop-pr-babysitter.yml`: PR events + hourly scheduled reconciliation

**Security:** All actions pinned to commit SHAs. Least-privilege permissions (contents: read, issues/pull-requests: write where needed). Concurrency keyed by issue/PR/run ID.

**CLI Architecture:** Doctor (health checks), bootstrap (branch protection), dry-run (run --dry-run true), run (load config/policy, execute pattern). Defensive pattern imports with try/catch.

#### Rationale

- Reusable workflow eliminates DRY violations
- Conservative schedules: issue intake weekdays (business hours), CI sweeper event-driven (no schedule), PR babysitter hourly (PR staleness matters)
- Exact workflow name match prevents recursion risk
- Defensive imports allow concurrent development (Danny + Rusty same tree)

#### Verification

- ✓ All 4 YAML files valid (js-yaml)
- ✓ 16 CLI arg-parsing tests pass
- ✓ 9 doctor tests pass
- ✓ npm run lint, build, test:unit pass

---

### 2026-07-16: Loop Engineering Phase 7 — Squad Workflow Cutover Sequencing

**Date:** 2026-07-16  
**Author:** Danny (Lead)  
**Status:** Active

#### Decision

Squad workflows (squad-heartbeat.yml, squad-triage.yml, squad-issue-assign.yml, sync-squad-labels.yml) will **NOT** be disabled in Phase 7 implementation. Instead:

1. Workflows are **flagged with detailed cutover comments** explaining overlap, cutover plan, requirement for human approval
2. Actual disablement is **deferred to dedicated cutover PR** after label migration complete and L1/L2 acceptance criteria met

#### Rationale

- Plan explicitly calls for "dedicated cutover PR," not "in Phase 7 implementation"
- Disabling Squad workflows is significant behavior change deserving separate deliberate PR
- Shadow mode allows comparison and validation before cutover
- Simpler rollback: pause loop (set `loop:paused` label) vs re-enable workflows + pause
- Phase 7 is preparation; cutover is future action

#### Risk Mitigation

- Loop runs L1 report-only by default (no mutations)
- Different label prefixes (squad:* vs loop:*)
- Both systems can coexist safely until cutover

---

### 2026-07-16: Loop Engineering Phase 8 — Operations, Observability, Documentation

**Date:** 2026-07-16  
**Author:** Danny  
**Context:** Phase 8 (Operations, Observability, Documentation) — final phase  
**Status:** Implemented and committed

#### Decision: Live-GitHub-Only Checks Are Soft Failures

**Problem:** State issue uniqueness, branch ruleset presence, and stale PR detection require GITHUB_TOKEN (unavailable in local dev).

**Solution:** Implement as informational soft failures — doctor passes (exit 0) in local dev, prints manual `gh` CLI commands for verification.

**Example Output:**
```
ℹ️ State issue uniqueness check requires GitHub API
  Run manually: gh issue list --label "loop:state" --json number,title
  Expected: Exactly one open issue with loop:state label
```

#### Decision: Metrics from State Ledger

Compute metrics on-demand from `state.runs` array via pure function `aggregateMetrics(runs)` — no separate metrics file, state ledger remains single source of truth.

#### Decision: Step Summary as Pure Function

Generate markdown string via pure `generateStepSummary()` function (fully testable, 16 tests), thin wrapper `writeStepSummary()` handles `$GITHUB_STEP_SUMMARY` write.

#### Decision: Incident Response Is Operator-Facing Prose

Document procedures using existing tools (gh CLI, git) rather than building new scripts. All procedures copy-paste-ready from LOOP.md.

#### Verification

- ✅ Extended doctor checks (soft failures for live-GitHub)
- ✅ Metrics aggregation tested (14 tests)
- ✅ Step summary generation tested (16 tests)
- ✅ All 463 tests passing
- ✅ Lint, typecheck, build all passing

---

### 2026-07-16: Loop Engineering Phase 5 — Pattern Modules (L1 Report-Only)

**Date:** 2026-07-16  
**Author:** Rusty (Backend Dev)  
**Context:** Phase 5 implementation — three loop pattern evaluation modules  
**Status:** Implemented

#### Decision: Pure Evaluation Functions

All three patterns (`issue-intake.mjs`, `ci-sweeper.mjs`, `pr-babysitter.mjs`) export pure `evaluate(input, config, policy)` functions returning structured proposals with explicit outcomes (no-op, actionable, needs-human, ambiguous, flake-detected, blocked, malformed).

#### Decision: L1 Report-Only Constraints

Each pattern enforces L1 rules at evaluation level:
- Issue intake: never apply labels, never comment, never delegate
- CI sweeper: never create fix issues, never assign, never retry
- PR babysitter: never rebase, never edit, never merge

All L1 actions limited to proposals for state ledger.

#### Decision: Fail-Closed Escalation

Escalate to `needs-human` for:
- P0/P1 issues
- Security/vulnerability
- Ambiguous issues
- Flaky tests (never retry to go green)
- Permission/secret failures
- Infrastructure/runner issues
- Low-confidence classifications
- Items exceeding max attempts (3)
- Large PRs (>5 files)
- Stale loop-managed PRs (>7 days)

#### Decision: Idempotency via Stable Keys

Use `sourceItemKey(kind, number)`, `failureFingerprint(...)`, `processedVersion = ${number}-${updated_at}` for change detection. Prior state from ledger detects replays.

#### Verification

- 56+ unit tests covering no-op, actionable, needs-human, ambiguous
- 7 fixtures for security, insufficient detail, flaky tests, large PRs
- 279+ total tests passing
- Lint clean, build successful

---

### 2026-07-16: Loop Engineering Phase 6 — L2 Graduation Double-Gate Design

**Date:** 2026-07-16  
**Decided by:** Rusty (Backend Dev)  
**Scope:** Loop engineering system  
**Status:** Implemented

#### Decision: Double-Gate Safety Design

Implement L2 graduation with two independent gates:
1. **Gate 1:** Effective mode must be L2 (per-loop override > global > L1 default)
2. **Gate 2:** `config.allowLiveDelegation` must be explicitly true

**Both gates must be open** for real (non-dry-run) delegation. If either gate is closed, delegation stays dry-run.

#### Decision: Safe Proposal Categories (L2 Allowlist)

Only these eligible for L2 delegation:
- `lint-fix`
- `type-fix`
- `mechanical-ci-fix`
- `deterministic-test-fix`

**Human-required (NEVER delegated):**
- `security`, `auth`, `dependency`, `infrastructure`
- `P0`, `P1`
- `breaking-change`, `architecture`, `ambiguous`

#### Decision: Budget/Policy Checks

L2 eligibility also requires:
- Attempts < `policy.maxAttempts` (default: 3)
- Changed files ≤ `policy.maxChangedFiles` (default: 5)
- Open loop PRs < `policy.maxConcurrentPRs` (default: 2)
- Active delegations < `policy.maxConcurrentDelegations` (default: 1)
- No protected paths touched

#### Decision: Default Stays L1

Phase 6 does NOT change Phase 5 behavior by default:
- Global mode: L1
- All loops explicitly L1
- `allowLiveDelegation: false`

Operators must make TWO explicit config changes to enable live delegation.

#### Rationale

- Fail-safe by default — even if mode set to L2, second gate prevents accidental live delegation
- Per-loop granularity allows surgical rollout
- Config-driven rollback — single config change (set mode=L1 or allowLiveDelegation=false)
- Defense-in-depth: each gate independently controlled

#### Verification

- 36+ graduation tests (eligibility checks, fail-closed edge cases)
- 16+ config per-loop mode resolution tests
- 18+ adapter double-gate tests
- 412+ total tests passing
- Lint, typecheck, build all passing

---

## Governance

- All meaningful changes require team consensus
- Document architectural decisions here
- Keep history focused on work, decisions focused on direction
- Merge this list into canonical decisions.md quarterly
