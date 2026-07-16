# Loop Engineering — Keystone Financial

> Repository-Owned Loop Engineering for GitHub Copilot automation

## Overview

This repository implements a loop engineering system that enables safe, bounded, and verifiable automation with GitHub Copilot. The loop system discovers issues, CI failures, and PR state from GitHub events, applies deterministic policy and budget checks, and delegates bounded work to GitHub Copilot in isolated environments with required verification.

## Current Status

**Phase 1** — Baseline verification and CI infrastructure ✅ (in progress)

**Phase 2-8** — Loop contracts, GitHub connector, agents, rollout — pending

## Phase 1: Baseline Verification

### What Was Implemented

1. **Development dependencies:**
   - `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`
   - `@playwright/test` for end-to-end smoke tests
   - `typescript` for staged JavaScript type-checking

2. **Package scripts:**
   - `test:unit` — Vitest unit tests
   - `test:e2e` — Playwright E2E tests
   - `typecheck` — TypeScript checking with `allowJs` (non-blocking)
   - `verify` — Lint + typecheck + unit tests + build
   - `verify:full` — Full verification including E2E
   - `loop`, `loop:doctor`, `loop:dry-run` — Stub commands (Phase 3)

3. **Baseline tests:**
   - Options helpers: formatting, date generation, ITM logic
   - localStorage auth: login, signup, logout, event dispatch
   - ProtectedRoute: redirect behavior and auth state handling
   - OptionsChainPage: rendering and navigation
   - Playwright smoke tests: unauthenticated redirect, login/profile, options navigation

4. **Type-checking:**
   - `tsconfig.json` with `allowJs: true`, `checkJs: false`, `noEmit: true`
   - Non-blocking — reports diagnostics without failing CI
   - Will be made required before L2 loop delegation (Phase 5+)

5. **CI workflow (`.github/workflows/ci.yml`):**
   - Separate jobs: lint & typecheck, unit tests, build, E2E tests (Chromium)
   - Aggregate `required-checks` job that depends on all others
   - Pinned action SHAs, explicit least-privilege permissions, concurrency control

6. **Branch protection bootstrap:**
   - Stub script at `scripts/loop/bootstrap-branch-protection.mjs`
   - Prints exact `gh api` commands for manual execution (requires admin)
   - Configures `main` ruleset: required CI checks, 1 approval, resolved conversations, pull-request-only changes
   - Force pushes, deletions, and auto-merge remain disabled

### Manual Remediation

Since branch protection requires admin permissions, run the bootstrap script to see the exact commands:

```bash
node scripts/loop/bootstrap-branch-protection.mjs
```

Copy and execute the `gh api` command with your repository owner/name substituted.

### Verification

Run these commands to verify Phase 1 is complete:

```bash
npm run lint          # Should pass
npm run typecheck     # Should run (may report diagnostics, non-blocking)
npm run test:unit     # Should pass
npm run build         # Should succeed
npm run verify        # All of the above
npm run test:e2e      # E2E tests (requires dev server or will auto-start)
npm run verify:full   # Full verification including E2E
```

CI will run on pull requests and require all checks to pass before merge (once branch protection is enabled).

## Next Phases

### Phase 2: Loop Contracts and State

- `.loop/config.json`, `.loop/policy.json`, schemas
- Live state issue with `loop:state` label
- Idempotency, pause/resume, budget enforcement

### Phase 3: GitHub Connector and Adapters

- `GitHubConnector` with injected HTTP transport
- GitHub Copilot delegation adapter
- Local `git worktree` isolation manager

### Phase 5: Issue Intake, CI Sweeper, PR Babysitter (L1 Report-Only)

**Status:** ✅ Complete

All three loops running in L1 report-only mode. Patterns evaluate issues, CI failures, and PR state, generate proposals, and write to the state ledger. No automated labels, comments, or delegations are performed.

### Phase 6: L2 Graduation with Double-Gate Safety

**Status:** ✅ Complete

