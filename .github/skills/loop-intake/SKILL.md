---
name: loop-intake
description: 'Discover, qualify, and score GitHub issues for loop-managed triage using Keystone project commands, labels, and policy.'
---

# Loop Intake

Discover and qualify GitHub issues for automated loop management. Apply Keystone-specific priority labels, detect readiness, and escalate sensitive items per `.loop/policy.json`.

## When to Use

- New or reopened issues need triage
- Backlog scoring and priority assignment required
- Detecting duplicates or dependencies before assignment
- Qualifying whether an issue is ready for L2 automation

## Keystone Context

### Commands

```bash
npm run lint         # ESLint verification
npm run typecheck    # TypeScript type checking (staged JS)
npm run test:unit    # Vitest unit tests
npm run build        # Vite production build
npm run test:e2e     # Playwright browser tests (full verify only)
```

### Priority Labels (Canonical)

- `P0: critical` — production-breaking, security, auth failures
- `P1: high` — user-facing bugs, performance degradation
- `P2: medium` — quality-of-life improvements, minor bugs
- `P3: low` — polish, non-urgent enhancements

### Protected Paths (from .loop/policy.json)

- `.env*`, secrets, credentials
- `.github/workflows/**`, `.github/hooks/**`, `.loop/**`
- `package.json`, `package-lock.json`
- `src/lib/auth.js`, `**/migrations/**`

### State Ledger

All mutable loop state lives in the **GitHub issue labeled `loop:state`**, not in repository files.

## Process

1. **Discover** — Scan open issues excluding `loop:state` and `loop:managed` bounded-fix issues
2. **Qualify** — Check for clear acceptance criteria, linked dependencies, blocked status
3. **Score** — Assign priority based on impact, labels, keywords (security, auth, breaking, flake)
4. **Readiness** — Mark `go:yes` only if deterministic done conditions exist
5. **Escalate** — Mark `loop:human-required` for:
   - P0/P1 severity
   - Security, auth, dependency changes
   - Architecture or breaking changes
   - Ambiguous scope or missing acceptance criteria
   - Detected duplicates

## Output Format (L1 Report-Only)

Write to the **loop:state issue** as an append-only comment:

```markdown
## Issue Intake — Run <run-id>

**Discovered:** <count>
**Actionable:** <count>
**Escalated:** <count>

### Recommendations

- #<num> — [Priority: P2] Ready for assignment (lint fix in `src/components/`)
- #<num> — [Priority: P1] Needs human — auth scope ambiguous
- #<num> — [Priority: P3] Blocked by #<dep-num>
```

## Stop Conditions

- Do **not** apply labels or comment on source issues in L1 mode
- Do **not** close issues or mark duplicates without human approval
- Do **not** create assignments or delegation requests in L1
- Exit before any GitHub write if `loop:paused` label is present on state issue

## Risk Awareness

- Never propose auto-closure for P0/P1 issues
- Never mark security, auth, or dependency issues as auto-ready
- If scope is ambiguous, escalate — do not guess intent
