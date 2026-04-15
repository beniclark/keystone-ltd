export default function Logo({ className = '', dark = false }) {
  const mark = dark ? '#ffffff' : '#0a2540'
  const accent = '#10b981'
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <svg
        width="32"
        height="32"
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M20 3 L36 14 V32 H26 V22 H14 V32 H4 V14 Z"
          fill={mark}
        />
        <path
          d="M20 3 L36 14 L32 14 L20 6 L8 14 L4 14 Z"
          fill={accent}
        />
      </svg>
      <span
        className={`font-display text-xl font-semibold tracking-tight ${
          dark ? 'text-white' : 'text-navy-800'
        }`}
      >
        Keystone
      </span>
    </div>
  )
}
