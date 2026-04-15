# Copilot Instructions — Keystone Financial

## Commands

```bash
npm run dev      # Vite dev server at localhost:5173
npm run build    # Production build to dist/
npm run lint     # ESLint (flat config, JS/JSX only)
npm run preview  # Preview production build
```

No test framework is configured.

## Architecture

Single-page React 19 app using Vite 8 and Tailwind CSS v4. Client-side routing via react-router-dom v7 with a shared `Layout` shell (Navbar + Outlet + Footer). The `/profile` route is protected by `ProtectedRoute`, which redirects unauthenticated users to `/login`.

**Auth** is localStorage-based (`keystoneUser` key). `src/lib/auth.js` handles login/signup/logout and dispatches a custom `keystone-auth` event. The `useAuth` hook subscribes to both that event and `storage` to stay in sync across tabs.

**Data** is entirely static mock data in `src/data/`. There is no API layer or backend. Components import named exports directly from data files.

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