Implemented L2 graduation with feature-flagged delegation controls and fail-closed safety.

#### What Is L2 Mode?

**L1 (report-only):** Loops discover events, evaluate them, and write proposals to the state ledger. No automated actions are taken — everything is human-reviewed.

**L2 (verified draft PRs):** Loops can delegate narrowly-scoped, low-risk changes to GitHub Copilot for automated implementation. L2 actions create draft PRs that still require CI verification, independent semantic review, and human approval before merge.

#### Double-Gate Safety Design

Real (non-dry-run) delegation requires **BOTH** gates to be open:

1. **Gate 1: Mode is L2** — The effective mode for the specific loop must be L2 (per-loop override or global mode)
2. **Gate 2: allowLiveDelegation = true** — An explicit opt-in flag in `.loop/config.json` must be set to `true`

Even when both gates are open, the adapter itself defaults to dry-run unless explicitly configured otherwise. This creates three independent safeguards against accidental live delegation.

#### Configuration

**Per-loop mode overrides:**

```json
{
  "mode": "L1",
  "allowLiveDelegation": false,
  "loops": {
    "issueIntake": { "mode": "L1" },
    "ciSweeper": { "mode": "L2" },
    "prBabysitter": { "mode": "L1" }
  }
}
```

In the example above:
- Global default is L1
- `issueIntake` is explicitly L1 (no delegation)
- `ciSweeper` is L2 (eligible for delegation IF second gate is also open)
- `prBabysitter` is explicitly L1 (no delegation)
- **But** `allowLiveDelegation: false` means all loops remain dry-run regardless

**Default behavior:**
All loops default to L1 mode. `allowLiveDelegation` defaults to `false`. This ensures **no behavior change** from Phase 5 unless both gates are explicitly opened.

#### L2 Eligibility Criteria

For a proposal to be eligible for L2 delegation, ALL of the following must be true:

1. **Effective mode is L2** for that specific loop
2. **Proposal outcome is `actionable`** (not `no-op`, `malformed`, etc.)
3. **Category is in the safe allowlist:**
   - `lint-fix` — ESLint/Prettier fixes
   - `type-fix` — TypeScript type errors
   - `mechanical-ci-fix` — Deterministic build/CI failures
   - `deterministic-test-fix` — Reproducible unit test failures

4. **Human-required categories are NEVER delegated**, even in L2:
   - `security`, `auth`, `dependency`, `infrastructure`
   - `P0`, `P1` (critical/high priority)
   - `breaking-change`, `architecture`, `ambiguous`

5. **Proposal has clear `doneWhen` conditions** (non-empty array)
6. **No protected paths are touched:**
   - `.env*`, secrets, credentials, keys
   - `.github/workflows/**`, `.github/hooks/**`, `.loop/**`
   - `package.json`, `package-lock.json`
   - `src/lib/auth.js`, auth/session code, migrations

7. **Budget limits are satisfied:**
   - Attempts < `policy.maxAttempts` (default: 3)
   - Changed files ≤ `policy.maxChangedFiles` (default: 5)
   - Open loop PRs < `policy.maxConcurrentPRs` (default: 2)
   - Active delegations < `policy.maxConcurrentDelegations` (default: 1)

**Fail-closed:** If any condition is ambiguous, missing, or cannot be verified, the proposal is **NOT** eligible for L2 delegation.

#### CLI Reporting

The `loop run` command shows graduation eligibility in dry-run output:

```bash
npm run loop -- run --pattern ciSweeper --dry-run true
```

Output includes:
```
=== L2 Graduation Check ===
Eligible for L2 delegation: YES
Effective mode: L2
Reason: All eligibility criteria satisfied

Double-gate status:
  1. Mode is L2: ✓
  2. allowLiveDelegation: ✗

Real delegation BLOCKED: config.allowLiveDelegation is false
Delegation would run in dry-run mode (safe)
```

#### NEEDS_LIVE_VERIFICATION Caveat

