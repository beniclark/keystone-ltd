export default function SectionHeading({
  eyebrow,
  title,
  description,
  center = false,
  dark = false,
  className = '',
}) {
  return (
    <div className={`${center ? 'text-center mx-auto' : ''} max-w-3xl ${className}`}>
      {eyebrow && (
        <div
          className={`inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] mb-4 ${
            dark ? 'text-emerald-300' : 'text-brand-emerald'
          }`}
        >
          <span className="inline-block h-px w-6 bg-current opacity-60" />
          {eyebrow}
        </div>
      )}
      <h2
        className={`font-display text-4xl md:text-5xl font-semibold tracking-tight leading-[1.05] ${
          dark ? 'text-white' : 'text-[var(--color-text-primary)]'
        }`}
      >
        {title}
      </h2>
      {description && (
        <p className={`mt-5 text-lg ${dark ? 'text-navy-100/80' : 'text-[var(--color-text-secondary)]'}`}>
          {description}
        </p>
      )}
    </div>
  )
}
