---
name: pr-review-triage
description: 'Track PR readiness, check/review state, staleness, and escalate merge blockers for Keystone loop-managed pull requests.'
---

# PR Review Triage

Monitor pull request state, track required checks, review decisions, and determine readiness for merge or escalation within Keystone loop policy.

## When to Use

- PR opened, updated, or review/check state changed
- Determining if PR is ready for human merge approval
- Detecting stale or abandoned PRs
- Tracking loop-created PRs through verification pipeline

## Keystone PR Verification Pipeline

### Required Checks (from ci.yml)

1. ✅ `lint-typecheck` — ESLint + TypeScript pass
2. ✅ `test-unit` — Vitest tests pass
3. ✅ `build` — Vite build succeeds
4. ✅ `test-e2e` — Playwright browser tests pass

### Loop PR Constraints (from .loop/policy.json)

- Max 2 concurrent loop-created PRs open
- Max 5 files changed per PR
- No auto-merge (always requires human approval)
- No protected paths modified without human gate

### Readiness States

**Ready (`loop:verified`):**
- All required checks pass
- Independent semantic review completed (verifier agent comment present)
- No unresolved conversations
- Not in draft state
- No merge conflicts

**Blocked (`loop:blocked`):**
- Required checks failing
- Changes requested by reviewer
- Merge conflicts present
- Protected paths modified without approval

**Human Required (`loop:human-required`):**
- P0/P1 linked issue
- Security, auth, or dependency changes
- Scope exceeded 5 files
- Third verification attempt failed

**Stale:**
- No updates in >7 days
- Base branch significantly ahead (>10 commits)

## Process

1. **Extract Context** — PR number, author, draft state, linked issue, changed files, labels
2. **Check Ownership** — Is this a loop-created PR? (label `loop:managed`)
3. **Verify Isolation** — Branch name matches `loop/<pattern>/<source>-<run-id>` pattern
4. **Check Limits** — Count loop-managed open PRs (max 2), changed files (max 5)
5. **Review CI Status** — All required checks passing?
6. **Review Feedback** — Approved, changes requested, or pending?
7. **Detect Blockers** — Merge conflicts, unresolved conversations, protected paths
8. **Staleness** — Last updated >7 days ago or base far ahead?
9. **Classify State** — ready, blocked, human-required, stale

## Output Format (L1 Report)

Write to **loop:state issue** as append-only comment:

```markdown
## PR Babysitter — Run <run-id>

**Tracked PRs:** 2 loop-managed, 1 human-authored

### PR #<num> — Fix lint errors in OptionsTable

- **Status:** ✅ Ready for review
- **Checks:** All passing
- **Reviews:** Pending
- **Files Changed:** 2 of 5 allowed
- **Linked Issue:** #<num>
- **Recommendation:** Awaiting independent verifier review

### PR #<num> — Update auth flow

- **Status:** 🚫 Human Required
- **Reason:** Protected path modified (`src/lib/auth.js`)
- **Checks:** Passing
- **Recommendation:** Escalate for manual review
```

## Output Format (L2 Actions)

**Allowed L2 Actions (future):**
- Apply `loop:verified` label after checks + verifier approval
- Add guidance comment if checks fail repeatedly
- Request re-review if new commits pushed after approval

**Denied L2 Actions:**
- Never auto-merge (always requires human)
- Never dismiss reviews or resolve conversations
- Never mark PR ready from draft without verifier evidence
- Never rebase automatically (disabled in L2 initial rollout)

## Stop Conditions

- Do **not** merge PRs, even if all checks pass and approved
- Do **not** apply `loop:verified` if independent verifier review is missing
- Do **not** rebase or force-push to loop-managed branches
- Do **not** close PRs without human approval
- Exit before any writes if `loop:paused` label is set

## Risk Awareness

- PR #18 is marked `human-required` due to excessive scope (>5 files)
- Never apply `loop:verified` based solely on implementer agent self-report
- Respect branch protection: one approval + all checks required
- Stale PRs should be flagged but not auto-closed
