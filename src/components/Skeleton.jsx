export function SkeletonText({ width = 'w-full' }) {
  return <div className={`h-4 rounded bg-[var(--color-skeleton)] animate-pulse ${width}`} />
}

export function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-surface-card)] p-6 space-y-4">
      <SkeletonText width="w-1/3" />
      <SkeletonText width="w-3/4" />
      <SkeletonText width="w-1/2" />
    </div>
  )
}

export function SkeletonTable({ rows = 4 }) {
  return (
    <div className="rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-surface-card)] p-6 space-y-4">
      {Array.from({ length: rows }).map((_, index) => (
        <SkeletonText key={index} width="w-full" />
      ))}
    </div>
  )
}
