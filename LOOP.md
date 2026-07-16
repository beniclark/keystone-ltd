# Loop Engineering — Keystone Financial

> Repository-Owned Loop Engineering for GitHub Copilot automation

## Overview

This repository implements a loop engineering system that enables safe, bounded, and verifiable automation with GitHub Copilot. The loop system discovers issues, CI failures, and PR state from GitHub events, applies deterministic policy and budget checks, and delegates bounded work to GitHub Copilot in isolated environments with required verification.

## Current Status

**All Phases (1-8)** — Complete ✅

Repository-owned loop engineering system fully implemented with baseline verification, loop contracts, GitHub connector, delegation adapter, worktree isolation, agent guardrails, L1/L2 loops, label cutover, and operational documentation.

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

### Phase 6: Graduate Narrowly to L2 Assisted Draft PRs

**Status:** ✅ Complete (double-gate in place)

L2 delegation enabled per loop with independent feature flags. Double-gate enforcement:
1. Per-loop mode must be L2
2. Global `allowLiveDelegation` flag must be true

### Phase 7: Label Cutover & Squad Cutover

**Status:** ✅ Complete

#### Label Normalization

Loop system now uses canonical priority labels and loop-owned operational labels defined in `.loop/labels.json`:

**Canonical Priority Labels:**
- `P0: critical` — Blocking release, must be resolved immediately
- `P1: high` — High priority, should be resolved this sprint
- `P2: medium` — Medium priority, should be resolved next sprint
- `P3: low` — Low priority, backlog item

**Loop-Owned Labels:**
- `loop:state` — Loop state ledger issue
- `loop:paused` — Loop paused, no automated actions
- `loop:managed` — Item managed by loop automation
- `loop:queued` — Queued for loop processing
- `loop:running` — Loop actively processing this item
- `loop:blocked` — Loop cannot proceed, human intervention required
- `loop:human-required` — Escalated to human, outside loop capabilities
- `loop:verified` — Independent verification passed, ready for human approval

#### Label Management

```bash
# Preview proposed label changes (dry-run, no writes)
node scripts/loop/cli.mjs labels --dry-run
npm run loop -- labels --dry-run

# Apply label changes (requires GITHUB_TOKEN)
node scripts/loop/cli.mjs labels --apply
npm run loop -- labels --apply
```

The label sync script:
- Validates `.loop/labels.json` against its JSON schema
- Reports proposed creates, updates, and migrations
- Fails closed if policy is missing or invalid
- Never makes real API calls in tests (uses injectable transport)

#### Deprecated Label Migration

The `sync-squad-labels.yml` workflow creates `priority:p0`, `priority:p1`, `priority:p2` labels which overlap with canonical `P0: critical`, `P1: high`, `P2: medium`.

**Migration steps:**
1. Run `node scripts/loop/cli.mjs labels --dry-run` to preview changes
2. Verify no active workflow depends on `priority:p*` labels for loop execution (confirmed: loop code does NOT reference priority:p* or squad:* labels)
3. Run `node scripts/loop/cli.mjs labels --apply` to create/update canonical labels
4. Manually migrate issues/PRs from `priority:p*` to `P*` labels (or create migration script)
5. After migration complete: remove `priority:p*` from `sync-squad-labels.yml` in a dedicated cutover PR

#### Squad Automation Coexistence

Four Squad workflows currently run in parallel with loop workflows (shadow mode):

| Squad Workflow | Loop Equivalent | Overlap Type | Cutover Status |
|---|---|---|---|
| `squad-heartbeat.yml` | `loop-issue-intake.yml` | Issue events, scheduled runs | Flagged for cutover PR |
| `squad-triage.yml` | `loop-issue-intake.yml` | Issue triage, labeled events | Flagged for cutover PR |
| `squad-issue-assign.yml` | Loop delegation adapter | Issue assignment, @copilot sessions | Flagged for cutover PR |
| `sync-squad-labels.yml` | `.loop/labels.json` + label sync script | Label creation (priority:p*) | Flagged for cutover PR |

