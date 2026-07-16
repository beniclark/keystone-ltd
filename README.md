# Keystone Financial — Options Chain Demo

> Modern React + Vite app with repository-owned loop engineering for GitHub Copilot automation

## Quick Start

```bash
npm install
npm run dev      # Start dev server at http://localhost:5173
```

## Loop Engineering

This repository implements a **loop engineering system** that enables safe, bounded, and verifiable automation with GitHub Copilot. See [LOOP.md](LOOP.md) for complete documentation.

**Loop Commands:**

```bash
npm run loop:doctor     # Validate loop config, policy, state, and environment
npm run loop:dry-run    # Simulate loop actions without GitHub writes
npm run loop            # Run loop patterns (production mode)
node scripts/loop/cli.mjs labels --dry-run   # Preview label changes
node scripts/loop/cli.mjs labels --apply     # Apply label changes (requires GITHUB_TOKEN)
```

**Current Status:** All phases (1-8) complete — baseline verification, loop contracts, GitHub connector, delegation adapter, worktree isolation, agent guardrails, L1/L2 rollout, label cutover, and operational documentation.

## Application Architecture

Single-page React 19 app using Vite 8 and Tailwind CSS v4. Client-side routing via react-router-dom v7. Mock data, no backend.

**Key Features:**
- Options chain explorer with real-time filtering
- User authentication (localStorage-based, demo only)
- Protected routes with automatic redirect
- Responsive design with Tailwind v4 and Framer Motion animations

## Development

```bash
npm install          # Install dependencies
npm run dev          # Vite dev server at localhost:5173
npm run build        # Production build to dist/
npm run preview      # Preview production build
npm run lint         # ESLint
npm run typecheck    # TypeScript type checking (staged JS)
npm run test:unit    # Vitest unit tests
npm run test:e2e     # Playwright E2E browser tests
npm run verify       # Run lint + typecheck + test:unit + build
npm run verify:full  # Run verify + test:e2e
```

## Project Structure

```
keystone-demo-options/
├── .github/
│   ├── workflows/        # CI and loop automation workflows
│   ├── hooks/            # Copilot agent hooks (policy enforcement, verification)
│   ├── agents/           # Custom Copilot agents (implementer, verifier)
│   └── skills/           # Project-specific agent skills
├── .loop/                # Loop engineering configuration
│   ├── config.json       # Loop mode, cadence, labels, action caps
│   ├── policy.json       # Protected paths, allowed actions, budget limits
│   ├── labels.json       # Canonical priority and loop-owned labels
│   ├── schemas/          # JSON schemas for config, policy, state, labels
│   └── fixtures/         # Test fixtures for loop patterns
├── scripts/loop/         # Loop runtime and CLI
│   ├── cli.mjs           # Loop CLI entry point (doctor, bootstrap, dry-run, run, labels)
│   ├── core/             # Config, policy, state, budget, graduation, metrics, reporting
│   ├── patterns/         # Loop patterns (issue-intake, ci-sweeper, pr-babysitter)
│   ├── connectors/       # GitHub REST connector (injectable transport)
│   ├── delegates/        # Delegation adapters (github-copilot)
│   ├── isolation/        # Worktree lifecycle manager
│   └── hooks/            # Agent hooks (pre-tool policy, agent-stop verify)
├── src/                  # Application source
│   ├── components/       # React components
│   ├── lib/              # Utilities (auth, options helpers)
│   ├── data/             # Mock data
│   └── pages/            # Route pages
├── tests/
│   ├── unit/loop/        # Loop system unit tests
│   └── e2e/              # Playwright browser tests
└── LOOP.md               # Loop engineering documentation
```

## Loop Engineering Quick Reference

**Loop Modes:**
- **L1 (report-only):** Loops discover and evaluate, write proposals to state ledger, no automated actions
- **L2 (verified draft PRs):** Loops can delegate narrowly-scoped, low-risk changes to GitHub Copilot (requires verification + human approval)

**CLI Subcommands:**
- `doctor` — Validate loop config, policy, state, labels, workflows, adapter
- `bootstrap` — Generate branch protection setup commands (requires admin)
- `dry-run` — Simulate loop run without GitHub writes
- `run` — Execute loop patterns (reads mode from config)
- `labels` — Sync labels from `.loop/labels.json` to GitHub (use `--apply` to write)
- `pause` / `resume` — Manage loop pause state (future work)

**State Management:**
- **State ledger:** Single GitHub issue with `loop:state` label contains versioned JSON state block
- **Append-only runs:** Each loop execution appends a run record with outcome, timestamp, fingerprint
- **Idempotency:** Duplicate event delivery, workflow runs, and assignments prevented by stable keys

**Escalation Paths:**
- `loop:human-required` — Proposal outside loop capabilities (security, P0/P1, ambiguous scope)
- `loop:blocked` — Loop cannot proceed (budget exhausted, protected paths, policy violation)
- **Pause loop:** Add `loop:paused` label to state issue to stop all automated actions

**Bootstrap Steps:**
1. Run `node scripts/loop/cli.mjs doctor` to validate configuration
2. Run `node scripts/loop/bootstrap-branch-protection.mjs` to see branch protection setup commands
3. Execute `gh api` commands manually (requires admin) to enable required checks on `main`
4. Verify workflows run: check Actions tab for `ci.yml` and `loop-*.yml` executions
5. Review state ledger: find the issue with `loop:state` label for operational history

**Cutover Steps (after L1/L2 acceptance):**
1. Verify loop meets acceptance criteria: `npm run verify:full` passes, state ledger shows expected outcomes
2. Migrate deprecated labels: run `node scripts/loop/cli.mjs labels --apply` to create canonical labels
3. Manually migrate issues/PRs from `priority:p*` to `P*` labels
4. Create dedicated cutover PR to disable/remove overlapping Squad workflows (see [LOOP.md](LOOP.md) Phase 7)
5. Document rollback plan: re-enable Squad workflows + set `loop:paused` label

## Testing

**Unit tests:** Vitest + React Testing Library
- Options helpers: formatting, date generation, ITM logic
- Auth: localStorage events, login/signup/logout
- Components: ProtectedRoute, OptionsChainPage
- Loop system: config, policy, state, graduation, metrics, reporting, connectors, adapters, patterns

**E2E tests:** Playwright (Chromium)
- Unauthenticated redirect
- Login and profile flow
- Options navigation and filtering

```bash
npm run test:unit    # All unit tests
npm run test:e2e     # All E2E tests (starts dev server automatically)
npm run verify:full  # Lint + typecheck + unit + build + E2E
```

## License

MIT
