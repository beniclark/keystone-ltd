---
name: keystone-verification
description: 'Run deterministic Keystone verification pipeline (lint, typecheck, test:unit, build) and report pass/fail evidence for loop stop conditions.'
---

# Keystone Verification

Execute the deterministic Keystone verification pipeline and report pass/fail evidence for loop-delegated work stop conditions.

## When to Use

- Before marking loop-delegated work as complete
- After proposing code changes for bounded fixes
- Validating PR readiness before independent review
- Checking that verification commands specified in delegation request pass

## Keystone Verification Commands

### Non-Browser (Local/Hook)

```bash
npm run lint         # ESLint — JavaScript/JSX code quality
npm run typecheck    # TypeScript — staged JS type checking (allowJs, checkJs, noEmit)
npm run test:unit    # Vitest — unit and component tests (jsdom, RTL)
npm run build        # Vite — production build to dist/
```

**Aggregate shortcut:** `npm run verify` (runs all four in sequence)

### Full (CI Only)

```bash
npm run test:e2e     # Playwright — Chromium browser smoke tests
```

`npm run verify:full` runs all five including E2E.

## Test Locations

- `src/**/__tests__/**` — Unit/component tests (Vitest + RTL)
- `tests/unit/loop/**` — Loop runtime unit tests (core, connectors, hooks)
- `e2e/**` — Playwright browser tests (Chromium smoke paths)

## Verification Process

1. **Parse Requirements** — Extract `verificationCommands` from delegation request
2. **Run Locally** — Execute each command in sequence, capture stdout/stderr
3. **Classify Result** — Pass (exit 0) or Fail (non-zero exit, error output)
4. **Collect Evidence** — Test counts, error messages, build output summary
5. **Report Pass/Fail** — Structured evidence for verifier review

## Output Format (Pass)

```markdown
## Verification — Passed ✅

**Commands:**
- ✅ npm run lint — passed
- ✅ npm run typecheck — passed
- ✅ npm run test:unit — passed (247 tests)
- ✅ npm run build — passed

**Changed Files:** 2
- src/components/OptionsTable.jsx
- src/components/__tests__/OptionsTable.test.jsx

**Evidence:** All verification commands exited 0, no errors reported.
```

## Output Format (Fail)

```markdown
## Verification — Failed ❌

**Commands:**
- ✅ npm run lint — passed
- ❌ npm run typecheck — failed
- ⏸️ npm run test:unit — skipped (previous failure)
- ⏸️ npm run build — skipped (previous failure)

**Error Output:**
```
src/components/OptionsTable.jsx:45:12 - error TS2322: Type 'string' is not assignable to type 'number'.
```

**Changed Files:** 1
- src/components/OptionsTable.jsx

**Next Step:** Fix type error or escalate if scope unclear.
```

## Stop Conditions (for agentStop hook)

**Block completion if:**

- ❌ Any verification command exits non-zero
- ❌ Verification commands were not run (no evidence)
- ❌ Changed files exceed max limit (5 files)
- ❌ Protected paths modified (per `.loop/policy.json`)

**Allow completion if:**

- ✅ All verification commands pass (exit 0)
- ✅ Changed files ≤ max limit
- ✅ No protected paths touched
- ✅ Evidence is present and valid

## Risk Awareness

- **Do not skip verification** — Even "trivial" changes must pass all commands
- **Do not trust self-reported results** — Verifier must re-run commands independently
- **Do not weaken tests** — Passing by disabling assertions is not verification
- **E2E tests run in CI only** — Local verification is lint/typecheck/unit/build, full verification includes E2E in required CI job

## Integration with Hooks

The `.github/hooks/loop-verify.json` hook calls `scripts/loop/hooks/agent-stop-verify.mjs`, which shells out to run these commands and blocks agent stop on failure.

Verification evidence must be append-only recorded in the **loop:state issue** for audit trail.
