# Loop State Ledger Format

This document describes the format of the live loop state ledger stored in a GitHub issue with the `loop:state` label.

## Issue Structure

The state issue contains:

1. **Issue Body** — Human-readable current state summary with a machine-readable JSON block
2. **Comments** — Append-only run records (one comment per loop run)

## Body Format

The issue body contains a marker-delimited JSON state block:

```markdown
# Loop State — Current Status

**Status:** Active  
**Last Updated:** 2026-07-16T01:00:00Z  
**Version:** 42

## Summary

- **Discovered:** 15 items
- **In Progress:** 2 delegations
- **Verified:** 8 items
- **Blocked:** 1 item
- **Human Required:** 3 items

## Recent Activity

- Issue #123: Queued for fix (1 attempt)
- PR #124: CI sweeper created draft fix
- Issue #125: Escalated to human-required (3 attempts)

---

<!-- LOOP_STATE_BEGIN -->
```json
{
  "version": 42,
  "lastUpdated": "2026-07-16T01:00:00Z",
  "status": "active",
  "sourceItems": {
    "issue-123": {
      "kind": "issue",
      "number": 123,
      "status": "queued",
      "attempts": 1,
      "firstSeen": "2026-07-15T10:00:00Z",
      "fingerprint": "sha256:abc123...",
      "activeDelegation": "deleg-issue-123-run-42"
    }
  },
  "delegations": {
    "deleg-issue-123-run-42": {
      "sourceKey": "issue-123",
      "backend": "github-copilot",
      "status": "running",
      "createdAt": "2026-07-16T00:30:00Z"
    }
  },
  "metrics": {
    "discovered": 15,
    "noOp": 3,
    "proposed": 10,
    "delegated": 8,
    "verified": 5,
    "blocked": 1,
    "escalated": 3,
    "duplicatePrevention": 12
  },
  "openPRs": [124, 126],
  "cooldowns": {}
}
```
<!-- LOOP_STATE_END -->
```

## Optimistic Concurrency

The `version` field is incremented with each state update. When updating:

1. Read the current state and its version
2. Apply changes to create new state with `version + 1`
3. Update the issue body atomically
4. If another process updated first (version mismatch), retry with exponential backoff

## Run Comments

Each loop run appends one comment with:

- **Run ID** — Unique identifier (workflow run ID or timestamp)
- **Trigger** — Event type and source (e.g., "issue.opened #123")
- **Discoveries** — New or changed source items
- **Actions** — Labels applied, delegations created, escalations
- **Deferrals** — Items skipped due to policy/budget
- **Links** — Source issues/PRs, workflow logs, created PRs

Example:

```markdown
## Run: workflow-run-1234567890 | 2026-07-16T01:00:00Z

**Trigger:** issue.opened #123  
**Mode:** L1 (report-only)

### Discoveries
- Issue #123: New bug report (fingerprint: sha256:abc123...)

### Actions
- Applied label `loop:managed` to #123
- Proposed priority: P2 (medium)
- Classified as type: bug, area: auth

### Deferrals
- No delegation in L1 mode

### Links
- Source: https://github.com/owner/repo/issues/123
- Workflow: https://github.com/owner/repo/actions/runs/1234567890
```

## Pruning

Old run comments (>30 days or >100 comments) are pruned to keep the issue manageable while preserving the audit trail:

- Archive pruned comments to GitHub Actions artifacts
- Update the issue body summary with archival notice
- Keep at least the last 20 run comments

## Kill Switch

Add the `loop:paused` label to the state issue to pause all loops immediately. Every loop checks this label before performing any discovery-side writes.

## No Production State in Repository

The `.loop/state.example.md` file documents the format but does NOT contain mutable production state. The live state always lives in the GitHub issue.