**Important:** These workflows have been **flagged with cutover comments** but are **NOT disabled** in Phase 7. Per the plan's guardrail:

> In a dedicated cutover PR, disable or remove overlapping triggers from: squad-heartbeat.yml, squad-triage.yml, squad-issue-assign.yml, sync-squad-labels.yml after label migration is complete.

Disabling these workflows is a **significant behavior change** that requires:
- Human approval via dedicated PR
- Confirmation that loop meets L1/L2 acceptance criteria
- Documented rollback plan (re-enable workflows + set `loop:paused` label)
- Verification that no active issue/PR/workflow depends on `squad:*` labels for loop execution

#### Loop Non-Dependency on .squad/

**Confirmed:** No loop code path reads `.squad/team.md`, `.squad/routing.md`, or any `squad:*` label for loop decision-making.

Verified via grep across:
- `scripts/loop/` — No references to `.squad` or `squad:` ✓
- `.github/hooks/` — No references to `.squad` or `squad:` ✓
- `.github/agents/` — Contains Squad agent definition (expected), but loop agents don't read it ✓
- `.loop/` — No references to `.squad` or `squad:` ✓

The `.squad/` directory remains as historical/optional team metadata. Loop workflows, scripts, policy, state transitions, and adapters do not depend on it for execution.

#### Rollback Plan

If unexpected behavior appears after Squad workflow cutover:

1. **Pause loop immediately:**
   ```bash
   # Add loop:paused label to state issue
   gh issue edit <STATE_ISSUE_NUMBER> --add-label "loop:paused"
   ```

2. **Re-enable Squad workflows:**
   ```bash
   # In a rollback PR, remove the workflow_dispatch: disable lines
   # or restore workflows from prior commit
   git revert <CUTOVER_COMMIT>
   ```

3. **Verify Squad workflows resume:**
   - Check that `squad-heartbeat.yml` runs on schedule
   - Manually trigger `squad-triage.yml` with a test issue
   - Confirm label sync works

4. **Investigate and fix loop issue:**
   - Review state ledger in the `loop:state` issue
   - Check workflow run logs
   - Validate config/policy changes

5. **Resume loop after fix:**
   ```bash
   # Remove loop:paused label
   gh issue edit <STATE_ISSUE_NUMBER> --remove-label "loop:paused"
   ```

**Note:** Rollback does NOT require restoring `.squad/` state — loop never depended on it.

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

## Incident Response

### Pause Loop Immediately

If the loop system produces unexpected behavior, incorrect fixes, or problematic PRs:

```bash
# Add loop:paused label to the state issue
gh issue edit <STATE_ISSUE_NUMBER> --add-label "loop:paused"
```

**Effect:** All loop workflows check for the `loop:paused` label before any action. When present, loops skip evaluation and delegation entirely until the label is removed.

### Revert or Close Bad Work

If a loop-created PR contains incorrect changes:

**Option 1: Close the PR**
```bash
# Close without merging (safe if not merged yet)
gh pr close <PR_NUMBER> --comment "Pausing loop for investigation"
```

**Option 2: Revert merged commit**
```bash
# If the PR was already merged and caused a problem
git revert <COMMIT_SHA>
git push origin main
```

Tag the revert commit with `[loop incident]` in the message to help correlate metrics.

### Record Failure Fingerprint

To prevent the loop from repeatedly attempting the same problematic change:

1. **Identify the failure fingerprint** — Check the state ledger's `runs` array for the `fingerprint` field of the problematic run
2. **Record in policy (future work)** — The `.loop/policy.json` schema is designed to support a `deniedFingerprints` list for permanent blocks

**For now:** Increase cooldown or lower max attempts in `.loop/policy.json` to slow down retries while investigating.

### Tighten Policy

If the loop is attempting changes outside acceptable bounds:

**Add protected paths:**
```json
{
  "protectedPaths": [
    ".github/workflows/**",
    ".loop/**",
    "src/lib/auth.js",
    "src/critical/module.js"  // Add new protected paths here
  ]
}
```

