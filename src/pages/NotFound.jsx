import { motion as Motion } from 'framer-motion'
import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[var(--color-surface-secondary)] flex items-center justify-center px-6">
      <Motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="max-w-xl w-full rounded-3xl border border-[var(--color-border-primary)] bg-[var(--color-surface-card)] p-10 text-center"
      >
        <p className="text-sm uppercase tracking-[0.14em] text-brand-emerald mb-4">404</p>
        <h1 className="font-display text-4xl font-semibold text-[var(--color-text-primary)]">Page not found</h1>
        <p className="mt-4 text-[var(--color-text-secondary)]">
          The page you requested doesn’t exist or may have moved.
        </p>
        <Link
          to="/"
          className="mt-8 inline-flex items-center justify-center rounded-full bg-brand-emerald px-6 py-3 text-sm font-medium text-white hover:opacity-95"
        >
          Back to home
        </Link>
      </Motion.div>
    </div>
  )
}
