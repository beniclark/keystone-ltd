# Phase 3 Loop Implementation — Decisions and Blockers

**Author:** Rusty  
**Date:** 2026-07-16  
**Context:** Phase 3 implementation (GitHub connector, Copilot adapter, worktree isolation)

## Decisions Made

### 1. Injected Dependencies for Test Isolation

**Decision:** All external dependencies (HTTP transport, exec, filesystem) are injected via constructor parameters.

**Rationale:**
- GitHubConnector accepts `fetchImpl` (defaults to global fetch)
- WorktreeManager accepts `execImpl` and `fsImpl` (defaults to Node's built-ins)
- Enables zero live network or git operations in unit tests
- Allows complete contract testing without mocking ESM imports (which Vitest can't do reliably)

**Impact:** All 103 Phase 3 unit tests pass with injected mocks. No brittle ESM spy hacks required.

---

### 2. Dry-Run by Default for GitHubCopilotAdapter

**Decision:** `GitHubCopilotAdapter` defaults to `dryRun: true` and requires explicit opt-in for real delegation.

**Rationale:**
- Safety first — no accidental production mutations during development/testing
- Dry-run returns complete, human-reviewable payload showing exact API calls
- Aligns with fail-closed principle from Phase 2 policy design
- Explicit opt-in forces conscious decision before enabling real delegation

**Implementation:**
```javascript
const adapter = new GitHubCopilotAdapter({
  connector,
  owner: 'owner',
  repo: 'repo',
  dryRun: false, // Must be explicitly set for real delegation
})
```

**Impact:** L2 rollout requires explicit configuration change. No silent escalation from L1 report-only to L2 delegation.

---

### 3. Backend-Neutral Delegation Interface

**Decision:** Abstract `DelegationAdapter` class defines contract; concrete implementations (GitHub Copilot, future backends) implement the interface.

**Structure:**
- **Request:** source (kind/number/URL), idempotencyKey, objective (max 200 chars), doneWhen (deterministic conditions), allowedPaths, deniedPaths, maxAttempts, maxFiles, verificationCommands, escalationInstructions
- **Result:** success, status (queued/running/completed/failed/dry-run), isolation (type/branch/prUrl/worktreePath), dryRunPayload, error, metadata
- **Validation:** `validateRequest()` enforces required fields, max lengths, valid types

**Rationale:**
- Decouples loop logic from specific agent backend (Copilot, Cursor, custom agents)
- Enables future backend switching without rewriting core loop patterns
- Request validation catches malformed delegations before they reach the backend

**Impact:** Adding new agent backends (e.g., Cursor, custom API) only requires implementing `DelegationAdapter` interface.

---

### 4. Cloud-Branch Isolation Contract

**Decision:** Separate `validateCloudBranchIsolation()` and `createCloudBranchIsolation()` helpers enforce isolation result structure.

**Requirements:**
- `type: 'cloud-branch'`
- `branch: string` (required)
- `prUrl: string` (optional)

**Rationale:**
- State machine requires isolation details before transitioning to "running"
- Separate validation from creation allows reuse in different contexts
- Type checking prevents mixing cloud-branch and worktree isolation

**Impact:** Prevents state transitions to "running" without valid isolation. Enforces separation between local (worktree) and cloud (Copilot branch) execution.

---

### 5. Worktree Safety and Collision Detection

**Decision:** WorktreeManager enforces strict safety rules:
- Refuses branch switching inside worktrees (throws immediately)
- Only removes clean, merged, or abandoned worktrees
- Collision detection via both `git worktree list` AND JSON manifest
- Branch naming: `loop/{pattern}/{source}-{run-id}`

**Rationale:**
- Prevents accidental data loss from removing dirty worktrees
- Collision detection protects against race conditions in concurrent runs
- Refusing branch switches keeps worktrees truly isolated
- Manifest provides loop-specific metadata beyond git's native tracking

**Impact:** Cannot accidentally remove uncommitted work. Cleanup is conservative by default; force removal requires explicit `{ force: true }` option.

---

## BLOCKER: GitHub Copilot Assignment API Shape

**Status:** 🚨 **NEEDS LIVE VERIFICATION BEFORE L2 ROLLOUT**

**Issue:** The exact API endpoint, HTTP method, request payload, and bot username for assigning GitHub Copilot coding agent to an issue is not definitively documented in public GitHub API docs.

**Current Implementation (Best-Effort):**
```javascript
// scripts/loop/connectors/github.mjs:332-345
async assignCopilotToIssue(owner, repo, issueNumber, copilotLogin = 'copilot') {
  // REST API assignees update
  return this._request(`/repos/${owner}/${repo}/issues/${issueNumber}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      assignees: [copilotLogin],
    }),
  })
}
```

**Possible Alternatives:**
1. **GraphQL `replaceActorsForAssignable` mutation** — May be the actual mechanism for Copilot assignment
2. **Different bot username** — `copilot` may not be correct; could be `copilot-bot`, `github-copilot`, or org-specific
3. **GitHub Apps API** — May require installation-specific bot user lookup
4. **Session creation endpoint** — Copilot may have a dedicated session/delegation API separate from standard issue assignees

**Required Action:**
- Manual bootstrap probe with live GitHub token and test issue
- Attempt current implementation; capture exact error response
- Research GitHub Copilot public docs + community examples
- Update `assignCopilotToIssue()` with verified working implementation
- Document exact API shape in code comments

**Impact on Phases:**
- **L1 (report-only):** No impact — L1 never calls assignCopilotToIssue
- **L2 (verified draft PRs):** **BLOCKED** — Cannot enable delegation without working Copilot assignment
- **Phase 4+ (skills, agents, hooks):** Can proceed in parallel

**Recommendation:**
- Proceed with Phase 4 (skills, agents, hooks) while verifying Copilot API in parallel
- Create a separate test issue specifically for Copilot assignment verification
- Document verified API shape in Phase 3 follow-up commit before L2 graduation

---

## Phase 3 Test Coverage Summary

**Total Tests:** 103 new tests (241 total with Phase 2)

**GitHubConnector (23 tests):**
- Constructor options
- Auth (GITHUB_TOKEN, GH_TOKEN, missing token)
- Error handling (403, 404, 429 + retry-after, malformed JSON, non-JSON)
- Read operations (issues, labels, PRs, reviews, checks, workflow runs)
- Write operations (update issue, create comment, create issue, assign Copilot)
- Idempotency (replay produces identical calls)

**Delegation Interface (31 tests):**
- DelegationAdapter abstract class
- Request validation (all required fields, max lengths, valid types)
- createDelegationRequest factory
- validateCloudBranchIsolation (null/undefined, wrong type, missing/invalid fields)
- createCloudBranchIsolation (with/without PR URL)

**GitHubCopilotAdapter (18 tests):**
- Constructor (dry-run default, explicit setting)
- isAvailable (token presence checks)
- Dry-run mode (no API calls, complete payload, correct actions/targets)
- Real mode (success with assignment + comment, failure on API error)
- createIsolationResult (valid cloud-branch creation)
- Comment formatting (all sections, omit empty sections)

**WorktreeManager (31 tests):**
- Constructor (require repoRoot, default exec/fs)
- Branch name generation
- Create (success, collision detection, custom base branch)
- List/get (empty manifest, parse manifest, find by branch/path)
- isClean (clean/dirty/error)
- isMerged (merged/not merged/error)
- Remove (not found, refuse dirty, allow clean, allow merged/abandoned)
- Mark abandoned/merged (status update)
- Cleanup (eligible removal, skip ineligible)
- refuseBranchSwitch (always throws)

**Verification Results:**
- `npm run test:unit` — 241 tests passing ✓
- `npm run lint` — clean ✓
- `npm run build` — successful (dist/ generated) ✓

---

## Recommended Next Phase

**Phase 4:** Skills, agents, and deterministic hooks

**Why proceed before Copilot API verification:**
- Phase 4 work (skills, agents, hooks) is independent of Copilot assignment API
- Can define loop commands, label rules, risk paths, and agent profiles in parallel
- Verification hooks and pre-tool policy don't depend on delegation backend
- Efficient use of time while waiting for Copilot API access/testing

**Phase 4 can proceed; L2 graduation remains blocked on Copilot API verification.**
