---
name: ci-failure-triage
description: 'Fingerprint CI failures, classify root cause, and propose bounded fixes for Keystone verification pipeline failures.'
---

# CI Failure Triage

Classify CI workflow failures, fingerprint the root cause, and determine if automated remediation is safe within loop policy limits.

## When to Use

- `CI` workflow completes with failure status
- Lint, typecheck, test, or build job fails
- Determining if failure is a flake, regression, or infrastructure issue
- Qualifying if a fix can stay within 5-file/safe-path limits

## Keystone CI Jobs

The `ci.yml` workflow runs:

1. **lint-typecheck** — `npm run lint && npm run typecheck`
2. **test-unit** — `npm run test:unit` (Vitest)
3. **build** — `npm run build` (Vite)
4. **test-e2e** — `npm run test:e2e` (Playwright/Chromium)

## Failure Classification

### Code Regression
- Lint rule violation (e.g., unused vars, missing deps)
- Type error (e.g., JSDoc mismatch, wrong prop types)
- Unit test failure (assertion, mock, logic error)
- Build error (import path, syntax)

### Flake (Do NOT auto-retry)
- Intermittent E2E timeout
- Race condition in async test
- Network/external dependency issue

### Infrastructure
- npm install failure (registry unavailable)
- Playwright browser download timeout
- Runner out of disk space

### Policy Violation
- Protected path modified without approval
- Dependency change without human gate

## Fingerprinting

Create stable key from:
- Workflow name: `CI`
- Job name: `lint-typecheck`, `test-unit`, `build`, `test-e2e`
- Head SHA (short)
- Normalized error message (first 100 chars, strip line numbers)

**Example:** `ci/lint-typecheck/abc1234/unused-var-auth-module`

## Bounded Fix Criteria (L2)

Safe for L2 automated fix if **ALL** conditions met:

- ✅ Classification: code regression (lint, type, unit test, build)
- ✅ Max 5 files need changes (per `.loop/policy.json`)
- ✅ No protected paths involved (`.github/workflows/**`, `.loop/**`, `package.json`, `src/lib/auth.js`)
- ✅ No dependency manifest changes
- ✅ Error message is actionable (not "out of memory" or "network timeout")
- ✅ First or second attempt (max 3 attempts per fingerprint)

Escalate (`loop:human-required`) if:

- ❌ E2E flake or infrastructure failure
- ❌ Protected path or auth code involved
- ❌ Third failed attempt
- ❌ Scope unclear or exceeds 5 files
- ❌ Same error seen repeatedly without resolution

## Output Format (L1 Report)

Write to **loop:state issue** as append-only comment:

```markdown
## CI Failure — Run <run-id>

**Workflow:** CI (#<run-num>)
**Job:** lint-typecheck
**SHA:** abc1234
**Fingerprint:** `ci/lint-typecheck/abc1234/unused-var`

**Classification:** Code regression (lint)
**Root Cause:** Unused variable `userId` in `src/lib/auth.js`

**Bounded Fix Feasible:** ❌ No — protected path
**Recommendation:** Escalate to human (`loop:human-required`)
```

## Output Format (L2 Delegation)

If safe for automated fix:

```markdown
**Objective:** Fix unused variable lint error in src/components/OptionsTable.jsx

**Done When:**
- `npm run lint` passes
- `npm run test:unit` passes
- `npm run build` succeeds

**Allowed Paths:** src/components/OptionsTable.jsx
**Max Files:** 1
**Verification:** npm run lint && npm run test:unit && npm run build
```

## Stop Conditions

- Do **not** disable tests, weaken assertions, or increase timeouts to pass CI
- Do **not** retry flakes merely to turn CI green
- Do **not** propose fixes for infrastructure or environment failures
- Do **not** proceed if protected paths are involved without human override
- Exit before delegation if `loop:paused` label is set

## Risk Awareness

- Never mask symptoms — fix root cause or escalate
- Respect circuit breaker: after 3 failed attempts, mark `loop:blocked` and escalate
- If error message is ambiguous, classify as unknown and escalate
