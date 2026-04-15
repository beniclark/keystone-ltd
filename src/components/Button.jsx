import { Link } from 'react-router-dom'

const base =
  'inline-flex items-center justify-center gap-2 font-medium rounded-full transition-all duration-200 whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--color-brand-emerald)]'

const variants = {
  primary:
    'bg-[#10b981] text-white hover:bg-[#059669] shadow-sm hover:shadow-md hover:-translate-y-0.5',
  dark:
    'bg-navy-800 text-white hover:bg-navy-700 shadow-sm hover:shadow-md hover:-translate-y-0.5',
  light:
    'bg-white text-navy-800 hover:bg-navy-50 shadow-sm hover:shadow-md hover:-translate-y-0.5',
  outline:
    'bg-transparent text-navy-800 border border-navy-200 hover:border-navy-400 hover:bg-navy-50',
  outlineDark:
    'bg-transparent text-white border border-white/40 hover:border-white hover:bg-white/10',
  ghost: 'bg-transparent text-navy-700 hover:bg-navy-50',
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