**CRITICAL:** The actual GitHub API shape for assigning the GitHub Copilot coding agent to an issue is **UNVERIFIED**.

The current implementation uses a best-effort REST API call:
```http
PATCH /repos/{owner}/{repo}/issues/{issue_number}
{ "assignees": ["copilot"] }
```

However, the correct shape may require:
- A different assignee username (e.g., `github-copilot[bot]`, `copilot-agent`, etc.)
- GraphQL mutation `replaceActorsForAssignable` instead of REST
- Additional authentication or scoping for Copilot-specific operations

**DO NOT enable both gates (`mode: L2` + `allowLiveDelegation: true`) without first manually verifying the GitHub API call against a live repository.** Even with both gates open, the adapter defaults to dry-run to prevent accidental misconfigured calls.

#### Implementation Files

- **`scripts/loop/core/graduation.mjs`** — Pure functions for L2 eligibility checks
- **`scripts/loop/core/config.mjs`** — Per-loop mode resolution (`getEffectiveMode`, `allowsLiveDelegation`)
- **`scripts/loop/delegates/github-copilot.mjs`** — Double-gate enforcement in adapter
- **`scripts/loop/cli.mjs`** — Graduation reporting in `run` command
- **`.loop/config.json`** — Per-loop mode overrides and `allowLiveDelegation` flag
- **`.loop/schemas/config.schema.json`** — Extended schema with `loops` and `allowLiveDelegation`
- **`.loop/fixtures/graduation-*.json`** — Test scenarios for graduation logic
- **`tests/unit/loop/graduation.test.mjs`** — Comprehensive graduation tests
- **`tests/unit/loop/config-graduation.test.mjs`** — Per-loop mode resolution tests

#### Rollback

If L2 delegation causes unexpected behavior:

1. Set `allowLiveDelegation: false` in `.loop/config.json` (immediate dry-run enforcement)
2. Or set specific loop modes back to L1:
   ```json
   "loops": {
     "ciSweeper": { "mode": "L1" }
   }
   ```
3. Or set global `mode: "L1"` to revert all loops to report-only
4. Commit and push — no workflow changes required

The double-gate design ensures you can disable L2 delegation at the config level without touching workflows, agents, or policies.

#### Verification Commands

```bash
npm run test:unit    # Should pass (360+ tests)
npm run lint         # Should pass
npm run typecheck    # Should pass
npm run build        # Should pass
npm run verify       # All of the above
```



- Project-specific skills (issue triage, CI triage, minimal fix, verification)
- Custom agents (implementer, verifier)
- `preToolUse` policy hooks, `agentStop` verification hooks

### Phase 5-8: Rollout and Cutover

- L1 report-only mode for issue intake, CI sweeper, PR babysitter
- Graduate to L2 verified draft PRs
- Shadow mode with Squad, then label cutover
- Comprehensive documentation and runbooks

## Architecture

```text
GitHub event or scheduled reconciliation
  -> thin loop workflow
  -> deterministic discovery and normalization
  -> policy, budget, idempotency, and pause checks
  -> read/update GitHub state issue
  -> L1: report and escalate only
     OR
  -> L2: repository adapter delegates a bounded goal
  -> isolated cloud branch or local git worktree
  -> implementer proposes a draft PR
  -> required CI verifier + independent semantic review
  -> human approval and merge
  -> reconciliation updates the live ledger
```

## Policies

- **Max automated attempts:** 3 per source item/failure fingerprint
- **Max changed files:** 5 per automated fix
- **Max concurrent loop PRs:** 2
- **Auto-merge:** Disabled
- **Protected paths:** `.github/workflows/`, `.github/hooks/`, `.loop/`, auth/session code, dependency manifests
- **Human gates:** Sensitive paths, governance changes, workflow self-modification

## Contact

For questions or issues with the loop system, open a GitHub issue with the `loop` label.

---

**Phase 1 complete. Phases 2-8 pending.**