**Reduce action caps:**
```json
{
  "maxAttempts": 2,           // Reduce from 3 to 2
  "maxChangedFiles": 3,        // Reduce from 5 to 3
  "maxConcurrentPRs": 1        // Reduce from 2 to 1
}
```

**Disable specific loops:**
```json
{
  "loops": {
    "ciSweeper": { "mode": "L1" }  // Revert to report-only
  }
}
```

Commit and push policy changes immediately — no workflow restart required, next run picks up new policy.

### Resume Loop

After fixing the root cause and verifying the policy is correct:

```bash
# Remove loop:paused label
gh issue edit <STATE_ISSUE_NUMBER> --remove-label "loop:paused"
```

**Verify resume:**
- Check next scheduled workflow run completes successfully
- Review state ledger for new `runs` entries
- Monitor for 24-48 hours to confirm stability

### Escalation Paths

**Loop continuously blocked on same item:**
- Check state ledger `attempts` count for the item key
- If ≥ `maxAttempts`, loop automatically escalates with `loop:human-required` label
- Review item manually, fix underlying issue, remove label to allow retry

**Loop creating duplicate PRs:**
- Check idempotency keys in state ledger — duplicates should be prevented by `itemKey` tracking
- If duplicates occur, investigate GitHub event delivery (may indicate missed state update)
- Manually close duplicate PRs, consolidate work into one PR, update state ledger

**Loop delegation adapter fails repeatedly:**
- Review workflow logs for adapter errors
- Check `NEEDS_LIVE_VERIFICATION` comment in `scripts/loop/delegates/github-copilot.mjs`
- Verify GitHub API shape against live repository with manual API call
- Disable L2 mode (`allowLiveDelegation: false`) until API shape confirmed

**Metrics show poor time-to-first-action:**
- Review state ledger `timeToFirstActionMs` values
- Check reconciliation cadence in `.loop/config.json` — may need more frequent runs
- Investigate GitHub webhook delivery delays (if using event triggers)
- Consider increasing workflow concurrency limits

## Observability and Metrics

### GitHub Step Summaries

Loop workflows publish concise GitHub Step Summaries when running in CI. Each run summary includes:

- Loop name and mode (L1/L2)
- Pattern evaluation outcome (discovered, no-op, proposed, delegated, verified, blocked, escalated)
- Actions taken or proposed
- L2 graduation eligibility (if applicable)
- Next steps for escalated/blocked items

**View summaries:** GitHub Actions run page → "Summary" tab

### Metrics in State Ledger

The loop state ledger tracks operational metrics across all runs:

- **Outcomes:** discovered, no-op, proposed, delegated, verified, blocked, escalated
- **Efficiency:** duplicate prevention count, attempts per item, max attempts for single item
- **Time-to-first-action:** median and 95th percentile (when available)

**Access metrics programmatically:**
```javascript
import { aggregateMetrics } from './scripts/loop/core/metrics.mjs'
import { parseState } from './scripts/loop/core/state.mjs'

const { state } = parseState(issueBody)
const metrics = aggregateMetrics(state.runs)
console.log(metrics)
```

### Doctor Command

Run `loop doctor` to validate loop system health:

```bash
npm run loop:doctor
# or
node scripts/loop/cli.mjs doctor
```

**Checks performed:**
- ✓ Config validity (schema, mode, adapter settings)
- ✓ Policy validity (schema, protected paths, limits)
- ✓ GITHUB_TOKEN presence
- ✓ Worktree manager operational
- ✓ Pattern modules present
- ✓ Labels configuration valid
- ✓ Required workflows present
- ✓ Adapter availability
- ℹ️ State issue uniqueness (requires GitHub API)
- ℹ️ Pause state consistency (requires GitHub API)
- ℹ️ Branch ruleset presence (requires GitHub API)
- ℹ️ Stale loop PRs (requires GitHub API)

**Note:** Some checks require live GitHub API access and are reported as informational. Run the suggested `gh` CLI commands manually to verify these checks in production.

## Contact

For questions or issues with the loop system, open a GitHub issue with the `loop` label.

---

**Phases 1-8 complete.**
