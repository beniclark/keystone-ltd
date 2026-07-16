---
name: issue-triage
description: 'Apply allowlisted labels, detect duplicates, and mark readiness for GitHub issues using Keystone priority taxonomy and protected-path rules.'
---

# Issue Triage

Apply high-confidence labels, detect duplicates, and mark issues ready for automated work within Keystone loop policy constraints.

## When to Use

- Issue needs priority, type, or area labels
- Checking for duplicates against open issues
- Marking issue as ready (`go:yes`) or blocked
- Determining if human review is required before delegation

## Keystone Context

### Allowed Labels (L2)

**Priority (canonical):**
- `P0: critical`, `P1: high`, `P2: medium`, `P3: low`

**Type:**
- `type:bug`, `type:feature`, `type:docs`, `type:chore`

**Area:**
- `area:auth`, `area:ui`, `area:data`, `area:build`, `area:test`

**Loop State:**
- `loop:managed`, `loop:queued`, `loop:blocked`, `loop:human-required`, `loop:verified`

### Human-Required Triggers

- P0 or P1 severity
- Labels: `security`, `auth`, `breaking`
- Keywords in title/body: "architecture change", "database migration", "dependency update"
- Protected paths referenced: `.github/workflows/**`, `.loop/**`, `package.json`, `src/lib/auth.js`
- Missing acceptance criteria or unclear scope

### Verification Commands (for ready issues)

```bash
npm run lint && npm run typecheck && npm run test:unit && npm run build
```

## Process

1. **Extract Context** — Title, body, labels, linked issues, referenced files
2. **Check Policy** — Scan for protected-path references and escalation keywords
3. **Assign Priority** — P0 (breaking/security) > P1 (user-facing) > P2 (quality) > P3 (polish)
4. **Detect Duplicates** — Search open issues for similar title/description
5. **Mark Readiness** — `go:yes` only if scope is clear, no blockers, and deterministic done conditions exist
6. **Escalate** — Add `loop:human-required` if sensitive, ambiguous, or high-risk

## Output Format (L2)

**Proposed Label Additions:**
```
P2: medium, type:bug, area:ui
```

**Readiness:**
- ✅ Ready (`go:yes`) — Clear scope, passes policy, deterministic done
- ⚠️ Blocked — Depends on #<num>
- 🚫 Human Required — Security scope, ambiguous acceptance criteria

**Duplicate Check:**
- No duplicates found
- OR: Possible duplicate of #<num> — escalate for human review

## Stop Conditions

- Do **not** apply P0/P1 labels without human confirmation
- Do **not** mark security, auth, or dependency issues as `go:yes` in L2
- Do **not** close issues or remove labels set by humans
- Do **not** proceed if issue references protected paths without human override

## Risk Awareness

- Fail safe: when in doubt, mark `loop:human-required`
- Never weaken priority or remove blocking labels
- Respect existing human-assigned labels — only add, never remove
