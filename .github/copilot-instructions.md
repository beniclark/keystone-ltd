# Copilot Instructions — Keystone Financial

## Commands

```bash
npm run dev          # Vite dev server at localhost:5173
npm run build        # Production build to dist/
npm run lint         # ESLint (flat config, JS/JSX only)
npm run typecheck    # TypeScript type checking (staged JS)
npm run test:unit    # Vitest unit tests
npm run test:e2e     # Playwright E2E browser tests
npm run verify       # Run lint + typecheck + test:unit + build
npm run verify:full  # Run verify + test:e2e (full verification)
npm run preview      # Preview production build
```

### Loop Commands

```bash
# Validate loop configuration and environment
npm run loop:doctor
node scripts/loop/cli.mjs doctor

# Simulate loop run without GitHub writes (safe, dry-run)
npm run loop:dry-run
node scripts/loop/cli.mjs dry-run

# Execute loop patterns (reads mode from .loop/config.json)
npm run loop
node scripts/loop/cli.mjs run

# Run specific pattern
node scripts/loop/cli.mjs run --pattern ciSweeper

# Label management
node scripts/loop/cli.mjs labels              # Preview label changes (dry-run, default)
node scripts/loop/cli.mjs labels --dry-run    # Explicit dry-run
node scripts/loop/cli.mjs labels --apply      # Apply label changes (requires GITHUB_TOKEN)

# Bootstrap branch protection (requires admin permissions)
node scripts/loop/bootstrap-branch-protection.mjs

# Pause/resume (future work — currently manual via gh CLI)
# gh issue edit <STATE_ISSUE_NUMBER> --add-label "loop:paused"
# gh issue edit <STATE_ISSUE_NUMBER> --remove-label "loop:paused"
```

**Loop CLI Subcommands:**
- `doctor` — Validate loop config, policy, state, labels, workflows, adapter availability
- `bootstrap` — Generate branch protection setup commands (requires admin)
- `dry-run` — Simulate loop run without GitHub writes (safe preview mode)
- `run` — Execute loop patterns (reads mode from `.loop/config.json`)
  - `--pattern <name>` — Run specific pattern (issueIntake, ciSweeper, prBabysitter)
  - `--mode L1|L2` — Override mode (default: from config)
  - `--dry-run` — Force dry-run even in L2 mode
- `labels` — Sync labels from `.loop/labels.json` to GitHub
  - `--dry-run` — Preview changes without applying (default)
  - `--apply` — Apply changes to GitHub (requires GITHUB_TOKEN)

**State Location:**
The loop state ledger is stored in a GitHub issue with the `loop:state` label. This issue contains:
- Human-readable narrative (issue body above state markers)
- Machine-readable JSON state block (between `<!-- LOOP_STATE_BEGIN -->` and `<!-- LOOP_STATE_END -->` markers)
- Append-only run records (in issue comments, one per loop execution)

**Labels (Phase 7):**
The loop system uses canonical priority labels and loop-owned operational labels defined in `.loop/labels.json`:

**Canonical Priority Labels:**
- `P0: critical` — Blocking release, must be resolved immediately
- `P1: high` — High priority, should be resolved this sprint
- `P2: medium` — Medium priority, should be resolved next sprint
- `P3: low` — Low priority, backlog item

**Loop-Owned Operational Labels:**
- `loop:state` — Loop state ledger issue
- `loop:paused` — Loop paused, no automated actions
- `loop:managed` — Item managed by loop automation
- `loop:queued` — Queued for loop processing
- `loop:running` — Loop actively processing this item
- `loop:blocked` — Loop cannot proceed, human intervention required
- `loop:human-required` — Escalated to human, outside loop capabilities
- `loop:verified` — Independent verification passed, ready for human approval

**Escalation Paths:**

1. **Loop paused:** Add `loop:paused` label to state issue → all loops skip evaluation/delegation
2. **Human required:** `loop:human-required` label indicates item is outside loop capabilities (security, P0/P1, ambiguous scope)
3. **Blocked:** `loop:blocked` label indicates loop cannot proceed (budget exhausted, protected paths, policy violation)
4. **Verification failed:** Loop PR fails CI or semantic review → manual fix required, then merge or close

**Bootstrap Steps (one-time setup):**

1. Run `node scripts/loop/cli.mjs doctor` to validate configuration
2. Run `node scripts/loop/bootstrap-branch-protection.mjs` to see branch protection setup commands
3. Execute the `gh api` commands manually (requires admin permissions) to enable required checks on `main`
4. Create a GitHub issue labeled `loop:state` with initial state (or let first loop run create it)
5. Verify workflows run: check Actions tab for `ci.yml` and `loop-*.yml` executions

**Cutover Steps (after L1/L2 acceptance):**

1. **Verify loop acceptance criteria:**
   - `npm run verify:full` passes
   - State ledger shows expected outcomes for all three loops
   - No unexpected escalations or blocks

2. **Migrate deprecated labels:**
   - Run `node scripts/loop/cli.mjs labels --dry-run` to preview
   - Run `node scripts/loop/cli.mjs labels --apply` to create canonical labels
   - Manually migrate issues/PRs from `priority:p*` to `P*` labels (or create migration script)

3. **Create dedicated cutover PR:**
   - Disable or remove overlapping Squad workflow triggers:
     - `squad-heartbeat.yml`
     - `squad-triage.yml`
     - `squad-issue-assign.yml`
     - `sync-squad-labels.yml` (after label migration)
   - Document rollback plan in PR description
   - Require human review and approval

