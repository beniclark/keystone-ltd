# Danny — Project History

## Project Context

- **Project:** Keystone Financial (keystone-ltd) — a financial services demo website
- **Stack:** React 19, Vite 8, Tailwind CSS 4.2, framer-motion, recharts, react-router-dom, lucide-react
- **User:** beclark
- **Repo:** https://github.com/beniclark/keystone-ltd
- **Current state:** Frontend-only SPA with crimson/creme theme redesign in progress. Planned: Express+SQLite backend, dark mode, JWT auth. 16 GitHub issues (#1-#16) track the backlog.

## Learnings

### Loop Engineering Phase 1 — Baseline Verification (2026-07-16)

**Context:** Implemented Phase 1 of Repository-Owned Loop Engineering plan — establishing deterministic verification infrastructure independent of .squad/ automation.

**Key Decisions:**
- **Test framework**: Chose Vitest over Jest for native ESM support and Vite integration. Added jsdom for browser environment, React Testing Library for component testing.
- **E2E framework**: Playwright with Chromium-only configuration (CI-friendly, fast feedback).
- **Type-checking strategy**: TypeScript with `allowJs: true`, `checkJs: false` — non-blocking initially. Reports diagnostics without failing CI. Will become required before L2 loop delegation.
- **CI structure**: Separate jobs for lint+typecheck, unit tests, build, and E2E tests, with a single aggregate `required-checks` job that depends on all. This aggregate job is the stable name for branch protection.
- **Pragmatic scope**: Fixed pre-existing lint issues (unused motion imports) by removing framer-motion usage where not needed. Phase 1 is about tooling infrastructure, not perfecting all existing code.

**Architecture Patterns:**
- **Loop CLI**: Stub at `scripts/loop/cli.mjs` — exits 0 with "not yet implemented" message. Prevents package.json script failures while Phase 3 is pending.
- **Bootstrap approach**: `scripts/loop/bootstrap-branch-protection.mjs` prints exact `gh api` commands for manual execution when admin permissions unavailable. Idempotent, dry-run-first design.
- **Test organization**: `__tests__` directories co-located with source (`src/lib/__tests__/`, `src/components/__tests__/`, etc.). E2E tests in top-level `e2e/` directory.

**File Paths:**
- Test configs: `vitest.config.js`, `vitest.setup.js`, `playwright.config.js`, `tsconfig.json`
- CI workflow: `.github/workflows/ci.yml`
- Loop infrastructure: `scripts/loop/cli.mjs`, `scripts/loop/bootstrap-branch-protection.mjs`
- Documentation: `LOOP.md` (Phase 1 section)
- Tests: `src/lib/__tests__/auth.test.js`, `src/data/options/__tests__/helpers.test.js`, `src/components/__tests__/ProtectedRoute.test.jsx`, `src/pages/__tests__/OptionsChainPage.test.jsx`, `e2e/smoke.spec.mjs`

**Verification Commands:**
```bash
npm run lint          # ESLint (passes)
npm run typecheck     # TypeScript (non-blocking, passes)
npm run test:unit     # Vitest (39 tests, all pass)
npm run build         # Vite build (succeeds)
npm run verify        # Aggregate: lint + typecheck + test + build
npm run verify:full   # Full verification including E2E
```

**Deferred to Later Phases:**
- Phase 2: Loop contracts (`.loop/config.json`, `.loop/policy.json`, schemas, state ledger format)
- Phase 3: GitHub connector, Copilot adapter, git worktree isolation
- Phase 4: Skills, custom agents, policy hooks, verification hooks
- Phase 5-8: L1 report-only rollout, L2 verified draft PRs, shadow mode, label cutover

**Blockers:**
- No `gh` CLI authentication or insufficient admin permissions to apply branch protection ruleset programmatically. Manual remediation required: run `node scripts/loop/bootstrap-branch-protection.mjs` and execute printed commands.

**Outcome:** Phase 1 complete. Branch has clean working tree, all verification passes, CI workflow ready, and baseline tests provide confidence for future loop automation work.

- Session started 2026-04-15. Team formed to tackle backlog of 16 issues spanning backend setup, dark mode, auth, and UI improvements.
- **Codebase Analysis (Danny)**: Reviewed full stack — React 19/Vite 8 SPA with Tailwind 4.2, recharts, framer-motion. Current state: localStorage-based mock auth (no validation), 6 main pages (Landing, Login, Signup, Services, About, Profile), profile dashboard with static data charts. Missing from the 16 issues: (1) SEO/meta (only description in index.html, no canonical/og tags), (2) Performance metrics & production optimizations (no build config for compression, lazy loading, code splitting), (3) Rate limiting/abuse prevention, (4) Input validation layer, (5) Error recovery strategies, (6) Analytics/telemetry, (7) CSV export for financial data, (8) Mobile-first responsive improvements. See decision file for recommendations.
- **Options Feature Architecture (Danny)**: Authored full architecture plan for stock options feature (ARCH-OPTIONS-001). Decision: tiered mock data with API-ready abstraction — no live APIs for v1 (demo site, no backend yet). Defined 5 data models (Stock, OptionContract, OptionsChain, OptionPosition, StrategyType). Mapped component tree: Options Positions section on Profile page + separate Options Chain page at `/options/:ticker` (Fidelity-style). 12 new components in `src/components/options/`, 2 new pages, 5 new data files in `src/data/options/`. Scoped v1 tightly: 8 S&P mega-cap tickers, 3-4 expirations each, view-only (no paper trading). Phased plan across Rusty (data layer), Linus (UI), Livingston (tests) with clear parallelization. Plan written to `.squad/decisions/inbox/danny-options-architecture.md`.
