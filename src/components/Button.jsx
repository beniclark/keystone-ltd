import { Link } from 'react-router-dom'

const base =
  'inline-flex items-center justify-center gap-2 font-medium rounded-full transition-all duration-200 whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--color-brand-emerald)]'

const variants = {
  primary:
    'bg-brand-emerald text-white hover:bg-brand-emerald-deep shadow-sm hover:shadow-md hover:-translate-y-0.5',
  dark:
    'bg-navy-800 text-white hover:bg-navy-700 shadow-sm hover:shadow-md hover:-translate-y-0.5',
  light:
    'bg-[var(--color-surface-primary)] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-secondary)] shadow-sm hover:shadow-md hover:-translate-y-0.5',
  outline:
    'bg-transparent text-[var(--color-text-primary)] border border-[var(--color-border-primary)] hover:bg-[var(--color-surface-secondary)]',
  outlineDark: 'bg-transparent text-white border border-white/40 hover:border-white hover:bg-white/10',
  ghost: 'bg-transparent text-[var(--color-text-primary)] hover:bg-[var(--color-surface-secondary)]',
}

const sizes = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-7 py-3.5 text-base',
}

export default function Button({
  as = 'button',
  to,
  href,
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...rest
}) {
  const cls = `${base} ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${className}`

  if (to) {
    return (
      <Link to={to} className={cls} {...rest}>
        {children}
      </Link>
    )
  }
  if (href) {
    return (
      <a href={href} className={cls} {...rest}>
        {children}
      </a>
    )
  }
  const Tag = as
  return (
    <Tag className={cls} {...rest}>
      {children}
    </Tag>
  )
}