4. **Rollback plan (if needed):**
   - Add `loop:paused` label to state issue
   - Revert cutover PR or re-enable Squad workflows
   - Investigate and fix loop issue
   - Remove `loop:paused` label to resume

**Incident Response (see LOOP.md for details):**

- **Pause:** `gh issue edit <STATE_ISSUE_NUMBER> --add-label "loop:paused"`
- **Revert bad work:** Close PR or `git revert <COMMIT_SHA>`
- **Record fingerprint:** Note failure fingerprint from state ledger (future: add to `deniedFingerprints` list)
- **Tighten policy:** Edit `.loop/policy.json` to add protected paths, reduce caps, or disable specific loops
- **Resume:** `gh issue edit <STATE_ISSUE_NUMBER> --remove-label "loop:paused"`

## Architecture

Single-page React 19 app using Vite 8 and Tailwind CSS v4. Client-side routing via react-router-dom v7 with a shared `Layout` shell (Navbar + Outlet + Footer). The `/profile` route is protected by `ProtectedRoute`, which redirects unauthenticated users to `/login`.

**Auth** is localStorage-based (`keystoneUser` key). `src/lib/auth.js` handles login/signup/logout and dispatches a custom `keystone-auth` event. The `useAuth` hook subscribes to both that event and `storage` to stay in sync across tabs.

**Data** is entirely static mock data in `src/data/`. There is no API layer or backend. Components import named exports directly from data files.

### Test Locations

- `src/**/__tests__/**` — Unit and component tests (Vitest + React Testing Library)
- `tests/unit/loop/**` — Loop runtime unit tests (core, connectors, hooks)
- `e2e/**` — Playwright browser tests (Chromium smoke paths)

### Loop Engineering

This repository uses **loop engineering** for automated issue intake, CI failure sweeping, and PR babysitting.

**All mutable loop state lives in the GitHub issue labeled `loop:state`, not in repository files.**

Loop configuration, policy, and schemas are versioned in `.loop/` and `scripts/loop/`. The loop runtime enforces:
- Max 3 attempts per source item/failure fingerprint
- Max 5 changed files per automated fix
- Max 2 concurrent loop-created PRs
- No auto-merge (human approval always required)
- Protected paths require human gate (`.github/workflows/**`, `.github/hooks/**`, `.loop/**`, `package.json`, `src/lib/auth.js`)

**Phase 7 — Label normalization:**

Loop uses canonical priority labels (`P0: critical`, `P1: high`, `P2: medium`, `P3: low`) and loop-owned operational labels (`loop:state`, `loop:paused`, `loop:managed`, `loop:queued`, `loop:running`, `loop:blocked`, `loop:human-required`, `loop:verified`).

Deprecated `priority:p*` labels from Squad automation are mapped to canonical equivalents in `.loop/labels.json`. The label sync script (`scripts/loop/labels-sync.mjs`) handles migration with human verification required before applying.

**Squad automation coexistence:** Four Squad workflows (`squad-heartbeat.yml`, `squad-triage.yml`, `squad-issue-assign.yml`, `sync-squad-labels.yml`) currently run in parallel with loop workflows for comparison (shadow mode). These are **flagged for future cutover** but remain active. Cutover requires a dedicated PR with human approval.

**Loop does NOT depend on `.squad/` files:** Loop workflows, scripts, policy, state transitions, and adapters do not read `.squad/team.md`, `.squad/routing.md`, or `squad:*` labels for decision-making. The `.squad/` directory remains as optional team metadata.

See `LOOP.md` for operating guide and `npm run loop:doctor` for configuration validation.

## Key Conventions

### Components
- **Default exports** for all components; **named exports** for hooks, data, and utility modules.
- Props are destructured with defaults in the function signature.
- Configuration maps and constants (variants, sizes, accent classes, icon maps) go above the component definition.
- Small helper components used by a single page are defined in the same file (e.g., `Section` in Profile, `InputField` in Login/Signup).

### Styling
- Tailwind CSS v4 with the Vite plugin (`@tailwindcss/vite`). No `tailwind.config.js` — configuration is CSS-first via `@theme` in `src/index.css`.
- Custom design tokens: `navy-50`–`navy-950` scale, `brand-emerald` variants, `brand-gold` variants, and custom fonts (`--font-sans: Inter`, `--font-serif: Fraunces`).
- Use `.font-display` for the serif display font. Use existing token colors rather than arbitrary values.

### Animations
- Framer Motion for entrance/reveal animations. Common pattern:
  - `initial={{ opacity: 0, y: 24 }}` with `whileInView` and `viewport={{ once: true }}`
  - Easing: `[0.22, 1, 0.36, 1]`, durations `0.5–0.9s`
- CSS animation `animate-float-slow` is available for gentle floating effects.

### Icons
- Use `lucide-react` for all UI icons — import and render as components (`<Icon size={…} />`).
- `public/icons.svg` contains an SVG sprite for social brand icons (GitHub, Discord, Bluesky, X).

### Routing
- All routes are defined in `src/App.jsx` inside a single `<Routes>` block nested under `<Layout>`.
- The catch-all `*` route redirects to Landing.
- Protected routes wrap their element with `<ProtectedRoute>`.

### ESLint
- Flat config (`eslint.config.js`) with `react-hooks` and `react-refresh` plugins.
- `no-unused-vars` ignores variables starting with uppercase or underscore (`varsIgnorePattern: '^[A-Z_]'`).
