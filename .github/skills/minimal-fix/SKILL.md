---
name: minimal-fix
description: 'Propose minimal, surgical code changes for bounded loop-delegated fixes within Keystone 5-file limit and protected-path rules.'
---

# Minimal Fix

Propose minimal, surgical code changes for loop-delegated bounded fixes. Respect Keystone file limits, protected paths, and verification requirements.

## When to Use

- Loop has delegated a bounded fix (lint, type, unit test, build error)
- Objective is narrow and deterministic
- Allowed paths and max file limits are specified
- Goal is to pass verification commands without scope expansion

## Keystone Constraints

### Hard Limits (from .loop/policy.json)

- **Max 5 files changed** per delegation
- **Max 3 attempts** per source issue/failure fingerprint
- **No protected paths** modified:
  - `.env*`, secrets, credentials
  - `.github/workflows/**`, `.github/hooks/**`, `.loop/**`
  - `package.json`, `package-lock.json`
  - `src/lib/auth.js`, `**/migrations/**`

### Verification Commands (must pass before done)

```bash
npm run lint         # ESLint must pass
npm run typecheck    # TypeScript type checking must pass
npm run test:unit    # Vitest unit tests must pass
npm run build        # Vite production build must succeed
```

Full E2E verification (`npm run test:e2e`) runs in CI, not during local fix.

## Fix Principles

1. **Surgical** — Change only what's necessary to pass verification
2. **No scope creep** — Do not refactor unrelated code
3. **No test weakening** — Do not disable assertions, increase timeouts, or skip tests to pass
4. **No workarounds** — Fix root cause, not symptoms
5. **Preserve intent** — Do not change business logic or user-facing behavior

## Process

1. **Parse Delegation** — Objective, doneWhen, allowedPaths, deniedPaths, verificationCommands
2. **Reproduce Error** — Run failing verification command locally
3. **Locate Root Cause** — Identify exact file/line causing failure
4. **Propose Minimal Change** — Smallest edit to pass verification
5. **Validate Scope** — Changed files ≤ max, no denied paths touched
6. **Run Verification** — Execute all required verification commands
7. **Report Result** — Success with evidence, or escalate with reason

## Output Format (Implementation)

**Branch:** `loop/<pattern>/<source>-<run-id>`

**Changes:**
- `src/components/OptionsTable.jsx` — Remove unused `userId` import

**Verification Evidence:**
```
✅ npm run lint — passed
✅ npm run typecheck — passed
✅ npm run test:unit — passed (247 tests)
✅ npm run build — passed
```

**Done Condition Met:** Unused variable lint error resolved

## Escalation Triggers

Escalate (`loop:human-required`) if:

- ❌ Fix requires >5 files
- ❌ Root cause is in a protected path
- ❌ Verification still fails after change
- ❌ Business logic change needed (unclear intent)
- ❌ This is the third attempt (max attempts reached)
- ❌ Error message is ambiguous or root cause unclear

## Stop Conditions

- Do **not** disable tests or lint rules to pass verification
- Do **not** add `@ts-ignore` or `eslint-disable` without documenting why
- Do **not** modify files outside `allowedPaths`
- Do **not** change business logic, auth flow, or user-facing behavior
- Do **not** increase test timeouts or weaken assertions

## Risk Awareness

- If unsure whether a change affects behavior, escalate — do not guess
- Protected paths like `src/lib/auth.js` require human review even for "simple" lint fixes
- A passing test suite is necessary but not sufficient — changes must preserve intent
- If the fix feels larger than "minimal", stop and escalate
