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

### Phase 4: Skills, Agents, and Hooks

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
